/*!
 * HomiShaper — Persian/Arabic text shaper for engines without RTL & joining support.
 * Pure JS, zero dependencies. Works in Node (CommonJS) and in the browser (window.HomiShaper).
 *
 * Pipeline:  wrap (logical order) -> shape (joined presentation forms) -> reorder (visual LTR order)
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HomiShaper = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // base code point -> [isolated, final, initial, medial]  (initial/medial = 0 for right-joining letters)
  var T = {
    0x0621: [0xFE80, 0, 0, 0],
    0x0622: [0xFE81, 0xFE82, 0, 0],
    0x0623: [0xFE83, 0xFE84, 0, 0],
    0x0624: [0xFE85, 0xFE86, 0, 0],
    0x0625: [0xFE87, 0xFE88, 0, 0],
    0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C],
    0x0627: [0xFE8D, 0xFE8E, 0, 0],
    0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92],
    0x0629: [0xFE93, 0xFE94, 0, 0],
    0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98],
    0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C],
    0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0],
    0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4],
    0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8],
    0x062F: [0xFEA9, 0xFEAA, 0, 0],
    0x0630: [0xFEAB, 0xFEAC, 0, 0],
    0x0631: [0xFEAD, 0xFEAE, 0, 0],
    0x0632: [0xFEAF, 0xFEB0, 0, 0],
    0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4],
    0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8],
    0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC],
    0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0],
    0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4],
    0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8],
    0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC],
    0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0],
    0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4],
    0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8],
    0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC],
    0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0],
    0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4],
    0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8],
    0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC],
    0x0648: [0xFEED, 0xFEEE, 0, 0],
    0x0649: [0xFEEF, 0xFEF0, 0, 0],
    0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4],
    // Persian extras
    0x067E: [0xFB56, 0xFB57, 0xFB58, 0xFB59], // پ
    0x0686: [0xFB7A, 0xFB7B, 0xFB7C, 0xFB7D], // چ
    0x0698: [0xFB8A, 0xFB8B, 0, 0],           // ژ
    0x06A9: [0xFB8E, 0xFB8F, 0xFEDB, 0xFEDC], // ک (initial/medial share the Arabic kaf glyphs)
    0x06AF: [0xFB92, 0xFB93, 0xFB94, 0xFB95], // گ
    0x06CC: [0xFBFC, 0xFBFD, 0xFEF3, 0xFEF4]  // ی (dotless in isolated/final, dotted below in initial/medial)
  };
  // Letters that never join (hamza)
  var NON_JOINING = { 0x0621: 1 };
  // Lam + alef ligatures: alef -> [isolated, final]
  var LAM_ALEF = {
    0x0622: [0xFEF5, 0xFEF6],
    0x0623: [0xFEF7, 0xFEF8],
    0x0625: [0xFEF9, 0xFEFA],
    0x0627: [0xFEFB, 0xFEFC]
  };
  var LAM = 0x0644, TATWEEL = 0x0640, ZWNJ = 0x200C, ZWJ = 0x200D;

  var MIRROR = { '(': ')', ')': '(', '[': ']', ']': '[', '{': '}', '}': '{', '<': '>', '>': '<',
    '«': '»', '»': '«', '‹': '›', '›': '‹' };

  function isMark(c) {
    return (c >= 0x064B && c <= 0x065F) || c === 0x0670 || (c >= 0x0610 && c <= 0x061A) ||
      (c >= 0x06D6 && c <= 0x06DC) || (c >= 0x06DF && c <= 0x06E4) || (c >= 0x06E7 && c <= 0x06E8) ||
      (c >= 0x06EA && c <= 0x06ED) || (c >= 0x0300 && c <= 0x036F);
  }
  function isDiacritic(c) { return isMark(c) && !(c >= 0x0300 && c <= 0x036F); }

  function cps(str) { return Array.from(str, function (ch) { return ch.codePointAt(0); }); }
  function str(arr) { return arr.map(function (c) { return String.fromCodePoint(c); }).join(''); }

  // Does char c connect to the letter after it?
  function joinsNext(c) {
    if (c === ZWJ || c === TATWEEL) return true;
    var e = T[c];
    return !!(e && e[2]);
  }
  // Does char c connect to the letter before it?
  function joinsPrev(c) {
    if (c === ZWJ || c === TATWEEL) return true;
    var e = T[c];
    return !!(e && !NON_JOINING[c]);
  }

  /** Replace Arabic/Persian letters with joined Presentation Forms. Keeps logical order. */
  function shape(text, opts) {
    var cs = cps(text);
    if (opts && opts.stripDiacritics) cs = cs.filter(function (c) { return !isDiacritic(c); });
    var out = [];
    var n = cs.length;
    function prevBase(i) { do { i--; } while (i >= 0 && isMark(cs[i])); return i; }
    function nextBase(i) { do { i++; } while (i < n && isMark(cs[i])); return i; }

    for (var i = 0; i < n; i++) {
      var c = cs[i];
      var e = T[c];
      if (c === ZWNJ || c === ZWJ) continue; // control chars only steer joining
      if (!e) { out.push(c); continue; }

      var p = prevBase(i);
      var joinPrev = p >= 0 && joinsNext(cs[p]) && !NON_JOINING[c];

      // lam + alef ligature (only directly adjacent)
      if (c === LAM && i + 1 < n && LAM_ALEF[cs[i + 1]]) {
        out.push(LAM_ALEF[cs[i + 1]][joinPrev ? 1 : 0]);
        i++;
        continue;
      }

      var q = nextBase(i);
      var joinNext = !!e[2] && q < n && joinsPrev(cs[q]);
      var form = joinPrev ? (joinNext ? 3 : 1) : (joinNext ? 2 : 0);
      out.push(e[form] || e[0]);
    }
    return str(out);
  }

  // ---- bidi (simplified UAX #9, right-to-left paragraph) ----
  var RE_LETTER = /[\p{L}\p{N}\p{M}]/u;
  var RE_EMOJI = /\p{Extended_Pictographic}/u;

  function charType(ch, c) {
    if ((c >= 0x30 && c <= 0x39) || (c >= 0x660 && c <= 0x669) || (c >= 0x6F0 && c <= 0x6F9)) return 'EN';
    if ((c >= 0x590 && c <= 0x8FF) || (c >= 0xFB1D && c <= 0xFDFF) || (c >= 0xFE70 && c <= 0xFEFF)) {
      if (c === 0x60C || c === 0x61B || c === 0x61F || c === 0x66A || c === 0x66B || c === 0x66C || c === 0x6D4) return 'N';
      return 'R';
    }
    if (RE_EMOJI.test(ch)) return 'L';
    if (RE_LETTER.test(ch)) return 'L';
    return 'N';
  }

  /** Reorder a (shaped) single line into visual left-to-right order. */
  function reorder(text) {
    // clusters: base char + following combining marks stay together
    var cl = [];
    Array.from(text).forEach(function (ch) {
      var c = ch.codePointAt(0);
      if (isMark(c) && cl.length) cl[cl.length - 1].s += ch;
      else cl.push({ s: ch, c: c, t: charType(ch, c) });
    });
    var n = cl.length, i, j;

    // W4: single separator between two numbers joins the number;  W5: terminators next to numbers
    var CS = ',.:/،٫٬', ES = '+-', ET = '#$%°٪£€';
    for (i = 1; i < n - 1; i++) {
      if (cl[i].t === 'N' && cl[i - 1].t === 'EN' && cl[i + 1].t === 'EN' &&
        (CS.indexOf(cl[i].s) >= 0 || ES.indexOf(cl[i].s) >= 0)) cl[i].t = 'EN';
    }
    for (i = 0; i < n; i++) {
      if (cl[i].t === 'N' && ET.indexOf(cl[i].s) >= 0) {
        j = i; while (j < n && cl[j].t === 'N' && ET.indexOf(cl[j].s) >= 0) j++;
        if ((j < n && cl[j].t === 'EN') || (i > 0 && cl[i - 1].t === 'EN')) {
          for (var k = i; k < j; k++) cl[k].t = 'EN';
        }
        i = j - 1;
      }
    }
    // W7: a number after a strong L is L
    var last = 'R';
    for (i = 0; i < n; i++) {
      if (cl[i].t === 'L' || cl[i].t === 'R') last = cl[i].t;
      else if (cl[i].t === 'EN' && last === 'L') cl[i].t = 'L';
    }
    // N1/N2: neutrals take the surrounding direction if both sides agree, else the paragraph (R)
    var dir = function (t) { return t === 'L' ? 'L' : 'R'; };
    for (i = 0; i < n; i++) {
      if (cl[i].t !== 'N') continue;
      j = i; while (j < n && cl[j].t === 'N') j++;
      var a = i > 0 ? dir(cl[i - 1].t) : 'R';
      var b = j < n ? dir(cl[j].t) : 'R';
      var r = a === b ? a : 'R';
      for (var m = i; m < j; m++) cl[m].r = r;
      i = j - 1;
    }
    var lv = cl.map(function (x) {
      var t = x.t === 'N' ? x.r : x.t;
      x.rtl = t === 'R';
      return t === 'R' ? 1 : 2;
    });
    // L2: reverse runs from the highest level down to 1
    var order = cl.map(function (_, idx) { return idx; });
    for (var level = 2; level >= 1; level--) {
      for (i = 0; i < n; i++) {
        if (lv[order[i]] < level) continue;
        j = i; while (j < n && lv[order[j]] >= level) j++;
        var seg = order.slice(i, j).reverse();
        for (k = 0; k < seg.length; k++) order[i + k] = seg[k];
        i = j - 1;
      }
    }
    return order.map(function (idx) {
      var x = cl[idx];
      return x.rtl && MIRROR[x.s] ? MIRROR[x.s] : x.s;
    }).join('');
  }

  // ---- line breaking ----
  function visibleLen(s) {
    var len = 0;
    Array.from(s).forEach(function (ch) {
      var c = ch.codePointAt(0);
      if (c !== ZWNJ && c !== ZWJ && !isMark(c)) len++;
    });
    return len;
  }

  /** Greedy word wrap in logical order. maxLength <= 0 disables wrapping. Returns an array of lines. */
  function wrap(text, maxLength) {
    var res = [];
    String(text).split(/\r\n|\r|\n/).forEach(function (para) {
      if (!(maxLength > 0)) { res.push(para); return; }
      var cur = '';
      para.split(' ').forEach(function (w) {
        while (visibleLen(w) > maxLength) { // hard split of an over-long word
          if (cur) { res.push(cur); cur = ''; }
          var chars = Array.from(w), take = '', cnt = 0;
          while (chars.length && cnt < maxLength) {
            var ch = chars.shift(); take += ch;
            var c = ch.codePointAt(0);
            if (c !== ZWNJ && c !== ZWJ && !isMark(c)) cnt++;
          }
          while (chars.length && isMark(chars[0].codePointAt(0))) take += chars.shift();
          res.push(take);
          w = chars.join('');
        }
        if (cur === '') cur = w;
        else if (visibleLen(cur) + 1 + visibleLen(w) <= maxLength) cur += ' ' + w;
        else { res.push(cur); cur = w; }
      });
      res.push(cur);
    });
    return res;
  }

  /** Full pipeline. Returns an array of display-ready lines (top to bottom). */
  function processLines(text, opts) {
    opts = opts || {};
    return wrap(text, opts.maxLength | 0).map(function (line) {
      return reorder(shape(line, opts));
    });
  }

  /** Full pipeline. Returns the display-ready string, lines joined with "\n". */
  function process(text, opts) { return processLines(text, opts).join('\n'); }

  return { shape: shape, reorder: reorder, wrap: wrap, process: process, processLines: processLines };
});
