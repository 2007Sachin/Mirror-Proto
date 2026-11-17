#!/usr/bin/env node
// Check that every quote in a seat's notes or brain is verbatim in the source it cites.
//
//   node .claude/skills/newroaster/scripts/check_quotes.mjs <build dir> <file or folder> [...]
//
// A quote is text in double quotes followed within a few characters by a source id, like
// "..." (S014) or "..." (S014, S020). Each quote must appear in the corpus file of one of
// its ids. A quote found under a different id is reported with the right one; a quote found
// nowhere is reported as not found and must be cut or replaced. Quotes with "..." are checked
// piece by piece. Exit code 1 when anything needs fixing.
import fs from "node:fs";
import path from "node:path";

const [, , buildArg, ...targets] = process.argv;
if (!buildArg || !targets.length) {
  console.error("usage: check_quotes.mjs <build dir> <file or folder> [...]");
  process.exit(2);
}
const BUILD = path.resolve(buildArg);
const sources = JSON.parse(fs.readFileSync(path.join(BUILD, "sources.json"), "utf8"));

const norm = (s) => s.toLowerCase()
  .replace(/[‘’`]/g, "'").replace(/[“”]/g, '"')
  .replace(/'\s+(t|s|re|ll|ve|d|m)\b/g, "'$1")
  .replace(/\[\d\d:\d\d(:\d\d)?\]/g, " ")
  .replace(/[^a-z0-9' ]+/g, " ").replace(/\s+/g, " ").trim();
const corpus = new Map(sources.map((s) => [s.id, norm(fs.readFileSync(path.join(BUILD, s.file), "utf8"))]));

const files = [];
const walk = (p) => {
  if (fs.statSync(p).isDirectory()) for (const n of fs.readdirSync(p)) walk(path.join(p, n));
  else if (/\.md$/.test(p)) files.push(p);
};
for (const t of targets) walk(path.resolve(t));

const found = (q, id) => {
  const hay = corpus.get(id);
  if (!hay) return false;
  // "..." splits a quote into pieces that must each be in the source
  return q.split(/\.\.\.|…/).map(norm).filter((p) => p.split(" ").length >= 3).every((p) => hay.includes(p));
};

let ok = 0;
const wrong = [], missing = [];
const re = /["“]([^"“”\n]{12,600})["”][^\n"“]{0,40}?[(\[]((?:S\d{3})(?:\s*[,;]\s*S\d{3})*)/g;
for (const f of files) {
  const lines = fs.readFileSync(f, "utf8").split(/\r?\n/);
  lines.forEach((line, i) => {
    for (const m of line.matchAll(re)) {
      const q = m[1];
      if (norm(q).split(" ").length < 4) continue;
      const ids = m[2].split(/\s*[,;]\s*/);
      const where = `${path.relative(process.cwd(), f)}:${i + 1}`;
      if (ids.some((id) => found(q, id))) { ok++; continue; }
      const other = sources.find((s) => found(q, s.id));
      if (other) wrong.push(`${where}  cites ${ids.join(", ")}, but the quote is in ${other.id}: "${q.slice(0, 90)}"`);
      else missing.push(`${where}  not found in any source: "${q.slice(0, 110)}"`);
    }
  });
}

console.log(`quotes verified: ${ok}; wrong source id: ${wrong.length}; not found: ${missing.length}`);
for (const w of wrong) console.log("  WRONG ID  " + w);
for (const m of missing) console.log("  NOT FOUND " + m);
process.exit(wrong.length || missing.length ? 1 : 0);
