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
  // Don't reload a page while the player is filling in a form.
  var typed = false;
  document.addEventListener('input', function () { typed = true; });

  function tick() {
    var timers = document.querySelectorAll('[data-ends]');
    for (var i = 0; i < timers.length; i++) {
      var el = timers[i];
      var left = Number(el.getAttribute('data-ends')) - now();
      el.textContent = fmt(left);
      if (left <= 0 && !reloading && !typed && el.hasAttribute('data-reload')) {
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

  // Chat cooldown: the Send button wakes up when the wait is over.
  var chatForm = document.getElementById('chatform');
  var chatSend = document.getElementById('chatsend');
  if (chatForm && chatSend && chatSend.disabled) {
    var chatNext = Number(chatForm.getAttribute('data-next')) || 0;
    var chatWake = setInterval(function () {
      if (now() < chatNext) return;
      clearInterval(chatWake);
      chatSend.disabled = false;
      chatSend.textContent = 'Send';
    }, 500);
  }

  // Map: hover/focus a field to see its details; arrow keys move the map.
  var info = document.getElementById('mi-b');
  if (info) {
    var head = document.getElementById('mi-h');
    var row = function (k, v) {
      var tr = document.createElement('tr');
      var th = document.createElement('th');
      var td = document.createElement('td');
      th.textContent = k;
      td.textContent = v;
      tr.appendChild(th);
      tr.appendChild(td);
      return tr;
    };
    var show = function (a) {
      var prev = document.querySelector('.mapsvg a.tile.hov');
      if (prev) prev.classList.remove('hov');
      a.classList.add('hov');
      head.textContent = 'Details (' + a.getAttribute('data-x') + '|' + a.getAttribute('data-y') + '):';
      while (info.firstChild) info.removeChild(info.firstChild);
      var k = a.getAttribute('data-k');
      if (k === 'village') {
        info.appendChild(row('Village', a.getAttribute('data-n')));
        info.appendChild(row('Player', a.getAttribute('data-o')));
        info.appendChild(row('Population', a.getAttribute('data-p')));
      } else {
        info.appendChild(row('Field', k === 'oasis' ? 'Oasis' : 'Abandoned valley'));
      }
    };
    var tiles = document.querySelectorAll('.mapsvg a.tile');
    for (var ti = 0; ti < tiles.length; ti++) {
      tiles[ti].addEventListener('mouseenter', function (e) { show(e.currentTarget); });
      tiles[ti].addEventListener('focus', function (e) { show(e.currentTarget); });
    }
    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT')) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var dir = { ArrowUp: 'n', ArrowRight: 'e', ArrowDown: 's', ArrowLeft: 'w' }[e.key];
      var a = dir && document.getElementById('mp-' + dir);
      if (a) {
        e.preventDefault();
        window.location.href = a.getAttribute('href');
      }
    });
  }

  // Village centre: click and hover exactly what you see. Each building/plot picture is checked
  // pixel by pixel (front to back), so a roof never opens the building behind it and grass does nothing.
  var vm = document.getElementById('vmap2');
  if (vm && vm.querySelector('.hitmap')) {
    vm.classList.add('js');
    var blds = [];
    var els = vm.querySelectorAll('.bld');
    for (var bi = 0; bi < els.length; bi++) {
      var mm = /\bb(\d+)\b/.exec(els[bi].className);
      var im = els[bi].querySelector('img');
      if (mm && im) blds.push({ el: els[bi], img: im, slot: mm[1], z: parseInt(getComputedStyle(els[bi]).zIndex, 10) || 0 });
    }
    blds.sort(function (a, b) { return b.z - a.z; }); // front first
    var wallImg = vm.querySelector('img.wall');
    // Outline masks of every picture (scripts/gen-masks.py): which cells of each picture are drawn.
    var masks = null;
    fetch(document.body.getAttribute('data-masks') || '/static/masks.json')
      .then(function (r) { return r.json(); })
      .then(function (j) { masks = j.masks; })
      .catch(function () { masks = null; });
    var maskFor = function (img) {
      var m = /\/static\/img\/(.+\.svg)/.exec(img.getAttribute('src') || '');
      if (!m || !masks) return null;
      var size = '@' + img.offsetWidth + 'x' + img.offsetHeight;
      // Stage pictures (e.g. main-3.svg) fall back to the base outline if their own mask is missing.
      return masks[m[1] + size] || masks[m[1].replace(/-\d\.svg$/, '.svg') + size] || null;
    };
    var drawnAt = function (img, fx, fy) {
      var mk = maskFor(img);
      if (!mk) return false;
      var c = Math.min(mk.cols - 1, Math.max(0, Math.floor(fx * mk.cols)));
      var r = Math.min(mk.rows - 1, Math.max(0, Math.floor(fy * mk.rows)));
      return ((parseInt(mk.data[r].charAt(c >> 2), 16) >> (3 - (c & 3))) & 1) === 1;
    };
    var hitImg = function (img, x, y) {
      var r = img.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return false;
      return drawnAt(img, (x - r.left) / r.width, (y - r.top) / r.height);
    };
    var pick = function (x, y) {
      for (var i = 0; i < blds.length; i++) if (hitImg(blds[i].img, x, y)) return blds[i].slot;
      if (wallImg && hitImg(wallImg, x, y)) return '40';
      // The wall is a thin ring: a band along it (in the 540x448 picture) also counts as the wall.
      var r = vm.getBoundingClientRect();
      var px = ((x - r.left) / r.width) * 540;
      var py = ((y - r.top) / r.height) * 448;
      var d = Math.sqrt(Math.pow((px - 270) / 262, 2) + Math.pow((py - 228) / 214, 2));
      if (d > 0.9 && d < 1.04) return '40';
      return null;
    };
    var hovered = null;
    var setHover = function (slot) {
      if (slot === hovered) return;
      for (var i = 0; i < blds.length; i++) blds[i].el.classList.toggle('hov', blds[i].slot === slot);
      vm.classList.toggle('pt', slot !== null);
      vm.classList.toggle('wallhov', slot === '40');
      hovered = slot;
    };
    vm.addEventListener('mousemove', function (e) { setHover(pick(e.clientX, e.clientY)); });
    vm.addEventListener('mouseleave', function () { setHover(null); });
    vm.addEventListener(
      'click',
      function (e) {
        if (e.detail === 0 || !masks) return; // keyboard activation, or masks not loaded: plain links
        var a = e.target.closest ? e.target.closest('a') : null;
        var slot = pick(e.clientX, e.clientY);
        // Natar villages have no wall picture: the gate area still opens the wall plot.
        if (!slot && !wallImg && a && a.getAttribute('href') === '/slot/40') slot = '40';
        if (a) e.preventDefault();
        if (slot) {
          e.preventDefault();
          window.location.href = '/slot/' + slot;
        }
      },
      true,
    );
  }

  // Send troops: live carry capacity of the selected units.
  // Live "Can carry" totals for every troop picker (send troops, farm list).
  var carryEls = document.querySelectorAll('[data-carrytotal]');
  Array.prototype.forEach.call(carryEls, function (carryEl) {
    var carryForm = carryEl.closest('form');
    if (!carryForm) return;
    var recarry = function () {
      var t = 0;
      var ins = carryForm.querySelectorAll('.su-in');
      for (var i = 0; i < ins.length; i++) t += Math.max(0, Math.floor(Number(ins[i].value) || 0)) * (Number(ins[i].getAttribute('data-carry')) || 0);
      carryEl.textContent = Math.floor(t).toLocaleString('en-US');
    };
    carryForm.addEventListener('input', recarry);
    carryForm.addEventListener('click', function () { setTimeout(recarry, 0); });
    recarry();
  });

  // Training: live total cost of everything entered in the training table.
  var tt = document.getElementById('train-total');
  if (tt) {
    var form = tt.closest('form');
    var have = tt.getAttribute('data-have').split(',').map(Number);
    var keys = ['wood', 'clay', 'iron', 'crop'];
    var fmtCount = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var dur = function (ms) {
      var s = Math.round(ms / 1000);
      var h = Math.floor(s / 3600);
      var m = Math.floor((s % 3600) / 60);
      return h + ':' + String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    };
    var setText = function (id, text) {
      var el = document.getElementById(id);
      // Keep the icon (first child), replace the number after it.
      while (el.childNodes.length > 1) el.removeChild(el.lastChild);
      el.appendChild(document.createTextNode(text));
      return el;
    };
    var recalc = function () {
      var sum = [0, 0, 0, 0, 0, 0, 0];
      var ins = form.querySelectorAll('.tr-in');
      for (var i = 0; i < ins.length; i++) {
        var n = Math.max(0, Math.floor(Number(ins[i].value) || 0));
        var c = ins[i].getAttribute('data-cost').split(',').map(Number);
        for (var j = 0; j < 7; j++) sum[j] += n * (c[j] || 0);
      }
      for (var k = 0; k < 4; k++) setText('tt-' + keys[k], fmtCount(sum[k])).className = sum[k] > have[k] ? 'miss' : '';
      setText('tt-upkeep', fmtCount(sum[4]));
      setText('tt-time', dur(sum[5]));
      if (document.getElementById('tt-carry')) setText('tt-carry', ' ' + fmtCount(sum[6]));
    };
    form.addEventListener('input', recalc);
    form.addEventListener('click', function () { setTimeout(recalc, 0); });
    recalc();
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

  // Market: quick-pick saved places / own villages fill the coordinates.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a.place') : null;
    if (!a) return;
    var form = a.closest('form');
    if (!form) return;
    e.preventDefault();
    form.querySelector('input[name=x]').value = a.getAttribute('data-x');
    form.querySelector('input[name=y]').value = a.getAttribute('data-y');
  });

  // Send troops: "all troops" fills every unit box with what's at home; "clear" empties them.
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('[data-allunits]') : null;
    if (!a) return;
    e.preventDefault();
    var all = a.getAttribute('data-allunits') === 'all';
    var ins = a.closest('form').querySelectorAll('input.su-in');
    for (var i = 0; i < ins.length; i++) {
      if (ins[i].disabled) continue;
      ins[i].value = all ? ins[i].getAttribute('max') : '';
    }
    ins.length && ins[0].dispatchEvent(new Event('input', { bubbles: true }));
  });

  // Marketplace: count the merchants needed and keep each "(max)" within what the free merchants can still carry.
  var mktForm = document.getElementById('sendform');
  if (mktForm && mktForm.hasAttribute('data-cap')) {
    var mCap = Number(mktForm.getAttribute('data-cap')) || 1;
    var mFree = Number(mktForm.getAttribute('data-free')) || 0;
    var mLinks = mktForm.querySelectorAll('[data-fill][data-stock]');
    var recount = function () {
      var vals = {}, sum = 0;
      for (var i = 0; i < mLinks.length; i++) {
        var id = mLinks[i].getAttribute('data-fill');
        var inp = document.getElementById(id);
        var v = inp ? Math.max(0, Math.floor(Number(inp.value) || 0)) : 0;
        vals[id] = v; sum += v;
      }
      var need = Math.ceil(sum / mCap);
      var needEl = document.getElementById('merch-need');
      if (needEl) { needEl.textContent = need; needEl.className = need > mFree ? 'bad' : ''; }
      var leftEl = document.getElementById('merch-left');
      if (leftEl) leftEl.textContent = Math.max(0, mFree * mCap - sum).toLocaleString('en-US');
      for (var j = 0; j < mLinks.length; j++) {
        var a = mLinks[j], key = a.getAttribute('data-fill');
        var room = mFree * mCap - (sum - vals[key]);
        var max = Math.max(0, Math.min(Number(a.getAttribute('data-stock')) || 0, room));
        a.setAttribute('data-value', max);
        a.textContent = '(max ' + max.toLocaleString('en-US') + ')';
      }
    };
    mktForm.addEventListener('input', recount);
    mktForm.addEventListener('click', function () { setTimeout(recount, 0); });
    recount();
  }

  // Rally Point movement tabs: filter rows without reloading.
  var mvBox = document.getElementById('movements');
  if (mvBox && mvBox.classList.contains('mvbox')) {
    mvBox.addEventListener('click', function (e) {
      var tabLink = e.target.closest ? e.target.closest('[data-tab]') : null;
      if (!tabLink) return;
      e.preventDefault();
      var want = tabLink.getAttribute('data-tab');
      var mvTabs = mvBox.querySelectorAll('[data-tab]');
      for (var i = 0; i < mvTabs.length; i++) mvTabs[i].classList.toggle('on', mvTabs[i] === tabLink);
      var mvRows = mvBox.querySelectorAll('tr[data-dir]');
      for (var j = 0; j < mvRows.length; j++) mvRows[j].hidden = want !== 'all' && mvRows[j].getAttribute('data-dir') !== want;
      mvBox.querySelector('.mvscroll').scrollTop = 0;
    });
  }

  // Lists (reports, messages): "select all" box ticks every row checkbox in its form.
  document.addEventListener('change', function (e) {
    var all = e.target;
    if (!all.hasAttribute || !all.hasAttribute('data-checkall')) return;
    var boxes = all.form ? all.form.querySelectorAll('input[type=checkbox][name=ids]') : [];
    for (var i = 0; i < boxes.length; i++) boxes[i].checked = all.checked;
  });
  // Buttons with data-confirm ask first (e.g. "Delete all").
  document.addEventListener('click', function (e) {
    var btn = e.target.closest ? e.target.closest('[data-confirm]') : null;
    if (btn && !window.confirm(btn.getAttribute('data-confirm'))) e.preventDefault();
  });

  // Combat simulator: results update as you type (the form still works as a plain GET).
  var simForm = document.getElementById('simform');
  var simOut = document.getElementById('simresult');
  if (simForm && simOut && window.fetch && window.URLSearchParams) {
    var simTimer = null;
    var simSeq = 0;
    var simRun = function () {
      var params = new URLSearchParams(new FormData(simForm));
      var url = '/simulator?' + params.toString();
      var mine = ++simSeq;
      simOut.classList.add('busy');
      fetch(url + '&partial=1', { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.text() : Promise.reject(r.status); })
        .then(function (htmlText) {
          if (mine !== simSeq) return;
          simOut.innerHTML = htmlText;
          simOut.classList.remove('busy');
          if (window.history && history.replaceState) history.replaceState(null, '', url);
        })
        .catch(function () { simOut.classList.remove('busy'); });
    };
    simForm.addEventListener('input', function () {
      clearTimeout(simTimer);
      simTimer = setTimeout(simRun, 250);
    });
    // Tribe, mode or target changes redraw the unit columns: reload the whole page.
    simForm.addEventListener('change', function (e) {
      var t = e.target;
      if (t.classList.contains('simtribe') || t.name === 'oasis') simForm.submit();
      else if (t.type === 'radio' || t.tagName === 'SELECT') { clearTimeout(simTimer); simRun(); }
    });
    simForm.addEventListener('submit', function (e) { e.preventDefault(); clearTimeout(simTimer); simRun(); });
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
