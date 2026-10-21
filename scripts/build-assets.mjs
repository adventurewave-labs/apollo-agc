#!/usr/bin/env node
// Generates public/assets/*.json from the vendored Apollo-11 AGC ropes.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'third_party/Apollo-11');
const OUT = join(root, 'public/assets');

const ropes = [
  { dir: 'Comanche055', section: 'COMMAND MODULE · COMANCHE 055', craft: 'Columbia (CSM)', prog: 55, prefix: 'cm' },
  { dir: 'Luminary099', section: 'LUNAR MODULE · LUMINARY 099', craft: 'Eagle (LM)', prog: 99, prefix: 'lum' },
];

const files = [];
for (const rope of ropes) {
  const names = readdirSync(join(SRC, rope.dir))
    .filter((n) => n.endsWith('.agc'))
    .sort((a, b) => a.localeCompare(b));
  for (const name of names) {
    const base = name.replace(/\.agc$/, '');
    const raw = readFileSync(join(SRC, rope.dir, name), 'utf8');
    const lines = raw.split('\n');
    if (lines.at(-1) === '') lines.pop();
    const rec = {
      id: `${rope.prefix}-${base.toLowerCase()}`,
      name: base,
      section: rope.section,
      craft: rope.craft,
      prog: rope.prog,
      count: lines.length,
      bytes: raw.length,
    };
    writeFileSync(join(OUT, `${rec.id}.json`), JSON.stringify({ ...rec, lines }));
    files.push(rec);
  }
}

const stats = {
  files: files.length,
  lines: files.reduce((a, f) => a + f.count, 0),
  bytes: files.reduce((a, f) => a + f.bytes, 0),
};
writeFileSync(
  join(OUT, 'meta.json'),
  JSON.stringify({
    generated: '2026-10-21',
    source: 'https://github.com/chrislgarry/Apollo-11',
    license: 'Public Domain (US Government work; Public Domain Mark 1.0)',
    files,
    stats,
  })
);
console.log(`assets: ${stats.files} files, ${stats.lines} lines, ${(stats.bytes / 1048576).toFixed(1)} MB of rope`);
