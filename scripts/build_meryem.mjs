import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import process from "node:process";

const SURAH_ID = 19;

function getArg(flag, def = null) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return def;
}

const TR_PATH = getArg("--tr", "public/data/meryem_tr.txt");
const OUT_PATH = getArg("--out", "public/data/meryem.json");

function fetchJsonNode(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        { headers: { accept: "application/json", "user-agent": "qadt-build-script" } },
        (res) => {
          let data = "";
          res.on("data", (c) => (data += c));
          res.on("end", () => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
              return reject(new Error(`GET ${url} -> ${res.statusCode}\n${data.slice(0, 400)}`));
            }
            try {
              resolve(JSON.parse(data));
            } catch (e) {
              reject(new Error(`JSON parse error for ${url}: ${e.message}`));
            }
          });
        }
      )
      .on("error", reject);
  });
}

async function jget(url) {
  if (typeof globalThis.fetch === "function") {
    const res = await fetch(url, { headers: { accept: "application/json" } });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
    return res.json();
  }
  return fetchJsonNode(url);
}

function readTextFile(p) {
  const raw = fs.readFileSync(p, "utf8");
  return raw.replace(/^\uFEFF/, "");
}

function parseTrLines(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const map = new Map();
  const bad = [];

  for (const line of lines) {
    const m = line.match(/^(\d+)\s*(?:[\t\-–—])?\s*(.+)$/);
    if (!m) {
      bad.push(line);
      continue;
    }
    const ay = Number(m[1]);
    const tr = String(m[2] ?? "").trim();
    if (!Number.isFinite(ay) || ay <= 0 || !tr) {
      bad.push(line);
      continue;
    }
    map.set(ay, tr);
  }
  return { map, bad };
}

function ensureDirForFile(filePath) {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
}

function normalizeSpaces(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim();
}

async function main() {
  if (!fs.existsSync(TR_PATH)) {
    throw new Error(`TR file not found: ${TR_PATH}`);
  }

  const trText = readTextFile(TR_PATH);
  const { map: trMap, bad: badLines } = parseTrLines(trText);

  if (badLines.length) {
    console.warn(`⚠️ TR parse: ${badLines.length} bad line(s) ignored. First 3:`);
    console.warn(badLines.slice(0, 3));
  }

  const arUrl = `https://api.alquran.cloud/v1/surah/${SURAH_ID}/quran-uthmani`;
  const deUrl = `https://api.alquran.cloud/v1/surah/${SURAH_ID}/de.bubenheim`;

  const [arRes, deRes] = await Promise.all([jget(arUrl), jget(deUrl)]);

  const arAyahs = arRes?.data?.ayahs;
  const deAyahs = deRes?.data?.ayahs;

  if (!Array.isArray(arAyahs) || !Array.isArray(deAyahs)) {
    throw new Error("API response unexpected: missing data.ayahs arrays");
  }

  const count = Math.min(arAyahs.length, deAyahs.length);
  const out = [];

  for (let i = 0; i < count; i++) {
    const a = arAyahs[i];
    const d = deAyahs[i];

    const ayah = Number(a?.numberInSurah);
    const ar = String(a?.text ?? "").trim();
    const de = String(d?.text ?? "").trim();

    if (!Number.isFinite(ayah) || ayah <= 0) continue;

    const tr = trMap.has(ayah) ? String(trMap.get(ayah)) : "";

    out.push({
      ayah,
      ar,
      de: normalizeSpaces(de),
      tr: normalizeSpaces(tr),
      start: null,
      end: null,
    });
  }

  const missingTr = out.filter((x) => !x.tr).map((x) => x.ayah);
  if (missingTr.length) {
    console.warn(
      `⚠️ Missing TR for ${missingTr.length} ayah(s). First 15: ${missingTr.slice(0, 15).join(", ")}`
    );
  }

  ensureDirForFile(OUT_PATH);
  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2), "utf8");

  console.log(`✅ Wrote: ${OUT_PATH}`);
  console.log(`   Surah: ${SURAH_ID} | ayahs: ${out.length}`);
  console.log(`   TR source: ${TR_PATH}`);
}

main().catch((e) => {
  console.error("❌ build_meryem failed:");
  console.error(e?.stack || e?.message || e);
  process.exit(1);
});
