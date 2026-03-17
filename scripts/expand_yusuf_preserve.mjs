import fs from "node:fs";

const SURA = 12;
const AYAH_COUNT = 111;
const DE_KEY = "german_bubenheim";

const pad3 = (n) => String(n).padStart(3, "0");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const writeJson = (p, v) => fs.writeFileSync(p, JSON.stringify(v, null, 2), "utf8");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, retries = 4) {
  let lastErr;
  for (let i = 0; i < retries; i += 1) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Qatd/1.0" } });
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await sleep(400 * (i + 1));
    }
  }
  throw lastErr;
}

async function fetchJson(url, retries = 4) {
  const t = await fetchText(url, retries);
  return JSON.parse(t);
}

const stripHtml = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const isEmptyText = (v) => {
  const s = String(v ?? "").trim();
  return !s || s === "—" || s.toLowerCase().startsWith("todo");
};

// mealler.org sayfasından Ali Ünal metni: "Ali Ünal" etrafındaki bloğu alıp text’e çeviriyoruz
function extractAliUnal(html) {
  const lower = html.toLowerCase();
  const idx = lower.indexOf("ali ünal");
  if (idx === -1) return null;

  const start = Math.max(0, idx - 4000);
  const end = Math.min(html.length, idx + 14000);
  const chunk = html.slice(start, end);

  const after = chunk.slice(chunk.toLowerCase().indexOf("ali ünal"));
  const text = stripHtml(after).replace(/^ali ünal\s*/i, "").trim();

  return text && text.length > 30 ? text : null;
}

// Arapça: sayfadaki en uzun Arapça (Unicode) blok
function extractArabic(html) {
  const matches = html.match(/[\u0600-\u06FF]{20,}/g);
  if (!matches?.length) return null;
  let best = matches[0];
  for (const m of matches) if (m.length > best.length) best = m;
  return best.trim();
}

async function fetchGermanMap() {
  const url = `https://quranenc.com/api/v1/translation/sura/${DE_KEY}/${SURA}`;
  const api = await fetchJson(url);
  const rows = api?.result;
  if (!Array.isArray(rows)) throw new Error("QuranEnc DE response missing result[]");

  const byAya = new Map();
  for (const r of rows) {
    const aya = Number(r?.aya);
    const t = String(r?.translation ?? "").replace(/\s+/g, " ").trim();
    if (Number.isFinite(aya) && t) byAya.set(aya, t);
  }
  return byAya;
}

async function fetchMeallerAyah(ayah) {
  const url = `https://mealler.org/SureveAyetler.aspx?sureid=${pad3(SURA)}&ayet=${pad3(ayah)}`;
  const html = await fetchText(url);
  return { url, tr: extractAliUnal(html), ar: extractArabic(html) };
}

function preserveTiming(dst, src) {
  const s = Number(src?.start);
  const e = Number(src?.end);
  if (Number.isFinite(s) && Number.isFinite(e) && e > s) {
    dst.start = s;
    dst.end = e;
  }
}

async function main() {
  const targetPath = process.argv[2] || "public/data/yusuf.json";
  const existing = readJson(targetPath);
  if (!Array.isArray(existing)) throw new Error(`${targetPath} must be an array`);

  const existingByAyah = new Map();
  for (const v of existing) {
    const ayah = Number(v?.ayah);
    if (Number.isFinite(ayah)) existingByAyah.set(ayah, v);
  }

  const deByAya = await fetchGermanMap();

  const out = [];
  const ex0 = existingByAyah.get(0);

  // ayah=0 (besmele): varsa aynen koru, yoksa ekle
  out.push(
    ex0
      ? { ...ex0 }
      : {
          ayah: 0,
          ar: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
          de: "Im Namen Allahs, des Allerbarmers, des Barmherzigen.",
          tr: "Bismillahirrahmanirrahim.",
          start: 0,
          end: 0,
        }
  );

  for (let ayah = 1; ayah <= AYAH_COUNT; ayah += 1) {
    const ex = existingByAyah.get(ayah);

    const row = {
      ayah,
      ar: ex?.ar ?? "—",
      de: ex?.de ?? "—",
      tr: ex?.tr ?? "—",
      start: Number(ex?.start ?? 0),
      end: Number(ex?.end ?? 0),
    };

    // 0..10 dahil, mevcut timing varsa ASLA bozma
    if (ex) preserveTiming(row, ex);

    // DE boşsa QuranEnc’den doldur
    if (isEmptyText(row.de)) {
      const de = deByAya.get(ayah);
      if (de) row.de = de;
    }

    // TR/AR boşsa mealler.org’dan doldur
    if (isEmptyText(row.tr) || isEmptyText(row.ar)) {
      const { tr, ar, url } = await fetchMeallerAyah(ayah);
      if (isEmptyText(row.tr) && tr) row.tr = tr;
      if (isEmptyText(row.ar) && ar) row.ar = ar;

      if ((isEmptyText(row.tr) && !tr) || (isEmptyText(row.ar) && !ar)) {
        console.warn(`WARN parse missing ayah=${ayah} ${url}`);
      }
    }

    out.push(row);

    if (ayah % 10 === 0) process.stdout.write(`✓${ayah} `);
    else process.stdout.write(".");
    if (ayah % 50 === 0) process.stdout.write("\n");
  }

  writeJson(targetPath, out);
  process.stdout.write("\n");
  console.log(`OK: wrote rows=${out.length} (ayah 0..${AYAH_COUNT}) -> ${targetPath}`);
}

main().catch((err) => {
  console.error("[expand_yusuf_preserve] FAILED:", err?.message || err);
  process.exit(1);
});
