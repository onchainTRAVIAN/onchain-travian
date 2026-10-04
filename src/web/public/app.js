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
