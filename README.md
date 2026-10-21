# APOLLO/AGC

> The code that landed on the Moon, reconstructed as an interactive page.

A live reading room for the Apollo 11 Guidance Computer software: **Comanche 055** (Command Module, *Columbia*) and **Luminary 099** (Lunar Module, *Eagle*) — 175 source files, ~130,000 lines of AGC assembly, browsable, searchable, and tourable in a DSKY-styled interface.

## Features

- **Full rope browser** — every section of both ropes, syntax-aware highlighting (labels, opcodes, interpretive ops, directives, comments, page markers), instant even on 5,000-line files thanks to virtual scrolling.
- **Rope search** (`Ctrl-K`) — search labels and comments across all 175 files; the first search loads the rope memory into your browser.
- **Guided tour** — 8 curated stops: P63 braking phase, the 1202/1203 alarms in code, "TEMPORARY, I HOPE HOPE HOPE", the Philosophy of Guildenstern, BURN_BABY_BURN, the interpreter, and pinball.
- **DSKY chrome** — COMP ACTY lamp, PROG/VERB/NOUN readouts (PROG = rope revision, NOUN = your line number).
- **Permalinks** — `#/<file>/<line>` deep links for every line; the ⧉ button copies the current one.
- **Easter eggs** — type `1202` anywhere. Also `1203`. Also `1969`.

## Run locally

```bash
npm run build   # regenerates public/assets from third_party/Apollo-11
npm start       # serves on :3000 — zero dependencies
```

Deploys anywhere Node runs (`npm start`, honors `$PORT`). Live on Railway.

## The source

The Apollo Guidance Computer software is a **US Government work in the public domain** (Public Domain Mark 1.0). This repo vendors the transcriptions from [chrislgarry/Apollo-11](https://github.com/chrislgarry/Apollo-11), which build on the [Virtual AGC project](https://www.ibiblio.org/apollo/) transcriptions by Ron Burkey and contributors. The `##` annotation blocks are historical notes preserved from the original MIT Instrumentation Laboratory engineers — including Don Eyles and Peter Adler — who wrote this code in 1968–69.

## License

- This app (everything outside `third_party/`): **MIT** — see [LICENSE](LICENSE).
- The AGC source under `third_party/Apollo-11/`: public domain — see its [LICENSE.md](third_party/Apollo-11/LICENSE.md).

*Ad astra per aspera.* 🚀
