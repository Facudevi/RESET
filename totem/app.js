/* ==========================================================
   Wireframe del tótem · lógica
   Todo se simula en el navegador. Contenido genérico a propósito.
   Bloques: 1 config · 2 base · 3 navegación · 4 diálogos · 5 reposo
            6 función 1 · 7 función 2 · 8 función 4 · 9 función 5
            10 función 6 · 11 accesibilidad y herramientas · 12 inicio
   ========================================================== */
(function () {
  'use strict';

  /* ---------- 1. Configuración (se puede tocar) ---------- */
  var CFG = {
    W: 1080, H: 1920,   // pantalla lógica del tótem
    IDLE_S: 60,         // segundos sin tocar hasta volver al reposo
    WARN_S: 10,         // segundos de aviso antes de reiniciar
    CHARGE_MS: 6000,    // tiempo que hay que mantener presionado en la función 1
    GAME_S: 10,         // duración del desafío de la función 2
    ZONES: ['A', 'B', 'C', 'D', 'E']
  };
  var NB = ' ';

  /* ---------- 2. Base ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var frame = $('#frame'), totem = $('#totem'), tools = $('#tools');
  var S = { xp: 0, scores: [28, 24, 21, 18, 15], occ: { A: 0, B: 1, C: 2, D: 1, E: 0 }, idleOn: true, updatedAt: Date.now(), t0: Date.now() };

  function fit() {
    var s = Math.min(window.innerWidth / CFG.W, window.innerHeight / CFG.H);
    frame.style.width = (CFG.W * s) + 'px';
    frame.style.height = (CFG.H * s) + 'px';
    frame.style.marginLeft = (-CFG.W * s / 2) + 'px';
    frame.style.marginTop = (-CFG.H * s / 2) + 'px';
    totem.style.transform = 'scale(' + s + ')';
    var side = (window.innerWidth - CFG.W * s) / 2;
    tools.classList.toggle('is-on', side > 215);
    frame.style.boxShadow = side > 30 ? '' : 'none';
  }
  window.addEventListener('resize', fit);

  function addXp(n) {
    S.xp += n;
    var el = $('#xpVal'), box = $('#xp');
    el.textContent = S.xp;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  }
  function mmss(sec) {
    sec = Math.max(0, Math.round(sec));
    var m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  }
  function ph(label, cls) { return '<div class="ph ' + (cls || '') + '"><span class="ph__tag">' + label + '</span></div>'; }

  /* ---------- 3. Navegación ---------- */
  var stack = ['home'], cur = 'home';
  var screens = {};   // cada pantalla registra enter(opts), leave(), busy(), back()

  function activate(name, opts) {
    if (screens[cur] && screens[cur].leave) screens[cur].leave();
    cur = name;
    $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s.id === 's-' + name); });
    if (screens[name] && screens[name].enter) screens[name].enter(opts || {});
    updateNav();
  }
  function go(name, opts) {
    if (name === cur && !(opts && opts.force)) return;
    guard(function () {
      if (name === 'home') stack = ['home']; else stack.push(name);
      activate(name, opts);
    });
  }
  function goHome() { if (cur !== 'home') go('home'); }
  function back() {
    var sc = screens[cur];
    if (sc && sc.back && sc.back()) return;
    if (stack.length <= 1) return;
    guard(function () { stack.pop(); activate(stack[stack.length - 1], { back: true }); });
  }
  function guard(fn) {
    var sc = screens[cur];
    if (sc && sc.confirmLeave && sc.confirmLeave()) {
      openModal('¿Querés salir?', '<p>Se pierde el avance de esta pantalla</p>', [
        { label: 'Seguir acá', primary: true },
        { label: 'Salir', fn: fn }
      ]);
    } else fn();
  }
  function updateNav() {
    var locked = !!(screens[cur] && screens[cur].busy && screens[cur].busy());
    var b = $('#navBack'), h = $('#navHome');
    b.disabled = locked || (cur === 'home');
    h.disabled = locked || (cur === 'home');
  }
  $('#navBack').addEventListener('click', back);
  $('#navHome').addEventListener('click', goHome);
  document.addEventListener('click', function (e) {
    var g = e.target.closest('[data-go]');
    if (g) go(g.getAttribute('data-go'));
  });

  /* ---------- 4. Diálogos ---------- */
  var modalOpen = false;
  function openModal(title, bodyHtml, actions, onClose) {
    $('#mdTitle').textContent = title;
    $('#mdBody').innerHTML = bodyHtml;
    var box = $('#mdActions'); box.innerHTML = '';
    (actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn' + (a.primary ? ' btn--primary' : '');
      b.textContent = a.label;
      b.addEventListener('click', function () { if (!a.keep) closeModal(); if (a.fn) a.fn(b); });
      box.appendChild(b);
    });
    $('#modal').hidden = false; modalOpen = true;
    $('#modal').onClose = onClose || null;
    var f = box.querySelector('.btn--primary') || box.querySelector('.btn'); if (f) f.focus();
  }
  function closeModal() {
    var m = $('#modal');
    if (m.hidden) return;
    m.hidden = true; modalOpen = false;
    if (m.onClose) { var f = m.onClose; m.onClose = null; f(); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* ---------- 5. Reposo e inactividad ---------- */
  var idleSec = 0, warnTimer = 0, attractEl = $('#attract');
  function wake() { attractEl.classList.add('is-off'); idleSec = 0; }
  attractEl.addEventListener('click', wake);
  attractEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') wake(); });
  ['pointerdown', 'keydown'].forEach(function (ev) { totem.addEventListener(ev, function () { if (!warnTimer) idleSec = 0; }, true); });

  function sessionReset() {
    clearInterval(warnTimer); warnTimer = 0;
    closeModal();
    Object.keys(screens).forEach(function (k) { if (screens[k].leave) screens[k].leave(); });
    S.xp = 0; $('#xpVal').textContent = '0';
    ['data-large', 'data-contrast', 'data-reach'].forEach(function (a) { totem.setAttribute(a, 'off'); });
    S.t0 = Date.now();
    Object.keys(screens).forEach(function (k) { if (screens[k].reset) screens[k].reset(); });
    stack = ['home']; cur = 'home';
    $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s.id === 's-home'); });
    updateNav();
    attractEl.classList.remove('is-off'); idleSec = 0;
  }
  setInterval(function () {
    if (!S.idleOn || !attractEl.classList.contains('is-off') || warnTimer) return;
    idleSec++;
    if (idleSec < CFG.IDLE_S) return;
    if (cur === 'home' && !modalOpen) { sessionReset(); return; }
    var left = CFG.WARN_S;
    openModal('¿Seguís ahí?', '<p>Por inactividad, el tótem vuelve al inicio en <b id="warnN">' + left + '</b> s</p>', [
      { label: 'Seguir acá', primary: true }
    ], function () { clearInterval(warnTimer); warnTimer = 0; idleSec = 0; });
    warnTimer = setInterval(function () {
      left--;
      var n = $('#warnN'); if (n) n.textContent = left;
      if (left <= 0) sessionReset();
    }, 1000);
  }, 1000);

  /* ---------- 6. Función 1 · Recargá tu cooldown ---------- */
  (function () {
    var st = 'scan', holding = false, raf = 0, t0 = 0, timer = 0, note = '', progress = 0;
    var body = $('#cdBody'), lead = $('#cdLead');

    function render() {
      var h = '';
      if (st === 'scan') {
        lead.textContent = 'Escaneá tu QR para empezar';
        h = '<div class="scanbox"><div class="ph scanbox__frame"><span class="ph__tag">Lector de QR</span><i class="scanline"></i></div><p class="big">Acercá tu QR al lector</p></div>' +
            '<button class="btn btn--primary btn--xl" data-cd="scan">Escanear</button>';
      } else if (st === 'reading') {
        lead.textContent = 'Un momento';
        h = '<div class="center"><div class="spin"></div><p class="big">Leyendo QR…</p></div>';
      } else if (st === 'charge') {
        lead.textContent = 'Mantené presionado hasta completar el círculo';
        h = '<div class="center"><button class="hold" id="cdHold" aria-label="Mantené presionado para recargar">' +
            '<svg viewBox="0 0 300 300" aria-hidden="true"><circle class="ring__bg" cx="150" cy="150" r="130"/><circle class="ring__fg" id="cdRing" cx="150" cy="150" r="130" transform="rotate(-90 150 150)"/></svg>' +
            '<span class="hold__txt"><b id="cdPct">0' + NB + '%</b><small id="cdBreath">Mantené presionado</small></span></button>' +
            '<div class="alert" id="cdNote"' + (note ? '' : ' hidden') + '>' + note + '</div></div>';
      } else {
        lead.textContent = 'Listo';
        h = '<div class="center"><div class="check" aria-hidden="true">✓</div><p class="big">Tiempo de juego recargado</p>' +
            '<div class="chips"><span class="chip">+XX min</span><span class="chip">+10 XP</span></div></div>' +
            '<button class="btn btn--primary btn--xl" data-go="home">Volver al inicio</button>';
      }
      body.innerHTML = h;
      var hold = $('#cdHold');
      if (hold) {
        hold.addEventListener('pointerdown', function (e) { e.preventDefault(); try { hold.setPointerCapture(e.pointerId); } catch (x) {} start(); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { hold.addEventListener(ev, release); });
        hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        hold.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
        hold.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') release(); });
      }
      updateNav();
    }
    function start() {
      if (holding || st !== 'charge') return;
      holding = true; note = ''; t0 = performance.now();
      var n = $('#cdNote'); if (n) n.hidden = true;
      $('#cdHold').classList.add('is-holding');
      raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      progress = Math.min(1, (now - t0) / CFG.CHARGE_MS);
      var ring = $('#cdRing'); if (!ring) return;
      ring.style.strokeDashoffset = 816.8 * (1 - progress);
      $('#cdPct').textContent = Math.round(progress * 100) + NB + '%';
      $('#cdBreath').textContent = Math.floor((now - t0) / 1500) % 2 === 0 ? 'Inhalá' : 'Exhalá';
      if (progress >= 1) { holding = false; st = 'done'; addXp(10); render(); return; }
      raf = requestAnimationFrame(tick);
    }
    function release() {
      if (!holding) return;
      holding = false; cancelAnimationFrame(raf);
      if (progress < 1) {
        note = 'Soltaste antes de tiempo. Probá de nuevo';
        progress = 0; render();
      }
    }
    body.addEventListener('click', function (e) {
      if (!e.target.closest('[data-cd="scan"]')) return;
      st = 'reading'; render();
      timer = setTimeout(function () { st = 'charge'; progress = 0; render(); }, 1300);
    });
    function reset() { clearTimeout(timer); cancelAnimationFrame(raf); holding = false; st = 'scan'; note = ''; progress = 0; render(); }
    screens.cooldown = {
      enter: function () { reset(); },
      leave: function () { clearTimeout(timer); cancelAnimationFrame(raf); holding = false; },
      reset: reset,
      busy: function () { return st === 'reading'; }
    };
  })();

  /* ---------- 7. Función 2 · Reflejo 10 ---------- */
  (function () {
    var st = 'intro', score = 0, misses = 0, left = 0, tm = 0, spawnT = 0, lifeT = 0, cdN = 3, myPos = 0, lastEntries = [];
    var body = $('#rfBody'), lead = $('#rfLead');

    function rankingHtml(me) {
      var entries = S.scores.map(function (s, i) { return { n: 'Jugador ' + (i + 1), s: s }; });
      if (me !== undefined) entries.push({ n: 'Vos', s: me, me: true });
      entries.sort(function (a, b) { return b.s - a.s || (a.me ? 1 : 0) - (b.me ? 1 : 0); });
      var top = entries.slice(0, 5), pos = entries.map(function (e) { return e.me; }).indexOf(true) + 1;
      myPos = pos;
      var li = top.map(function (e) { return '<li' + (e.me ? ' class="me"' : '') + '><span>' + e.n + '</span><b>' + e.s + '</b></li>'; }).join('');
      if (me !== undefined && pos > 5) li += '<li class="me extra" data-pos="' + pos + '"><span>Vos</span><b>' + me + '</b></li>';
      return '<div class="rank"><h2>Mejores del día</h2><ol>' + li + '</ol></div>';
    }
    function render() {
      var h = '';
      if (st === 'intro') {
        lead.textContent = 'Tocá las luces que aparecen. Tenés ' + CFG.GAME_S + ' segundos';
        h = rankingHtml() + '<button class="btn btn--primary btn--xl" data-rf="start">Empezar</button>';
      } else if (st === 'count') {
        lead.textContent = 'Prepará el dedo';
        h = '<div class="center"><div class="countdown" id="rfN">' + cdN + '</div></div>';
      } else if (st === 'play') {
        lead.textContent = '¡Tocá las luces!';
        h = '<div class="hud"><div>Tiempo<b id="rfT">' + left + '</b></div><div>Puntos<b id="rfS">' + score + '</b></div></div><div class="arena" id="rfArena" aria-label="Zona de juego"></div>';
      } else {
        lead.textContent = 'Resultado';
        var rk = rankingHtml(score);
        h = '<div class="center" style="flex:none;gap:12px"><p class="big">Tu puntaje</p><div class="score">' + score + '</div><div class="chips"><span class="chip">+' + score + ' XP</span><span class="chip">Puesto ' + myPos + '</span></div></div>' +
            rk +
            '<div class="row"><button class="btn btn--primary" data-rf="start">Jugar de nuevo</button><button class="btn" data-go="home">Volver al inicio</button></div>';
      }
      body.innerHTML = h;
      updateNav();
    }
    function begin() {
      st = 'count'; cdN = 3; render();
      clearInterval(tm);
      tm = setInterval(function () {
        cdN--;
        if (cdN > 0) { var n = $('#rfN'); if (n) n.textContent = cdN; return; }
        clearInterval(tm); play();
      }, 800);
    }
    function play() {
      st = 'play'; score = 0; misses = 0; left = CFG.GAME_S; render(); spawn();
      tm = setInterval(function () {
        left--; var t = $('#rfT'); if (t) t.textContent = left;
        if (left <= 0) finish();
      }, 1000);
    }
    function spawn() {
      clearTimeout(spawnT); clearTimeout(lifeT);
      var a = $('#rfArena'); if (!a || st !== 'play') return;
      var old = $('.target', a); if (old) old.remove();
      var w = a.clientWidth, h = a.clientHeight, size = 190;
      var b = document.createElement('button');
      b.className = 'target'; b.setAttribute('aria-label', 'Luz');
      b.style.left = Math.round(Math.random() * (w - size - 16) + 8) + 'px';
      b.style.top = Math.round(Math.random() * (h - size - 16) + 8) + 'px';
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); if (st !== 'play') return;
        score++; var s = $('#rfS'); if (s) s.textContent = score;
        b.remove(); clearTimeout(lifeT); spawnT = setTimeout(spawn, 90);
      });
      a.appendChild(b);
      lifeT = setTimeout(function () { misses++; b.remove(); spawnT = setTimeout(spawn, 90); }, Math.max(520, 1100 - score * 22));
    }
    function finish() {
      clearInterval(tm); clearTimeout(spawnT); clearTimeout(lifeT);
      st = 'result';
      addXp(score);
      render();
      S.scores.push(score);
    }
    body.addEventListener('click', function (e) { if (e.target.closest('[data-rf="start"]')) begin(); });
    function stop() { clearInterval(tm); clearTimeout(spawnT); clearTimeout(lifeT); }
    function reset() { stop(); st = 'intro'; S.scores = [28, 24, 21, 18, 15]; render(); }
    screens.reflejo = {
      enter: function () { stop(); st = 'intro'; render(); },
      leave: stop,
      reset: reset,
      busy: function () { return st === 'count' || st === 'play'; }
    };
  })();

  /* ---------- 8. Función 4 · ¿Qué jugador sos? ---------- */
  (function () {
    var N = 5, i = 0, answers = [], st = 'intro', lock = false;
    var LET = ['A', 'B', 'C'];
    var PROFILES = [
      { n: 'Perfil A', d: 'Descripción del perfil. Texto breve que explica cómo juega esta persona', acts: [['Actividad 1', 'A'], ['Actividad 2', 'B'], ['Actividad 3', 'C']] },
      { n: 'Perfil B', d: 'Descripción del perfil. Texto breve que explica cómo juega esta persona', acts: [['Actividad 2', 'B'], ['Actividad 4', 'D'], ['Actividad 5', 'E']] },
      { n: 'Perfil C', d: 'Descripción del perfil. Texto breve que explica cómo juega esta persona', acts: [['Actividad 3', 'C'], ['Actividad 1', 'A'], ['Actividad 5', 'E']] }
    ];
    var body = $('#qzBody'), lead = $('#qzLead');

    function bar() { var s = ''; for (var k = 0; k < N; k++) s += '<i class="' + (k <= i ? 'on' : '') + '"></i>'; return '<div class="progress" aria-hidden="true">' + s + '</div>'; }
    function render() {
      var h = '';
      if (st === 'intro') {
        lead.textContent = 'Respondé ' + N + ' preguntas y descubrí tu perfil';
        h = '<div class="center">' + ph('Imagen / ilustración', '') .replace('class="ph "', 'class="ph " style="width:560px;height:560px"') + '<p class="big">No hay respuestas correctas. Elegí la que más se parezca a vos</p></div>' +
            '<button class="btn btn--primary btn--xl" data-qz="start">Empezar</button>';
      } else if (st === 'q') {
        lead.textContent = 'Pregunta ' + (i + 1) + ' de ' + N;
        h = bar() + '<p class="qtext">Texto de la pregunta ' + (i + 1) + '</p><div class="answers">' +
            LET.map(function (l, k) { return '<button class="btn ans' + (answers[i] === k ? ' is-picked' : '') + '" data-qz="ans" data-k="' + k + '"><span class="letter">' + l + '</span>Opción ' + l + '</button>'; }).join('') + '</div>';
      } else {
        var cnt = [0, 0, 0]; answers.forEach(function (a) { cnt[a]++; });
        var best = cnt.indexOf(Math.max.apply(null, cnt)), p = PROFILES[best];
        lead.textContent = 'Tu resultado';
        h = '<div class="profile">' + ph('Imagen del perfil', '') + '<div><p class="lead">Tu perfil</p><h2>' + p.n + '</h2><p>' + p.d + '</p></div></div>' +
            '<div class="rec"><h3>Actividades recomendadas</h3>' + p.acts.map(function (a) {
              return '<div class="rec__item"><div>' + a[0] + '<small>Zona ' + a[1] + '</small></div><button class="btn" data-qz="map" data-zone="' + a[1] + '">Llevarme</button></div>';
            }).join('') + '</div>' +
            '<div class="row" style="margin-top:auto"><button class="btn" data-qz="again">Repetir test</button><button class="btn btn--primary" data-go="home">Volver al inicio</button></div>';
      }
      body.innerHTML = h;
      updateNav();
    }
    function reset() { st = 'intro'; i = 0; answers = []; lock = false; render(); }
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qz]'); if (!b) return;
      var a = b.getAttribute('data-qz');
      if (a === 'start' || a === 'again') { reset(); st = 'q'; render(); }
      else if (a === 'ans' && !lock) {
        lock = true; answers[i] = +b.getAttribute('data-k'); b.classList.add('is-picked');
        setTimeout(function () {
          lock = false;
          if (i < N - 1) { i++; render(); } else { st = 'result'; addXp(5); render(); }
        }, 280);
      } else if (a === 'map') go('mapa', { zone: b.getAttribute('data-zone'), route: true });
    });
    screens.quiz = {
      enter: function (o) { if (o && o.back && st !== 'intro') render(); else reset(); },
      reset: reset,
      back: function () { if (st === 'q' && i > 0 && !lock) { i--; render(); return true; } return false; },
      confirmLeave: function () { return st === 'q'; }
    };
  })();

  /* ---------- 9. Función 5 · Mapa en vivo ---------- */
  (function () {
    var sel = null, route = false, tick = 0, occTimer = 0;
    var OCC = ['Baja', 'Media', 'Alta'];
    var GEO = { // centros y salida de cada zona (plano de 960 × 860)
      A: 'M480 740 V620 H20 V150 H40', B: 'M480 740 V620 H940 V150 H920',
      C: 'M480 740 V620 H180 V590', D: 'M480 740 V620 H480 V590', E: 'M480 740 V620 H780 V590'
    };
    var DIST = { A: 'XX m', B: 'XX m', C: 'XX m', D: 'XX m', E: 'XX m' };

    function paint() {
      $$('#map .zone').forEach(function (z) {
        var k = z.getAttribute('data-zone'), o = S.occ[k];
        z.setAttribute('data-occ', o);
        z.setAttribute('aria-pressed', sel === k);
        z.setAttribute('aria-label', 'Zona ' + k + ', ocupación ' + OCC[o].toLowerCase());
        z.innerHTML = 'Zona ' + k + '<small>' + OCC[o] + '</small>';
      });
      $('#mpRoute').setAttribute('d', route && sel ? GEO[sel] : '');
      var info = $('#mpInfo');
      if (!sel) {
        info.innerHTML = '<div><h2>Tocá una zona</h2><p>Mirá su ocupación y cómo llegar</p></div>';
      } else {
        info.innerHTML = '<div><h2>Zona ' + sel + ' · Ubicación</h2><p>Ocupación ' + OCC[S.occ[sel]].toLowerCase() + (route ? ' · Ruta marcada · ' + DIST[sel] : '') + '</p></div>' +
          '<button class="btn ' + (route ? '' : 'btn--primary') + '" data-mp="route">' + (route ? 'Quitar ruta' : 'Llevarme') + '</button>';
      }
      $('#mpUpd').textContent = 'Actualizado hace ' + Math.max(0, Math.round((Date.now() - S.updatedAt) / 1000)) + ' s';
    }
    $('#map').addEventListener('click', function (e) {
      var z = e.target.closest('.zone'); if (!z) return;
      var k = z.getAttribute('data-zone');
      if (sel === k) { sel = null; route = false; } else { sel = k; route = false; }
      paint();
    });
    $('#mpInfo').addEventListener('click', function (e) { if (e.target.closest('[data-mp="route"]')) { route = !route; paint(); } });
    function shuffleOcc() { // simula datos en vivo
      var k = CFG.ZONES[Math.floor(Math.random() * CFG.ZONES.length)];
      var d = Math.random() < .5 ? -1 : 1;
      S.occ[k] = Math.min(2, Math.max(0, S.occ[k] + d));
      S.updatedAt = Date.now(); paint();
    }
    screens.mapa = {
      enter: function (o) {
        sel = o && o.zone ? o.zone : null; route = !!(o && o.route);
        paint();
        clearInterval(tick); clearInterval(occTimer);
        tick = setInterval(function () { $('#mpUpd').textContent = 'Actualizado hace ' + Math.max(0, Math.round((Date.now() - S.updatedAt) / 1000)) + ' s'; }, 1000);
        occTimer = setInterval(shuffleOcc, 7000);
      },
      leave: function () { clearInterval(tick); clearInterval(occTimer); },
      reset: function () { sel = null; route = false; S.occ = { A: 0, B: 1, C: 2, D: 1, E: 0 }; S.updatedAt = Date.now(); paint(); }
    };
    paint();
  })();

  /* ---------- 10. Función 6 · Ahora y próximo ---------- */
  (function () {
    var ITEMS = [ // start y dur en segundos respecto del inicio de la sesión
      { id: 1, n: 'Actividad 1', z: 'A', start: -600, dur: 1500 },
      { id: 2, n: 'Actividad 2', z: 'C', start: -300, dur: 900 },
      { id: 3, n: 'Actividad 3', z: 'B', start: 90, dur: 1800 },
      { id: 4, n: 'Actividad 4', z: 'E', start: 900, dur: 1800 },
      { id: 5, n: 'Actividad 5', z: 'D', start: 1800, dur: 1800 }
    ];
    var body = $('#agBody'), timer = 0, sig = '';
    function nowSec() { return (Date.now() - S.t0) / 1000; }
    function buildSig(now) { return ITEMS.map(function (a) { return now < a.start ? 'n' : (now < a.start + a.dur ? 'a' : 'x'); }).join(''); }
    function render() {
      var now = nowSec(), act = ITEMS.filter(function (a) { return now >= a.start && now < a.start + a.dur; }),
          nxt = ITEMS.filter(function (a) { return now < a.start; }).sort(function (a, b) { return a.start - b.start; });
      sig = buildSig(now);
      var h = '<h2>Ahora <i>' + act.length + '</i></h2>';
      h += act.length ? act.map(function (a) {
        return '<div class="act act--now"><div style="flex:1"><h3>' + a.n + '</h3><p>Zona ' + a.z + ' · Termina en <b data-end="' + a.id + '"></b></p><div class="pbar"><i data-bar="' + a.id + '"></i></div></div><button class="btn" data-ag="' + a.z + '">Llevarme</button></div>';
      }).join('') : '<p class="note">No hay actividades en curso</p>';
      h += '<h2 style="margin-top:12px">Próximamente <i>' + nxt.length + '</i></h2>';
      h += nxt.length ? nxt.map(function (a) {
        return '<div class="act"><div><h3>' + a.n + '</h3><p>Zona ' + a.z + ' · Empieza en <b data-st="' + a.id + '"></b></p></div><button class="btn" data-ag="' + a.z + '">Llevarme</button></div>';
      }).join('') : '<p class="note">No hay más actividades por hoy</p>';
      body.innerHTML = h; update();
    }
    function update() {
      var now = nowSec();
      if (buildSig(now) !== sig) { render(); return; }
      ITEMS.forEach(function (a) {
        var e = body.querySelector('[data-end="' + a.id + '"]'), s = body.querySelector('[data-st="' + a.id + '"]'), br = body.querySelector('[data-bar="' + a.id + '"]');
        if (e) e.textContent = mmss(a.start + a.dur - now) + ' min';
        if (s) s.textContent = mmss(a.start - now) + ' min';
        if (br) br.style.width = Math.min(100, ((now - a.start) / a.dur) * 100) + '%';
      });
    }
    body.addEventListener('click', function (e) { var b = e.target.closest('[data-ag]'); if (b) go('mapa', { zone: b.getAttribute('data-ag'), route: true }); });
    screens.agenda = {
      enter: function () { render(); clearInterval(timer); timer = setInterval(update, 1000); },
      leave: function () { clearInterval(timer); },
      reset: function () { render(); }
    };
  })();

  /* ---------- 11. Ayuda, accesibilidad y herramientas ---------- */
  $('#navHelp').addEventListener('click', function () {
    openModal('Ayuda', '<p>Información de ayuda. Tocá una opción de la pantalla de inicio para empezar. Con «Volver» regresás a la pantalla anterior y con «Inicio» al menú principal</p>', [
      { label: 'Llamar al staff', fn: function () {
          setTimeout(function () { openModal('Aviso enviado', '<p>Una persona del staff va a acercarse a este tótem</p>', [{ label: 'Entendido', primary: true }]); }, 0);
        } },
      { label: 'Cerrar', primary: true }
    ]);
  });
  $('#navA11y').addEventListener('click', function () {
    var defs = [['data-large', 'Texto grande'], ['data-contrast', 'Alto contraste'], ['data-reach', 'Pantalla baja']];
    var body = '<p>Elegí cómo querés ver el tótem</p>' + defs.map(function (d) {
      var on = totem.getAttribute(d[0]) === 'on';
      return '<button class="switch" data-a11y="' + d[0] + '" aria-pressed="' + on + '">' + d[1] + '<span class="pill">' + (on ? 'Sí' : 'No') + '</span></button>';
    }).join('');
    openModal('Accesibilidad', body, [{ label: 'Listo', primary: true }]);
  });
  $('#mdBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a11y]'); if (!b) return;
    var a = b.getAttribute('data-a11y'), on = totem.getAttribute(a) !== 'on';
    totem.setAttribute(a, on ? 'on' : 'off');
    b.setAttribute('aria-pressed', on); b.querySelector('.pill').textContent = on ? 'Sí' : 'No';
  });
  $('#tFull').addEventListener('click', function () {
    var d = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen(); else if (d.requestFullscreen) d.requestFullscreen();
  });
  $('#tNums').addEventListener('click', function () {
    var on = totem.getAttribute('data-nums') !== 'on';
    totem.setAttribute('data-nums', on ? 'on' : 'off');
    this.setAttribute('aria-pressed', on); this.textContent = 'Numeración: ' + (on ? 'sí' : 'no');
  });
  $('#tIdle').addEventListener('click', function () {
    S.idleOn = !S.idleOn; idleSec = 0;
    this.setAttribute('aria-pressed', S.idleOn); this.textContent = 'Reposo automático: ' + (S.idleOn ? 'sí' : 'no');
  });
  $('#tReset').addEventListener('click', sessionReset);

  /* ---------- 12. Inicio ---------- */
  screens.home = {};
  window.addEventListener('resize', updateNav);
  fit();
  activate('home');
  attractEl.classList.remove('is-off');
})();
