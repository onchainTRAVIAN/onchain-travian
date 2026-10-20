// Wallet features: sign-in with Ethereum (log in / join / link) and paying for credits.
// Works with any EVM browser wallet: finds them through EIP-6963 (a picker when several are installed),
// falls back to window.ethereum (older extensions, phone wallets' in-app browsers). No libraries needed.
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

  // ---- Wallet discovery (EIP-6963) ----
  var found = [];
  var chosen = null;
  window.addEventListener('eip6963:announceProvider', function (e) {
    var d = e.detail;
    if (!d || !d.provider || !d.info) return;
    for (var i = 0; i < found.length; i++) if (found[i].info.uuid === d.info.uuid) return;
    found.push(d);
  });
  window.dispatchEvent(new Event('eip6963:requestProvider'));

  function lastUsed(set) {
    try {
      if (set) localStorage.setItem('walletRdns', set);
      return localStorage.getItem('walletRdns');
    } catch (e) {
      return null;
    }
  }

  function noWallet() {
    var err = new Error('No wallet found.');
    err.noWallet = true;
    return err;
  }

  // Phones have no wallet extensions: the wallet apps open this page in their own browser instead.
  var isPhone = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
  var WALLET_APPS = [
    ['MetaMask', function (u) { return 'https://metamask.app.link/dapp/' + u.replace(/^https?:\/\//, ''); }],
    ['Trust Wallet', function (u) { return 'https://link.trustwallet.com/open_url?coin_id=60&url=' + encodeURIComponent(u); }],
    ['Coinbase Wallet', function (u) { return 'https://go.cb-w.com/dapp?cb_url=' + encodeURIComponent(u); }],
    ['OKX Wallet', function (u) { return 'okx://wallet/dapp/url?dappUrl=' + encodeURIComponent(u); }],
  ];

  function showOpenInApp() {
    var box = picker();
    box.textContent = '';
    var head = document.createElement('p');
    head.className = 'small';
    head.textContent = 'Open the game in your wallet app:';
    box.appendChild(head);
    var page = location.origin + location.pathname + location.search;
    WALLET_APPS.forEach(function (w) {
      var a = document.createElement('a');
      a.className = 'wopt';
      a.href = w[1](page);
      a.rel = 'noopener';
      a.textContent = w[0];
      box.appendChild(a);
    });
    box.hidden = false;
    statusEl.className = 'small';
    statusEl.textContent = 'This browser has no wallet. Tap your wallet above: the game opens inside it, then press Connect wallet there.';
  }

  function showNoWallet() {
    if (!statusEl) return;
    if (isPhone) return showOpenInApp();
    statusEl.className = 'small bad';
    statusEl.textContent = 'No wallet found in this browser. Install one, for example ';
    [['MetaMask', 'https://metamask.io/download/'], ['Rabby', 'https://rabby.io/'], ['Coinbase Wallet', 'https://www.coinbase.com/wallet/downloads']].forEach(function (w, i, all) {
      var a = document.createElement('a');
      a.href = w[1];
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = w[0];
      statusEl.appendChild(a);
      statusEl.appendChild(document.createTextNode(i < all.length - 1 ? ', ' : ''));
    });
    statusEl.appendChild(document.createTextNode(", or open this page in your wallet app's browser."));
  }

  function picker() {
    var box = root.querySelector('[data-picker]');
    if (!box) {
      box = document.createElement('div');
      box.className = 'wpick';
      box.setAttribute('data-picker', '');
      if (statusEl) statusEl.parentNode.insertBefore(box, statusEl);
      else root.appendChild(box);
    }
    return box;
  }

  // Resolves with the EIP-1193 provider to use (asks the player when several wallets are installed).
  function choose() {
    if (chosen) return Promise.resolve(chosen);
    var list = found.slice();
    if (!list.length) {
      if (window.ethereum) return Promise.resolve((chosen = window.ethereum));
      return Promise.reject(noWallet());
    }
    if (list.length === 1) {
      lastUsed(list[0].info.rdns);
      return Promise.resolve((chosen = list[0].provider));
    }
    var last = lastUsed();
    list.sort(function (a, b) { return (b.info.rdns === last) - (a.info.rdns === last); });
    return new Promise(function (resolve, reject) {
      var box = picker();
      box.textContent = '';
      var head = document.createElement('p');
      head.className = 'small';
      head.textContent = 'Choose your wallet:';
      box.appendChild(head);
      list.forEach(function (d) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'wopt';
        if (/^data:image\//.test(d.info.icon || '')) {
          var img = document.createElement('img');
          img.src = d.info.icon;
          img.width = 24;
          img.height = 24;
          img.alt = '';
          b.appendChild(img);
        }
        b.appendChild(document.createTextNode(d.info.name || 'Wallet'));
        b.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          box.hidden = true;
          lastUsed(d.info.rdns);
          resolve((chosen = d.provider));
        });
        box.appendChild(b);
      });
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'small secondary';
      cancel.textContent = 'Cancel';
      cancel.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        box.hidden = true;
        reject(new Error('Cancelled.'));
      });
      box.appendChild(cancel);
      box.hidden = false;
      say('');
    });
  }

  function wallet() {
    if (!chosen) throw noWallet();
    return chosen;
  }

  function account() {
    return choose().then(function (p) {
      return p.request({ method: 'eth_requestAccounts' });
    }).then(function (accs) {
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
    if (err && err.noWallet) return showNoWallet();
    var msg = (err && (err.message || err.reason)) || String(err);
    if (err && err.code === 4001) msg = 'You cancelled the request in your wallet.';
    say(msg, true);
  }

  // ---- Sign in with Ethereum ----
  function signIn(purpose, btn) {
    busy(btn, true);
    say('Waiting for your wallet...');
    var address;
    account()
      .then(function (a) {
        address = a;
        // The message names the chain the wallet is on, so no wallet asks to switch networks just to sign in.
        return wallet().request({ method: 'eth_chainId' }).then(function (hex) { return parseInt(hex, 16); }, function () { return 0; });
      })
      .then(function (chain) {
        var body = { address: address, purpose: purpose };
        if (chain > 0 && chain <= Number.MAX_SAFE_INTEGER) body.chainId = chain;
        return post('/wallet/challenge', body);
      })
      .then(function (c) {
        say('Please sign the message in your wallet (free, no gas)…');
        return wallet().request({ method: 'personal_sign', params: [utf8ToHex(c.message), address] }).then(function (sig) {
          return post('/wallet/verify', { message: c.message, signature: sig, purpose: purpose });
        });
      })
      .then(function (r) {
        say(r.redirect === '/register' ? 'Signed in. Now pick a name and a tribe...' : 'Done!');
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
        say('Payment sent! Credits arrive after a few confirmations - you will get a message. Tx: ' + hash);
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
