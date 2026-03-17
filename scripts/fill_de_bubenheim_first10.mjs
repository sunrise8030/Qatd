import fs from "node:fs";

const SURAH_NUMBER = 12;
const FIRST_AYA = 1;
const LAST_AYA = 10;
const TRANSLATION_KEY = "german_bubenheim";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

async function fetchSuraTranslation() {
  const url = `https://quranenc.com/api/v1/translation/sura/${TRANSLATION_KEY}/${SURAH_NUMBER}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`QuranEnc API failed: ${res.status} ${res.statusText}`);
  return res.json();
}

function normalizeGerman(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

async function main() {
  const targetPath = process.argv[2] || "public/data/yusuf.json";
  const local = readJson(targetPath);
  if (!Array.isArray(local)) throw new Error(`${targetPath} must be an array`);

  const api = await fetchSuraTranslation();
  const rows = api?.result;
  if (!Array.isArray(rows)) throw new Error("Unexpected QuranEnc response shape (missing result array)");

  const byAya = new Map();
  for (const r of rows) {
    const aya = Number(r?.aya);
    if (!Number.isFinite(aya)) continue;
    const t = normalizeGerman(r?.translation);
    if (t) byAya.set(aya, t);
  }

  let filled = 0;
  const out = local.map((v) => {
    const ayah = Number(v?.ayah);
    if (ayah >= FIRST_AYA && ayah <= LAST_AYA) {
      const de = byAya.get(ayah);
      if (de) {
        filled += 1;
        return { ...v, de };
      }
    }
    return v;
  });

  writeJson(targetPath, out);
  console.log(`OK: filled ${filled} German verses (ayah ${FIRST_AYA}-${LAST_AYA}) into ${targetPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
