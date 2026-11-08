#!/usr/bin/env node
// Make a new seat's cartoon portrait the same way the original seven were made: a real photo
// of the person plus a style reference (one of the existing cartoons) go to Seedream 5 Pro
// image-to-image, which returns a 3D animated-film bust on a green screen. Then three edits of
// the chosen bust give the talking frames (mouth open, mouth "oh", eyes closed).
// build_portraits.py turns those into the room's aligned, keyed frames.
//
//   node .claude/skills/newroaster/scripts/portrait.mjs photo  <dir> <image url or file>
//   node .claude/skills/newroaster/scripts/portrait.mjs base   <dir> "<who and what they wear>" [--n 2]
//   node .claude/skills/newroaster/scripts/portrait.mjs pick   <dir> <candidate number>
//   node .claude/skills/newroaster/scripts/portrait.mjs frames <dir>
//   node .claude/skills/newroaster/scripts/portrait.mjs probe
//
// <dir> is the seat's portrait folder, <build>/portrait/. It holds photo.jpg, cand1.png...,
// base.png, open.png, mid.png, and blink.png. Needs KIE_AI_API_KEY (kie.ai) in the
// environment or the project .env. A base candidate or edit costs a few credits.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STYLE_REF = path.join(HERE, "..", "assets", "style-reference.jpg");
const API = "https://api.kie.ai";
const UPLOAD = "https://kieai.redpandaai.co/api/file-base64-upload";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// The exact prompts the original seven were built with. Change them and new seats stop matching.
const STYLE = "Turn the real person in the first image into a stylized 3D animated-film cartoon caricature drawn in exactly the same art style, rendering, lighting, and framing as the cartoon in the second image: head and upper chest bust, facing the camera straight on, centered, eyes looking at the viewer, mouth closed in a relaxed friendly smile. Keep the real person's likeness from the first image exactly: face shape, nose, eyes, eyebrows, hairline, and facial hair. Plain flat solid pure green (#00ff00) background, nothing else in the frame, no text except on the clothing.";
const KEEP = "Keep everything else exactly identical: same character, same face, same head position and size, same pose, same clothes, same lighting, same framing, same green background.";
const EDITS = {
  open: `Edit this image: the character is mid-sentence talking, mouth open wide in an 'ah' shape, teeth and tongue visible. ${KEEP} Only the mouth changes.`,
  mid: `Edit this image: the character is talking, mouth half open saying 'oh', lips slightly rounded. ${KEEP} Only the mouth changes.`,
  blink: `Edit this image: the character blinks, both eyes fully closed with relaxed eyelids. ${KEEP} Only the eyes change.`,
};

function key() {
  if (process.env.KIE_AI_API_KEY) return process.env.KIE_AI_API_KEY;
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const p = path.join(dir, ".env");
    if (fs.existsSync(p)) {
      const m = fs.readFileSync(p, "utf8").match(/^\s*KIE_AI_API_KEY\s*=\s*["']?([^"'\r\n]+)/m);
      if (m && m[1].trim()) return m[1].trim();
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  console.error("portrait: no KIE_AI_API_KEY. Get a key at https://kie.ai/api-key and add KIE_AI_API_KEY=... to the project .env.");
  process.exit(3);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let H;

async function upload(file) {
  const ext = path.extname(file).slice(1).toLowerCase();
  const mime = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
  const r = await fetch(UPLOAD, {
    method: "POST", headers: H,
    body: JSON.stringify({ base64Data: `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`, uploadPath: "roast-room", fileName: path.basename(file) }),
  });
  const j = await r.json();
  const url = j?.data?.downloadUrl || j?.data?.fileUrl || j?.data?.url;
  if (!url) throw new Error("upload failed: " + JSON.stringify(j));
  return url;
}

/** One Seedream 5 Pro image-to-image job, saved to `out`. */
async function still(prompt, refs, out) {
  const image_urls = await Promise.all(refs.map(upload));
  const r = await fetch(`${API}/api/v1/jobs/createTask`, {
    method: "POST", headers: H,
    body: JSON.stringify({ model: "seedream/5-pro-image-to-image", input: { prompt, image_urls, aspect_ratio: "1:1", quality: "high", output_format: "png", nsfw_checker: false } }),
  });
  const j = await r.json();
  const id = j?.data?.taskId;
  if (!id) throw new Error(`createTask: ${JSON.stringify(j)}`);
  const t0 = Date.now();
  for (let delay = 4000; ; delay = Math.min(delay * 1.25, 15000)) {
    if (Date.now() - t0 > 15 * 60 * 1000) throw new Error(`${path.basename(out)}: timed out`);
    await sleep(delay);
    const d = (await (await fetch(`${API}/api/v1/jobs/recordInfo?taskId=${id}`, { headers: H })).json())?.data || {};
    const state = d.state || d.status;
    if (state === "fail" || state === "failed") throw new Error(`${path.basename(out)}: ${d.failMsg || d.failCode || "failed"}`);
    if (state !== "success") continue;
    let res = d.resultJson;
    if (typeof res === "string") res = JSON.parse(res);
    const url = (res?.resultUrls || res?.urls || [])[0];
    if (!url) throw new Error(`${path.basename(out)}: no result url`);
    fs.writeFileSync(out, Buffer.from(await (await fetch(url)).arrayBuffer()));
    return out;
  }
}

/** Run jobs in parallel; a failed job is retried once. */
async function all(jobs) {
  const results = await Promise.allSettled(jobs.map(async ([prompt, refs, out]) => {
    try { return await still(prompt, refs, out); } catch (e) {
      console.error(`retrying ${path.basename(out)} (${e.message})`);
      return still(prompt, refs, out);
    }
  }));
  for (const r of results) console.log(r.status === "fulfilled" ? `ok     ${r.value}` : `fail   ${r.reason.message}`);
  if (results.some((r) => r.status === "rejected")) process.exitCode = 1;
}

const [cmd, dirArg, arg, ...rest] = process.argv.slice(2);
const dir = dirArg && path.resolve(dirArg);
const need = (f) => { if (!fs.existsSync(f)) { console.error(`portrait: missing ${f}`); process.exit(2); } return f; };

if (cmd === "photo") {
  if (!arg) throw new Error("usage: portrait.mjs photo <dir> <image url or file>");
  fs.mkdirSync(dir, { recursive: true });
  const out = path.join(dir, "photo.jpg");
  if (/^https?:/i.test(arg)) {
    const r = await fetch(arg, { headers: { "user-agent": UA } });
    if (!r.ok) throw new Error(`download ${r.status}`);
    fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
  } else fs.copyFileSync(arg, out);
  fs.writeFileSync(path.join(dir, "photo-source.txt"), arg + "\n");
  console.log(`saved ${out}. Look at it before going on: one real person, face clear and toward the camera.`);
} else if (cmd === "probe") {
  H = { "Content-Type": "application/json", Authorization: `Bearer ${key()}` };
  console.log("kie.ai credit:", (await (await fetch(`${API}/api/v1/chat/credit`, { headers: H })).json()).data);
} else if (cmd === "base") {
  if (!arg) throw new Error('usage: portrait.mjs base <dir> "<who and what they wear>" [--n 2]');
  H = { "Content-Type": "application/json", Authorization: `Bearer ${key()}` };
  const n = Number(rest[rest.indexOf("--n") + 1]) || 2;
  const refs = [need(path.join(dir, "photo.jpg")), need(STYLE_REF)];
  await all(Array.from({ length: n }, (_, i) => [`${STYLE} Person: ${arg}`, refs, path.join(dir, `cand${i + 1}.png`)]));
} else if (cmd === "pick") {
  fs.copyFileSync(need(path.join(dir, `cand${arg}.png`)), path.join(dir, "base.png"));
  console.log(`base.png = cand${arg}.png`);
} else if (cmd === "frames") {
  H = { "Content-Type": "application/json", Authorization: `Bearer ${key()}` };
  const base = need(path.join(dir, "base.png"));
  await all(Object.entries(EDITS).map(([shape, prompt]) => [prompt, [base], path.join(dir, `${shape}.png`)]));
} else {
  console.error("usage: portrait.mjs photo|base|pick|frames <dir> ... | probe");
  process.exit(1);
}
