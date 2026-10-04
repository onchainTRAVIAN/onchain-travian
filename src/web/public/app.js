// Progressive enhancement only: the game is fully playable without JavaScript.
(function () {
  'use strict';
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  function fmt(ms) {
    var t = Math.max(0, Math.ceil(ms / 1000));
    var d = Math.floor(t / 86400), h = Math.floor((t % 86400) / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    var hms = (d > 0 ? pad(h) : h) + ':' + pad(m) + ':' + pad(s);
    return d > 0 ? d + 'd ' + hms : hms;
  }
  // Server time offset so countdowns are right even if the phone clock is off.
  var serverNow = Number(document.body.getAttribute('data-now')) || Date.now();
  var skew = serverNow - Date.now();
  var now = function () { return Date.now() + skew; };
  var reloading = false;

  function tick() {
    var timers = document.querySelectorAll('[data-ends]');
    for (var i = 0; i < timers.length; i++) {
      var el = timers[i];
      var left = Number(el.getAttribute('data-ends')) - now();
      el.textContent = fmt(left);
      if (left <= 0 && !reloading && el.hasAttribute('data-reload')) {
        reloading = true;
        setTimeout(function () { location.reload(); }, 1500);
      }
    }
    var res = document.querySelectorAll('[data-amount]');
    for (var j = 0; j < res.length; j++) {
      var r = res[j];
      var base = Number(r.getAttribute('data-amount'));
      var rate = Number(r.getAttribute('data-rate'));
      var cap = Number(r.getAttribute('data-cap'));
      var at = Number(r.getAttribute('data-at'));
      var v = base + (rate * (now() - at)) / 3600000;
      if (rate >= 0) v = base >= cap ? base : Math.min(cap, v);
      v = Math.max(0, Math.floor(v));
      r.textContent = v.toLocaleString('en-US');
      var cell = r.closest('.res');
      if (cell) cell.classList.toggle('full', rate >= 0 && v >= cap);
    }
  }
  tick();
  setInterval(tick, 1000);

  // Live chat: refresh the message list every few seconds without reloading the page.
  var log = document.getElementById('chatlog');
  if (log && window.fetch) {
    var feed = log.getAttribute('data-feed');
    setInterval(function () {
      if (document.hidden) return;
      fetch(feed, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(function (htmlText) { if (htmlText !== null) log.innerHTML = htmlText; })
        .catch(function () {});
    }, 6000);
  }

  // NPC merchant: live "Rest" counter and "Distribute remaining" button.
  var npc = document.getElementById('npc');
  if (npc) {
    var total = Number(npc.getAttribute('data-total')) || 0;
    var inputs = npc.querySelectorAll('.npc-in');
    var restEl = document.getElementById('npc-rest');
    var sum = function () {
      var s = 0;
      for (var i = 0; i < inputs.length; i++) s += Math.max(0, Math.floor(Number(inputs[i].value) || 0));
      return s;
    };
    var update = function () {
      var rest = total - sum();
      restEl.textContent = rest.toLocaleString('en-US');
      restEl.className = rest === 0 ? 'c1' : rest < 0 ? 'bad' : 'c2';
    };
    npc.addEventListener('input', update);
    document.getElementById('npc-dist').addEventListener('click', function () {
      // Entered too much: take the excess back from the largest amounts first.
      var over = sum() - total;
      if (over > 0) {
        var arr = Array.prototype.slice.call(inputs).sort(function (a, b) { return (Number(b.value) || 0) - (Number(a.value) || 0); });
        for (var r = 0; r < arr.length && over > 0; r++) {
          var cur = Math.max(0, Number(arr[r].value) || 0);
          var cut = Math.min(cur, over);
          arr[r].value = cur - cut;
          over -= cut;
        }
      }
      // Spread the rest evenly over resources that still have storage room.
      for (var round = 0; round < 6; round++) {
        var rest = total - sum();
        if (rest <= 0) break;
        var open = [];
        for (var i = 0; i < inputs.length; i++) {
          var cap = Number(inputs[i].getAttribute('data-cap')) || 0;
          if ((Number(inputs[i].value) || 0) < cap) open.push(inputs[i]);
        }
        if (!open.length) break;
        var share = Math.max(1, Math.floor(rest / open.length));
        for (var j = 0; j < open.length && rest > 0; j++) {
          var el = open[j];
          var c = Number(el.getAttribute('data-cap')) || 0;
          var v = Number(el.value) || 0;
          var add = Math.min(c - v, share, rest);
          el.value = v + add;
          rest -= add;
        }
      }
      update();
    });
    update();
  }

  // "(max)" links fill unit inputs.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-fill]') : null;
    if (!a) return;
    var input = document.getElementById(a.getAttribute('data-fill'));
    if (!input) return;
    e.preventDefault();
    input.value = a.getAttribute('data-value');
    input.focus();
  });
})();
