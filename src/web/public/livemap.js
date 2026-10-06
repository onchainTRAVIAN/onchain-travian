// Live map: drag to move, wheel/pinch/buttons to zoom, minimap to jump. Tiles come in 21×21 chunks
// from /map/chunk; the world wraps around at the edges. The server-drawn map stays as the fallback.
(function () {
  'use strict';
  var root = document.getElementById('livemap');
  if (!root || !window.fetch || !window.requestAnimationFrame) return;
  var view = document.getElementById('lm-view');
  var layer = document.getElementById('lm-layer');
  var axX = document.getElementById('lm-ax');
  var axY = document.getElementById('lm-ay');
  var canvas = document.getElementById('lm-canvas');
  var miniBox = document.getElementById('lm-mini');
  var loadEl = document.getElementById('lm-load');
  var zoomEl = document.getElementById('lm-zoom');
  var titleEl = document.getElementById('lm-title');
  var infoH = document.getElementById('lm-ih');
  var infoB = document.getElementById('lm-ib');
  var goForm = document.getElementById('lm-go');

  var R = Number(root.getAttribute('data-r')) || 50;
  var N = 2 * R + 1;
  var T = 60; // tile size at 100%
  var ZMIN = 0.35;
  var ZMAX = 2;
  var CH = 21; // chunk width (radius 10)
  var home = { x: Number(root.getAttribute('data-hx')) || 0, y: Number(root.getAttribute('data-hy')) || 0 };
  var fx = Number(root.getAttribute('data-x')) || 0;
  var fy = Number(root.getAttribute('data-y')) || 0;
  var z = 1;
  var W = 0;
  var H = 0;

  var store = function (k, v) {
    try {
      if (v === undefined) return window.localStorage.getItem(k);
      window.localStorage.setItem(k, v);
    } catch (e) {
      /* storage blocked: fine */
    }
    return null;
  };
  var savedZ = Number(store('lm-zoom'));
  if (savedZ >= ZMIN && savedZ <= ZMAX) z = savedZ;

  // Show the live map instead of the static one.
  root.hidden = false;
  var stat = document.querySelector('.mapstatic[data-live]');
  if (stat) stat.hidden = true;

  var wrap = function (v) { return ((((v + R) % N) + N) % N) - R; };
  var key = function (x, y) { return x + '|' + y; };
  var data = {}; // world "x|y" → tile
  var asked = {}; // chunk centre → true
  var els = {}; // logical "lx,ly" → element
  var pending = 0;

  /* ---------- Data ---------- */
  var queue = [];
  var active = 0;
  var pump = function () {
    while (active < 4 && queue.length) {
      var c = queue.shift();
      active++;
      fetch('/map/chunk?x=' + c.x + '&y=' + c.y, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
        .then(function (j) {
          for (var i = 0; i < j.tiles.length; i++) data[key(j.tiles[i].x, j.tiles[i].y)] = j.tiles[i];
          dirty();
        })
        .catch(function () { asked[c.k] = false; })
        .then(function () { active--; pump(); loadEl.hidden = active === 0 && queue.length === 0; });
    }
  };
  var need = function (wx, wy) {
    var cx = wrap(Math.round(wx / CH) * CH);
    var cy = wrap(Math.round(wy / CH) * CH);
    var k = key(cx, cy);
    if (asked[k]) return;
    asked[k] = true;
    queue.push({ x: cx, y: cy, k: k });
    loadEl.hidden = false;
    pump();
  };

  /* ---------- Tiles ---------- */
  var REL = { m: 'yours', a: 'alliance or pact', n: 'Natars', o: 'another player' };
  var fill = function (el, wx, wy) {
    var t = data[key(wx, wy)];
    if (!t) {
      if (el.getAttribute('data-f') !== '0') {
        el.className = 'lt';
        el.firstChild.src = '/static/img/map/flat/' + ((wx * 7 + wy * 13) % 5 === 0 ? 'grass2' : 'grass') + '.svg';
        el.setAttribute('data-f', '0');
      }
      need(wx, wy);
      return;
    }
    if (el.getAttribute('data-f') === '1') return;
    el.setAttribute('data-f', '1');
    el.firstChild.src = '/static/img/map/flat/' + t.i + '.svg';
    el.className = 'lt' + (t.r ? ' rel-' + t.r : '') + (t.k === 'o' ? ' oas' : '');
    while (el.childNodes.length > 1) el.removeChild(el.lastChild);
    drawMarks(el);
  };

  /* ---------- Your troop movements (refreshed every 15 s) ---------- */
  var marks = {};
  var MARK_TITLE = { attack: 'Your attack or raid is heading here', support: 'Your reinforcements are heading here', settle: 'Your settlers are heading here', back: 'Your troops are coming back from here' };
  var drawMarks = function (el) {
    var old = el.querySelector('.lt-m');
    if (old) el.removeChild(old);
    var m = marks[key(el.getAttribute('data-x'), el.getAttribute('data-y'))];
    if (!m || !m.length) return;
    var box = document.createElement('span');
    box.className = 'lt-m';
    for (var i = 0; i < m.length; i++) {
      var s = document.createElement('span');
      s.className = 'mvk ' + m[i];
      s.title = MARK_TITLE[m[i]] || '';
      box.appendChild(s);
    }
    el.appendChild(box);
  };
  var loadMarks = function () {
    fetch('/map/marks', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        marks = j || {};
        for (var k in els) drawMarks(els[k]);
      })
      .catch(function () { /* keep the old marks */ });
  };
  var make = function (lx, ly) {
    var wx = wrap(lx);
    var wy = wrap(ly);
    var a = document.createElement('a');
    a.href = '/map/tile?x=' + wx + '&y=' + wy;
    a.setAttribute('data-x', wx);
    a.setAttribute('data-y', wy);
    a.tabIndex = -1;
    a.draggable = false;
    var img = document.createElement('img');
    img.width = T;
    img.height = T;
    img.alt = '';
    img.draggable = false;
    a.appendChild(img);
    a.style.left = lx * T + 'px';
    a.style.top = -ly * T + 'px';
    fill(a, wx, wy);
    return a;
  };

  /* ---------- Render ---------- */
  var queued = false;
  var dirty = function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  };
  var lastUrl = 0;
  var render = function () {
    queued = false;
    W = view.clientWidth;
    H = view.clientHeight;
    var s = T * z;
    layer.style.transform = 'translate(' + (W / 2 - fx * s - s / 2) + 'px,' + (H / 2 + fy * s - s / 2) + 'px) scale(' + z + ')';
    var x0 = Math.floor(fx - W / 2 / s) - 1;
    var x1 = Math.ceil(fx + W / 2 / s) + 1;
    var y0 = Math.floor(fy - H / 2 / s) - 1;
    var y1 = Math.ceil(fy + H / 2 / s) + 1;
    var seen = {};
    for (var ly = y1; ly >= y0; ly--) {
      for (var lx = x0; lx <= x1; lx++) {
        var k = lx + ',' + ly;
        seen[k] = true;
        var el = els[k];
        if (!el) {
          el = make(lx, ly);
          els[k] = el;
          layer.appendChild(el);
        } else if (el.getAttribute('data-f') !== '1') fill(el, wrap(lx), wrap(ly));
      }
    }
    for (var k2 in els) {
      if (!seen[k2]) {
        layer.removeChild(els[k2]);
        delete els[k2];
      }
    }
    axes(s, x0, x1, y0, y1);
    drawMini();
    var cx = wrap(Math.round(fx));
    var cy = wrap(Math.round(fy));
    zoomEl.textContent = Math.round(z * 100) + '%';
    if (titleEl) titleEl.textContent = '(' + cx + '|' + cy + ')';
    // Keep the address up to date (after moving stops), so reload and back return here.
    clearTimeout(lastUrl);
    lastUrl = setTimeout(function () {
      if (window.history && history.replaceState) history.replaceState(null, '', '/map?x=' + cx + '&y=' + cy);
    }, 250);
  };

  // Coordinate rulers; spans are positioned through the CSSOM (allowed by the CSP).
  var axes = function (s, x0, x1, y0, y1) {
    var every = s >= 40 ? 1 : s >= 22 ? 2 : 5;
    rebuild(axX, x0, x1, every, function (v, el) { el.style.left = W / 2 + (v - fx) * s + 'px'; el.textContent = wrap(v); });
    rebuild(axY, y0, y1, every, function (v, el) { el.style.top = H / 2 + (fy - v) * s + 'px'; el.textContent = wrap(v); });
  };
  var rebuild = function (box, a, b, every, place) {
    var i = 0;
    for (var v = a; v <= b; v++) {
      if (wrap(v) % every) continue;
      var el = box.children[i] || box.appendChild(document.createElement('span'));
      place(v, el);
      i++;
    }
    while (box.children.length > i) box.removeChild(box.lastChild);
  };

  /* ---------- Minimap ---------- */
  var ctx2 = canvas.getContext && canvas.getContext('2d');
  var miniImg = null;
  var CW = canvas.width;
  var k = CW / N;
  // '.' empty, '~' oasis, m yours, a alliance/pacts, n Natars, o other players.
  var COLORS = { '.': [196, 222, 140], '~': [62, 128, 52], m: [255, 140, 0], a: [40, 110, 220], n: [128, 50, 160], o: [200, 40, 30] };
  var loadMini = function () {
    fetch('/map/mini', { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (j) {
        var off = document.createElement('canvas');
        off.width = N;
        off.height = N;
        var c = off.getContext('2d');
        var img = c.createImageData(N, N);
        for (var row = 0; row < N; row++) {
          var line = j.rows[row] || '';
          for (var col = 0; col < N; col++) {
            var ch = line.charAt(col);
            var rgb = COLORS[ch] || COLORS['.'];
            var p = (row * N + col) * 4;
            img.data[p] = rgb[0];
            img.data[p + 1] = rgb[1];
            img.data[p + 2] = rgb[2];
            img.data[p + 3] = 255;
          }
        }
        c.putImageData(img, 0, 0);
        miniImg = off;
        dirty();
      })
      .catch(function () { /* the minimap stays empty */ });
  };
  var drawMini = function () {
    if (!ctx2 || miniBox.hidden) return;
    ctx2.imageSmoothingEnabled = false;
    ctx2.clearRect(0, 0, CW, CW);
    if (miniImg) ctx2.drawImage(miniImg, 0, 0, CW, CW);
    var s = T * z;
    var w = (W / s) * k;
    var h = (H / s) * k;
    var cx = (wrap(fx) + R + 0.5) * k;
    var cy = (R - wrap(fy) + 0.5) * k;
    ctx2.strokeStyle = '#fff';
    ctx2.lineWidth = 1.5;
    for (var dx = -1; dx <= 1; dx++) for (var dy = -1; dy <= 1; dy++) ctx2.strokeRect(cx - w / 2 + dx * CW, cy - h / 2 + dy * CW, w, h);
    ctx2.fillStyle = '#ff8000';
    ctx2.fillRect((home.x + R) * k - 1, (R - home.y) * k - 1, Math.max(3, k + 1), Math.max(3, k + 1));
  };
  var miniJump = function (e) {
    var r = canvas.getBoundingClientRect();
    var wx = Math.floor(((e.clientX - r.left) / r.width) * N) - R;
    var wy = R - Math.floor(((e.clientY - r.top) / r.height) * N);
    // Move the shortest way round the world.
    fx += ((((wx - wrap(fx)) % N) + N + R) % N) - R;
    fy += ((((wy - wrap(fy)) % N) + N + R) % N) - R;
    dirty();
  };
  var miniDown = false;
  canvas.addEventListener('pointerdown', function (e) {
    e.stopPropagation();
    miniDown = true;
    canvas.setPointerCapture(e.pointerId);
    miniJump(e);
  });
  canvas.addEventListener('pointermove', function (e) { if (miniDown) miniJump(e); });
  canvas.addEventListener('pointerup', function () { miniDown = false; });

  /* ---------- Moving and zooming ---------- */
  var anim = null;
  var glide = function (tx, ty, tz) {
    var sx = fx;
    var sy = fy;
    var sz = z;
    var t0 = performance.now();
    if (anim) cancelAnimationFrame(anim);
    var step = function (now) {
      var p = Math.min(1, (now - t0) / 260);
      var e = 1 - Math.pow(1 - p, 3);
      fx = sx + (tx - sx) * e;
      fy = sy + (ty - sy) * e;
      z = sz + ((tz === undefined ? sz : tz) - sz) * e;
      render();
      anim = p < 1 ? requestAnimationFrame(step) : null;
      if (!anim) store('lm-zoom', String(z));
    };
    anim = requestAnimationFrame(step);
  };
  var nearest = function (wx, wy) {
    return { x: fx + ((((wx - wrap(fx)) % N) + N + R) % N) - R, y: fy + ((((wy - wrap(fy)) % N) + N + R) % N) - R };
  };
  var zoomAt = function (nz, mx, my) {
    nz = Math.max(ZMIN, Math.min(ZMAX, nz));
    var s = T * z;
    var wx = fx + (mx - W / 2) / s;
    var wy = fy - (my - H / 2) / s;
    var s2 = T * nz;
    fx = wx - (mx - W / 2) / s2;
    fy = wy + (my - H / 2) / s2;
    z = nz;
    store('lm-zoom', String(z));
    dirty();
  };

  var pointers = {};
  var dragFrom = null;
  var moved = 0;
  var pinch = null;
  view.addEventListener('pointerdown', function (e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: z };
    }
    dragFrom = { x: e.clientX, y: e.clientY };
    moved = 0;
  });
  view.addEventListener('pointermove', function (e) {
    if (!pointers[e.pointerId]) { hover(e.target); return; }
    pointers[e.pointerId] = { x: e.clientX, y: e.clientY };
    var ids = Object.keys(pointers);
    if (pinch && ids.length === 2) {
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      var r = view.getBoundingClientRect();
      zoomAt((pinch.z * Math.hypot(a.x - b.x, a.y - b.y)) / Math.max(1, pinch.d), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      moved = 99;
      return;
    }
    var dx = e.clientX - dragFrom.x;
    var dy = e.clientY - dragFrom.y;
    dragFrom = { x: e.clientX, y: e.clientY };
    moved += Math.abs(dx) + Math.abs(dy);
    // Capture only once it is a real drag, so a plain click still reaches the field link.
    if (moved > 3 && !view.classList.contains('drag')) {
      view.classList.add('drag');
      try { view.setPointerCapture(e.pointerId); } catch (err) { /* pointer already gone */ }
    }
    var s = T * z;
    fx -= dx / s;
    fy += dy / s;
    dirty();
  });
  var up = function (e) {
    delete pointers[e.pointerId];
    if (Object.keys(pointers).length < 2) pinch = null;
    if (Object.keys(pointers).length === 0) view.classList.remove('drag');
  };
  view.addEventListener('pointerup', up);
  view.addEventListener('pointercancel', up);
  window.addEventListener('pointerup', up);
  view.addEventListener('pointerleave', function () {
    if (hovered) hovered.classList.remove('hov');
    hovered = null;
  });
  // A drag is not a click: only open a field when the map didn't move.
  view.addEventListener('click', function (e) {
    if (moved > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
  view.addEventListener('wheel', function (e) {
    e.preventDefault();
    var r = view.getBoundingClientRect();
    zoomAt(z * (e.deltaY < 0 ? 1.15 : 1 / 1.15), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  view.addEventListener('keydown', function (e) {
    var d = { ArrowUp: [0, 1], ArrowDown: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    if (d) {
      e.preventDefault();
      glide(Math.round(fx) + d[0] * (e.shiftKey ? 5 : 1), Math.round(fy) + d[1] * (e.shiftKey ? 5 : 1));
    } else if (e.key === '+' || e.key === '=') zoomAt(z * 1.25, W / 2, H / 2);
    else if (e.key === '-') zoomAt(z / 1.25, W / 2, H / 2);
    else if (e.key === 'Enter') window.location.href = '/map/tile?x=' + wrap(Math.round(fx)) + '&y=' + wrap(Math.round(fy));
    else if (e.key === 'Escape' && root.classList.contains('full')) toggleFull();
  });

  /* ---------- Details box ---------- */
  var row = function (k2, v) {
    var tr = document.createElement('tr');
    var th = document.createElement('th');
    var td = document.createElement('td');
    th.textContent = k2;
    if (v && v.nodeType) td.appendChild(v);
    else td.textContent = v;
    tr.appendChild(th);
    tr.appendChild(td);
    infoB.appendChild(tr);
  };
  var link = function (href, text) {
    var a = document.createElement('a');
    a.href = href;
    a.textContent = text;
    return a;
  };
  var hovered = null;
  var hover = function (target) {
    var a = target && target.closest ? target.closest('a.lt') : null;
    if (!a || a === hovered) return;
    if (hovered) hovered.classList.remove('hov');
    hovered = a;
    a.classList.add('hov');
    var x = a.getAttribute('data-x');
    var y = a.getAttribute('data-y');
    var t = data[key(x, y)];
    infoH.textContent = 'Details (' + x + '|' + y + ')';
    while (infoB.firstChild) infoB.removeChild(infoB.firstChild);
    if (t && t.k === 'v') {
      row('Village', t.n);
      row('Player', t.o + (t.r ? ' (' + REL[t.r] + ')' : ''));
      row('Population', String(t.p));
    } else row('Field', t ? (t.k === 'o' ? 'Oasis' : 'Abandoned valley') : '…');
    var dx = Math.abs(((((Number(x) - home.x) % N) + N + R) % N) - R);
    var dy = Math.abs(((((Number(y) - home.y) % N) + N + R) % N) - R);
    row('Distance', (Math.round(Math.hypot(dx, dy) * 10) / 10).toString());
    var acts = document.createElement('span');
    acts.appendChild(link('/map/tile?x=' + x + '&y=' + y, 'Open »'));
    acts.appendChild(document.createTextNode(' '));
    if (!t || t.r !== 'm') acts.appendChild(link('/troops/send?x=' + x + '&y=' + y, 'Send troops »'));
    row('', acts);
  };

  /* ---------- Toolbar ---------- */
  var toggleFull = function () {
    root.classList.toggle('full');
    document.body.classList.toggle('lm-noscroll', root.classList.contains('full'));
    dirty();
    view.focus();
  };
  var setMini = function (on) {
    miniBox.hidden = !on;
    var b = root.querySelector('[data-lm=mini]');
    if (b) b.setAttribute('aria-pressed', on ? 'true' : 'false');
    store('lm-mini', on ? '1' : '0');
    dirty();
  };
  setMini(store('lm-mini') !== '0');
  root.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-lm]') : null;
    if (!b) return;
    var act = b.getAttribute('data-lm');
    if (act === 'in') glide(fx, fy, Math.min(ZMAX, z * 1.25));
    else if (act === 'out') glide(fx, fy, Math.max(ZMIN, z / 1.25));
    else if (act === 'home') { var h = nearest(home.x, home.y); glide(h.x, h.y); }
    else if (act === 'mini') setMini(miniBox.hidden);
    else if (act === 'full') toggleFull();
  });
  goForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var x = parseInt(goForm.elements.x.value, 10);
    var y = parseInt(goForm.elements.y.value, 10);
    if (isNaN(x) || isNaN(y)) return;
    var p = nearest(wrap(x), wrap(y));
    glide(p.x, p.y);
    view.focus();
  });
  window.addEventListener('resize', dirty);

  loadMini();
  loadMarks();
  setInterval(function () { if (!document.hidden) loadMarks(); }, 15000);
  render();
})();
