/* =========================================================================
   RESET · Tótem · arte vectorial propio
   Íconos de contorno (trazo de 1,5 px), marco hexagonal, QR dibujado y
   ayudas para el plano. Sin imágenes ni librerías externas.
   ========================================================================= */
(function () {
  'use strict';

  var uid = 0;
  function id(p) { uid += 1; return p + uid; }

  var ICONS = {
    calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    pin: '<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0113 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0112 7.4a4.3 4.3 0 017.5 2.4C19.5 15.4 12 20 12 20z"/>',
    bolt: '<path d="M13 3L5 13.5h6L10 21l8-10.5h-6z"/>',
    hourglass: '<path d="M6.5 3.5h11M6.5 20.5h11M7.5 3.5c0 4 2.5 5.5 4.5 8.5-2 3-4.5 4.5-4.5 8.5M16.5 3.5c0 4-2.5 5.5-4.5 8.5 2 3 4.5 4.5 4.5 8.5"/>',
    users: '<circle cx="9" cy="8.5" r="3"/><path d="M3.5 19.5c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M16.5 14.2c2.6.2 4.5 2 4.5 5"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 01-8 0z"/><path d="M8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8M12 13v4M8.5 20h7M10 17h4"/>',
    mic: '<rect x="9" y="3.5" width="6" height="10" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0013 0M12 18v3M9 21h6"/>',
    controller: '<path d="M7 7.5h10a4 4 0 014 4l.5 4.2a2.6 2.6 0 01-4.5 2L15 15.5H9L7 17.7a2.6 2.6 0 01-4.5-2L3 11.5a4 4 0 014-4z"/><path d="M8 10.5v3M6.5 12h3"/><circle cx="15.5" cy="11" r=".8"/><circle cx="17.5" cy="13" r=".8"/>',
    coop: '<circle cx="9" cy="12" r="5"/><circle cx="15" cy="12" r="5"/>',
    swords: '<path d="M5 5l9 9M5 5v3.5L7.5 11M19 5l-9 9M19 5v3.5L16.5 11M6 18l2.5-2.5M18 18l-2.5-2.5M4.5 19.5L7 17M19.5 19.5L17 17"/>',
    foosball: '<rect x="3.5" y="6.5" width="17" height="11" rx="2"/><path d="M12 6.5v11M8 3.5v6M16 14.5v6"/><circle cx="12" cy="12" r="1.8"/>',
    stopwatch: '<circle cx="12" cy="13.5" r="7"/><path d="M12 13.5V9.5M9.5 3.5h5M12 3.5v3M18.5 7l1.2-1.2"/>',
    lights: '<circle cx="7" cy="8" r="2.4"/><circle cx="17" cy="8" r="2.4"/><circle cx="7" cy="16" r="2.4"/><circle cx="17" cy="16" r="2.4"/>',
    cube: '<path d="M12 3.5l7.5 4.2v8.6L12 20.5l-7.5-4.2V7.7z"/><path d="M4.5 7.7L12 12l7.5-4.3M12 12v8.5"/>',
    desk: '<rect x="4" y="4.5" width="16" height="10" rx="1.6"/><path d="M9 19.5h6M12 14.5v5"/>',
    question: '<circle cx="12" cy="12" r="8.5"/><path d="M9.5 9.5a2.6 2.6 0 115 .9c0 1.7-2.5 2-2.5 3.6M12 17.2v.1"/>',
    brain: '<path d="M9.5 4.5a3 3 0 00-3 3 3 3 0 00-2 2.8 3 3 0 001.2 2.4 3 3 0 00.8 4.3A3 3 0 0012 18V6.5a2 2 0 00-2.5-2zM14.5 4.5a3 3 0 013 3 3 3 0 012 2.8 3 3 0 01-1.2 2.4 3 3 0 01-.8 4.3A3 3 0 0112 18"/>',
    stairs: '<path d="M3.5 20h4.5v-4.5h4.5V11H17V6.5h3.5"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 015.5 4H8M16 4h2.5A1.5 1.5 0 0120 5.5V8M20 16v2.5a1.5 1.5 0 01-1.5 1.5H16M8 20H5.5A1.5 1.5 0 014 18.5V16M4 12h16"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    home: '<path d="M4 11l8-6.5 8 6.5M6 9.5V20h12V9.5M10 20v-5.5h4V20"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    'chevron-down': '<path d="M6 9l6 6 6-6"/>',
      'arrow-left': '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    'arrow-right': '<path d="M5 12h14M13 6l6 6-6 6"/>',
    wind:'<path d="M3.5 9h10a2.5 2.5 0 10-2.5-2.5M3.5 14h14a2.5 2.5 0 11-2.5 2.5M3.5 19h7"/>'
  };

  function icon(name, size) {
    var s = size || 24;
    return '<svg class="ico" viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" ' +
      'stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' +
      (ICONS[name] || ICONS.cube) + '</svg>';
  }

  // Hexágono: marco primario del logotipo
  function hexFrame(name, tone) {
    var g = id('hx');
    var t = tone === 'cyan' ? '#00CFFF' : tone === 'green' ? '#39FF14' : tone === 'violet' ? '#A874FF' : '#EEEEF8';
    return '<svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true" focusable="false">' +
      '<defs><linearGradient id="' + g + '" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#8B30FF"/><stop offset=".55" stop-color="#00CFFF"/><stop offset="1" stop-color="#39FF14"/></linearGradient></defs>' +
      '<polygon points="24,2.5 43.5,13.25 43.5,34.75 24,45.5 4.5,34.75 4.5,13.25" fill="#141426" stroke="url(#' + g + ')" stroke-width="1.8" stroke-linejoin="round"/>' +
      '<g transform="translate(12 12)" color="' + t + '">' + icon(name, 24) + '</g></svg>';
  }

  // QR dibujado a partir del código (determinístico, no es un QR real)
  function qr(code, cls) {
    var n = 21, seed = 0, i, j;
    for (i = 0; i < code.length; i++) seed = (seed * 31 + code.charCodeAt(i)) >>> 0;
    function rnd() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }
    function finder(x, y) {
      return x < 8 && y < 8 || x > n - 9 && y < 8 || x < 8 && y > n - 9;
    }
    function fin(x, y) {
      var cx = x < 8 ? 3 : n - 4, cy = y < 8 ? 3 : n - 4;
      var d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
      return d === 3 || d <= 1;
    }
    var out = '';
    for (j = 0; j < n; j++) for (i = 0; i < n; i++) {
      var on = finder(i, j) ? fin(i, j) : rnd() > .5;
      if (on) out += '<rect x="' + i + '" y="' + j + '" width="1.02" height="1.02"/>';
    }
    return '<svg class="' + (cls || 'qr') + '" viewBox="-2 -2 ' + (n + 4) + ' ' + (n + 4) + '" role="img" aria-label="QR de la entrada ' + code + '">' +
      '<rect x="-2" y="-2" width="' + (n + 4) + '" height="' + (n + 4) + '" fill="#EEEEF8"/><g fill="#050508">' + out + '</g></svg>';
  }

  function chamfer(x, y, w, h, c) {
    return 'M' + (x + c) + ' ' + y + 'H' + (x + w) + 'V' + (y + h - c) + 'L' + (x + w - c) + ' ' + (y + h) + 'H' + x + 'V' + (y + c) + 'Z';
  }

  function render(root) {
    root = root || document;
    Array.prototype.forEach.call(root.querySelectorAll('[data-icon]'), function (el) {
      if (!el.firstChild) el.innerHTML = icon(el.getAttribute('data-icon'), +el.getAttribute('data-size') || 24);
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-hex]'), function (el) {
      if (!el.firstChild) el.innerHTML = hexFrame(el.getAttribute('data-hex'), el.getAttribute('data-tone'));
    });
  }

  window.RESETArt = { icon: icon, hexFrame: hexFrame, qr: qr, chamfer: chamfer, render: render };
  render(document);
})();
