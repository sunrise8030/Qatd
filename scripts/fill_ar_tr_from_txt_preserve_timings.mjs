import fs from "node:fs";

const SURA = 12;
const AYAH_COUNT = 111;
const AR_EDITION = "quran-uthmani"; // alquran.cloud

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

// ✅ multiline-safe TR parser: "N <tab/space> text" başlıyorsa yeni ayet, yoksa devam satırı
function parseTrTxt(path) {
  const raw = fs.readFileSync(path, "utf8").replace(/\r/g, "");
  const lines = raw.split("\n");

  const map = new Map();
  let current = null;
  let buf = [];

  const flush = () => {
    if (current == null) return;
    const text = buf.join(" ").replace(/\s+/g, " ").trim();
    if (text) map.set(current, text);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(/^(\d{1,3})\s+(.*)$/);
    if (m) {
      flush();
      current = Number(m[1]);
      buf = [m[2] ?? ""];
    } else if (current != null) {
      buf.push(line);
    }
  }
  flush();

  const missing = [];
  for (let i = 1; i <= AYAH_COUNT; i += 1) if (!map.has(i)) missing.push(i);
  if (missing.length) {
    throw new Error(`TR txt incomplete: missing ${missing.length}. First: ${missing.slice(0, 10).join(", ")}`);
  }
  return map;
}

async function fetchArabicMap() {
  const url = `https://api.alquran.cloud/v1/surah/${SURA}/${AR_EDITION}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`AR API failed: ${res.status} ${res.statusText}`);
  const api = await res.json();

  const ayahs = api?.data?.ayahs;
  if (!Array.isArray(ayahs)) throw new Error("AR API shape unexpected: missing data.ayahs[]");

  const map = new Map();
  for (const a of ayahs) {
    const n = Number(a?.numberInSurah);
    const t = String(a?.text ?? "").trim();
    if (Number.isFinite(n) && t) map.set(n, t);
  }
  return map;
}

async function main() {
  const jsonPath = process.argv[2] || "public/data/yusuf.json";
  const trPath = process.argv[3] || "public/data/yusuf.txt";

  const verses = readJson(jsonPath);
  if (!Array.isArray(verses) || verses.length === 0) throw new Error(`${jsonPath} must be a non-empty array`);

  const [trMap, arMap] = await Promise.all([Promise.resolve(parseTrTxt(trPath)), fetchArabicMap()]);

  const out = verses.map((v) => {
    const ayah = Number(v?.ayah);
    if (!Number.isFinite(ayah) || ayah < 0) return v;

    // ayah=0 (besmele) dokunma (sende zaten var)
    if (ayah === 0) return v;

    const next = { ...v };

    // ✅ TR: txt’den kesin set et (HTML temizlenir)
    next.tr = trMap.get(ayah) || next.tr;

    // ✅ AR: API’den kesin set et (—/_ kalmaz)
    next.ar = arMap.get(ayah) || next.ar;

    // ✅ timing bozulmasın
    if (isMeaningfulTiming(v)) {
      next.start = v.start;
      next.end = v.end;
    }

    return next;
  });

  writeJson(jsonPath, out);
  console.log(`OK: filled TR(from ${trPath}) + AR(Uthmani) into ${jsonPath}, timings preserved.`);
  console.log("Sample ayah 11:", out.find((x) => x.ayah === 11));
}

main().catch((e) => {
  console.error("[fill_ar_tr_from_txt_preserve_timings] FAILED:", e?.message || e);
  process.exit(1);
});
