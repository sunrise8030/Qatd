import fs from "node:fs";

const SURAH_NUMBER = 12;
const TRANSLATION_KEY = "german_bubenheim";

function readJson(path) {
  return JSON.parse(fs.readFileSync(path, "utf8"));
}

function writeJson(path, data) {
  fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
}

function normalizeGerman(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

async function fetchWithRetry(url, retries = 4) {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Qatd/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return res.json();
    } catch (e) {
      lastErr = e;
      await new Promise((r) => setTimeout(r, 500 * (i + 1)));
    }
  }
  throw lastErr;
}

async function main() {
  const targetPath = process.argv[2] || "public/data/yusuf.json";
  const local = readJson(targetPath);
  if (!Array.isArray(local)) throw new Error(`${targetPath} must be an array`);

  const url = `https://quranenc.com/api/v1/translation/sura/${TRANSLATION_KEY}/${SURAH_NUMBER}`;
  const api = await fetchWithRetry(url);

  const rows = api?.result;
  if (!Array.isArray(rows)) throw new Error("Unexpected QuranEnc response: missing result[]");

  const byAya = new Map();
  for (const r of rows) {
    const aya = Number(r?.aya);
    const t = normalizeGerman(r?.translation);
    if (Number.isFinite(aya) && t) byAya.set(aya, t);
  }

  let filled = 0;
  const out = local.map((v) => {
    const ayah = Number(v?.ayah);
    if (!Number.isFinite(ayah) || ayah <= 0) return v;

    const de = byAya.get(ayah);
    if (!de) return v;

    const prev = String(v?.de ?? "").trim();
    const isEmpty = !prev || prev === "—" || prev.toLowerCase().startsWith("todo");
    if (!isEmpty) return v;

    filled += 1;
    return { ...v, de };
  });

  writeJson(targetPath, out);

  console.log(`OK: filled=${filled} verses into ${targetPath}`);
  console.log("DE sample:", out.filter((x) => x.ayah === 1 || x.ayah === 2).map((x) => ({ ayah: x.ayah, de: x.de?.slice(0, 80) })));
}

main().catch((err) => {
  console.error("[fill_de_bubenheim] FAILED:", err?.message || err);
  process.exit(1);
});
