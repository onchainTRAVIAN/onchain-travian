// Wallet features: sign-in with Ethereum (link / log in) and paying for credits.
// Uses the browser wallet (window.ethereum). No libraries needed.
(function () {
  'use strict';
  var root = document.querySelector('[data-wallet]');
  if (!root) return;
  var csrf = root.getAttribute('data-csrf');
  var statusEl = root.querySelector('[data-status]');
  var chainId = Number(root.getAttribute('data-chain') || '0');
  var chainName = root.getAttribute('data-chain-name') || 'the right network';

  // Function selectors (keccak256 of the signature, first 4 bytes).
  var SEL_DEPOSIT_ETH = '5358fbda'; // depositETH(uint256)
  var SEL_DEPOSIT_TOKEN = '9d2d04d1'; // depositToken(uint256,uint256)
  var SEL_APPROVE = '095ea7b3'; // approve(address,uint256)

  function say(text, bad) {
    if (!statusEl) return;
    statusEl.textContent = text;
    statusEl.className = 'small ' + (bad ? 'bad' : 'good');
  }

  function wallet() {
    if (!window.ethereum) throw new Error('No wallet found. Install MetaMask (or open this page in your wallet app) and try again.');
    return window.ethereum;
  }

  function account() {
    return wallet().request({ method: 'eth_requestAccounts' }).then(function (accs) {
      if (!accs || !accs[0]) throw new Error('No account selected');
      return accs[0];
    });
  }

  function ensureChain() {
    var hex = '0x' + chainId.toString(16);
    return wallet().request({ method: 'eth_chainId' }).then(function (current) {
      if (parseInt(current, 16) === chainId) return;
      return wallet()
        .request({ method: 'wallet_switchEthereumChain', params: [{ chainId: hex }] })
        .catch(function () { throw new Error('Please switch your wallet to ' + chainName + '.'); });
    });
  }

  function post(url, body) {
    body._csrf = csrf;
    return fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then(function (r) {
      return r.json().catch(function () { return { ok: false, error: 'Unexpected response' }; });
    }).then(function (j) {
      if (!j.ok) throw new Error(j.error || 'Request failed');
      return j;
    });
  }

  function utf8ToHex(s) {
    var bytes = new TextEncoder().encode(s);
    var out = '0x';
    for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
    return out;
  }

  function pad32(hexNoPrefix) {
    return ('0'.repeat(64) + hexNoPrefix).slice(-64);
  }

  function uint(v) {
    return pad32(BigInt(v).toString(16));
  }

  function addr(a) {
    return pad32(a.toLowerCase().replace(/^0x/, ''));
  }

  function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
  }

  function fail(err) {
    var msg = (err && (err.message || err.reason)) || String(err);
    if (err && err.code === 4001) msg = 'You cancelled the request in your wallet.';
    say(msg, true);
  }

  // ---- Sign in with Ethereum ----
  function signIn(purpose, btn) {
    busy(btn, true);
    say('Waiting for your wallet…');
    var address;
    account()
      .then(function (a) {
        address = a;
        return post('/wallet/challenge', { address: a, purpose: purpose });
      })
      .then(function (c) {
        say('Please sign the message in your wallet (free, no gas)…');
        return wallet().request({ method: 'personal_sign', params: [utf8ToHex(c.message), address] }).then(function (sig) {
          return post('/wallet/verify', { message: c.message, signature: sig, purpose: purpose });
        });
      })
      .then(function (r) {
        say('Done!');
        location.href = r.redirect || '/';
      })
      .catch(fail)
      .then(function () { busy(btn, false); });
  }

  // ---- Payments ----
  var payments = root.getAttribute('data-payments');
  var token = root.getAttribute('data-token');
  var accountId = root.getAttribute('data-account');
  var decimals = Number(root.getAttribute('data-decimals') || '18');

  function waitForReceipt(hash) {
    return new Promise(function (resolve, reject) {
      var tries = 0;
      (function poll() {
        wallet().request({ method: 'eth_getTransactionReceipt', params: [hash] }).then(function (r) {
          if (r) return r.status === '0x1' ? resolve(r) : reject(new Error('The transaction failed.'));
          if (++tries > 120) return reject(new Error('Timed out waiting for the transaction.'));
          setTimeout(poll, 2500);
        }, reject);
      })();
    });
  }

  function parseUnits(value, dec) {
    var m = /^(\d+)(?:\.(\d+))?$/.exec(String(value).trim());
    if (!m) throw new Error('Enter a valid amount, e.g. 0.05');
    var frac = (m[2] || '').slice(0, dec);
    while (frac.length < dec) frac += '0';
    return (BigInt(m[1]) * (10n ** BigInt(dec)) + BigInt(frac || '0')).toString();
  }

  function pay(asset, units, btn) {
    if (!payments) return say('Payments are not configured.', true);
    if (BigInt(units) <= 0n) return say('Enter an amount.', true);
    busy(btn, true);
    say('Waiting for your wallet…');
    var from;
    account()
      .then(function (a) { from = a; return ensureChain(); })
      .then(function () {
        if (asset === 'eth') {
          return wallet().request({
            method: 'eth_sendTransaction',
            params: [{ from: from, to: payments, value: '0x' + BigInt(units).toString(16), data: '0x' + SEL_DEPOSIT_ETH + uint(accountId) }],
          });
        }
        if (!token) throw new Error('Token payments are not configured.');
        say('Step 1 of 2: approve the token spend in your wallet…');
        return wallet()
          .request({ method: 'eth_sendTransaction', params: [{ from: from, to: token, data: '0x' + SEL_APPROVE + addr(payments) + uint(units) }] })
          .then(function (h) { say('Waiting for the approval to confirm…'); return waitForReceipt(h); })
          .then(function () {
            say('Step 2 of 2: confirm the payment in your wallet…');
            return wallet().request({
              method: 'eth_sendTransaction',
              params: [{ from: from, to: payments, data: '0x' + SEL_DEPOSIT_TOKEN + uint(accountId) + uint(units) }],
            });
          });
      })
      .then(function (hash) {
        say('Payment sent! Credits arrive after a few confirmations — you will get a message. Tx: ' + hash);
      })
      .catch(fail)
      .then(function () { busy(btn, false); });
  }

  root.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('button') : null;
    if (!t || !root.contains(t)) return;
    var action = t.getAttribute('data-action');
    if (action === 'link' || action === 'login') {
      e.preventDefault();
      return signIn(action, t);
    }
    if (t.hasAttribute('data-pay')) {
      e.preventDefault();
      return pay(t.getAttribute('data-pay'), t.getAttribute('data-units'), t);
    }
    if (t.hasAttribute('data-pay-custom')) {
      e.preventDefault();
      try {
        var asset = root.querySelector('[data-custom-asset]').value;
        var raw = root.querySelector('[data-custom-amount]').value;
        return pay(asset, parseUnits(raw, asset === 'eth' ? 18 : decimals), t);
      } catch (err) {
        return fail(err);
      }
    }
  });
})();
