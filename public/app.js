/* APOLLO/AGC — interactive reconstruction of the Apollo 11 AGC ropes */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const LH = 22;    // px per line
const OVER = 24;  // overscan rows

/* ---------- AGC token classes ---------- */
const OPS = new Set(('CA CAF CS CCS TC TCF TCR INDEX INCR ADS AD SU DV MP MSU DOUBLE SQUARE COM ' +
  'DXCH DCA DCS TS XCH MASK READ WRITE RAND WAN WOR ROR RXOR LXCH BZF BZMF TCAA OVSK XQ ' +
  'EXTEND INHINT RELINT RESUME NOOP NOLOP ' +
  'CALL EXIT GOTO STORE STODL STODT STCALL STOVL BOV BON BOFF RTB SET CLEAR TSLC TSRT ' +
  'VLOAD VXSC VXMU VXV VAD VSU DOT UNIT VSQ VPROJ SWAB MXV MMX NV NORM MAG SIGN ' +
  'SLOAD DLOAD DSU DAD DMP DMPR DDV DADD SR SQRT ABS PDDL PDSU PDVL BVSU BMN BDD').split(/\s+/));
const DIRS = new Set('BANK SETLOC EQUALS ERASE ERASE* CNOP BLOCK COUNT DEC DEC* 2DEC OCT 2OCT CADR 2CADR MEMORY CHECK='
  .split(' '));

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function hlLine(t) {
  if (!t) return '';
  if (/^\s*#/.test(t)) {
    const tr = t.trim();
    if (/^#\s*Page\s+\d+/i.test(tr)) return `<span class="pg">${esc(t)}</span>`;
    if (/^##/.test(tr)) return `<span class="note">${esc(t)}</span>`;
    return `<span class="cmt">${esc(t)}</span>`;
  }
  const hi = t.indexOf('#');
  const code = hi >= 0 ? t.slice(0, hi) : t;
  const cmt = hi >= 0 ? t.slice(hi) : '';
  let out = '';
  let rest = code;
  if (/^\S/.test(code)) {
    const lab = code.match(/^\S+/)[0];
    if (!OPS.has(lab) && !DIRS.has(lab)) {
      out += `<span class="lbl">${esc(lab)}</span>`;
      rest = code.slice(lab.length);
    }
  }
  for (const tok of rest.split(/(\s+)/)) {
    if (!tok) continue;
    if (/^\s+$/.test(tok)) { out += tok; continue; }
    const bare = tok.replace(/^\*+|\*+$/g, '');
    if (OPS.has(tok) || OPS.has(bare)) out += `<span class="op">${esc(tok)}</span>`;
    else if (DIRS.has(tok) || DIRS.has(bare)) out += `<span class="dir">${esc(tok)}</span>`;
    else if (/^-?\d+[BD]?$/i.test(tok) || /^[0-7]{2,6}$/.test(tok)) out += `<span class="num">${esc(tok)}</span>`;
    else out += `<span class="sym">${esc(tok)}</span>`;
  }
  if (cmt) out += `<span class="cmt">${esc(cmt)}</span>`;
  return out;
}

/* ---------- state ---------- */
let meta = null;
let cur = null;
let hlCache = new Map();
const cache = new Map();
let allLoaded = false, allPromise = null;
let suppressHash = false;

const viewer = $('#viewer'), linesEl = $('#lines'), spacer = $('#spacer');

/* ---------- boot splash ---------- */
const BOOT = [
  'APOLLO GUIDANCE COMPUTER — AGC4',
  'WORDS 36864 · CYCLES 1.024MHZ · WTS 11.7US',
  'ROPES: COMANCHE 055 (CM) · LUMINARY 099 (LM)',
  'SELF-CHECK ............. OK',
  'ROPE MEMORY ............ READY',
  'GUIDANCE ............... CLOSED',
  '',
  'THERE IS NO ERROR CODE FOR LANDING WRONG.',
];
let bootDone = false;
(async () => {
  const el = $('#bootlog');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  $('#boot').addEventListener('click', endBoot);
  for (const line of BOOT) {
    if (bootDone) return;
    for (const ch of line) {
      if (bootDone) return;
      el.textContent += ch;
      await sleep(7);
    }
    el.textContent += '\n';
    await sleep(55);
  }
  await sleep(420);
  endBoot();
})();
function endBoot() {
  if (bootDone) return;
  bootDone = true;
  const b = $('#boot');
  b.classList.add('gone');
  setTimeout(() => b.remove(), 700);
}

/* ---------- COMP ACTY lamp ---------- */
let lampT = null;
function compActy() {
  const i = $('#lampComp i');
  i.classList.add('on', 'blink');
  clearTimeout(lampT);
  lampT = setTimeout(() => i.classList.remove('blink'), 240);
}

/* ---------- data ---------- */
async function getFile(id) {
  if (cache.has(id)) return cache.get(id);
  compActy();
  const rec = await fetch(`assets/${id}.json`).then((r) => r.json());
  cache.set(id, rec);
  return rec;
}
function ensureAll() {
  if (allLoaded) return Promise.resolve();
  if (!allPromise) {
    allPromise = (async () => {
      const list = meta.files;
      let done = 0;
      const workers = Array.from({ length: 8 }, async () => {
        while (done < list.length) {
          const f = list[done++];
          await getFile(f.id).catch(() => {});
          if (done % 20 === 0 || done === list.length) {
            $('#pstat').textContent = `LOADING ROPE ${done}/${list.length}`;
          }
        }
      });
      await Promise.all(workers);
      allLoaded = true;
      $('#pstat').textContent = '';
    })();
  }
  return allPromise;
}

/* ---------- tree ---------- */
function buildTree() {
  const tree = $('#tree');
  const secs = [...new Set(meta.files.map((f) => f.section))];
  tree.textContent = '';
  for (const sec of secs) {
    const h = document.createElement('div');
    h.className = 'secHead';
    h.textContent = sec;
    tree.appendChild(h);
    for (const f of meta.files.filter((x) => x.section === sec)) {
      const d = document.createElement('div');
      d.className = 'fi';
      d.dataset.id = f.id;
      d.dataset.name = f.name.toLowerCase();
      d.innerHTML = `${esc(f.name)}<i>${f.count}</i>`;
      d.addEventListener('click', () => {
        openFile(f.id);
        $('#side').classList.remove('open');
      });
      tree.appendChild(d);
    }
  }
  $('#fileFilter').addEventListener('input', (e) => {
    const v = e.target.value.toLowerCase();
    for (const d of tree.querySelectorAll('.fi')) {
      d.style.display = d.dataset.name.includes(v) ? '' : 'none';
    }
  });
}
function markTree() {
  for (const d of document.querySelectorAll('.fi')) {
    d.classList.toggle('on', d.dataset.id === cur.id);
  }
}

/* ---------- viewer ---------- */
let rafPending = false;
function render() {
  if (!cur) return;
  const st = viewer.scrollTop;
  const first = Math.max(0, Math.floor(st / LH) - OVER);
  const last = Math.min(cur.count - 1, Math.ceil((st + viewer.clientHeight) / LH) + OVER);
  let html = '';
  for (let i = first; i <= last; i++) {
    let h = hlCache.get(i);
    if (h === undefined) { h = hlLine(cur.lines[i]); hlCache.set(i, h); }
    html += `<div class="ln" data-i="${i}" style="top:${i * LH}px"><span class="gut">${i + 1}</span><span class="code">${h}</span></div>`;
  }
  linesEl.innerHTML = html;
  const mid = Math.min(cur.count, Math.floor((st + viewer.clientHeight / 2) / LH) + 1);
  $('#dNoun').textContent = String(mid).padStart(3, '0');
  $('#curPos').textContent = `L${mid}/${cur.count}`;
}
viewer.addEventListener('scroll', () => {
  compActy();
  if (!rafPending) {
    rafPending = true;
    requestAnimationFrame(() => { rafPending = false; render(); });
  }
  scheduleHash();
});

async function openFile(id, line, flash) {
  const rec = await getFile(id);
  cur = rec;
  hlCache = new Map();
  spacer.style.height = rec.count * LH + 'px';
  $('#curFile').textContent = rec.name;
  $('#curSub').textContent = `${rec.section} · ${rec.craft}`;
  $('#dProg').textContent = String(rec.prog);
  markTree();
  if (line && line > 1) {
    viewer.scrollTop = Math.max(0, (line - 1) * LH - viewer.clientHeight / 3);
    render();
    if (flash) flashLine(line - 1);
  } else {
    viewer.scrollTop = 0;
    render();
  }
}
function flashLine(i) {
  const row = linesEl.querySelector(`.ln[data-i="${i}"]`);
  if (row) {
    row.classList.add('tgt');
    setTimeout(() => row.classList.remove('tgt'), 2400);
  }
}

/* ---------- hash permalinks ---------- */
let hashT = null;
function scheduleHash() {
  if (suppressHash) return;
  clearTimeout(hashT);
  hashT = setTimeout(() => {
    if (!cur) return;
    const mid = Math.min(cur.count, Math.floor((viewer.scrollTop + viewer.clientHeight / 2) / LH) + 1);
    const want = `#/${cur.id}/${mid}`;
    if (location.hash !== want) {
      suppressHash = true;
      location.hash = want;
      setTimeout(() => { suppressHash = false; }, 0);
    }
  }, 500);
}
function parseHash() {
  const m = location.hash.match(/^#\/([a-z0-9_\-\.]+)(?:\/(\d+))?/i);
  return m ? { id: m[1], line: m[2] ? parseInt(m[2], 10) : 1 } : null;
}

/* ---------- search palette ---------- */
const palette = $('#palette'), q2 = $('#q2');
$('#q').addEventListener('focus', () => { openPalette(); });
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') openPalette(); });
function openPalette() {
  palette.hidden = false;
  q2.value = $('#q').value;
  q2.focus();
  if (q2.value.trim().length >= 2) doSearch();
}
function closePalette() { palette.hidden = true; }

let searchT = null;
q2.addEventListener('input', () => {
  clearTimeout(searchT);
  searchT = setTimeout(doSearch, 130);
});
q2.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePalette();
  if (e.key === 'Enter') {
    const first = $('#presults .ritem');
    if (first) first.click();
  }
});
async function doSearch() {
  const query = q2.value.trim().toLowerCase();
  const res = $('#presults');
  if (query.length < 2) {
    res.innerHTML = '<div class="pempty">type at least 2 characters — first search loads the full rope (~3 MB)</div>';
    $('#pstat').textContent = '';
    return;
  }
  await ensureAll();
  compActy();
  const out = [];
  let total = 0;
  for (const f of meta.files) {
    const rec = cache.get(f.id);
    if (!rec) continue;
    let shown = 0;
    for (let i = 0; i < rec.lines.length && total < 400; i++) {
      const ln = rec.lines[i];
      const low = ln.toLowerCase();
      const at = low.indexOf(query);
      if (at < 0) continue;
      const isLabel = /^\S/.test(ln) && !/^\s*#/.test(ln) && low.match(/^\S+/)[0].includes(query);
      const rank = isLabel ? 0 : (/^\s*#/.test(ln) ? 2 : 1);
      out.push({ rank, f, line: i + 1, text: ln.trim().slice(0, 120), shown });
      total++; shown++;
      if (shown >= 12) break;
    }
  }
  out.sort((a, b) => a.rank - b.rank);
  let html = '', lastFile = null;
  for (const r of out.slice(0, 250)) {
    if (r.f.id !== lastFile) {
      html += `<div class="rgrp">${esc(r.f.section)} · ${esc(r.f.name)}</div>`;
      lastFile = r.f.id;
    }
    html += `<div class="ritem" data-f="${esc(r.f.id)}" data-l="${r.line}"><span class="rl">${esc(r.f.name)} : ${r.line}</span><span class="rt">${esc(r.text)}</span></div>`;
  }
  res.innerHTML = html || '<div class="pempty">no matches in 130,186 lines of rope.</div>';
  $('#pstat').textContent = total ? `${total} hit${total === 1 ? '' : 's'}` : '';
}
$('#presults').addEventListener('click', (e) => {
  const it = e.target.closest('.ritem');
  if (!it) return;
  closePalette();
  openFile(it.dataset.f, parseInt(it.dataset.l, 10), true);
});

/* ---------- tour ---------- */
const STOPS = [
  { f: 'lum-lunar_landing_guidance_equations', l: 850, t: 'P63 — braking phase begins', d: 'About 8,000 feet over Mare Tranquillitatis the computer runs P63: powered descent braking. P63 hands off to P64 (approach), and Armstrong took P66 for the final manual rate-of-descent. This is the P63 display setup — VERB 06 NOUN 63.' },
  { f: 'lum-executive', l: 208, t: 'The famous 1202, in code', d: 'OCT 1202 — the executive-overflow alarm number itself, sitting in the scheduler\'s alarm tables. During the real descent it fired five times; a 26-year-old Jack Garman made the GO call, and the landing continued.' },
  { f: 'lum-assembly_and_operation_information', l: 963, t: 'The alarm table', d: 'The abort-code directory: 1201 executive overflow (no VAC areas), 1202 (no core sets), 1203 waitlist overflow. The alarms that rattled the descent are three quiet lines here — prepared for, not feared.' },
  { f: 'lum-lunar_landing_guidance_equations', l: 179, t: '"TEMPORARY, I HOPE HOPE HOPE"', d: 'A workaround comment in the landing guidance equations that shipped to the Moon anyway. Margins were thin, schedules were real, and the engineers\' hopes are preserved in the rope for eternity.' },
  { f: 'lum-lunar_landing_guidance_equations', l: 130, t: 'The philosophy of Guildenstern', d: 'The throttle logic is named for Rosencrantz and Guildenstern. The MIT Instrumentation Lab engineers hid Hamlet references inside the code that landed humans on the Moon.' },
  { f: 'lum-burn_baby_burn--master_ignition_routine', l: 31, t: 'BURN, BABY, BURN — master ignition', d: 'The LM\'s master ignition routine. The ## notes preserve Don Eyles and Peter Adler\'s story of the name — and the listing print date two days before launch: 16:27, JULY 14, 1969.' },
  { f: 'lum-interpreter', l: 1, t: 'The interpreter', d: 'A virtual machine inside the flight computer: the interpreter ran a compact higher-level language of double-precision operations so the guidance equations could fit — and run — in 36,864 words of rope memory.' },
  { f: 'lum-pinball_game_buttons_and_lights', l: 1, t: 'Pinball — buttons and lights', d: 'Everything the astronauts touched: DSKY keyboard, displays, and lamps. The crews called flying the DSKY "playing pinball" — and the name stuck in the source itself.' },
];
let tourIdx = -1;
const tourCard = $('#tourCard');
function showTour(i) {
  tourIdx = (i + STOPS.length) % STOPS.length;
  const s = STOPS[tourIdx];
  $('#tourStep').textContent = `TOUR ${tourIdx + 1}/${STOPS.length}`;
  $('#tourTitle').textContent = s.t;
  $('#tourBlurb').textContent = s.d;
  tourCard.hidden = false;
  openFile(s.f, s.l, true);
}
$('#tourBtn').addEventListener('click', () => showTour(0));
$('#tourNext').addEventListener('click', () => showTour(tourIdx + 1));
$('#tourPrev').addEventListener('click', () => showTour(tourIdx - 1));
$('#tourClose').addEventListener('click', () => { tourCard.hidden = true; tourIdx = -1; });

/* ---------- easter eggs ---------- */
let kbuf = '';
addEventListener('keydown', (e) => {
  if (e.key.length === 1 && /[0-9]/.test(e.key)) {
    kbuf = (kbuf + e.key).slice(-4);
    if (kbuf === '1202') showAlarm('1202', 'EXECUTIVE OVERFLOW — NO CORE SETS', 'the eagle did not abort. houston said GO. (garman / bales · 20 jul 1969)');
    else if (kbuf === '1203') showAlarm('1203', 'WAITLIST OVERFLOW — TOO MANY TASKS', 'also survived in flight. keep flying.');
    else if (kbuf === '1969') toast('THE EAGLE HAS LANDED · 20 JUL 1969 · 20:17:40 UTC');
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape') { closePalette(); if (!$('#alarm').hidden) hideAlarm(); tourCard.hidden = true; }
  if (tourIdx >= 0 && !tourCard.hidden) {
    if (e.key === 'ArrowRight') showTour(tourIdx + 1);
    if (e.key === 'ArrowLeft') showTour(tourIdx - 1);
  }
});
let alarmT = null;
function showAlarm(code, msg, sub) {
  $('#alarmCode').textContent = code;
  $('#alarmMsg').innerHTML = `${esc(msg)}<small>${esc(sub)}</small>`;
  $('#alarm').hidden = false;
  clearTimeout(alarmT);
  alarmT = setTimeout(hideAlarm, 4600);
}
function hideAlarm() { $('#alarm').hidden = true; }
$('#alarm').addEventListener('click', hideAlarm);

let toastT = null;
function toast(text) {
  const t = $('#toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.hidden = true; }, 3200);
}

/* ---------- misc UI ---------- */
$('#linkBtn').addEventListener('click', async () => {
  scheduleHash();
  setTimeout(async () => {
    try { await navigator.clipboard.writeText(location.href); toast('LINK COPIED'); }
    catch { toast(location.href); }
  }, 550);
});
$('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));

/* ---------- init ---------- */
(async () => {
  compActy();
  meta = await fetch('assets/meta.json').then((r) => r.json());
  buildTree();
  const s = meta.stats;
  $('#status').innerHTML =
    `<span>${s.files} FILES · ${s.lines.toLocaleString('en-US')} LINES · ${(s.bytes / 1048576).toFixed(1)} MB ROPE</span>` +
    `<span>·</span><span>SOURCE: <a href="https://github.com/chrislgarry/Apollo-11" target="_blank" rel="noopener">chrislgarry/Apollo-11</a> (PUBLIC DOMAIN)</span>` +
    `<span>·</span><span>SITE BY ADVENTUREWAVE LABS</span>`;
  const h = parseHash();
  if (h && meta.files.some((f) => f.id === h.id)) {
    await openFile(h.id, h.line, h.line > 1);
  } else {
    await openFile('lum-lunar_landing_guidance_equations');
    showTour(0);
  }
  compActy();
})();
})();
