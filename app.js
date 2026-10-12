/* ==========================================================
   RESET · Tótem · lógica
   Todo se simula en el navegador (sin servidor).
   Bloques: 1 configuración · 2 base y datos · 3 navegación · 4 diálogos
            5 reposo · 6 opción 1 (cooldown) · 7 opción 2 (reflejo)
            8 opción 3 (¿qué jugador sos?) · 9 opción 4 (mapa)
            10 opción 5 (ahora y próximo) · 11 ayuda y accesibilidad · 12 inicio
   ========================================================== */
(function () {
  'use strict';

  /* ---------- 1. Configuración ---------- */
  var CFG = {
    W: 1080, H: 1920,            // pantalla lógica del tótem
    IDLE_S: 60,                  // segundos sin tocar hasta volver al reposo
    WARN_S: 10,                  // segundos de aviso antes de reiniciar
    SCAN_MS: 2800,               // cuánto se muestra el lector escaneando
    SCAN_OK_MS: 1000,            // cuánto se muestra "QR leído"
    BREATH_IN_MS: 4000,          // inhalar (más lento que en el wireframe)
    BREATH_OUT_MS: 4000,         // exhalar
    BREATH_CYCLES: 2,            // respiraciones completas para recargar
    COOLDOWN_MS: 60 * 60 * 1000, // cada persona puede recargar una vez por hora
    GAME_S: 10,                  // duración del desafío de la función 2
    OCC_MS: 15000                // la ocupación se actualiza cada 15 segundos
  };
  var NB = ' ';
  var MINUS = '−';

  /* ---------- 2. Base y datos ---------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var A = window.RESETArt;
  var frame = $('#frame'), totem = $('#totem');

  // Almacenamiento con respaldo en memoria si el navegador no deja usar localStorage
  var store = (function () {
    var mem = {};
    return {
      get: function (k, d) {
        try { var v = window.localStorage.getItem(k); if (v !== null) return JSON.parse(v); } catch (e) { /* sigue */ }
        return k in mem ? mem[k] : d;
      },
      set: function (k, v) { mem[k] = v; try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sigue */ } }
    };
  })();

  // Sectores del plano (mismas coordenadas y nombres que el mapa del sitio).
  // base = ocupación típica en %, según la capacidad y la cantidad de actividades de cada sector:
  // The Nexus (3 000 personas en rotación) y The Analog Arcade (cinco actividades) son los más
  // concurridos; la Main Arena depende de los torneos; Spawn Point es de paso; el Hub y la
  // Safe Zone son los más tranquilos.
  var ZONES = [
    { id: 'spawn', name: 'Spawn Point', lbl: 'Spawn Point', lvl: 1, x: 24, y: 56, w: 152, h: 66, base: 38, desc: 'Acreditación e ingreso' },
    { id: 'safe', name: 'The Safe Zone', lbl: 'Safe Zone', lvl: 1, x: 24, y: 134, w: 152, h: 78, base: 20, desc: 'Silencio y descanso de la vista' },
    { id: 'nexus', name: 'The Nexus', lbl: 'The Nexus', lvl: 2, x: 214, y: 50, w: 164, h: 52, base: 80, desc: 'Estaciones de PC y consolas' },
    { id: 'arcade', name: 'The Analog Arcade', lbl: 'Arcade', lvl: 2, x: 214, y: 110, w: 164, h: 34, base: 72, desc: 'Juegos fuera de la pantalla' },
    { id: 'arena', name: 'Main Arena', lbl: 'Main Arena', lvl: 2, x: 214, y: 152, w: 100, h: 60, base: 62, desc: 'Esports en vivo y charlas' },
    { id: 'hub', name: 'The Upgrade Hub', lbl: 'Hub', lvl: 2, x: 322, y: 152, w: 56, h: 60, base: 30, desc: 'Consultas de postura y setup' }
  ];
  var ZBY = {}; ZONES.forEach(function (z) { ZBY[z.id] = z; });
  var LIST_ORDER = ['nexus', 'arcade', 'arena', 'hub', 'spawn', 'safe'];
  var HERE = 'arcade';  // sector donde está el tótem (los tótems de cooldown están en The Analog Arcade)
  var OCC_LBL = ['Baja', 'Media', 'Alta'];
  function occLevel(p) { return p < 40 ? 0 : (p < 70 ? 1 : 2); }
  function lvlTxt(l) { return 'Nivel ' + MINUS + l; }

  // Actividades del evento y el sector donde se hacen · a = afinidad con cada perfil
  // (C competidor · A aliado · E explorador · S estratega · Q equilibrista)
  var ACTS = [
    { id: 'torneos', n: 'Torneos con Tactical Timeouts', z: 'arena', ic: 'trophy', a: { C: 3, S: 1, A: 1 } },
    { id: 'metacast', n: 'El Meta-Cast en vivo', z: 'arena', ic: 'mic', a: { Q: 3, S: 2, E: 1 } },
    { id: 'cooldowns', n: 'The Nexus Cooldowns', z: 'nexus', ic: 'hourglass', a: { Q: 3, S: 1 } },
    { id: 'hardcarry', n: 'Hard Carry Co-Op', z: 'nexus', ic: 'coop', a: { A: 3, S: 1 } },
    { id: 'copa', n: 'Copa Cooperativa Local', z: 'nexus', z2: 'arcade', ic: 'users', a: { A: 3, E: 1, C: 1 } },
    { id: 'streamer', n: 'Beat the Streamer', z: 'arcade', ic: 'swords', a: { C: 2, E: 1, A: 1 } },
    { id: 'freeplay', n: 'Analog Arcade Freeplay', z: 'arcade', ic: 'foosball', a: { E: 2, A: 2, Q: 1 } },
    { id: 'speedrun', n: 'Speedrun Challenge', z: 'arcade', ic: 'stopwatch', a: { C: 3, S: 1 } },
    { id: 'reflex', n: 'Red Bull Reflex Challenge', z: 'arcade', ic: 'lights', a: { C: 2, Q: 1 } },
    { id: 'setup', n: 'Setup Challenge', z: 'hub', ic: 'desk', a: { S: 3, Q: 2 } },
    { id: 'habitos', n: 'Autoevaluación de hábitos digitales', z: 'safe', ic: 'brain', a: { Q: 3, S: 1 } },
    { id: 'loot', n: 'Loot Box Hunt', z: null, where: 'Todo el recinto', ic: 'cube', a: { E: 3 } },
    { id: 'trivia', n: 'Trivia Express', z: null, where: 'Pasillos', ic: 'question', a: { S: 2, E: 1, C: 1 } }
  ];
  var ABY = {}; ACTS.forEach(function (a) { ABY[a.id] = a; });

  var S = { xp: 0, scores: [28, 24, 21, 18, 15], occ: {}, updatedAt: Date.now(), t0: Date.now() };
  ZONES.forEach(function (z) { S.occ[z.id] = Math.round(z.base + (Math.random() * 10 - 5)); });

  function fit() {
    var s = Math.min(window.innerWidth / CFG.W, window.innerHeight / CFG.H);
    frame.style.width = (CFG.W * s) + 'px';
    frame.style.height = (CFG.H * s) + 'px';
    frame.style.marginLeft = (-CFG.W * s / 2) + 'px';
    frame.style.marginTop = (-CFG.H * s / 2) + 'px';
    totem.style.transform = 'scale(' + s + ')';
    var side = (window.innerWidth - CFG.W * s) / 2;
    frame.style.boxShadow = side > 30 ? '' : 'none';
  }
  window.addEventListener('resize', fit);

  function addXp(n) {
    S.xp += n;
    var el = $('#xpVal'), box = $('#xp');
    el.textContent = S.xp;
    box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function mmss(sec) { sec = Math.max(0, Math.round(sec)); return pad(Math.floor(sec / 60)) + ':' + pad(sec % 60); }
  function clock(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + NB + 'h'; }
  function pct(n) { return Math.round(n) + NB + '%'; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- 3. Navegación ---------- */
  var stack = ['home'], cur = 'home';
  var screens = {};   // cada pantalla registra enter(opts), leave(), reset(), busy(), back(), confirmLeave()

  function activate(name, opts) {
    if (screens[cur] && screens[cur].leave) screens[cur].leave();
    cur = name;
    $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s.id === 's-' + name); });
    var sc = $('#s-' + name); if (sc) sc.scrollTop = 0;
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
    $('#navBack').disabled = locked || (cur === 'home');
    $('#navHome').disabled = locked || (cur === 'home');
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
  var idleSec = 0, warnTimer = 0, idleOn = true, attractEl = $('#attract');
  function wake() { attractEl.classList.add('is-off'); idleSec = 0; }
  attractEl.addEventListener('click', wake);
  attractEl.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') wake(); });
  ['pointerdown', 'keydown'].forEach(function (ev) { totem.addEventListener(ev, function () { if (!warnTimer) idleSec = 0; }, true); });

  function sessionReset() {
    clearInterval(warnTimer); warnTimer = 0;
    closeModal();
    Object.keys(screens).forEach(function (k) { if (screens[k].leave) screens[k].leave(); });
    S.xp = 0; $('#xpVal').textContent = '0';
    ['data-large', 'data-contrast'].forEach(function (a) { totem.setAttribute(a, 'off'); });
    S.t0 = Date.now();
    Object.keys(screens).forEach(function (k) { if (screens[k].reset) screens[k].reset(); });
    stack = ['home']; cur = 'home';
    $$('.screen').forEach(function (s) { s.classList.toggle('is-active', s.id === 's-home'); });
    updateNav();
    attractEl.classList.remove('is-off'); idleSec = 0;
  }
  setInterval(function () {
    if (!idleOn || !attractEl.classList.contains('is-off') || warnTimer) return;
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
    var KEY = 'reset_totem_cooldowns';
    var TICKETS = [{ code: 'RST-4K7M', name: 'Sol' }, { code: 'RST-9Q2X', name: 'Nico' }, { code: 'RST-6B8D', name: 'Juli' }];
    var BREATH = CFG.BREATH_IN_MS + CFG.BREATH_OUT_MS, TOTAL = BREATH * CFG.BREATH_CYCLES;
    var st = 'scan', user = '', holding = false, raf = 0, t0 = 0, timers = [], note = '', progress = 0, countT = 0;
    var body = $('#cdBody'), lead = $('#cdLead'), obj = $('#cdObj');

    function clearTimers() { timers.forEach(clearTimeout); timers = []; clearInterval(countT); }
    function nextAllowed(code) { var m = store.get(KEY, {}); return m[code] ? m[code] + CFG.COOLDOWN_MS : 0; }
    function who(code) { var t = TICKETS.filter(function (x) { return x.code === code; })[0]; return t ? t.name : ''; }
    function ease(x) { return (1 - Math.cos(Math.PI * x)) / 2; }

    function render() {
      var h = '';
      obj.hidden = !(st === 'scan' || st === 'scanning' || st === 'ok' || st === 'blocked');
      if (st === 'scan') {
        lead.textContent = 'Escaneá tu QR para empezar';
        h = '<div class="scanbox"><div class="reader"><i class="reader__line"></i>' + A.qr('RESET') + '<span class="reader__msg">Listo para leer</span></div>' +
            '<p class="big">Acercá tu QR al lector</p>' +
            '<div class="tickets">' + TICKETS.map(function (t) {
              return '<button class="card ticket" data-cd="scan" data-code="' + t.code + '" aria-label="Acercar el QR de la entrada de ' + t.name + '">' + A.qr(t.code) + '<b>' + t.code + '</b><span>' + t.name + '</span></button>';
            }).join('') + '</div></div>';
      } else if (st === 'scanning' || st === 'ok') {
        lead.textContent = st === 'ok' ? 'QR leído' : 'Un momento';
        h = '<div class="scanbox"><div class="reader ' + (st === 'ok' ? 'is-ok' : 'is-scanning') + '"><i class="reader__line"></i>' + A.qr(user) +
            '<span class="reader__msg">' + (st === 'ok' ? 'QR leído' : 'Escaneando…') + '</span></div>' +
            '<p class="big">' + (st === 'ok' ? 'Hola, ' + who(user) : 'Escaneando tu QR…') + '</p><p class="cd__code">' + user + '</p></div>';
      } else if (st === 'charge') {
        lead.textContent = 'Hola, ' + who(user) + '. Mantené presionado y respirá al ritmo del círculo';
        h = '<div class="center"><button class="hold" id="cdHold" aria-label="Mantené presionado para recargar">' +
            '<svg viewBox="0 0 300 300" aria-hidden="true"><defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B30FF"/><stop offset=".55" stop-color="#00CFFF"/><stop offset="1" stop-color="#39FF14"/></linearGradient></defs>' +
            '<circle class="ring__bg" cx="150" cy="150" r="130"/><circle class="ring__fg" id="cdRing" cx="150" cy="150" r="130" transform="rotate(-90 150 150)"/></svg>' +
            '<span class="hold__orb" id="cdOrb"></span>' +
            '<span class="hold__txt"><b id="cdPct">0' + NB + '%</b><small id="cdBreath">Mantené presionado</small><em id="cdSec">&nbsp;</em></span></button>' +
            '<div class="alert" id="cdNote"' + (note ? '' : ' hidden') + '>' + note + '</div></div>';
      } else if (st === 'blocked') {
        var next = nextAllowed(user);
        lead.textContent = 'Todavía no podés recargar';
        h = '<div class="center"><div class="check is-wait" aria-hidden="true">' + A.icon('clock', 110) + '</div><p class="big">Hola, ' + who(user) + '. Ya recargaste tu cooldown</p>' +
            '<p class="lead">Podés volver a recargar a las ' + clock(next) + '</p><p class="cd__count" id="cdCount" aria-live="off"></p><p class="cd__code">' + user + '</p></div>' +
            '<button class="btn btn--primary btn--xl" data-go="home">Volver al inicio</button>';
      } else {
        lead.textContent = 'Listo';
        h = '<div class="center"><div class="check" aria-hidden="true">' + A.icon('check', 120) + '</div><p class="big">Cooldown recargado</p><p class="lead">Ya podés volver a jugar, ' + who(user) + '</p>' +
            '<div class="chips"><span class="chip">+10 XP</span><span class="chip chip--cyan">Próxima recarga ' + clock(nextAllowed(user)) + '</span></div></div>' +
            '<button class="btn btn--primary btn--xl" data-go="home">Volver al inicio</button>';
      }
      body.innerHTML = h;
      var hold = $('#cdHold');
      if (hold) {
        hold.addEventListener('pointerdown', function (e) { e.preventDefault(); try { hold.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } start(); });
        ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { hold.addEventListener(ev, release); });
        hold.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        hold.addEventListener('keydown', function (e) { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
        hold.addEventListener('keyup', function (e) { if (e.key === ' ' || e.key === 'Enter') release(); });
      }
      if (st === 'blocked') {
        var upd = function () {
          var left = (nextAllowed(user) - Date.now()) / 1000, c = $('#cdCount');
          if (left <= 0) { clearInterval(countT); st = 'scan'; render(); return; }
          if (c) c.textContent = 'Faltan ' + mmss(left) + ' min';
        };
        upd(); clearInterval(countT); countT = setInterval(upd, 1000);
      }
      updateNav();
    }

    function read(code) {
      user = code; st = 'scanning'; render();
      timers.push(setTimeout(function () {
        st = 'ok'; render();
        timers.push(setTimeout(function () {
          if (nextAllowed(user) > Date.now()) { st = 'blocked'; }
          else { st = 'charge'; progress = 0; note = ''; }
          render();
        }, CFG.SCAN_OK_MS));
      }, CFG.SCAN_MS));
    }
    function start() {
      if (holding || st !== 'charge') return;
      holding = true; note = ''; t0 = performance.now();
      var n = $('#cdNote'); if (n) n.hidden = true;
      $('#cdHold').classList.add('is-holding');
      raf = requestAnimationFrame(tick);
    }
    function tick(now) {
      var el = now - t0;
      progress = Math.min(1, el / TOTAL);
      var ring = $('#cdRing'); if (!ring) return;
      ring.style.strokeDashoffset = 816.8 * (1 - progress);
      $('#cdPct').textContent = Math.round(progress * 100) + NB + '%';
      var pos = el % BREATH, inh = pos < CFG.BREATH_IN_MS, scale, left;
      if (inh) { scale = .72 + .28 * ease(pos / CFG.BREATH_IN_MS); left = CFG.BREATH_IN_MS - pos; }
      else { scale = 1 - .28 * ease((pos - CFG.BREATH_IN_MS) / CFG.BREATH_OUT_MS); left = BREATH - pos; }
      $('#cdOrb').style.transform = 'scale(' + scale.toFixed(3) + ')';
      $('#cdBreath').textContent = inh ? 'Inhalá' : 'Exhalá';
      $('#cdSec').textContent = Math.ceil(left / 1000) + NB + 's';
      if (progress >= 1) {
        holding = false;
        var m = store.get(KEY, {}); m[user] = Date.now(); store.set(KEY, m);
        st = 'done'; addXp(10); render(); return;
      }
      raf = requestAnimationFrame(tick);
    }
    function release() {
      if (!holding) return;
      holding = false; cancelAnimationFrame(raf);
      if (progress < 1) { note = 'Soltaste antes de tiempo. Probá de nuevo'; progress = 0; render(); }
    }
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cd="scan"]'); if (!b || st !== 'scan') return;
      read(b.getAttribute('data-code'));
    });
    function stop() { clearTimers(); cancelAnimationFrame(raf); holding = false; }
    function reset() { stop(); st = 'scan'; user = ''; note = ''; progress = 0; render(); }
    screens.cooldown = {
      enter: reset, leave: stop, reset: reset,
      busy: function () { return st === 'scanning' || st === 'ok'; }
    };
  })();

  /* ---------- 7. Función 2 · Reflejo 10 ---------- */
  (function () {
    var NAMES = ['Zeta', 'Kuro', 'Nimbus', 'Atlas', 'Vega'];
    var st = 'intro', score = 0, left = 0, tm = 0, spawnT = 0, lifeT = 0, cdN = 3, myPos = 0;
    var body = $('#rfBody'), lead = $('#rfLead');

    function rankingHtml(me) {
      var entries = S.scores.map(function (s, i) { return { n: NAMES[i % NAMES.length] + (i >= NAMES.length ? ' ' + (i + 1) : ''), s: s }; });
      if (me !== undefined) entries.push({ n: 'Vos', s: me, me: true });
      entries.sort(function (a, b) { return b.s - a.s || (a.me ? 1 : 0) - (b.me ? 1 : 0); });
      var top = entries.slice(0, 5), pos = entries.map(function (e) { return e.me; }).indexOf(true) + 1;
      myPos = pos;
      var li = top.map(function (e) { return '<li' + (e.me ? ' class="me"' : '') + '><span>' + e.n + '</span><b>' + e.s + '</b></li>'; }).join('');
      if (me !== undefined && pos > 5) li += '<li class="me"><span>Vos · puesto ' + pos + '</span><b>' + me + '</b></li>';
      return '<div class="card rank"><h2>Mejores del día</h2><ol>' + li + '</ol></div>';
    }
    function render() {
      var h = '';
      if (st === 'intro') {
        lead.textContent = 'Tocá las luces que aparecen. Tenés ' + CFG.GAME_S + ' segundos';
        h = rankingHtml() + '<div class="center"><div class="hero-hex" data-hex="lights" data-tone="green"></div><p class="big">Tocá las luces antes de que desaparezcan</p></div>' +
            '<button class="btn btn--primary btn--xl" data-rf="start">Empezar</button>';
      } else if (st === 'count') {
        lead.textContent = 'Prepará el dedo';
        h = '<div class="center" style="min-height:900px"><div class="countdown" id="rfN">' + cdN + '</div></div>';
      } else if (st === 'play') {
        lead.textContent = 'Tocá las luces';
        h = '<div class="hud"><div>Tiempo<b id="rfT">' + left + '</b></div><div>Puntos<b id="rfS">' + score + '</b></div></div><div class="arena" id="rfArena" aria-label="Zona de juego"></div>';
      } else {
        var rk = rankingHtml(score);
        lead.textContent = 'Resultado';
        h = '<div class="center"><p class="big">Tu puntaje</p><div class="score">' + score + '</div><div class="chips"><span class="chip">+' + score + ' XP</span><span class="chip chip--cyan">Puesto ' + myPos + '</span></div></div>' +
            rk + '<div class="row"><button class="btn btn--primary" data-rf="start">Jugar de nuevo</button><button class="btn" data-go="home">Volver al inicio</button></div>';
      }
      body.innerHTML = h;
      A.render(body);
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
      st = 'play'; score = 0; left = CFG.GAME_S; render(); spawn();
      tm = setInterval(function () {
        left--; var t = $('#rfT'); if (t) t.textContent = left;
        if (left <= 0) finish();
      }, 1000);
    }
    function spawn() {
      clearTimeout(spawnT); clearTimeout(lifeT);
      var a = $('#rfArena'); if (!a || st !== 'play') return;
      var old = $('.target', a); if (old) old.remove();
      var w = a.clientWidth, h = a.clientHeight;
      var b = document.createElement('button');
      b.className = 'target'; b.setAttribute('aria-label', 'Luz');
      b.style.left = Math.round(Math.random() * (w - 190 - 16) + 8) + 'px';
      b.style.top = Math.round(Math.random() * (h - 210 - 16) + 8) + 'px';
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault(); if (st !== 'play') return;
        score++; var s = $('#rfS'); if (s) s.textContent = score;
        b.remove(); clearTimeout(lifeT); spawnT = setTimeout(spawn, 90);
      });
      a.appendChild(b);
      lifeT = setTimeout(function () { b.remove(); spawnT = setTimeout(spawn, 90); }, Math.max(520, 1100 - score * 22));
    }
    function finish() {
      clearInterval(tm); clearTimeout(spawnT); clearTimeout(lifeT);
      st = 'result'; addXp(score); render(); S.scores.push(score);
    }
    body.addEventListener('click', function (e) { if (e.target.closest('[data-rf="start"]')) begin(); });
    function stop() { clearInterval(tm); clearTimeout(spawnT); clearTimeout(lifeT); }
    function reset() { stop(); st = 'intro'; S.scores = [28, 24, 21, 18, 15]; render(); }
    screens.reflejo = {
      enter: function () { stop(); st = 'intro'; render(); },
      leave: stop, reset: reset,
      busy: function () { return st === 'count' || st === 'play'; }
    };
  })();

  /* ---------- 8. Función 3 · ¿Qué jugador sos? ---------- */
  // Cada respuesta suma puntos a uno o dos perfiles: C competidor · A aliado · E explorador · S estratega · Q equilibrista
  var PROFILES = {
    C: { n: 'Competidor', ic: 'trophy', tone: 'violet', d: 'Jugás para ganar y superar tu marca. Los desafíos contra reloj y los torneos son tu terreno' },
    A: { n: 'Aliado', ic: 'coop', tone: 'cyan', d: 'Disfrutás más cuando jugás en equipo. Tu fuerte es comunicarte y coordinar con gente que recién conocés' },
    E: { n: 'Explorador', ic: 'compass', tone: 'green', d: 'Te mueve la curiosidad. Probás de todo y te encanta descubrir rincones, pistas y sorpresas' },
    S: { n: 'Estratega', ic: 'brain', tone: 'violet', d: 'Pensás antes de moverte. Te interesa entender cómo jugar mejor y dejar tu setup a punto' },
    Q: { n: 'Equilibrista', ic: 'heart', tone: 'cyan', d: 'Cuidás tu ritmo. Sabés cuándo pausar y buscás que jugar sume a tu bienestar' }
  };
  var PORDER = ['C', 'A', 'E', 'S', 'Q'];
  var QUIZ = [
    { q: 'Entrás al CEC con tu grupo. ¿Qué hacés primero?', o: [
      ['Voy a ver los torneos y a medirme con alguien', { C: 2, S: 1 }],
      ['Armo equipo para jugar juntos', { A: 2, Q: 1 }],
      ['Recorro todo para ver qué hay', { E: 2, A: 1 }],
      ['Busco un lugar tranquilo para ubicarme', { Q: 2, S: 1 }]] },
    { q: 'Perdés una partida. ¿Qué te pasa?', o: [
      ['Quiero la revancha ahora mismo', { C: 2, S: 1 }],
      ['Me río y le pido consejos a mi equipo', { A: 2, Q: 1 }],
      ['Pruebo otra cosa para ver si funciona', { E: 2, S: 1 }],
      ['Respiro, tomo agua y sigo con calma', { Q: 2, S: 1 }]] },
    { q: '¿Qué desafío te da más ganas de probar?', o: [
      ['Uno contra reloj, a toda velocidad', { C: 2, S: 1 }],
      ['Uno donde sólo ganamos si nos hablamos', { A: 2, E: 1 }],
      ['Una búsqueda del tesoro con QR escondidos', { E: 2, C: 1 }],
      ['Mejorar mi setup y mi postura', { S: 2, Q: 1 }]] },
    { q: 'Pasaron 30 minutos y se bloquea tu pantalla. ¿Qué hacés en el cooldown?', o: [
      ['Miro el ranking y planeo la próxima', { C: 2, S: 1 }],
      ['Charlo con quien tenga al lado', { A: 2, E: 1 }],
      ['Camino y miro otros sectores', { E: 2, Q: 1 }],
      ['Estiro, miro lejos y descanso la vista', { Q: 2, S: 1 }]] },
    { q: '¿Qué te gustaría llevarte del evento?', o: [
      ['Un lugar en el podio', { C: 2, E: 1 }],
      ['Amigos nuevos para jugar', { A: 2, E: 1 }],
      ['Ideas para jugar de forma más inteligente', { S: 2, E: 1 }],
      ['Una mejor relación con mi tiempo de juego', { Q: 2, A: 1 }]] }
  ];

  (function () {
    var N = QUIZ.length, i = 0, answers = [], st = 'intro', lock = false;
    var LET = ['A', 'B', 'C', 'D'];
    var body = $('#qzBody'), lead = $('#qzLead'), obj = $('#qzObj');

    function tally() {
      var t = { C: 0, A: 0, E: 0, S: 0, Q: 0 };
      answers.forEach(function (k, qi) { var w = QUIZ[qi].o[k][1]; Object.keys(w).forEach(function (p) { t[p] += w[p]; }); });
      return t;
    }
    // Desempate: gana el perfil que más pesó en la última respuesta; si sigue empatado, el orden fijo
    function pick(t, exclude) {
      var cand = PORDER.filter(function (p) { return p !== exclude; });
      var max = Math.max.apply(null, cand.map(function (p) { return t[p]; }));
      var tied = cand.filter(function (p) { return t[p] === max; });
      for (var qi = answers.length - 1; qi >= 0 && tied.length > 1; qi--) {
        var w = QUIZ[qi].o[answers[qi]][1], best = Math.max.apply(null, tied.map(function (p) { return w[p] || 0; }));
        tied = tied.filter(function (p) { return (w[p] || 0) === best; });
      }
      return tied[0];
    }
    function recommend(t) {
      var scored = ACTS.map(function (a, idx) {
        var sc = 0; Object.keys(a.a).forEach(function (p) { sc += t[p] * a.a[p]; });
        var occ = a.z ? S.occ[a.z] : 50;
        return { a: a, sc: sc, occ: occ, idx: idx };
      }).filter(function (x) { return x.sc > 0; });
      // Más afinidad primero; con igual afinidad, el sector con menos gente
      scored.sort(function (x, y) { return y.sc - x.sc || x.occ - y.occ || x.idx - y.idx; });
      var out = [], per = {};
      scored.forEach(function (x) {
        var key = x.a.z || ('x' + x.a.id);
        if (out.length >= 3 || (per[key] || 0) >= 2) return;
        per[key] = (per[key] || 0) + 1; out.push(x.a);
      });
      return out;
    }
    function bar() { var s = ''; for (var k = 0; k < N; k++) s += '<i class="' + (k <= i ? 'on' : '') + '"></i>'; return '<div class="progress" aria-hidden="true">' + s + '</div>'; }
    function render() {
      var h = '';
      obj.hidden = st !== 'intro';
      if (st === 'intro') {
        lead.textContent = 'Respondé ' + N + ' preguntas y descubrí tu perfil';
        h = '<div class="center"><p class="big">No hay respuestas correctas. Elegí la que más se parezca a vos</p></div>' +
            '<button class="btn btn--primary btn--xl" data-qz="start">Empezar</button>';
      } else if (st === 'q') {
        lead.textContent = 'Pregunta ' + (i + 1) + ' de ' + N;
        h = bar() + '<p class="qtext">' + QUIZ[i].q + '</p><div class="answers">' +
            QUIZ[i].o.map(function (o, k) { return '<button class="btn ans' + (answers[i] === k ? ' is-picked' : '') + '" data-qz="ans" data-k="' + k + '"><span class="letter">' + LET[k] + '</span>' + o[0] + '</button>'; }).join('') + '</div>';
      } else {
        var t = tally(), main = pick(t), sec = pick(t, main), p = PROFILES[main], tot = PORDER.reduce(function (s, k) { return s + t[k]; }, 0);
        var order = PORDER.slice().sort(function (a, b) { return t[b] - t[a] || PORDER.indexOf(a) - PORDER.indexOf(b); });
        var recs = recommend(t);
        lead.textContent = 'Tu resultado';
        h = '<div class="card profile"><div class="profile__ico" data-hex="' + p.ic + '" data-tone="' + p.tone + '"></div><div><p class="lead">Tu perfil</p><h2>' + p.n + '</h2><p>' + p.d + '</p>' +
            (t[sec] > 0 ? '<p style="margin-top:10px">También tenés algo de ' + PROFILES[sec].n.toLowerCase() + '</p>' : '') + '</div></div>' +
            '<div class="card mix"><h3>Tu mezcla de jugador</h3><ul>' + order.map(function (k, ix) {
              var v = Math.round(t[k] / tot * 100);
              return '<li' + (ix === 0 ? ' class="is-top"' : '') + '><span>' + PROFILES[k].n + '</span><div class="bar"><i style="width:' + v + '%"></i></div><b>' + v + NB + '%</b></li>';
            }).join('') + '</ul></div>' +
            '<div class="rec"><h3>Actividades recomendadas para vos</h3>' + recs.map(function (a) {
              var z = a.z ? ZBY[a.z] : null, o = z ? S.occ[z.id] : null;
              var where = z ? z.name + ' · ' + lvlTxt(z.lvl) + ' · Ocupación ' + OCC_LBL[occLevel(o)].toLowerCase() : a.where;
              var btn = z ? '<button class="btn" data-qz="map" data-zone="' + z.id + '">' + (z.id === HERE ? 'Ver en el mapa' : 'Llevarme') + '</button>' : '';
              return '<div class="card rec__item"><div>' + a.n + '<small>' + where + '</small></div>' + btn + '</div>';
            }).join('') + '</div>' +
            '<div class="row"><button class="btn" data-qz="again">Repetir test</button><button class="btn btn--primary" data-go="home">Volver al inicio</button></div>';
      }
      body.innerHTML = h;
      A.render(body);
      updateNav();
    }
    function reset() { st = 'intro'; i = 0; answers = []; lock = false; render(); }
    body.addEventListener('click', function (e) {
      var b = e.target.closest('[data-qz]'); if (!b) return;
      var a = b.getAttribute('data-qz');
      if (a === 'start' || a === 'again') { reset(); st = 'q'; render(); $('#s-quiz').scrollTop = 0; }
      else if (a === 'ans' && !lock) {
        lock = true; answers[i] = +b.getAttribute('data-k'); b.classList.add('is-picked');
        setTimeout(function () {
          lock = false;
          if (i < N - 1) { i++; render(); } else { st = 'result'; addXp(5); render(); }
          $('#s-quiz').scrollTop = 0;
        }, 280);
      } else if (a === 'map') go('mapa', { zone: b.getAttribute('data-zone'), route: b.getAttribute('data-zone') !== HERE });
    });
    screens.quiz = {
      enter: function (o) { if (o && o.back && st === 'result') return; reset(); },
      reset: reset,
      back: function () { if (st === 'q' && i > 0 && !lock) { i--; render(); return true; } return false; },
      confirmLeave: function () { return st === 'q'; }
    };
  })();

  /* ---------- 9. Función 4 · Mapa en vivo ---------- */
  (function () {
    var sel = null, route = false, tick = 0;
    var mapEl = $('#map'), here = [358, 127], STAIRS = [196, 127];
    // Caminos desde el tótem (The Nexus, nivel −2). Los del nivel −1 pasan por las escaleras
    var ROUTES = {
      nexus: { d: 'M358 127V96H300', end: [300, 96] },
      arena: { d: 'M358 127V148H228V172', end: [228, 172] },
      hub: { d: 'M358 127V148H350V164', end: [350, 164] },
      spawn: { d: 'M358 127H196V108H100', end: [100, 108] },
      safe: { d: 'M358 127H196V196H100', end: [100, 196] }
    };

    function build() {
      var s = '<svg viewBox="4 12 392 224" preserveAspectRatio="xMidYMid meet" role="presentation" focusable="false">' +
        '<defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8B30FF"/><stop offset=".55" stop-color="#00CFFF"/><stop offset="1" stop-color="#39FF14"/></linearGradient>' +
        '<radialGradient id="mgl"><stop offset="0" stop-color="#8B30FF" stop-opacity=".55"/><stop offset="1" stop-color="#8B30FF" stop-opacity=".12"/></radialGradient>' +
        '<pattern id="mdiag" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#8B30FF" stroke-opacity=".55" stroke-width="2"/></pattern>' +
        '<pattern id="mgrid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#8B30FF" stroke-opacity=".14"/></pattern></defs>' +
        '<rect x="4" y="12" width="392" height="224" fill="#0C0C18"/><rect x="4" y="12" width="392" height="224" fill="url(#mgrid)"/>' +
        '<path d="' + A.chamfer(12, 24, 176, 204, 12) + '" fill="#08080f" stroke="#2E2E52" stroke-width="1.5"/>' +
        '<path d="' + A.chamfer(204, 24, 184, 204, 12) + '" fill="#08080f" stroke="#2E2E52" stroke-width="1.5"/>' +
        '<text x="24" y="42" class="z-lvl">NIVEL ' + MINUS + '1</text><text x="216" y="42" class="z-lvl">NIVEL ' + MINUS + '2</text>';
      ZONES.forEach(function (z) {
        var wide = z.w > 120 || z.id === 'spawn';
        var nameXY = wide ? 'x="' + (z.x + 12) + '" y="' + (z.y + z.h / 2 + (z.id === 'arcade' ? 1 : 4)) + '"' : 'x="' + (z.x + z.w / 2) + '" y="' + (z.y + z.h / 2 - 3) + '" text-anchor="middle"';
        var pctXY = wide ? 'x="' + (z.x + z.w - (z.id === HERE ? 42 : 12)) + '" y="' + (z.y + z.h / 2 + (z.id === 'arcade' ? 0 : 4)) + '" text-anchor="end"' : 'x="' + (z.x + z.w / 2) + '" y="' + (z.y + z.h / 2 + 13) + '" text-anchor="middle"';
        s += '<g class="zone" data-zone="' + z.id + '" role="button" tabindex="0">' +
          '<path class="z" d="' + A.chamfer(z.x, z.y, z.w, z.h, 8) + '" stroke-width="1.4"/>' +
          '<path class="zd" d="' + A.chamfer(z.x, z.y, z.w, z.h, 8) + '" fill="url(#mdiag)" opacity="0"/>' +
          '<rect class="z-bar" x="' + (z.x + 6) + '" y="' + (z.y + z.h - 7) + '" width="0" height="3" rx="1.5" data-max="' + (z.w - 12) + '"/>' +
          '<text class="z-name" ' + nameXY + '>' + z.lbl + '</text><text class="z-pct" ' + pctXY + '></text>' +
          '<path class="z-tri" d="M0 0l6 -10 6 10z" fill="#39FF14" transform="translate(' + (z.x + z.w - 16) + ' ' + (z.y + 4) + ')" opacity="0"/></g>';
      });
      // Escaleras entre los dos niveles
      s += '<g id="mpStairs" transform="translate(' + STAIRS[0] + ' ' + STAIRS[1] + ')"><polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" fill="#141426" stroke="#00CFFF" stroke-width="1.5"/>' +
        '<g transform="translate(-7 -7) scale(.58)" fill="none" stroke="#EEEEF8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 20h4.5v-4.5h4.5V11H17V6.5h3.5"/></g></g>';
      // Camino
      s += '<g id="mpRt" style="display:none"><path class="z-route-glow" id="mpRtG" d=""/><path class="z-route" id="mpRtP" d=""/><circle id="mpEnd" r="4.5" fill="#050508" stroke="#39FF14" stroke-width="2"/></g>';
      // Estás acá
      s += '<g transform="translate(' + here[0] + ' ' + here[1] + ')"><circle class="z-ping" r="14" fill="none" stroke="#39FF14" stroke-width="1.5"/>' +
        '<polygon points="0,-12 10.4,-6 10.4,6 0,12 -10.4,6 -10.4,-6" fill="#0C0C18" stroke="url(#mg)" stroke-width="2.4"/><path d="M-4 5l4-9 4 9-4-2.4z" fill="#39FF14"/></g>';
      s += '</svg>';
      mapEl.innerHTML = s;
      // Lista de sectores
      $('#mpList').innerHTML = LIST_ORDER.map(function (id) {
        var z = ZBY[id];
        return '<button class="zrow" data-zone="' + id + '" aria-pressed="false"><span>' + z.name + '<small>' + lvlTxt(z.lvl) + (id === HERE ? ' · Estás acá' : '') + '</small></span><span class="occ"></span><span class="meter"><i></i></span></button>';
      }).join('');
    }

    function stepsFor(z) {
      var arr = ['Salí de ' + ZBY[HERE].name];
      if (z.lvl !== ZBY[HERE].lvl) {
        arr.push({ stairs: true, t: 'Tomá las escaleras y ' + (z.lvl < ZBY[HERE].lvl ? 'subí' : 'bajá') + ' al ' + lvlTxt(z.lvl) });
        arr.push('Seguí por el ' + lvlTxt(z.lvl) + ' hasta ' + z.name);
      } else {
        arr.push('Seguí el camino marcado por el ' + lvlTxt(z.lvl));
        arr.push('Llegá a ' + z.name);
      }
      return arr;
    }
    function actsIn(id) { return ACTS.filter(function (a) { return a.z === id || a.z2 === id; }).map(function (a) { return a.n; }); }

    function paint() {
      ZONES.forEach(function (z) {
        var p = S.occ[z.id], o = occLevel(p), g = $('.zone[data-zone="' + z.id + '"]', mapEl);
        g.setAttribute('data-occ', o); g.classList.toggle('is-sel', sel === z.id);
        g.setAttribute('aria-label', z.name + ', ' + lvlTxt(z.lvl) + ', ocupación ' + OCC_LBL[o].toLowerCase() + ', ' + pct(p));
        g.setAttribute('aria-pressed', sel === z.id);
        $('.z-pct', g).textContent = pct(p);
        var bar = $('.z-bar', g); bar.style.width = (p / 100 * +bar.getAttribute('data-max')).toFixed(1) + 'px';
        $('.zd', g).setAttribute('opacity', o === 2 ? '1' : '0');
        $('.z-tri', g).setAttribute('opacity', sel === z.id ? '1' : '0');
        var row = $('.zrow[data-zone="' + z.id + '"]'), occ = $('.occ', row);
        row.setAttribute('data-occ', o); row.setAttribute('aria-pressed', sel === z.id);
        occ.textContent = OCC_LBL[o] + ' · ' + pct(p);
        $('.meter i', row).style.width = p + '%';
      });
      var r = route && sel && ROUTES[sel];
      $('#mpRt').style.display = r ? '' : 'none';
      if (r) { $('#mpRtG').setAttribute('d', r.d); $('#mpRtP').setAttribute('d', r.d); $('#mpEnd').setAttribute('cx', r.end[0]); $('#mpEnd').setAttribute('cy', r.end[1]); }
      $('#mpStairs polygon').setAttribute('stroke', r && ZBY[sel].lvl !== ZBY[HERE].lvl ? '#39FF14' : '#00CFFF');

      var info = $('#mpInfo'), stepsEl = $('#mpSteps');
      if (!sel) {
        info.innerHTML = '<div><h2>Tocá un sector</h2><p>Mirá su ocupación y cómo llegar</p></div>';
        stepsEl.hidden = true;
      } else {
        var z = ZBY[sel], o = occLevel(S.occ[sel]), acts = actsIn(sel), isHere = sel === HERE;
        info.innerHTML = '<div><h2>' + z.name + ' · ' + lvlTxt(z.lvl) + '</h2><p>Ocupación ' + OCC_LBL[o].toLowerCase() + ' · ' + pct(S.occ[sel]) + (isHere ? ' · Estás acá' : '') + '</p>' +
          '<p>' + (acts.length ? acts.join(' · ') : z.desc) + '</p></div>' +
          (isHere ? '' : '<button class="btn ' + (route ? '' : 'btn--primary') + '" data-mp="route">' + (route ? 'Quitar camino' : 'Llevarme') + '</button>');
        if (route && !isHere) {
          stepsEl.hidden = false;
          stepsEl.innerHTML = '<h3>Cómo llegar a ' + z.name + '</h3><ol>' + stepsFor(z).map(function (t, ix) {
            var stairs = typeof t === 'object';
            return '<li' + (stairs ? ' class="is-stairs"' : '') + '><i>' + (stairs ? A.icon('stairs', 32) : (ix + 1)) + '</i><span>' + (stairs ? t.t : t) + '</span></li>';
          }).join('') + '</ol>';
        } else stepsEl.hidden = true;
      }
      upd();
    }
    function upd() { $('#mpUpd').textContent = 'Actualizado hace ' + Math.max(0, Math.round((Date.now() - S.updatedAt) / 1000)) + NB + 's · se actualiza cada ' + CFG.OCC_MS / 1000 + NB + 's'; }
    function choose(id) { if (sel === id) { sel = null; route = false; } else { sel = id; route = false; } paint(); }

    mapEl.addEventListener('click', function (e) { var z = e.target.closest('.zone'); if (z) choose(z.getAttribute('data-zone')); });
    mapEl.addEventListener('keydown', function (e) { var z = e.target.closest('.zone'); if (z && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(z.getAttribute('data-zone')); } });
    $('#mpList').addEventListener('click', function (e) { var r = e.target.closest('.zrow'); if (r) choose(r.getAttribute('data-zone')); });
    $('#mpInfo').addEventListener('click', function (e) { if (e.target.closest('[data-mp="route"]')) { route = !route; paint(); } });

    // Ocupación en vivo: caminata al azar alrededor de lo esperable para cada sector
    function shuffleOcc() {
      ZONES.forEach(function (z) {
        var p = S.occ[z.id];
        p = p + (z.base - p) * 0.25 + (Math.random() * 12 - 6);
        p = Math.max(z.base - 14, Math.min(z.base + 14, p));
        S.occ[z.id] = Math.round(Math.max(3, Math.min(99, p)));
      });
      S.updatedAt = Date.now();
      if (cur === 'mapa') paint();
    }
    setInterval(shuffleOcc, CFG.OCC_MS);
    var tickT = 0;

    screens.mapa = {
      enter: function (o) {
        sel = o && o.zone ? o.zone : null; route = !!(o && o.route);
        paint(); clearInterval(tickT); tickT = setInterval(upd, 1000);
      },
      leave: function () { clearInterval(tickT); },
      reset: function () { sel = null; route = false; paint(); }
    };
    build(); A.render($('#s-mapa')); paint();
  })();

  /* ---------- 10. Función 5 · Ahora y próximo ---------- */
  (function () {
    var ITEMS = [ // start y dur en segundos respecto del inicio de la sesión
      { id: 'torneos', start: -600, dur: 1500 },
      { id: 'hardcarry', start: -300, dur: 900 },
      { id: 'freeplay', start: -120, dur: 1200 },
      { id: 'habitos', start: 60, dur: 1500 },
      { id: 'setup', start: 90, dur: 1800 },
      { id: 'speedrun', start: 600, dur: 1200 },
      { id: 'streamer', start: 900, dur: 1800 },
      { id: 'cooldowns', start: 1200, dur: 1500 },
      { id: 'metacast', start: 1800, dur: 1800 }
    ];
    var body = $('#agBody'), timer = 0, sig = '';
    function nowSec() { return (Date.now() - S.t0) / 1000; }
    function buildSig(now) { return ITEMS.map(function (a) { return now < a.start ? 'n' : (now < a.start + a.dur ? 'a' : 'x'); }).join(''); }
    function where(a) { var z = ZBY[ABY[a.id].z]; return z.name + ' · ' + lvlTxt(z.lvl); }
    function render() {
      var now = nowSec(), act = ITEMS.filter(function (a) { return now >= a.start && now < a.start + a.dur; }),
          nxt = ITEMS.filter(function (a) { return now < a.start; }).sort(function (a, b) { return a.start - b.start; });
      sig = buildSig(now);
      var h = '<h2>Ahora <i>' + act.length + '</i></h2>';
      h += act.length ? act.map(function (a) {
        return '<div class="card act act--now"><div style="flex:1"><h3>' + ABY[a.id].n + '</h3><p>' + where(a) + ' · Termina en <b data-end="' + a.id + '"></b></p><div class="pbar"><i data-bar="' + a.id + '"></i></div></div><button class="btn" data-ag="' + ABY[a.id].z + '">' + (ABY[a.id].z === HERE ? 'Ver en el mapa' : 'Llevarme') + '</button></div>';
      }).join('') : '<p class="note">No hay actividades en curso</p>';
      h += '<h2 style="margin-top:12px">Próximamente <i>' + nxt.length + '</i></h2>';
      h += nxt.length ? nxt.map(function (a) {
        return '<div class="card act"><div><h3>' + ABY[a.id].n + '</h3><p>' + where(a) + ' · Empieza en <b data-st="' + a.id + '"></b></p></div><button class="btn" data-ag="' + ABY[a.id].z + '">' + (ABY[a.id].z === HERE ? 'Ver en el mapa' : 'Llevarme') + '</button></div>';
      }).join('') : '<p class="note">No hay más actividades por hoy</p>';
      body.innerHTML = h; update();
    }
    function update() {
      var now = nowSec();
      if (buildSig(now) !== sig) { render(); return; }
      ITEMS.forEach(function (a) {
        var e = body.querySelector('[data-end="' + a.id + '"]'), s = body.querySelector('[data-st="' + a.id + '"]'), br = body.querySelector('[data-bar="' + a.id + '"]');
        if (e) e.textContent = mmss(a.start + a.dur - now) + NB + 'min';
        if (s) s.textContent = mmss(a.start - now) + NB + 'min';
        if (br) br.style.width = Math.min(100, ((now - a.start) / a.dur) * 100) + '%';
      });
    }
    body.addEventListener('click', function (e) { var b = e.target.closest('[data-ag]'); if (b) { var z = b.getAttribute('data-ag'); go('mapa', { zone: z, route: z !== HERE }); } });
    screens.agenda = {
      enter: function () { render(); clearInterval(timer); timer = setInterval(update, 1000); },
      leave: function () { clearInterval(timer); },
      reset: function () { render(); }
    };
  })();

  /* ---------- 11. Ayuda y accesibilidad ---------- */
  $('#navHelp').addEventListener('click', function () {
    openModal('Ayuda', '<p>Tocá una opción del inicio para empezar. Con «Volver» regresás a la pantalla anterior y con «Inicio», al menú principal</p>', [
      { label: 'Llamar al staff', fn: function () {
          setTimeout(function () { openModal('Aviso enviado', '<p>Una persona del staff va a acercarse a este tótem</p>', [{ label: 'Entendido', primary: true }]); }, 0);
        } },
      { label: 'Cerrar', primary: true }
    ]);
  });
  $('#navA11y').addEventListener('click', function () {
    var defs = [['data-large', 'Texto grande'], ['data-contrast', 'Alto contraste']];
    var body = '<p>Elegí cómo querés ver el tótem</p>' + defs.map(function (d) {
      var on = totem.getAttribute(d[0]) === 'on';
      return '<button class="switch" data-a11y="' + d[0] + '" aria-pressed="' + on + '">' + d[1] + '<span class="pill">' + (on ? 'Activado' : 'Desactivado') + '</span></button>';
    }).join('');
    openModal('Accesibilidad', body, [{ label: 'Listo', primary: true }]);
  });
  $('#mdBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-a11y]'); if (!b) return;
    var a = b.getAttribute('data-a11y'), on = totem.getAttribute(a) !== 'on';
    totem.setAttribute(a, on ? 'on' : 'off');
    b.setAttribute('aria-pressed', on); b.querySelector('.pill').textContent = on ? 'Activado' : 'Desactivado';
  });

  /* ---------- Indicador de desplazamiento ---------- */
  (function () {
    var more = $('#more'), content = $('#content');
    function check() {
      var sc = $('.screen.is-active', content) || $('.screen:not([hidden])', content);
      if (!sc || !more) return;
      var rest = sc.scrollHeight - sc.clientHeight - sc.scrollTop;
      more.hidden = rest < 40;
    }
    content.addEventListener('scroll', check, true);
    setInterval(check, 300);
  })();

  /* ---------- 12. Inicio ---------- */
  screens.home = {};
  A.render(document);
  fit();
  activate('home');
  attractEl.classList.remove('is-off');
})();
