import fs from "node:fs";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

function isMeaningfulTiming(v) {
  const s = Number(v?.start);
  const e = Number(v?.end);
  return Number.isFinite(s) && Number.isFinite(e) && e > s;
}

function parseMultiline(txtPath) {
  const raw = fs.readFileSync(txtPath, "utf8").replace(/\r/g, "");
  const lines = raw.split("\n");

  const map = new Map();
  let currentAyah = null;
  let buf = [];

  const flush = () => {
    if (currentAyah == null) return;
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (text) map.set(currentAyah, text);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(/^(\d{1,3})\s+(.*)$/);
    if (m) {
      flush();
      currentAyah = Number(m[1]);
      buf = [m[2] ?? ""];
    } else if (currentAyah != null) {
      buf.push(line);
    }
  }
  flush();

  const missing = [];
  for (let i = 1; i <= 111; i += 1) if (!map.has(i)) missing.push(i);
  if (missing.length) {
    throw new Error(`TR parse incomplete: missing ${missing.length}. First: ${missing.slice(0, 10).join(", ")}`);
  }
  return map;
}

async function main() {
  const jsonPath = process.argv[2] || "public/data/yusuf.json";
  const trPath = process.argv[3] || "public/data/yusuf.tr.txt";

  const verses = readJson(jsonPath);
  if (!Array.isArray(verses)) throw new Error(`${jsonPath} must be an array`);

  const trMap = parseMultiline(trPath);

  const out = verses.map((v) => {
    const ayah = Number(v?.ayah);
    if (!Number.isFinite(ayah) || ayah <= 0) return v;

    const tr = trMap.get(ayah);
    if (!tr) return v;

    const next = { ...v, tr };

    // timing bozulmasın
    if (isMeaningfulTiming(v)) {
      next.start = v.start;
      next.end = v.end;
    }

    return next;
  });

  writeJson(jsonPath, out);
  console.log(`OK: TR replaced from ${trPath} -> ${jsonPath} (timings preserved).`);
}

main().catch((err) => {
  console.error("[merge_tr_from_txt_preserve_timings] FAILED:", err.message || err);
  process.exit(1);
});
