/* APOLLO/AGC — the code that landed on the Moon.
   Authentic DSKY · rope reader · powered-descent simulation. */
(() => {
'use strict';
const $ = (s) => document.querySelector(s);
const LH = 22;
const OVER = 24;

/* ---------- AGC instruction reference (plain English) ---------- */
const OPREF = {
  CA: ['clear and add', 'Wipe the accumulator, then load it with the value at address K. The most common instruction in the rope — "read a variable".'],
  CAF: ['clear and add, fixed', 'Like CA, but K points into fixed (rope) memory — reading a constant or a table.'],
  CS: ['clear and subtract', 'A ← −(K): load the negated value at K. AGC stores negatives in one\'s complement, so this is also how you make a "minus".'],
  TS: ['transfer to storage', 'Store A into K. If A overflowed, control transfers to K+1 / K+2 instead — a free error branch.'],
  XCH: ['exchange', 'Swap the accumulator with K in one step.'],
  AD: ['add', 'A ← A + (K), one\'s complement add.'],
  SU: ['subtract (extended)', 'A ← A − (K).'],
  MSU: ['modular subtract (extended)', 'Subtract without sign, for counters and angular data.'],
  INCR: ['increment', 'K ← (K) + 1. The AGC\'s ++.'],
  ADS: ['add to storage', 'K ← (K) + A.'],
  DOUBLE: ['double', 'A ← A + A (a fast multiply-by-two).'],
  SQUARE: ['square', 'A ← A × A.'],
  COM: ['complement', 'A ← −A.'],
  MP: ['multiply', 'A,L ← A × K — double precision product.'],
  DV: ['divide (extended)', 'A,L ← A,L ÷ K.'],
  DXCH: ['double exchange', 'Swap the A,L pair with a pair at K.'],
  DCA: ['double clear and add', 'Load the A,L register pair from K and K+1.'],
  DCS: ['double clear and subtract', 'Load the negated pair from K and K+1.'],
  TC: ['transfer control', 'Jump — or call: the return address goes in the Q register (there is no stack).'],
  TCF: ['transfer control, fixed', 'Jump within fixed memory, without disturbing Q.'],
  TCR: ['transfer control, reusable', 'Jump through a register-preserving trampoline.'],
  CCS: ['count, compare and skip', 'Four-way branch on |K|: positive → negative → zero → minus-one. The rope\'s workhorse loop instruction.'],
  INDEX: ['index', 'Add K to the address field of the next instruction — arrays and jump tables work this way.'],
  EXTEND: ['extend opcode', 'Prefix: the next instruction comes from the extended set (DV, MSU, channel ops…).'],
  BZF: ['branch if zero', 'Jump if A = 0.'],
  BZMF: ['branch if zero or minus', 'Jump if A ≤ 0.'],
  OVSK: ['overflow skip', 'Skip one instruction if A overflowed.'],
  TCAA: ['transfer control to A', 'Jump to the address held in A — a computed goto.'],
  XQ: ['execute', 'Jump to the address in Q — used with INDEX for computed dispatch.'],
  NOOP: ['no operation', 'Do nothing — spacing, patching, timing.'],
  INHINT: ['inhibit interrupts', 'Mask interrupts — critical sections.'],
  RELINT: ['release interrupts', 'Unmask interrupts.'],
  RESUME: ['resume', 'Return from an interrupt handler.'],
  READ: ['read channel (ext)', 'Read an I/O channel: discretes, counters, the DSKY keys.'],
  WRITE: ['write channel (ext)', 'Write an I/O channel: relays, engine on/off, display lines.'],
  RAND: ['read and mask (ext)', 'Read a channel ANDed with a mask.'],
  WAND: ['write and mask (ext)', 'Clear selected bits in an output channel.'],
  WOR: ['write or mask (ext)', 'Set selected bits in an output channel.'],
  ROR: ['read or mask (ext)', 'Read a channel, ORed with a mask.'],
  MASK: ['mask', 'A ← A AND K — bit selection.'],
  LXCH: ['exchange with L', 'Swap the L register with K.'],
  CALL: ['interpreter call', 'Enter the interpreter: run the indented interpretive code that follows.'],
  EXIT: ['interpreter exit', 'Leave the interpreter, back to basic instructions.'],
  GOTO: ['interpreter goto', 'Jump to another interpretive routine.'],
  STORE: ['interpreter store', 'Store the top of the interpretive stack.'],
  STODL: ['store and deload', 'Store a double-precision value from the stack.'],
  STODT: ['store and deload, triple', 'Store a triple (a vector) from the stack.'],
  STCALL: ['store and call', 'Store a vector, then call another interpretive routine with it.'],
  STOVL: ['store and overload', 'Store one vector onto another.'],
  BOV: ['branch on overflow', 'Interpretive branch when an overflow flag is set.'],
  BON: ['branch on, no off', 'Branch if a flag is set.'],
  BOFF: ['branch off', 'Branch if a flag is clear.'],
  RTB: ['return to basic', 'Leave the interpreter and jump — the interpreter\'s return.'],
  SET: ['set flag', 'Set a flagword bit.'],
  CLEAR: ['clear flag', 'Clear a flagword bit.'],
  VLOAD: ['vector load', 'Push a 3-component vector onto the interpreter stack.'],
  VXSC: ['vector × scalar', 'Scale a vector.'],
  VXMU: ['vector × matrix', 'Transform a vector — attitude rotations live here.'],
  VXV: ['vector × vector', 'Cross product.'],
  DOT: ['dot product', 'Dot product of two vectors — angles, projections.'],
  UNIT: ['unitize', 'Normalize a vector to length one.'],
  VAD: ['vector add', 'Add two vectors.'],
  VSU: ['vector subtract', 'Subtract two vectors.'],
  VSQ: ['vector square', 'Sum of the squares — magnitudes.'],
  VPROJ: ['vector projection', 'Project one vector onto another.'],
  DLOAD: ['double load', 'Push a double-precision scalar.'],
  DAD: ['double add', 'Add doubles.'],
  DSU: ['double subtract', 'Subtract doubles.'],
  DMP: ['double multiply', 'Multiply doubles.'],
  DDV: ['double divide', 'Divide doubles.'],
  SQRT: ['square root', 'Compute a square root.'],
  ABS: ['absolute value', 'Take |x|.'],
  PDDL: ['push and deload', 'Stack operations for doubles.'],
  PDSU: ['push and subtract', 'Stack subtract.'],
  PDVL: ['push vector load', 'Stack push of a vector.'],
  SWAB: ['swap banks', 'Exchange bank registers.'],
  MXV: ['matrix × vector', 'Transform the other way.'],
  MMX: ['matrix multiply', 'Matrix product.'],
  NORM: ['normalize', 'Produce unit vector and magnitude.'],
  SIGN: ['sign transfer', 'Move a sign between values.'],
  SLOAD: ['scalar load', 'Push a single-precision value.'],
  BANK: ['bank directive', 'Select the fixed-memory bank the assembler places following code into.'],
  SETLOC: ['set location', 'Set the assembly location counter.'],
  ERASE: ['erase directive', 'Reserve a word (or a block) in erasable core memory — declaring a variable.'],
  EQUALS: ['equals directive', 'Give a symbolic name to an address or value — aliases.'],
  CADR: ['constant address', 'A banked fixed-memory address constant — a pointer the AGC can jump through.'],
  '2CADR': ['double constant address', 'A two-word banked address constant.'],
  OCT: ['octal constant', 'A constant written in octal — AGC native base.'],
  DEC: ['decimal constant', 'A decimal constant the assembler converts to AGC form.'],
  '2DEC': ['double decimal', 'A double-precision decimal constant.'],
  CNOP: ['conditional nop', 'Pad to a word boundary inside a bank.'],
  BLOCK: ['block directive', 'Reserve a named block of erasable memory.'],
  COUNT: ['count directive', 'Listing/section bookkeeping for the assembler.'],
  MEMORY: ['memory directive', 'Force a symbol into a specific memory space.'],
};

const OPS = new Set(('CA CAF CS CCS TC TCF TCR INDEX INCR ADS AD SU DV MP MSU DOUBLE SQUARE COM ' +
  'DXCH DCA DCS TS XCH MASK READ WRITE RAND WAN WOR ROR RXOR LXCH BZF BZMF TCAA OVSK XQ ' +
  'EXTEND INHINT RELINT RESUME NOOP NOLOP ' +
  'CALL EXIT GOTO STORE STODL STODT STCALL STOVL BOV BON BOFF RTB SET CLEAR TSLC TSRT ' +
  'VLOAD VXSC VXMU VXV VAD VSU DOT UNIT VSQ VPROJ SWAB MXV MMX NORM MAG SIGN ' +
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
    if (OPS.has(tok) || OPS.has(bare)) out += `<span class="op" data-k="${esc(bare)}">${esc(tok)}</span>`;
    else if (DIRS.has(tok) || DIRS.has(bare)) out += `<span class="dir" data-k="${esc(bare)}">${esc(tok)}</span>`;
    else if (/^-?\d+[BD]?$/i.test(tok) || /^[0-7]{2,6}$/.test(tok)) out += `<span class="num">${esc(tok)}</span>`;
    else out += `<span class="sym">${esc(tok)}</span>`;
  }
  if (cmt) out += `<span class="cmt">${esc(cmt)}</span>`;
  return out;
}

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
      await sleep(6);
    }
    el.textContent += '\n';
    await sleep(45);
  }
  await sleep(300);
  endBoot();
})();
function endBoot() {
  if (bootDone) return;
  bootDone = true;
  const b = $('#boot');
  b.classList.add('gone');
  setTimeout(() => b.remove(), 700);
  maybeAutoSim();
}

/* ---------- DSKY ---------- */
const dsky = {
  prog: '00', verb: '16', noun: '63',
  entry: null, buf: '',
};
function seg(id, txt) { $(id).textContent = txt; }
function paintDSKY() {
  seg('#dProg', dsky.prog);
  seg('#dVerb', dsky.entry === 'verb' ? dsky.buf.padStart(2, ' ') : dsky.verb);
  seg('#dNoun', dsky.entry === 'noun' ? dsky.buf.padStart(3, ' ') : dsky.noun);
  $('#dVerb').classList.toggle('blink', dsky.entry === 'verb');
  $('#dNoun').classList.toggle('blink', dsky.entry === 'noun');
}
function setReg(n, sign, value) {
  $('#r' + n + 's').textContent = sign;
  seg('#r' + n, String(Math.min(99999, Math.max(0, Math.round(Math.abs(value))))).padStart(5, '0'));
}
function setLamp(name, on, green) {
  const el = document.querySelector(`.alamp[data-lamp="${name}"]`);
  if (el) { el.classList.toggle('on', !!on); el.classList.toggle('green', !!green); }
}
let lampT = null;
function compActy() {
  const i = $('#compLamp');
  i.classList.add('on', 'blink');
  clearTimeout(lampT);
  lampT = setTimeout(() => i.classList.remove('blink'), 200);
}
setInterval(() => {
  if (!sim.on && Math.random() < 0.45) {
    $('#compLamp').classList.add('on');
    setTimeout(() => { if (!sim.on) $('#compLamp').classList.remove('on'); }, 160 + Math.random() * 500);
  }
}, 3400);

/* keypad */
$('#keys').addEventListener('click', (e) => {
  const k = e.target.closest('button');
  if (!k) return;
  pressKey(k.dataset.key);
});
function pressKey(k) {
  compActy();
  if (k === 'VERB') { dsky.entry = 'verb'; dsky.buf = ''; paintDSKY(); return; }
  if (k === 'NOUN') { dsky.entry = 'noun'; dsky.buf = ''; paintDSKY(); return; }
  if (k === 'CLR') {
    if (dsky.entry) { dsky.entry = null; dsky.buf = ''; paintDSKY(); }
    else { simAlarmActive ? clearSimAlarm() : note('CLR'); }
    return;
  }
  if (k === 'ENTR') {
    if (dsky.entry === 'verb') dsky.verb = dsky.buf.padStart(2, '0');
    if (dsky.entry === 'noun') dsky.noun = dsky.buf.padStart(3, '0');
    dsky.entry = null; dsky.buf = '';
    paintDSKY();
    note(`V${dsky.verb} N${dsky.noun} — accepted.`);
    return;
  }
  if (k === 'PRO') { toggleSim(); return; }
  if (k === 'KEYREL') {
    setLamp('keyrel', true);
    setTimeout(() => setLamp('keyrel', false), 800);
    note('KEY REL — keys released.');
    return;
  }
  if (/^[0-9]$/.test(k) && dsky.entry) {
    const max = dsky.entry === 'verb' ? 2 : 3;
    if (dsky.buf.length < max) dsky.buf += k;
    paintDSKY();
    return;
  }
  note(dsky.entry ? 'enter digits, then ENTR.' : 'idle.');
}
function note(html) { $('#simNote').innerHTML = html; }

/* ---------- powered descent simulation ---------- */
const sim = { on: false, f: 0, timer: null, alarm: false };
let simAlarmActive = false;
const FPS = 5;           // (flight seconds per sim second — display only)
const FSTEP = 2;         // flight seconds advanced per tick
const TICK = 200;        // ms per tick
const DUR = 745;         // flight seconds PDI → touchdown

const KEYFRAMES = [
  { f: 0,   h: 50000, hd: 35,  prog: '63', verb: '06', noun: '63', note: 'P63 ignition — descent engine lit, throttle 10% → 92.5%. <a data-open="lum-lunar_landing_guidance_equations:850">open the guidance code →</a>' },
  { f: 90,  h: 36000, hd: 95,  prog: '63' },
  { f: 240, h: 20000, hd: 158, prog: '63' },
  { f: 490, h: 7200,  hd: 140, prog: '64', verb: '06', noun: '64', note: 'High gate — P64 approach phase. Armstrong looks through the LPD window grid; a couple of <a data-open="lum-executive:208">1202 alarms</a> are coming.' },
  { f: 570, alarm: '1202' },
  { f: 585, alarm: '1202' },
  { f: 660, h: 500,   hd: 16,  prog: '66', verb: '16', noun: '66', note: 'Low gate — P66. Armstrong takes manual rate-of-descent; the <a data-open="lum-lunar_landing_guidance_equations:179">throttle workaround ("TEMPORARY, I HOPE HOPE HOPE")</a> is what\'s limiting his descent rate right now.' },
  { f: 735, h: 25,    hd: 3.5, prog: '66', note: 'CONTACT LIGHT.' },
  { f: 745, h: 6,     hd: 0,   prog: '66', done: true },
];
function lerpKF(f) {
  let a = KEYFRAMES[0], b = KEYFRAMES[KEYFRAMES.length - 1];
  for (let i = 0; i < KEYFRAMES.length - 1; i++) {
    if (f >= KEYFRAMES[i].f && f <= KEYFRAMES[i + 1].f) { a = KEYFRAMES[i]; b = KEYFRAMES[i + 1]; break; }
  }
  const span = Math.max(1, b.f - a.f);
  const t = Math.min(1, Math.max(0, (f - a.f) / span));
  return {
    h: a.h + (b.h - a.h) * t,
    hd: a.hd + (b.hd - a.hd) * t,
    prog: b.prog || a.prog,
    verb: b.verb || a.verb || '06',
    noun: b.noun || a.noun || '63',
  };
}
function getClock(f) {
  const get = 102 * 3600 + 33 * 60 + 4 + f;
  const h = Math.floor(get / 3600), m = Math.floor((get % 3600) / 60), s = Math.floor(get % 60);
  return `GET ${String(h).padStart(3, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function simTick() {
  sim.f += FSTEP;
  const kf = lerpKF(sim.f);
  dsky.prog = kf.prog; dsky.verb = kf.verb; dsky.noun = kf.noun;
  paintDSKY();
  const lpd = 25 + 18 * Math.min(1, Math.max(0, (sim.f - 490) / 240));
  if (kf.prog === '63') { setReg(1, '+', 100 + 90 * Math.sin(sim.f / 9)); setReg(2, '+', kf.h); setReg(3, '−', kf.hd); }
  else if (kf.prog === '64') { setReg(1, '+', lpd); setReg(2, '+', kf.h); setReg(3, '−', kf.hd); }
  else { setReg(1, '+', 15); setReg(2, '+', kf.h); setReg(3, '−', kf.hd); }
  if (Math.random() < 0.3) setLamp('uplink', true); else if (Math.random() < 0.3) setLamp('uplink', false);
  for (const k of KEYFRAMES) {
    if (sim.f >= k.f && sim.f - FSTEP < k.f) {
      if (k.note) note(`${getClock(sim.f)} · <span class="ph">${k.note}</span>`);
      if (k.alarm) simAlarm(k.alarm);
      if (k.done) land();
    }
  }
}
function simAlarm(code) {
  simAlarmActive = true;
  setLamp('prog', true);
  setLamp('restart', true);
  setReg(1, '+', parseInt(code, 10));
  $('#r1').classList.add('blink');
  showAlarm(code, 'EXECUTIVE OVERFLOW — NO CORE SETS', 'the restart cleaned it up. houston reviewed: GO. (garman / bales · jul 20 1969)');
  setTimeout(clearSimAlarm, 4200);
}
function clearSimAlarm() {
  simAlarmActive = false;
  setLamp('prog', false); setLamp('restart', false);
  $('#r1').classList.remove('blink');
  $('#alarm').hidden = true;
}
function toggleSim() {
  if (sim.on) {
    clearInterval(sim.timer); sim.on = false;
    dsky.prog = '00'; dsky.verb = '16'; dsky.noun = '63';
    paintDSKY(); setReg(1, '+', 0); setReg(2, '+', 0); setReg(3, '+', 0);
    setLamp('prog', false); setLamp('restart', false); setLamp('uplink', false);
    $('#compLamp').classList.remove('on');
    $('#simBtn').textContent = '▶ RUN P63 POWERED DESCENT';
    $('#simBtn').classList.remove('run');
    note('Simulation reset — P00 idle.');
  } else {
    sim.on = true; sim.f = 0;
    $('#simBtn').textContent = '■ ABORT / RESET (PRO)';
    $('#simBtn').classList.add('run');
    note(getClock(0) + ' · engine ignition — flying an approximate reconstruction of the real descent. ~75 seconds.');
    simTick();
    sim.timer = setInterval(simTick, TICK);
  }
}
function land() {
  clearInterval(sim.timer); sim.on = false;
  dsky.prog = '00'; paintDSKY();
  setReg(3, '−', 0);
  setLamp('uplink', false);
  $('#compLamp').classList.remove('on');
  $('#simBtn').textContent = '▶ RUN P63 POWERED DESCENT';
  $('#simBtn').classList.remove('run');
  note(`${getClock(DUR)} · CONTACT LIGHT — ENGINE STOP. <span class="ph">THE EAGLE HAS LANDED.</span> 20:17:40 UTC, Jul 20 1969. Fly it again with PRO, or read <a data-open="lum-lunar_landing_guidance_equations:850">how it was computed</a>.`);
  toast('TRANQUILITY BASE HERE. THE EAGLE HAS LANDED.');
}
$('#simBtn').addEventListener('click', toggleSim);
$('#simNote').addEventListener('click', (e) => {
  const a = e.target.closest('[data-open]');
  if (!a) return;
  const [id, ln] = a.dataset.open.split(':');
  openFile(id, parseInt(ln, 10), true);
});
function maybeAutoSim() {
  if (!location.hash && !sim.on) setTimeout(toggleSim, 1600);
}

/* ---------- data ---------- */
let meta = null;
let cur = null;
let hlCache = new Map();
const cache = new Map();
let allLoaded = false, allPromise = null;
let suppressHash = false;
const viewer = $('#viewer'), linesEl = $('#lines'), spacer = $('#spacer');

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
          if (done % 20 === 0 || done === list.length) $('#pstat').textContent = `LOADING ROPE ${done}/${list.length}`;
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
      d.addEventListener('click', () => { openFile(f.id); $('#side').classList.remove('open'); });
      tree.appendChild(d);
    }
  }
  $('#fileFilter').addEventListener('input', (e) => {
    const v = e.target.value.toLowerCase();
    for (const d of tree.querySelectorAll('.fi')) d.style.display = d.dataset.name.includes(v) ? '' : 'none';
  });
}
function markTree() {
  for (const d of document.querySelectorAll('.fi')) d.classList.toggle('on', d.dataset.id === cur.id);
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
  $('#curPos').textContent = `L${mid}/${cur.count}`;
}
viewer.addEventListener('scroll', () => {
  compActy();
  if (!rafPending) { rafPending = true; requestAnimationFrame(() => { rafPending = false; render(); }); }
  scheduleHash();
});
async function openFile(id, line, flash) {
  const rec = await getFile(id);
  cur = rec; hlCache = new Map();
  spacer.style.height = rec.count * LH + 'px';
  $('#curFile').textContent = rec.name;
  $('#curSub').textContent = `${rec.section} · ${rec.craft}`;
  markTree();
  if (line && line > 1) {
    viewer.scrollTop = Math.max(0, (line - 1) * LH - viewer.clientHeight / 3);
    render();
    if (flash) flashLine(line - 1);
  } else { viewer.scrollTop = 0; render(); }
}
function flashLine(i) {
  const row = linesEl.querySelector(`.ln[data-i="${i}"]`);
  if (row) { row.classList.add('tgt'); setTimeout(() => row.classList.remove('tgt'), 2400); }
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
    if (location.hash !== want) { suppressHash = true; location.hash = want; setTimeout(() => { suppressHash = false; }, 0); }
  }, 500);
}
function parseHash() {
  const m = location.hash.match(/^#\/([a-z0-9_\-\.]+)(?:\/(\d+))?/i);
  return m ? { id: m[1], line: m[2] ? parseInt(m[2], 10) : 1 } : null;
}

/* ---------- opcode popover ---------- */
const pop = document.createElement('div');
pop.id = 'opPop'; pop.hidden = true;
document.body.appendChild(pop);
linesEl.addEventListener('click', (e) => {
  const k = e.target.closest('[data-k]');
  if (!k) return;
  const key = k.dataset.k.replace(/\*+$/, '');
  const info = OPREF[key];
  if (!info) return;
  pop.innerHTML = `<div class="ok">${k.classList.contains('dir') ? 'ASSEMBLER DIRECTIVE' : 'AGC INSTRUCTION'}</div><b>${esc(key)}</b> — ${esc(info[0])}<br>${esc(info[1])}`;
  pop.hidden = false;
  const r = k.getBoundingClientRect();
  const w = Math.min(340, innerWidth - 20);
  pop.style.width = w + 'px';
  let x = Math.min(r.left, innerWidth - w - 12);
  let y = r.bottom + 8;
  if (y + 120 > innerHeight) y = Math.max(10, r.top - 130);
  pop.style.left = Math.max(8, x) + 'px';
  pop.style.top = y + 'px';
});
addEventListener('scroll', () => { pop.hidden = true; }, true);
document.addEventListener('click', (e) => { if (!e.target.closest('#opPop') && !e.target.closest('[data-k]')) pop.hidden = true; });

/* ---------- search palette ---------- */
const palette = $('#palette'), q2 = $('#q2');
$('#q').addEventListener('focus', openPalette);
$('#q').addEventListener('keydown', (e) => { if (e.key === 'Enter') openPalette(); });
function openPalette() { palette.hidden = false; q2.value = $('#q').value; q2.focus(); if (q2.value.trim().length >= 2) doSearch(); }
function closePalette() { palette.hidden = true; }
let searchT = null;
q2.addEventListener('input', () => { clearTimeout(searchT); searchT = setTimeout(doSearch, 130); });
q2.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePalette();
  if (e.key === 'Enter') { const first = $('#presults .ritem'); if (first) first.click(); }
});
async function doSearch() {
  const query = q2.value.trim().toLowerCase();
  const res = $('#presults');
  if (query.length < 2) { res.innerHTML = '<div class="pempty">type at least 2 characters — the first search loads the full rope (~3 MB)</div>'; $('#pstat').textContent = ''; return; }
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
      if (!low.includes(query)) continue;
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
    if (r.f.id !== lastFile) { html += `<div class="rgrp">${esc(r.f.section)} · ${esc(r.f.name)}</div>`; lastFile = r.f.id; }
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

/* ---------- help modal ---------- */
const HELP_ANATOMY =
  '<div class="anat"><span class="lbl">P63DISPS</span>  <span class="op">CAF</span>  <span class="num">V06N63</span>  <span class="cmt"># DISPLAY SETUP FOR P63</span></div>' +
  '<div class="legend"><b>LABEL</b> — where jumps land (a subroutine\'s name). · <b>OPCODE</b> — what the computer does (click any opcode in the listing for its meaning). · <b>OPERAND</b> — the address or constant it acts on. · <b># COMMENT</b> — the 1969 engineers\' own notes.</div>';
function helpHTML() {
  let ops = '<table>';
  for (const k of Object.keys(OPREF)) {
    ops += `<tr><td>${esc(k)}</td><td><b style="color:var(--amber)">${esc(OPREF[k][0])}</b> — ${esc(OPREF[k][1])}</td></tr>`;
  }
  ops += '</table>';
  return `<h4>ANATOMY OF A LISTING LINE</h4>${HELP_ANATOMY}
  <h4>THE MACHINE IN ONE MINUTE</h4>
  Words are 15 bits, values shown in octal. Memory splits into <b style="color:var(--ph)">fixed</b> — 36,864 words of rope, literally woven copper wire, immutable after manufacture — and <b style="color:var(--ph)">erasable</b> core (2,048 words) for variables. Fixed memory is paged in 2K <b>banks</b> (see BANK / SETLOC). Calls keep their return in the single Q register: no stack. Indented code is <b>interpretive</b> — a compact language running on the INTERPRETER, a VM inside the AGC, built for double-precision vector math. <span class="cmt"># comments</span> are the originals; <span class="note">## notes</span> are modern historical annotations; <span class="pg"># Page NNNN</span> marks the original listing pagination.
  <h4>THE DSKY</h4>
  PROG shows the running major program (63 = braking, 64 = approach, 66 = rate-of-descent). VERB 06/NOUN 63 means "display these values"; VERB 16 means "update them live". The keypad works: VERB or NOUN then digits then ENTR; PRO flies or aborts the landing simulation; CLR cancels.
  <h4>THE SIMULATION</h4>
  An approximate reconstruction of the real descent (PDI at 50,000 ft, high gate ~7,200 ft, low gate ~500 ft, the two famous 1202s, touchdown GET 102:45) — telemetry is illustrative, the display formats and source links are real.
  <h4>INSTRUCTION REFERENCE (click any opcode in the code for the same)</h4>${ops}`;
}
$('#helpBtn').addEventListener('click', () => { $('#helpBody').innerHTML = helpHTML(); $('#help').hidden = false; });
$('#helpClose').addEventListener('click', () => { $('#help').hidden = true; });
$('#help').addEventListener('click', (e) => { if (e.target.id === 'help') $('#help').hidden = true; });

/* ---------- easter eggs ---------- */
let kbuf = '';
addEventListener('keydown', (e) => {
  const inInput = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
  if (e.key.length === 1 && /[0-9]/.test(e.key) && !inInput) {
    kbuf = (kbuf + e.key).slice(-4);
    if (kbuf === '1202') showAlarm('1202', 'EXECUTIVE OVERFLOW — NO CORE SETS', 'the eagle did not abort. houston said GO. (garman / bales · 20 jul 1969)');
    else if (kbuf === '1203') showAlarm('1203', 'WAITLIST OVERFLOW — TOO MANY TASKS', 'also survived in flight. keep flying.');
    else if (kbuf === '1969') toast('THE EAGLE HAS LANDED · 20 JUL 1969 · 20:17:40 UTC');
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
  if (e.key === 'Escape') { closePalette(); if (!$('#alarm').hidden) hideAlarm(); pop.hidden = true; if (!$('#help').hidden) $('#help').hidden = true; tourCard.hidden = true; }
  if (e.key === '?' && !inInput) { $('#helpBody').innerHTML = helpHTML(); $('#help').hidden = false; }
  if (tourIdx >= 0 && !tourCard.hidden && !inInput) {
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
  toastT = setTimeout(() => { t.hidden = true; }, 3400);
}

/* ---------- misc ---------- */
$('#linkBtn').addEventListener('click', async () => {
  scheduleHash();
  setTimeout(async () => {
    try { await navigator.clipboard.writeText(location.href); toast('LINK COPIED'); }
    catch { toast(location.href); }
  }, 550);
});
$('#menuBtn').addEventListener('click', () => $('#side').classList.toggle('open'));
$('#dskyHide').addEventListener('click', () => {
  const p = $('#dskyPanel');
  p.classList.toggle('min');
  $('#dskyHide').textContent = p.classList.contains('min') ? '▴' : '▾';
});
paintDSKY();
setReg(1, '+', 0); setReg(2, '+', 0); setReg(3, '+', 0);

/* ---------- init ---------- */
(async () => {
  compActy();
  meta = await fetch('assets/meta.json').then((r) => r.json());
  buildTree();
  const s = meta.stats;
  $('#status').innerHTML =
    `<span>${s.files} FILES · ${s.lines.toLocaleString('en-US')} LINES · ${(s.bytes / 1048576).toFixed(1)} MB ROPE</span>` +
    `<span>·</span><span>SOURCE: <a href="https://github.com/chrislgarry/Apollo-11" target="_blank" rel="noopener">chrislgarry/Apollo-11</a> (PUBLIC DOMAIN)</span>` +
    `<span>·</span><span>? HELP EXPLAINS THE CODE</span>`;
  const h = parseHash();
  if (h && meta.files.some((f) => f.id === h.id)) await openFile(h.id, h.line, h.line > 1);
  else await openFile('lum-lunar_landing_guidance_equations');
  compActy();
})();
})();
