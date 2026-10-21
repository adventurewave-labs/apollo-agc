# APOLLO/AGC

> The code that landed on the Moon — reconstructed as an interactive page with a working DSKY.

A live reading room for the Apollo 11 Guidance Computer software: **Comanche 055** (Command Module, *Columbia*) and **Luminary 099** (Lunar Module, *Eagle*) — 175 source files, ~130,000 lines of AGC assembly, browsable, searchable, explainable, and watchable in flight.

## What's inside

- **Authentic Block II DSKY** — the real lamp layout (UPLINK ACTY, TEMP, NO ATT, GIMBAL LOCK, PROG, RESTART, KEY REL, OPR ERR, COMP ACTY), 7-segment PROG/VERB/NOUN and R1–R3 registers, and a working keypad: VERB/NOUN entry with digits + ENTR, CLR, PRO, KEY REL.
- **Powered-descent simulation** — press PRO (or ▶ RUN P63) and watch P63 braking → P64 approach → P66 rate-of-descent fly an approximate reconstruction of the real landing: altitude and rate counting down in the correct V06N63 / V06N64 / V16N66 display formats, the famous 1202 executive-overflow alarms lighting the PROG lamp mid-descent, contact light, engine stop.
- **The rope, readable** — every section of both ropes with syntax-aware highlighting (labels, opcodes, interpretive ops, directives, comments, page markers); virtual scrolling keeps 5,000-line files instant.
- **Understand the code** — click any opcode in the listing for a plain-English explanation (CA, CCS, BANK, CADR, VLOAD… ~100 entries); `? HELP` has the anatomy of a listing line and a one-minute tour of the machine (15-bit words, rope vs erasable, banks, the Q register, the interpreter).
- **Rope search** (`Ctrl-K`) — search labels and comments across all 175 files.
- **Guided tour** — 8 curated stops: P63, the 1202s in code, "TEMPORARY, I HOPE HOPE HOPE", the Philosophy of Guildenstern, BURN_BABY_BURN, the interpreter, and pinball.
- **Permalinks** — `#/<file>/<line>` deep links for every line.
- **Easter eggs** — type `1202` anywhere. Also `1203`. Also `1969`.

## Run locally

```bash
npm run build   # regenerates public/assets from third_party/Apollo-11
npm start       # serves on :3000 — zero dependencies
```

Deploys anywhere Node runs (`npm start`, honors `$PORT`). Live on Railway.

## The source

The Apollo Guidance Computer software is a **US Government work in the public domain** (Public Domain Mark 1.0). This repo vendors the transcriptions from [chrislgarry/Apollo-11](https://github.com/chrislgarry/Apollo-11), which build on the [Virtual AGC project](https://www.ibiblio.org/apollo/) transcriptions by Ron Burkey and contributors. The `##` annotation blocks are historical notes preserved from the original MIT Instrumentation Laboratory engineers — including Don Eyles and Peter Adler — who wrote this code in 1968–69. The descent simulation is an illustrative reconstruction (keyframes from the published profile); display formats and source links are real.

## License

- This app (everything outside `third_party/`): **MIT** — see [LICENSE](LICENSE).
- The AGC source under `third_party/Apollo-11/`: public domain — see its [LICENSE.md](third_party/Apollo-11/LICENSE.md).

*Ad astra per aspera.* 🚀
