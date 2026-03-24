// =========================
// FILE: src/App.jsx (FULL - MAX PERF, FUNCS SAFE)  // ✅ Git commit removed
// =========================
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./styles.css";

const SURAHES = [
  {
    id: 12,
    slug: "yusuf",
    nameAr: "يوسف",
    nameTr: "Yusuf",
    nameDe: "Yusuf",
    ayahCount: 111,
    audioUrl: "/audio/yusuf.mp3",
    versesUrl: "/data/yusuf.json",
  },
  {
    id: 19,
    slug: "meryem",
    nameAr: "مريم",
    nameTr: "Meryem",
    nameDe: "Maryam",
    ayahCount: 98,
    audioUrl: "/audio/meryem.mp3",
    versesUrl: "/data/meryem.json",
  },
];

/**
 * SEGMENTS: only the parts you provided are colored.
 * - ar: highlight + color
 * - tr/de: color only
 */
const SEGMENTS = {
  6: {
    color: "green",
    ar: "إِنَّ رَبَّكَ عَلِيمٌ حَكِيمٌۭ",
    de: "Gewiß, dein Herr ist Allwissend und Allweise.",
    tr: "“Şüphesiz ki Rabbin, (her şeyi) hakkıyla bilendir; her hüküm ve icraatında pek çok hikmetler bulunandır.”",
  },
  18: {
    color: "green",
    ar: "فَصَبْرٌۭ جَمِيلٌۭ ۖ وَٱللَّهُ ٱلْمُسْتَعَانُ عَلَىٰ مَا تَصِفُونَ",
    de: "(So gilt es,) schöne Geduld (zu üben). Allah ist Derjenige, bei Dem Hilfe zu suchen ist gegen das, was ihr beschreibt.",
    tr: "“Artık bana düşen, güzelce sabretmektir. Sizin bu anlattıklarınız karşısında yardımına müracaat edilecek sadece Allah var.”",
  },
  21: {
    color: "green",
    ar: "وَٱللَّهُ غَالِبٌ عَلَىٰٓ أَمْرِهِۦ وَلَٰكِنَّ أَكْثَرَ ٱلنَّاسِ لَا يَعْلَمُونَ",
    de: "Und Allah ist in Seiner Angelegenheit überlegen. Aber die meisten Menschen wissen nicht.",
    tr: "“Allah, neyi diler, neye hükmederse onu muhakkak yerine getirir. Ne var ki, insanların çoğu bunu bilmez.”",
  },
  22: {
    color: "green",
    ar: "وَكَذَٰلِكَ نَجْزِى ٱلْمُحْسِنِينَ",
    de: "So vergelten Wir den Gutes Tuenden.",
    tr: "“Kendilerini iyiliğe adamış, daima Allah’ı görüyormuşçasına ve Allah’ın kendilerini gördüğünün şuuru içinde davrananları işte böyle mükâfatlandırırız.”",
  },
  33: {
    color: "red",
    ar: "وَإِلَّا تَصْرِفْ عَنِّى كَيْدَهُنَّ أَصْبُ إِلَيْهِنَّ وَأَكُن مِّنَ ٱلْجَٰهِلِينَ",
    de: "Und wenn Du ihre List von mir nicht abwendest, werde ich mich zu ihnen hingezogen fühlen und zu den Toren gehören.",
    tr: "“Eğer fendlerini bozup beni onlardan kurtarmazsan, kayıp onlara meyleder ve cahillerden (doğru nedir, yanlış nedir bilmeyen, bilseler bile yapmamaları gerekeni bile bile yapanlardan) olurum.”",
  },
  34: {
    color: "green",
    ar: "إِنَّهُۥ هُوَ ٱلسَّمِيعُ ٱلْعَلِيمُ",
    de: "Er ist ja der Allhörende und Allwissende.",
    tr: "Hiç şüphesiz O’dur Semî‘ (her şeyi, her duayı hakkıyla işiten); Alîm (her şeyi, herkesin durumunu hakkıyla bilen).”",
  },
  40: {
    color: "green",
    ar: "إِنِ ٱلْحُكْمُ إِلَّا لِلَّهِ ۚ أَمَرَ أَلَّا تَعْبُدُوٓا۟ إِلَّآ إِيَّاهُ ۚ ذَٰلِكَ ٱلدِّينُ ٱلْقَيِّمُ وَلَٰكِنَّ أَكْثَرَ ٱلنَّاسِ لَا يَعْلَمُونَ",
    de: "Das Urteil ist allein Allahs. Er hat befohlen, daß ihr nur Ihm dienen sollt. Das ist die richtige Religion. Aber die meisten Menschen wissen nicht.",
    tr: "“Şurası bir gerçek ki, mutlak manâda hükmetme yetkisi sadece Allah’a aittir. O, Kendisinden başka hiç bir varlığa ibadet etmemenizi emretmiştir. Budur doğru ve her bakımdan sağlam din. Ne var ki, insanların çoğu bilmemekte ve bilgisizce hareket etmektedir.”",
  },
  // ✅ FIX: 12:53
  53: {
    color: "green",
    ar: "إِنَّ ٱلنَّفْسَ لَأَمَّارَةٌۢ بِٱلسُّوٓءِ إِلَّا مَا رَحِمَ رَبِّىٓ ۚ إِنَّ رَبِّى غَفُورٌۭ رَّحِيمٌۭ",
    de: "Die Seele gebietet fürwahr mit Nachdruck das Böse, außer daß mein Herr Sich erbarmt. Mein Herr ist Allvergebend und Barmherzig.",
    tr: "“Çünkü nefis, daima ve ısrarla kötülüğü emreder; meğer ki Rabbim, hususî olarak merhamet edip koruya. Şurası bir gerçek ki Rabbim, günahları pek çok bağışlayandır; (bilhassa inanmış kullarına karşı) hususî rahmeti pek bol olandır.”",
  },
  56: {
    color: "green",
    ar: "نُصِيبُ بِرَحْمَتِنَا مَن نَّشَآءُ ۖ وَلَا نُضِيعُ أَجْرَ ٱلْمُحْسِنِينَ",
    de: "Wir treffen mit Unserer Barmherzigkeit, wen Wir wollen, und Wir lassen den Lohn der Gutes Tuenden nicht verlorengehen.",
    tr: "“Kimi dilersek ona bu şekilde hususî rahmetimizle muamele eder ve bütünüyle iyiliğe adanmış olarak, Allah’ı görür gibi, en azından O’nun kendilerini gördüğünün şuuru içinde davrananların mükâfatını asla zayi etmeyiz.”",
  },
  64: {
    color: "green",
    ar: "فَٱللَّهُ خَيْرٌ حَٰفِظًۭا ۖ وَهُوَ أَرْحَمُ ٱلرَّٰحِمِينَ",
    de: "Allah ist besser als Behütender, und Er ist der Barmherzigste der Barmherzigen.",
    tr: "“Ama Allah’tır gerçek hayırlı koruyucu ve O, bütün merhamet edenlerin üstünde mutlak merhamet sahibidir.”",
  },
  66: {
    color: "green",
    ar: "قَالَ ٱللَّهُ عَلَىٰ مَا نَقُولُ وَكِيلٌۭ",
    de: "Allah ist Sachwalter über das, was wir (hier) sagen.",
    tr: "“Allah konuştuklarımıza şahit ve gözeticidir; verilen sözlerin yerine gelip gelmemesi nihayette yine O’nun iznine ve kudretine bağlıdır.”",
  },
  67: {
    color: "green",
    ar: "إِنِ ٱلْحُكْمُ إِلَّا لِلَّهِ ۖ عَلَيْهِ تَوَكَّلْتُ ۖ وَعَلَيْهِ فَلْيَتَوَكَّلِ ٱلْمُتَوَكِّلُونَ",
    de: "Das Urteil ist allein Allahs. Auf Ihn verlasse ich mich; und auf Ihn sollen sich diejenigen verlassen, die sich (überhaupt auf jemanden) verlassen (wollen).",
    tr: "“Mutlak manâda bütün hüküm ve hakimiyet ancak Allah’ındır. Ancak O’na dayanır, O’na güvenirim. Kendisine dayanıp güvenecek bir güç ve makam arayan herkes (bütün insanlar), ancak O’na dayanıp güvenmelidirler.”",
  },
  76: {
    color: "green",
    ar: "إِلَّآ أَن يَشَآءَ ٱللَّهُ ۚ نَرْفَعُ دَرَجَٰتٍۢ مَّن نَّشَآءُ ۗ وَفَوْقَ كُلِّ ذِى عِلْمٍ عَلِيمٌۭ",
    de: "außer daß Allah es wollte. Wir erhöhen, wen Wir wollen, um Rangstufen. Und über jedem, der Wissen besitzt, steht einer, der (noch mehr) weiß.",
    tr: "“fakat Allah ne dilerse o olur (ve Allah, bir şeyi dileyince onun sebeplerini de hazırlar). Biz, kimi dilersek onu böyle mertebe mertebe yükseltiriz. Ve her bir bilgi sahibinin üstünde daha iyi bir bilen (ve hepsinin üstünde her şeyi bilen olarak Allah) vardır.”",
  },
  80: {
    color: "green",
    ar: "وَهُوَ خَيْرُ ٱلْحَٰكِمِينَ",
    de: "Er ist der Beste derer, die Urteile fällen.",
    tr: "“Allah, her zaman en hayırlı hükmü verendir.”",
  },
  86: {
    color: "red",
    ar: "إِنَّمَآ أَشْكُوا۟ بَثِّى وَحُزْنِىٓ إِلَى ٱللَّهِ",
    de: "Ich klage meinen unerträglichen Kummer und meine Trauer nur Allah (allein)",
    tr: "“Ben, bütün dertlerimi, keder ve hüznümü Allah’a arz ediyor, O’na şikâyette bulunuyorum.”",
  },
  87: {
    color: "green",
    ar: "وَلَا تَا۟يْـَٔسُوا۟ مِن رَّوْحِ ٱللَّهِ ۖ إِنَّهُۥ لَا يَا۟يْـَٔسُ مِن رَّوْحِ ٱللَّهِ إِلَّا ٱلْقَوْمُ ٱلْكَٰفِرُونَ",
    de: "Und gebt nicht die Hoffnung auf das Erbarmen Allahs auf. Es gibt die Hoffnung auf das Erbarmen Allahs nur das ungläubige Volk auf.",
    tr: "“Allah’ın rahmetinden asla ümidinizi kesmeyin. Şurası bir gerçek ki, O’na inanmayan kâfirler güruhu dışında hiç kimse Allah’ın rahmetinden ümit kesmez.”",
  },
  88: {
    color: "green",
    ar: "إِنَّ ٱللَّهَ يَجْزِى ٱلْمُتَصَدِّقِينَ",
    de: "Allah vergilt denjenigen, die Almosen geben.",
    tr: "“Hiç kuşkusuz Allah, fazladan iyilikte bulunanları bol bol mükâfatlandırır.”",
  },
  90: {
    color: "green",
    ar: "إِنَّ ٱللَّهُ لَا يُضِيعُ أَجْرَ ٱلْمُحْسِنِينَ",
    de: "Gewiß, Allah läßt den Lohn der Gutes Tuenden nicht verlorengehen.",
    tr: "“Doğrusu şu ki, kim O’na karşı derin saygı duyar, O’na karşı gelmekten sakınır ve O’na itaatla birlikte başına gelenlere de sabrederse, hiç şüphesiz Allah, böyle iyiliğe adanmış ve O’nu görürcesine davranan kimselerin mükâfatını asla zayi etmez.”",
  },
  91: {
    color: "green",
    ar: "تَٱللَّهِ لَقَدْ ءَاثَرَكَ ٱللَّهُ عَلَيْنَا وَإِن كُنَّا لَخَٰطِـِٔينَ",
    de: "Bei Allah, Allah hat dich uns vorgezogen. Und wir haben wahrlich Verfehlungen begangen.",
    tr: "“Allah’a yemin olsun ki, gerçekten Allah seni bize tercih etti; biz, başka değil, ancak bir yanlış içinde idik.”",
  },
  92: {
    color: "green",
    ar: "لَا تَثْرِيبَ عَلَيْكُمُ ٱلْيَوْمَ ۖ يَغْفِرُ ٱللَّهُ لَكُمْ ۖ وَهُوَ أَرْحَمُ ٱلرَّٰحِمِينَ",
    de: "Keine Schelte soll heute über euch kommen. Allah vergibt euch, Er ist ja der Barmherzigste der Barmherzigen.",
    tr: "“Hayır! Bugün size hiçbir kınama yok! (Ben hakkımı çoktan helâl ettim;) Allah da sizi affetsin. Çünkü O, bütün merhamet edenlerin üstünde mutlak merhamet sahibidir.”",
  },
  98: {
    color: "green",
    ar: "إِنَّهُۥ هُوَ ٱلْغَفُورُ ٱلرَّحِيمُ",
    de: "Er ist ja der Allvergebende und Barmherzige.",
    tr: "“Hiç şüphesiz O, Ğafûr (günahları çok bağışlayan)dır; Rahîm (bilhassa tevbe ile Kendisine yönelen mü’ min kullarına karşı hususî rahmeti pek bol olan)dır.”",
  },
  100: {
    color: "green",
    ar: "إِنَّ رَبِّى لَطِيفٌۭ لِّمَا يَشَآءُ ۚ إِنَّهُۥ هُوَ ٱلْعَلِيمُ ٱلْحَكِيمُ",
    de: "Gewiß, mein Herr ist feinfühlig (in der Durchführung dessen), was Er will. Er ist ja der Allwissende und Allweise.",
    tr: "“Gerçekten Rabbim, her ne dilerse onu pek güzel şekilde ve insanların göremeyeceği bir incelik içinde yerine getirir. Şüphesiz O, evet O, Alîm (her şeyi hakkıyla bilen)dir; Hakîm (bütün hüküm ve icraatında pek çok hikmetler bulunan)dır.”",
  },
  101: {
    color: "red",
    ar: "تَوَفَّنِى مُسْلِمًۭا وَأَلْحِقْنِى بِٱلصَّٰلِحِينَ",
    de: "Berufe mich als (Dir) ergeben ab und nimm mich unter die Rechtschaffenen auf.",
    tr: "“Beni Müslüman olarak vefat ettir ve beni salihler içine kat!”",
  },
  108: {
    color: "green",
    ar: "قُلْ هَٰذِهِۦ سَبِيلِىٓ أَدْعُوٓا۟ إِلَى ٱللَّهِ ۚ عَلَىٰ بَصِيرَةٍ أَنَا۠ وَمَنِ ٱتَّبَعَنِى ۖ وَسُبْحَٰنَ ٱللَّهِ وَمَآ أَنَا۠ مِنَ ٱلْمُشْرِكِينَ",
    de: "Sag: Das ist mein Weg: Ich rufe zu Allah aufgrund eines sichtbaren Hinweises, ich und diejenigen, die mir folgen. Preis sei Allah! Und ich gehöre nicht zu den Götzendienern.",
    tr: "“İşte benim (iman, ihlâs ve Tevhid) yolum: Ben, (körü körüne ve taklide dayalı olarak değil,) görerek, delile dayanarak ve insanların idrakine hitap ederek Allah’a çağırıyorum: ben ve bana tâbi olanlar. Ve Allah’ı şirkin her türlüsünden tenzih ederim, asla O’na ortak tanıyanlardan değilim ben.”",
  },
};

function resolvePublicUrl(path) {
  const base = import.meta.env.BASE_URL || "/";
  const p = String(path || "").replace(/^\//, "");
  const b = String(base || "/");
  return new URL(`${b}${p}`, window.location.origin).toString();
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00.00";
  const s = Math.max(0, sec);
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  const ms = Math.floor((s - Math.floor(s)) * 100);
  return `${mm}:${String(ss).padStart(2, "0")}.${String(ms).padStart(2, "0")}`;
}

function formatSec(sec) {
  return Number.isFinite(sec) ? `${sec.toFixed(2)}s` : "—";
}

function tactilePulse(ms = 8) {
  try {
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate(ms);
    }
  } catch {}
}

/* =========================
   Active verse index (FAST)
   ========================= */

function isMonotonicNonDecreasing(arr) {
  for (let i = 1; i < arr.length; i += 1) {
    if (!(arr[i] >= arr[i - 1])) return false;
  }
  return true;
}

function findActiveVerseIndexBinary(starts, ends, t) {
  if (!Number.isFinite(t) || !starts.length || starts.length !== ends.length) return -1;

  let lo = 0;
  let hi = starts.length - 1;
  let best = -1;

  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = starts[mid];
    if (s <= t) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best < 0) return 0;
  const e = ends[best];
  if (Number.isFinite(e) && t < e) return best;

  return best;
}

// Fallback (overlap-safe)
function findActiveVerseIndexLinearOverlapSafe(verses, t) {
  if (!Array.isArray(verses) || verses.length === 0 || !Number.isFinite(t)) return -1;

  let bestIdx = -1;
  let bestStart = -Infinity;

  for (let i = 0; i < verses.length; i += 1) {
    const v = verses[i];
    const start = Number(v?.start);
    const end = Number(v?.end);
    if (!Number.isFinite(start) || !Number.isFinite(end)) continue;
    if (start <= t && t < end && start > bestStart) {
      bestStart = start;
      bestIdx = i;
    }
  }
  if (bestIdx !== -1) return bestIdx;

  let closest = -1;
  let bestDelta = Infinity;
  for (let i = 0; i < verses.length; i += 1) {
    const start = Number(verses[i]?.start);
    if (!Number.isFinite(start)) continue;
    const d = Math.abs(t - start);
    if (d < bestDelta) {
      bestDelta = d;
      closest = i;
    }
  }
  return closest;
}

/* =========================
   Sticky scroll helper
   ========================= */
function getStickyOverlayTopPx() {
  const el = document.querySelector(".playerSticky");
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.height <= 0) return null;
  if (r.bottom <= 0 || r.top >= window.innerHeight) return null;
  return r.top;
}

function ensureRowVisible(el, padding = 10) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const overlayTop = getStickyOverlayTopPx();

  const viewportTop = padding;
  const viewportBottom = window.innerHeight - padding;
  const effectiveBottom =
    overlayTop != null ? Math.min(viewportBottom, overlayTop - padding) : viewportBottom;

  const above = r.top < viewportTop;
  const below = r.bottom > effectiveBottom;

  if (above || below) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* =========================
   JSON tolerant
   ========================= */
function parseJsonTolerant(text, urlForMsg = "") {
  const raw = String(text ?? "");
  let s = raw.replace(/^\uFEFF/, "").trim();

  if (
    s.startsWith("<!doctype") ||
    s.startsWith("<html") ||
    s.startsWith("<head") ||
    s.startsWith("<")
  ) {
    throw new Error(`Expected JSON but got HTML | url=${urlForMsg} | head=${s.slice(0, 80)}`);
  }

  s = s.replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(s);
  } catch (e) {
    const msg = String(e?.message || e);
    const m = msg.match(/position\s+(\d+)/i);
    if (m) {
      const pos = Number(m[1]);
      const from = Math.max(0, pos - 80);
      const to = Math.min(s.length, pos + 80);
      const ctx = s.slice(from, to).replaceAll("\n", "\\n");
      throw new Error(`JSON parse failed | url=${urlForMsg} | pos=${pos} | ctx=...${ctx}...`);
    }
    throw new Error(`JSON parse failed | url=${urlForMsg} | msg=${msg}`);
  }
}

/* =========================
   Segment marking (robust + cached)
   ========================= */

function stripOuterQuotes(s) {
  const t = String(s ?? "").trim();
  return t.replace(/^["“”]+/, "").replace(/["“”]+$/, "").trim();
}

function normalizeCommon(s) {
  return String(s ?? "")
    .replaceAll("\u00A0", " ")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRegexLiteral(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeArabicSnippet(snippet) {
  return String(snippet || "")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .trim();
}

function buildArabicLooseRegex(snippet) {
  const base = normalizeArabicSnippet(snippet);
  if (!base) return null;

  const DIACR = "[\\u064B-\\u065F\\u0670\\u06D6-\\u06ED]*";
  const TAT = "\\u0640*";
  const WS = "\\s*";

  const chars = Array.from(base);
  const parts = [];

  for (const ch of chars) {
    if (/\s/.test(ch)) {
      parts.push(WS);
      continue;
    }
    const esc = escapeRegexLiteral(ch);
    parts.push(`${TAT}${esc}${DIACR}`);
  }

  return new RegExp(parts.join(""), "g");
}

function isArabicIgnorable(ch) {
  return /[\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/.test(ch);
}

function foldArabicChar(ch) {
  switch (ch) {
    case "ٱ":
    case "أ":
    case "إ":
    case "آ":
      return "ا";
    case "ى":
      return "ي";
    case "ؤ":
      return "و";
    case "ئ":
      return "ي";
    case "ة":
      return "ه";
    default:
      return ch;
  }
}

function normalizeArabicForSearch(original) {
  const s = String(original ?? "");
  let norm = "";
  const map = [];

  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];

    if (isArabicIgnorable(ch)) continue;

    if (/\s/.test(ch)) {
      if (norm.length && norm[norm.length - 1] !== " ") {
        map.push(i);
        norm += " ";
      }
      continue;
    }

    const folded = foldArabicChar(ch);
    map.push(i);
    norm += folded;
  }

  return { norm: norm.trim().replace(/\s+/g, " "), map };
}

function extendArabicMatchEnd(original, endIndexExclusive) {
  const s = String(original ?? "");
  let end = endIndexExclusive;
  while (end < s.length && isArabicIgnorable(s[end])) end += 1;
  return end;
}

function markArabicByNormalizedMapping(text, snippet, className) {
  const s = String(text ?? "");
  const needleRaw = String(snippet ?? "");
  if (!s || !needleRaw) return null;

  const { norm: textN, map: textMap } = normalizeArabicForSearch(s);
  const { norm: needleN } = normalizeArabicForSearch(needleRaw);

  if (!textN || !needleN) return null;

  const idxN = textN.indexOf(needleN);
  if (idxN < 0) return null;

  const startOrig = textMap[idxN];
  const lastNormPos = idxN + needleN.length - 1;
  const lastOrig = textMap[lastNormPos];

  if (startOrig == null || lastOrig == null) return null;

  const endOrigExclusive = extendArabicMatchEnd(s, lastOrig + 1);

  return (
    <>
      {s.slice(0, startOrig)}
      <span className={className}>{s.slice(startOrig, endOrigExclusive)}</span>
      {s.slice(endOrigExclusive)}
    </>
  );
}

function applyRegexMarkFirst(text, regex, className) {
  const s = String(text ?? "");
  if (!s || !regex) return s;

  regex.lastIndex = 0;
  const m = regex.exec(s);
  if (!m) return s;

  const start = m.index;
  const matchText = m[0] ?? "";
  const end = start + matchText.length;

  return (
    <>
      {s.slice(0, start)}
      <span className={className}>{matchText}</span>
      {s.slice(end)}
    </>
  );
}

function splitAndMarkFirst(text, needle, className) {
  const s = String(text ?? "");
  const n = String(needle ?? "");
  if (!s || !n) return s;

  const idx = s.indexOf(n);
  if (idx < 0) return s;

  return (
    <>
      {s.slice(0, idx)}
      <span className={className}>{n}</span>
      {s.slice(idx + n.length)}
    </>
  );
}

function markSegmentUncached(text, ayah, lang) {
  const s = String(text ?? "");
  const a = Number(ayah);
  const seg = SEGMENTS[a];
  if (!seg) return s;

  const color = seg.color === "green" ? "green" : "red";
  const rawNeedle = seg[lang];
  if (!rawNeedle) return s;

  if (lang === "ar") {
    const cls = color === "green" ? "mark markGreen" : "mark markRed";
    const mapped = markArabicByNormalizedMapping(s, rawNeedle, cls);
    if (mapped) return mapped;
    const rx = buildArabicLooseRegex(rawNeedle);
    return applyRegexMarkFirst(s, rx, cls);
  }

  const cls = color === "green" ? "fontGreen" : "fontRed";
  const needle = stripOuterQuotes(rawNeedle);

  const direct = splitAndMarkFirst(s, needle, cls);
  if (direct !== s) return direct;

  const sN = normalizeCommon(s);
  const nN = normalizeCommon(needle);
  if (!sN || !nN) return s;

  const idxN = sN.indexOf(nN);
  if (idxN < 0) return s;

  return <span className={cls}>{s}</span>;
}

function useMarkSegmentCached() {
  const cacheRef = useRef(new Map());

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  const markSegment = useCallback((text, ayah, lang) => {
    const s = String(text ?? "");
    const key = `${Number(ayah) || 0}|${lang}|${s}`;
    const hit = cacheRef.current.get(key);
    if (hit !== undefined) return hit;

    const out = markSegmentUncached(s, ayah, lang);
    cacheRef.current.set(key, out);
    return out;
  }, []);

  return { markSegment, clearCache: clear };
}

/* =========================
   UI Components
   ========================= */

function SurahList({ surahs, selectedId, query, onQuery, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <h1 className="appTitle">Türkçe-Almanca Kur’an Player</h1>
        <label className="fieldLabel" htmlFor="search">
          Search (name / id / slug)
        </label>
        <input
          id="search"
          className="searchInput"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="e.g. yusuf, 12, يوسف"
          autoComplete="off"
        />
      </div>

      <div className="surahList" role="list">
        {surahs.map((s) => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              className={`surahCard ${active ? "active" : ""}`}
              onClick={() => onSelect(s)}
              type="button"
            >
              <div className="surahCardTop">
                <div className="surahId">#{s.id}</div>
                <div className="surahSlug">{s.slug}</div>
              </div>
              <div className="surahNames">
                <div className="surahNameStrong">{s.nameTr}</div>
                <div className="surahNameMuted">{s.nameDe}</div>
                <div className="surahNameAr" dir="rtl">
                  {s.nameAr}
                </div>
              </div>
              <div className="surahMeta">{s.ayahCount} ayahs</div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Timeline({
  duration,
  currentTime,
  verses,
  activeIndex,
  onSeek,
  onSeekVerse,
  showMarkers,
  markerEvery,
}) {
  const trackRef = useRef(null);

  const markers = useMemo(() => {
    if (!showMarkers || !Number.isFinite(duration) || duration <= 0) return [];
    return verses
      .map((v, idx) => {
        const start = Number(v?.start);
        if (!Number.isFinite(start)) return null;
        const leftPct = clamp((start / duration) * 100, 0, 100);
        const ay = Number(v?.ayah);
        const show =
          idx === activeIndex ||
          markerEvery === 1 ||
          (Number.isFinite(ay) && ay > 0 && ay % markerEvery === 0);
        return { idx, leftPct, ayah: v.ayah, show };
      })
      .filter(Boolean)
      .filter((m) => m.show);
  }, [verses, duration, showMarkers, activeIndex, markerEvery]);

  const onClickTrack = (e) => {
    if (!trackRef.current || !Number.isFinite(duration) || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = clamp(e.clientX - rect.left, 0, rect.width);
    const t = (x / rect.width) * duration;
    onSeek(t);
  };

  return (
    <div className="timeline">
      <div className="timelineTop">
        <div className="timeReadout">
          <span className="mono">{formatTime(currentTime)}</span>
          <span className="muted"> / </span>
          <span className="mono muted">{formatTime(duration)}</span>
          <span className="muted"> • </span>
          <span className="mono muted">{formatSec(currentTime)}</span>
        </div>
        <div className="timelineHint muted">Drag • Click markers • Shift+←/→ ±0.1s</div>
      </div>

      <div className="timelineTrack" ref={trackRef} onClick={onClickTrack} role="presentation">
        <div
          className="timelineProgress"
          style={{
            width:
              Number.isFinite(duration) && duration > 0
                ? `${clamp((currentTime / duration) * 100, 0, 100)}%`
                : "0%",
          }}
        />
        {markers.map((m) => (
          <button
            key={`${m.idx}-${m.ayah}`}
            type="button"
            className={`timelineMarker ${m.idx === activeIndex ? "active" : ""}`}
            style={{ left: `${m.leftPct}%` }}
            title={`Ayah ${m.ayah}`}
            onClick={(ev) => {
              ev.stopPropagation();
              tactilePulse(8);
              onSeekVerse(m.idx);
            }}
          />
        ))}
      </div>

      <input
        className="timelineSlider"
        type="range"
        min={0}
        max={Number.isFinite(duration) && duration > 0 ? duration : 0}
        step={0.01}
        value={Number.isFinite(currentTime) ? currentTime : 0}
        onChange={(e) => onSeek(Number(e.target.value))}
        aria-label="Seek audio"
      />
    </div>
  );
}

/**
 * iOS-like vertical wheel (3D)
 */
function IOSPickerWheelVertical3D({ disabled, value, onStep }) {
  const ref = useRef(null);

  const draggingRef = useRef(false);
  const lastYRef = useRef(0);
  const lastTsRef = useRef(0);

  const velRef = useRef(0);
  const accumPxRef = useRef(0);
  const rafRef = useRef(0);

  const STEP_PX = 12;

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    velRef.current = 0;
    accumPxRef.current = 0;
  };

  const tickSteps = () => {
    let did = false;

    while (accumPxRef.current <= -STEP_PX) {
      onStep(+1);
      accumPxRef.current += STEP_PX;
      did = true;
    }

    while (accumPxRef.current >= STEP_PX) {
      onStep(-1);
      accumPxRef.current -= STEP_PX;
      did = true;
    }

    if (did) tactilePulse(8);
  };

  const startInertia = () => {
    const v0 = velRef.current;
    if (!Number.isFinite(v0) || Math.abs(v0) < 0.05) {
      stop();
      return;
    }

    const DECAY = 0.0045;
    const MAX_MS = 1100;
    const startTs = performance.now();
    let last = performance.now();

    const frame = () => {
      const now = performance.now();
      const dt = now - last;
      last = now;

      const sign = Math.sign(velRef.current || v0);
      const sp = Math.abs(velRef.current || v0);
      const nextSp = Math.max(0, sp * (1 - DECAY * dt));
      velRef.current = sign * nextSp;

      accumPxRef.current += velRef.current * dt;
      tickSteps();

      if (nextSp < 0.05 || now - startTs > MAX_MS) {
        stop();
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };

    rafRef.current = requestAnimationFrame(frame);
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    stop();
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    lastTsRef.current = performance.now();
    ref.current?.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (disabled || !draggingRef.current) return;

    const now = performance.now();
    const dy = e.clientY - lastYRef.current;
    const dt = Math.max(1, now - (lastTsRef.current || now));

    lastYRef.current = e.clientY;
    lastTsRef.current = now;

    velRef.current = dy / dt;
    accumPxRef.current += dy;
    tickSteps();
  };

  const onPointerUp = () => {
    draggingRef.current = false;
    startInertia();
  };

  const onWheel = (e) => {
    if (disabled) return;
    e.preventDefault();
    stop();

    const dy = e.deltaY;
    const steps = clamp(Math.round(Math.abs(dy) / 18), 1, 14);
    const dir = dy < 0 ? +1 : -1;

    for (let i = 0; i < steps; i += 1) onStep(dir);
    tactilePulse(8);

    velRef.current = clamp(dy / 820, -1.0, 1.0);
    startInertia();
  };

  const items = useMemo(() => {
    const v = Number(value) || 0;
    return [v - 3, v - 2, v - 1, v, v + 1, v + 2, v + 3];
  }, [value]);

  const angles = [-82, -54, -28, 0, 28, 54, 82];
  const radius = 90;

  return (
    <div className={`spPicker3D ${disabled ? "disabled" : ""}`}>
      <div className="spPickerShine" />
      <div className="spPickerFadeTop" />
      <div className="spPickerFadeBottom" />
      <div className="spPickerBar" />

      <div
        ref={ref}
        className="spPickerViewport"
        role="slider"
        aria-label="Ayet çarkı"
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <div className="spPickerItems3D">
          {items.map((n, i) => {
            const ang = angles[i] ?? 0;
            const active = n === Number(value);

            const abs = Math.abs(ang);
            const opacity = clamp(1 - abs / 92, 0.12, 1);
            const blur = clamp(abs / 55, 0, 1.4);
            const scale = clamp(1 - abs / 220, 0.86, 1);

            return (
              <div
                key={n}
                className={`spPickerItem3D ${active ? "active" : ""}`}
                style={{
                  opacity,
                  filter: `blur(${blur}px)`,
                  transform: `rotateX(${ang}deg) translateZ(${radius}px) scale(${scale})`,
                }}
              >
                {n <= 0 ? "—" : String(n).padStart(2, "0")}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function SinglePlayerPanel({
  open,
  verse,
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  onClose,
  dialDisabled,
  onDialStep,
  repeatMode,
  onToggleRepeat,
  markSegment,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause();
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        onPrev();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPlayPause, onPrev, onNext]);

  if (!open) return null;

  const ay = Number(verse?.ayah || 0);

  return (
    <div
      className="singlePlayerBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Single Player"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="singlePlayerCard">
        <div className="singlePlayerLines">
          <div className="singlePlayerLine singlePlayerLineAr" dir="rtl">
            {markSegment((verse?.ar || "—").trim(), ay, "ar")}
          </div>

          <div className="singlePlayerLine singlePlayerLineDe">
            {markSegment((verse?.de || "—").trim(), ay, "de")}
          </div>

          <div className="singlePlayerLine singlePlayerLineTr">
            {markSegment((verse?.tr || "—").trim(), ay, "tr")}
          </div>

          <div style={{ height: 140 }} />
        </div>
      </div>

      <div className="singlePlayerDockBottom" aria-label="Player Dock">
        <div className="singlePlayerDockRow">
          <button className="spBtn" type="button" onClick={onPrev} aria-label="Prev">
            ◀
          </button>

          <button
            className="spBtn spBtnPrimary"
            type="button"
            onClick={onPlayPause}
            aria-label="Play/Pause"
          >
            {isPlaying ? "⏸" : "▶"}
          </button>

          <button className="spBtn" type="button" onClick={onNext} aria-label="Next">
            ▶
          </button>

          <IOSPickerWheelVertical3D disabled={dialDisabled} value={ay} onStep={onDialStep} />

          <button
            className={`spRBtn ${repeatMode ? "on" : "off"}`}
            type="button"
            onClick={() => {
              tactilePulse(10);
              onToggleRepeat();
            }}
            aria-label="Repeat"
          >
            {repeatMode === 2 ? "rr" : "r"}
          </button>

          <button className="spBtn spBtnClose" type="button" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}

function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  collapsed,
  onToggleCollapsed,
  onPlayPause,
  onPrev,
  onNext,
  onNudge,
  loopAyah,
  onToggleLoopAyah,
  loopAB,
  onToggleLoopAB,
  rate,
  onRate,
  markersOn,
  onToggleMarkers,
  markerEvery,
  onMarkerEvery,
  aPoint,
  bPoint,
  onSetA,
  onSetB,
  singleOn,
  onToggleSingle,
}) {
  return (
    <div className="playerControls">
      <div className="liveTimeBar">
        <div className="liveTime">
          <span className="liveLabel">LIVE</span>
          <span className="liveSec">
            {Number.isFinite(currentTime) ? currentTime.toFixed(2) : "0.00"}s
          </span>
          <span className="liveDur muted">
            / {Number.isFinite(duration) ? duration.toFixed(2) : "0.00"}s
          </span>
        </div>

        <div className="liveActions">
          <button className="btnPrimary" type="button" onClick={onPlayPause}>
            {isPlaying ? "Pause" : "Play"}
          </button>
          <button className="btnSmall" type="button" onClick={onPrev} title="Prev ayah">
            ◀
          </button>
          <button className="btnSmall" type="button" onClick={onNext} title="Next ayah">
            ▶
          </button>

          <button
            className={`btnSinglePlayer ${singleOn ? "on" : ""}`}
            type="button"
            onClick={onToggleSingle}
          >
            {singleOn ? "Single Player: ON" : "Single Player"}
          </button>

          <button
            className="btnSmall btnToggle"
            type="button"
            onClick={onToggleCollapsed}
            title="Toggle tools"
          >
            {collapsed ? "Open tools" : "Close tools"}
          </button>
        </div>
      </div>

      {collapsed ? null : (
        <>
          <div className="btnRow">
            <button className="btnSmall" type="button" onClick={() => onNudge(-1)}>
              -1s
            </button>
            <button className="btnSmall" type="button" onClick={() => onNudge(-0.1)}>
              -0.1
            </button>
            <button className="btnSmall" type="button" onClick={() => onNudge(+0.1)}>
              +0.1
            </button>
            <button className="btnSmall" type="button" onClick={() => onNudge(+1)}>
              +1s
            </button>

            <div className="divider" />

            <label className="chip" title="Loop current ayah (L)">
              <input type="checkbox" checked={loopAyah} onChange={onToggleLoopAyah} />
              Loop ayah (L)
            </label>

            <label className="chip" title="Loop A..B (Shift+L)">
              <input type="checkbox" checked={loopAB} onChange={onToggleLoopAB} />
              Loop A..B (Shift+L)
            </label>

            <button className="btnSmall" type="button" onClick={onSetA} title="Set A (A)">
              Set A {aPoint != null ? `(${formatTime(aPoint)})` : ""}
            </button>
            <button className="btnSmall" type="button" onClick={onSetB} title="Set B (B)">
              Set B {bPoint != null ? `(${formatTime(bPoint)})` : ""}
            </button>

            <div className="divider" />

            <label className="chip">
              <input type="checkbox" checked={markersOn} onChange={onToggleMarkers} />
              Markers
            </label>

            <label className="rate">
              Markers:
              <select value={markerEvery} onChange={(e) => onMarkerEvery(Number(e.target.value))}>
                <option value={1}>All</option>
                <option value={2}>Every 2</option>
                <option value={5}>Every 5</option>
              </select>
            </label>

            <div className="divider" />

            <label className="rate">
              Speed:
              <select value={rate} onChange={(e) => onRate(Number(e.target.value))}>
                <option value={0.75}>0.75×</option>
                <option value={1}>1×</option>
                <option value={1.25}>1.25×</option>
                <option value={1.5}>1.5×</option>
              </select>
            </label>
          </div>

          <div className="kbdHelp muted">
            Space play/pause • ↑/↓ prev/next • ←/→ ±1s • Shift+←/→ ±0.1s • S start • E end • N end+next
            • L loop ayah • Shift+L loop AB • A/B set points
          </div>
        </>
      )}
    </div>
  );
}

function SyncPanel({
  verses,
  activeIndex,
  currentTime,
  duration,
  onUpdateVerse,
  onSeek,
  onSeekVerse,
  onExportJson,
  onImportJson,
  onSaveDraft,
  onRestoreDraft,
  onClearDraft,
  onJumpFirstUntimed,
}) {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [jumpAyah, setJumpAyah] = useState("");
  const [jumpTime, setJumpTime] = useState("");
  const fileRef = useRef(null);

  const active = activeIndex >= 0 ? verses[activeIndex] : null;

  useEffect(() => {
    if (!active) {
      setStartInput("");
      setEndInput("");
      return;
    }
    const s = Number(active.start);
    const e = Number(active.end);
    setStartInput(Number.isFinite(s) ? String(s) : "");
    setEndInput(Number.isFinite(e) ? String(e) : "");
  }, [activeIndex, active]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => {
      const s = Number(startInput);
      const e = Number(endInput);
      const patch = {};
      if (Number.isFinite(s)) patch.start = clamp(s, 0, Math.max(0, duration || s));
      if (Number.isFinite(e)) patch.end = clamp(e, 0, Math.max(0, duration || e));
      if (Number.isFinite(patch.start) && Number.isFinite(patch.end) && patch.end <= patch.start) {
        patch.end = patch.start + 0.01;
      }
      if (Object.keys(patch).length) onUpdateVerse(activeIndex, patch);
    }, 250);
    return () => clearTimeout(t);
  }, [startInput, endInput, activeIndex, active, duration, onUpdateVerse]);

  const startNum = Number(startInput);
  const endNum = Number(endInput);
  const deltaOk = Number.isFinite(startNum) && Number.isFinite(endNum) && endNum > startNum;
  const delta = deltaOk ? endNum - startNum : null;

  const setStartToT = () => active && onUpdateVerse(activeIndex, { start: currentTime });
  const setEndToT = () => active && onUpdateVerse(activeIndex, { end: currentTime });
  const setEndToTAndNext = () => {
    if (!active) return;
    onUpdateVerse(activeIndex, { end: currentTime });
    const nextIdx = Math.min(verses.length - 1, activeIndex + 1);
    onSeekVerse(nextIdx);
  };

  const nudgeStart = (d) => {
    if (!active) return;
    const s = Number(active.start);
    if (!Number.isFinite(s)) return;
    onUpdateVerse(activeIndex, { start: Math.max(0, s + d) });
  };

  const nudgeEnd = (d) => {
    if (!active) return;
    const e = Number(active.end);
    if (!Number.isFinite(e)) return;
    onUpdateVerse(activeIndex, { end: Math.max(0, e + d) });
  };

  const jumpToAyah = () => {
    const n = Number(jumpAyah);
    if (!Number.isFinite(n)) return;
    const idx = verses.findIndex((v) => Number(v?.ayah) === n);
    if (idx >= 0) onSeekVerse(idx);
  };

  const jumpToTime = () => {
    const t = Number(jumpTime);
    if (!Number.isFinite(t)) return;
    onSeek(t);
  };

  return (
    <div className="syncPanel">
      <div className="syncHeader">
        <div className="syncTitle">Sync tools</div>
        <div className="syncMeta muted">
          Active: <span className="mono">{active ? active.ayah : "-"}</span> • t=
          <span className="mono">{formatSec(currentTime)}</span>
          <span className="muted"> (</span>
          <span className="mono muted">{formatTime(currentTime)}</span>
          <span className="muted">)</span>
        </div>
      </div>

      <div className="syncGrid">
        <div className="syncBlock">
          <div className="syncRow">
            <button className="btnSmall" type="button" onClick={setStartToT} disabled={!active}>
              Set START = t (S)
            </button>
            <button className="btnSmall" type="button" onClick={setEndToT} disabled={!active}>
              Set END = t (E)
            </button>
            <button className="btnSmall" type="button" onClick={setEndToTAndNext} disabled={!active}>
              END=t + Next (N)
            </button>
          </div>

          <div className="syncRow">
            <div className="syncInputs">
              <label className="miniLabel">
                start
                <input
                  className="miniInput"
                  value={startInput}
                  onChange={(e) => setStartInput(e.target.value)}
                  inputMode="decimal"
                />
              </label>

              <label className="miniLabel">
                end
                <input
                  className="miniInput"
                  value={endInput}
                  onChange={(e) => setEndInput(e.target.value)}
                  inputMode="decimal"
                />
              </label>

              <div className="syncMetaInline">
                <div className="autoSaved muted">Auto-save</div>
                <div className={`deltaPill ${deltaOk ? "" : "muted"}`}>
                  Δ {deltaOk ? `${delta.toFixed(2)}s` : "—"}
                </div>
              </div>
            </div>
          </div>

          <div className="syncRow">
            <div className="syncNudgeGroup">
              <span className="muted">Start:</span>
              <button className="btnTiny" type="button" onClick={() => nudgeStart(-0.1)} disabled={!active}>
                -0.1
              </button>
              <button className="btnTiny" type="button" onClick={() => nudgeStart(+0.1)} disabled={!active}>
                +0.1
              </button>
              <button className="btnTiny" type="button" onClick={() => nudgeStart(-0.5)} disabled={!active}>
                -0.5
              </button>
              <button className="btnTiny" type="button" onClick={() => nudgeStart(+0.5)} disabled={!active}>
                +0.5
              </button>
            </div>

            <div className="syncNudgeGroup">
              <span className="muted">End:</span>
              <button className="btnTiny" type="button" onClick={() => nudgeEnd(-0.1)} disabled={!active}>
                -0.1
              </button>
              <button className="btnTiny" type="button" onClick={() => nudgeEnd(+0.1)} disabled={!active}>
                +0.1
              </button>
              <button className="btnTiny" type="button" onClick={() => nudgeEnd(-0.5)} disabled={!active}>
                -0.5
              </button>
              <button className="btnTiny" type="button" onClick={() => nudgeEnd(+0.5)} disabled={!active}>
                +0.5
              </button>
            </div>
          </div>
        </div>

        <div className="syncBlock">
          <div className="syncRow">
            <label className="miniLabel">
              Jump ayah
              <input
                className="miniInput"
                value={jumpAyah}
                onChange={(e) => setJumpAyah(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <button className="btnSmall" type="button" onClick={jumpToAyah}>
              Go
            </button>

            <label className="miniLabel">
              Jump time (s)
              <input
                className="miniInput"
                value={jumpTime}
                onChange={(e) => setJumpTime(e.target.value)}
                inputMode="decimal"
              />
            </label>
            <button className="btnSmall" type="button" onClick={jumpToTime}>
              Seek
            </button>
          </div>

          <div className="syncRow">
            <button className="btnSmall" type="button" onClick={onJumpFirstUntimed}>
              First untimed
            </button>
            <div className="divider" />
            <button className="btnSmall" type="button" onClick={onSaveDraft}>
              Save draft
            </button>
            <button className="btnSmall" type="button" onClick={onRestoreDraft}>
              Restore draft
            </button>
            <button className="btnSmall" type="button" onClick={onClearDraft}>
              Clear draft
            </button>
          </div>

          <div className="syncRow">
            <button className="btnSmall" type="button" onClick={onExportJson}>
              Export JSON
            </button>
            <button className="btnSmall" type="button" onClick={() => fileRef.current?.click()}>
              Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              className="hiddenFile"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onImportJson(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Verses Table (MEMO)
   ========================= */

const VerseRow = React.memo(function VerseRow({
  v,
  idx,
  active,
  onRowClick,
  setRowRef,
  markSegment,
}) {
  const arText = (v.ar || "").trimStart();
  const deText = v.de || "";
  const trText = v.tr || "";

  return (
    <button
      type="button"
      className={`row ${active ? "active" : ""}`}
      onClick={() => onRowClick(idx)}
      ref={(el) => setRowRef(idx, el)}
    >
      <div className="cell colNo">{v.ayah}</div>

      <div className="cell colAr" dir="rtl">
        {active ? markSegment(arText, v.ayah, "ar") : arText}
      </div>

      <div className="cell colDe">
        {active ? markSegment(deText, v.ayah, "de") : deText}
      </div>

      <div className="cell colTr">
        {active ? markSegment(trText, v.ayah, "tr") : trText}
      </div>
    </button>
  );
});

const VersesTable = React.memo(function VersesTable({
  verses,
  activeIndex,
  onRowClick,
  setRowRef,
  markSegment,
}) {
  return (
    <div className="tableWrap" role="region" aria-label="Verses">
      <div className="tableHeader">
        <div className="colNo">No</div>
        <div className="colAr">Arabic</div>
        <div className="colDe">German</div>
        <div className="colTr">Turkish</div>
      </div>

      <div className="tableBody" role="table">
        {verses.map((v, idx) => (
          <VerseRow
            key={`${v.ayah}-${idx}`}
            v={v}
            idx={idx}
            active={idx === activeIndex}
            onRowClick={onRowClick}
            setRowRef={setRowRef}
            markSegment={markSegment}
          />
        ))}
      </div>
    </div>
  );
});

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedSurah, setSelectedSurah] = useState(SURAHES[0]);
  const [verses, setVerses] = useState([]);
  const [error, setError] = useState("");

  const audioRef = useRef(null);
  const rowRefs = useRef([]);

  const [isPlaying, setIsPlaying] = useState(false);

  // ✅ THROTTLED UI time (max perf)
  const [uiTime, setUiTime] = useState(0);

  const [duration, setDuration] = useState(0);
  const [activeIndex, setActiveIndex] = useState(-1);

  const [loopAyah, setLoopAyah] = useState(false);
  const [rate, setRate] = useState(1);
  const [markersOn, setMarkersOn] = useState(true);
  const [markerEvery, setMarkerEvery] = useState(2);

  const [loopAB, setLoopAB] = useState(false);
  const [aPoint, setAPoint] = useState(null);
  const [bPoint, setBPoint] = useState(null);

  const [toolsCollapsed, setToolsCollapsed] = useState(true);
  const [singleOn, setSingleOn] = useState(true);

  // repeat: 0 off, 1 => 1 tekrar, 2 => 2 tekrar
  const [repeatMode, setRepeatMode] = useState(0);
  const repeatStateRef = useRef({ idx: -1, done: 0, armed: true, lastFire: 0 });

  // Refs for zero-re-render logic
  const versesRef = useRef(verses);
  const activeIndexRef = useRef(activeIndex);
  const durationRef = useRef(duration);
  const isPlayingRef = useRef(isPlaying);

  // Real time ref (never throttled) for precise sync
  const currentTimeRef = useRef(0);

  // UI throttle state
  const rafRef = useRef(0);
  const lastUiTsRef = useRef(0);
  const UI_FPS = 12;

  const { markSegment, clearCache } = useMarkSegmentCached();

  useEffect(() => {
    document.title = "Türkçe-Almanca Kur’an Player";
  }, []);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || "";
      const isSafari = /safari/i.test(ua) && !/chrome|crios|chromium|android/i.test(ua);
      document.documentElement.classList.toggle("isSafari", isSafari);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("qatd:toolsCollapsed");
      if (raw === "0") setToolsCollapsed(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("qatd:toolsCollapsed", toolsCollapsed ? "1" : "0");
    } catch {}
  }, [toolsCollapsed]);

  useEffect(() => {
    versesRef.current = verses;
    activeIndexRef.current = activeIndex;
    durationRef.current = duration;
    isPlayingRef.current = isPlaying;
  }, [verses, activeIndex, duration, isPlaying]);

  const draftKey = useMemo(() => `qatd:draft:${selectedSurah.slug}`, [selectedSurah.slug]);

  const filteredSurahs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SURAHES;
    return SURAHES.filter((s) => {
      const idMatch = String(s.id) === q || String(s.id).includes(q);
      const slugMatch = s.slug.toLowerCase().includes(q);
      const tr = (s.nameTr || "").toLowerCase().includes(q);
      const de = (s.nameDe || "").toLowerCase().includes(q);
      const ar = (s.nameAr || "").includes(query.trim());
      return idMatch || slugMatch || tr || de || ar;
    });
  }, [query]);

  const audioSrc = useMemo(
    () => (selectedSurah ? resolvePublicUrl(selectedSurah.audioUrl) : ""),
    [selectedSurah]
  );
  const versesSrc = useMemo(
    () => (selectedSurah ? resolvePublicUrl(selectedSurah.versesUrl) : ""),
    [selectedSurah]
  );

  // Precompute starts/ends for binary search
  const { starts, ends, monotonic } = useMemo(() => {
    const s = [];
    const e = [];
    for (const v of verses) {
      s.push(Number(v?.start));
      e.push(Number(v?.end));
    }
    const ok =
      s.length > 0 &&
      s.every((x) => Number.isFinite(x)) &&
      e.every((x) => Number.isFinite(x)) &&
      isMonotonicNonDecreasing(s);
    return { starts: s, ends: e, monotonic: ok };
  }, [verses]);

  // Load verses
  useEffect(() => {
    let cancelled = false;

    setError("");
    setVerses([]);
    setActiveIndex(-1);
    setUiTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSingleOn(true);

    setRepeatMode(0);
    repeatStateRef.current = { idx: -1, done: 0, armed: true, lastFire: 0 };

    currentTimeRef.current = 0;
    clearCache();

    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }

    (async () => {
      try {
        const res = await fetch(versesSrc, { cache: "no-store" });
        const text = await res.text();

        if (!res.ok) {
          throw new Error(
            `Fetch failed: ${res.status} ${res.statusText} | url=${versesSrc} | body=${text.slice(0, 160)}`
          );
        }

        const data = parseJsonTolerant(text, versesSrc);
        if (!Array.isArray(data))
          throw new Error(`Invalid verses JSON (expected array) | url=${versesSrc}`);

        if (!cancelled) {
          rowRefs.current = [];
          setVerses(data);
        }
      } catch (e) {
        console.error("[verses] load failed:", e);
        if (!cancelled) setError(`Verses could not be loaded: ${e.message}`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [versesSrc, clearCache]);

  // Audio listeners + throttled UI time updates
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const scheduleUi = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame((ts) => {
        rafRef.current = 0;
        const minDt = 1000 / UI_FPS;
        if (ts - (lastUiTsRef.current || 0) < minDt) return;
        lastUiTsRef.current = ts;
        setUiTime(currentTimeRef.current);
      });
    };

    const onTime = () => {
      currentTimeRef.current = a.currentTime || 0;
      scheduleUi();
    };

    const onMeta = () => setDuration(a.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onErr = () => setError("Audio could not be played. Check console for details.");

    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("error", onErr);

    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("error", onErr);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = rate;
  }, [rate]);

  const seekTo = useCallback((t, autoPlay = false) => {
    const a = audioRef.current;
    if (!a || !Number.isFinite(t)) return;

    const d = Number.isFinite(a.duration) ? a.duration : durationRef.current;
    const nextT = Number.isFinite(d) && d > 0 ? clamp(t, 0, d - 0.01) : Math.max(0, t);

    a.currentTime = nextT;
    currentTimeRef.current = nextT;
    setUiTime(nextT);

    if (autoPlay) a.play().catch(() => {});
  }, []);

  const seekVerse = useCallback(
    (idx, autoPlay = true) => {
      const v = versesRef.current[idx];
      if (!v) return;
      const start = Number(v.start);
      if (!Number.isFinite(start)) return;

      repeatStateRef.current = { idx, done: 0, armed: true, lastFire: 0 };
      seekTo(start, autoPlay);
    },
    [seekTo]
  );

  useEffect(() => {
    if (!singleOn) return;
    if (!verses.length) return;
    if (activeIndexRef.current >= 0) return;
    seekVerse(0, false);
  }, [singleOn, verses.length, seekVerse]);

  const onPlayPause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
  }, []);

  const pause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    a.pause();
  }, []);

  const nudge = useCallback(
    (delta) => {
      const a = audioRef.current;
      if (!a) return;
      seekTo((a.currentTime || 0) + delta, false);
    },
    [seekTo]
  );

  const prevAyah = useCallback(() => {
    const vs = versesRef.current;
    if (!vs.length) return;
    const cur = activeIndexRef.current;
    const idx = cur > 0 ? cur - 1 : 0;
    seekVerse(idx, true);
  }, [seekVerse]);

  const nextAyah = useCallback(() => {
    const vs = versesRef.current;
    if (!vs.length) return;
    const cur = activeIndexRef.current;
    const idx = cur >= 0 ? Math.min(vs.length - 1, cur + 1) : 0;
    seekVerse(idx, true);
  }, [seekVerse]);

  const updateVerse = useCallback(
    (idx, patch) => {
      setVerses((prev) => {
        if (!prev[idx]) return prev;
        const next = [...prev];
        const v = { ...next[idx], ...patch };

        const s = Number(v.start);
        const e = Number(v.end);

        if (Number.isFinite(s)) v.start = Math.max(0, s);
        if (Number.isFinite(e)) v.end = Math.max(0, e);
        if (Number.isFinite(v.start) && Number.isFinite(v.end) && v.end <= v.start)
          v.end = v.start + 0.01;

        next[idx] = v;
        return next;
      });

      clearCache();
    },
    [clearCache]
  );

  // Draft auto-save
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(versesRef.current));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [draftKey, verses]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(versesRef.current, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSurah.slug}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [selectedSurah.slug]);

  const importJsonFile = useCallback(
    (file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result || ""));
          if (!Array.isArray(parsed)) throw new Error("Imported JSON must be an array");
          setVerses(parsed);
          versesRef.current = parsed;
          clearCache();
          setError("");
        } catch (e) {
          setError(`Import failed: ${e.message}`);
        }
      };
      reader.readAsText(file);
    },
    [clearCache]
  );

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(versesRef.current));
    } catch {}
  }, [draftKey]);

  const restoreDraft = useCallback(
    () => {
      try {
        const raw = localStorage.getItem(draftKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        setVerses(parsed);
        versesRef.current = parsed;
        clearCache();
      } catch {}
    },
    [draftKey, clearCache]
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
  }, [draftKey]);

  const jumpFirstUntimed = useCallback(() => {
    const vs = versesRef.current;
    const idx = vs.findIndex(
      (v) => !Number.isFinite(Number(v?.start)) || !Number.isFinite(Number(v?.end))
    );
    if (idx >= 0) seekVerse(idx, true);
  }, [seekVerse]);

  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => {
      const next = m === 0 ? 1 : m === 1 ? 2 : 0;

      if (next <= 0) {
        repeatStateRef.current = { idx: -1, done: 0, armed: true, lastFire: 0 };
        return next;
      }

      const vs = versesRef.current;
      if (!vs.length) return next;

      let idx = activeIndexRef.current;
      if (idx < 0) {
        idx = monotonic
          ? findActiveVerseIndexBinary(starts, ends, currentTimeRef.current)
          : findActiveVerseIndexLinearOverlapSafe(vs, currentTimeRef.current);
      }
      idx = clamp(idx, 0, vs.length - 1);

      const v = vs[idx];
      const s = Number(v?.start);
      if (Number.isFinite(s)) {
        repeatStateRef.current = { idx, done: 0, armed: true, lastFire: 0 };
        tactilePulse(10);
        seekTo(s, true);
      }
      return next;
    });
  }, [seekTo, monotonic, starts, ends]);

  // Repeat engine (uses real time ref)
  useEffect(() => {
    const a = audioRef.current;
    const vs = versesRef.current;
    if (!a || !vs.length) return;
    if (repeatMode <= 0) return;

    let idx = activeIndexRef.current;
    const t = currentTimeRef.current;

    if (idx < 0 || !vs[idx]) {
      idx = monotonic
        ? findActiveVerseIndexBinary(starts, ends, t)
        : findActiveVerseIndexLinearOverlapSafe(vs, t);
    }
    if (idx < 0 || !vs[idx]) return;

    const v = vs[idx];
    const s = Number(v?.start);
    const e = Number(v?.end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;

    const st = repeatStateRef.current;

    if (st.idx !== idx) {
      repeatStateRef.current = { idx, done: 0, armed: true, lastFire: 0 };
      return;
    }

    if (t < e - 0.12) {
      repeatStateRef.current.armed = true;
      return;
    }

    const nearEnd = t >= e - 0.02;
    if (!nearEnd || !repeatStateRef.current.armed) return;

    const now = performance.now();
    if (now - (repeatStateRef.current.lastFire || 0) < 350) return;
    repeatStateRef.current.lastFire = now;

    repeatStateRef.current.armed = false;

    const done = repeatStateRef.current.done || 0;
    if (done < repeatMode) {
      repeatStateRef.current.done = done + 1;
      a.currentTime = s;
      currentTimeRef.current = s;
      setUiTime(s);
      a.play().catch(() => {});
      return;
    }

    repeatStateRef.current.done = 0;
    a.pause();
    a.currentTime = s;
    currentTimeRef.current = s;
    setUiTime(s);
  }, [uiTime, repeatMode, monotonic, starts, ends]);

  // Loop AB / Loop ayah (uses real time ref)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const t = currentTimeRef.current;

    if (loopAB && aPoint != null && bPoint != null) {
      const lo = Math.min(aPoint, bPoint);
      const hi = Math.max(aPoint, bPoint);
      if (t >= hi) {
        a.currentTime = lo;
        currentTimeRef.current = lo;
        setUiTime(lo);
        a.play().catch(() => {});
      }
      return;
    }

    if (loopAyah && verses.length) {
      const idx = monotonic
        ? findActiveVerseIndexBinary(starts, ends, t)
        : findActiveVerseIndexLinearOverlapSafe(verses, t);
      if (idx >= 0) {
        const v = verses[idx];
        const s = Number(v?.start);
        const e = Number(v?.end);
        if (Number.isFinite(s) && Number.isFinite(e) && e > s && t >= e) {
          a.currentTime = s;
          currentTimeRef.current = s;
          setUiTime(s);
          a.play().catch(() => {});
        }
      }
    }
  }, [uiTime, verses, loopAyah, loopAB, aPoint, bPoint, monotonic, starts, ends]);

  // Active index update (only when changes)
  useEffect(() => {
    if (!verses.length) return;

    const t = currentTimeRef.current;
    const idx = monotonic
      ? findActiveVerseIndexBinary(starts, ends, t)
      : findActiveVerseIndexLinearOverlapSafe(verses, t);

    if (idx === -1 || idx === activeIndexRef.current) return;

    setActiveIndex(idx);

    const el = rowRefs.current[idx];
    if (el) ensureRowVisible(el, 10);
  }, [uiTime, verses, monotonic, starts, ends]);

  const setA = useCallback(() => setAPoint(currentTimeRef.current), []);
  const setB = useCallback(() => setBPoint(currentTimeRef.current), []);

  // App hotkeys (disabled while single player open)
  useEffect(() => {
    const onKey = (e) => {
      if (singleOn) return;

      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing =
        tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
      if (typing) return;

      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause();
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudge(e.shiftKey ? -0.1 : -1);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nudge(e.shiftKey ? 0.1 : 1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        prevAyah();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        nextAyah();
        return;
      }

      const k = e.key.toLowerCase();
      if (k === "l") {
        if (e.shiftKey) setLoopAB((x) => !x);
        else setLoopAyah((x) => !x);
        return;
      }
      if (k === "a") setA();
      if (k === "b") setB();

      const idx = activeIndexRef.current;
      const vs = versesRef.current;
      const t = currentTimeRef.current;

      if (idx >= 0 && vs[idx]) {
        if (k === "s") updateVerse(idx, { start: t });
        else if (k === "e") updateVerse(idx, { end: t });
        else if (k === "n") {
          updateVerse(idx, { end: t });
          const nextIdx = Math.min(vs.length - 1, idx + 1);
          seekVerse(nextIdx, true);
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [singleOn, onPlayPause, nudge, prevAyah, nextAyah, updateVerse, seekVerse, setA, setB]);

  const activeVerse = useMemo(() => (activeIndex >= 0 ? verses[activeIndex] : null), [
    activeIndex,
    verses,
  ]);

  const closeSingle = useCallback(() => {
    setSingleOn(false);
    pause();
  }, [pause]);

  const toggleSingle = useCallback(() => {
    setSingleOn((x) => {
      const next = !x;
      if (!next) pause();
      return next;
    });
  }, [pause]);

  const header = selectedSurah ? (
    <div className="surahHeader">
      <div className="surahHeaderLeft">
        <h2 className="surahTitle">
          #{selectedSurah.id} — {selectedSurah.nameTr}
        </h2>
        <div className="surahSub">{selectedSurah.nameDe}</div>
      </div>
      <div className="surahHeaderRight" dir="rtl">
        {selectedSurah.nameAr}
      </div>
      <div className="surahBadges">
        <span className="badge">Slug: {selectedSurah.slug}</span>
        <span className="badge">Ayahs: {selectedSurah.ayahCount}</span>
        <span className="badge">Loaded: {verses.length}</span>
      </div>
    </div>
  ) : null;

  const dialDisabled = !verses.length;

  const onRowClick = useCallback(
    (idx) => {
      seekVerse(idx, true);
    },
    [seekVerse]
  );

  const setRowRef = useCallback((idx, el) => {
    rowRefs.current[idx] = el;
  }, []);

  return (
    <div className="appShell">
      <SurahList
        surahs={filteredSurahs}
        selectedId={selectedSurah?.id}
        query={query}
        onQuery={setQuery}
        onSelect={setSelectedSurah}
      />

      <main className="content">
        {header}
        {error ? <div className="errorBox">{error}</div> : null}

        <SinglePlayerPanel
          open={singleOn}
          verse={activeVerse}
          isPlaying={isPlaying}
          onPlayPause={onPlayPause}
          onPrev={prevAyah}
          onNext={nextAyah}
          onClose={closeSingle}
          dialDisabled={dialDisabled}
          onDialStep={(dir) => {
            const vs = versesRef.current;
            if (!vs.length) return;
            const cur = activeIndexRef.current;
            const base = cur >= 0 ? cur : 0;
            const next = clamp(base + dir, 0, Math.max(0, vs.length - 1));
            seekVerse(next, isPlayingRef.current);
          }}
          repeatMode={repeatMode}
          onToggleRepeat={toggleRepeat}
          markSegment={markSegment}
        />

        <div className={`playerCard playerSticky ${toolsCollapsed ? "collapsed" : ""}`}>
          <audio ref={audioRef} src={audioSrc} preload="metadata" />

          <PlayerControls
            isPlaying={isPlaying}
            currentTime={uiTime}
            duration={duration}
            collapsed={toolsCollapsed}
            onToggleCollapsed={() => setToolsCollapsed((x) => !x)}
            onPlayPause={onPlayPause}
            onPrev={prevAyah}
            onNext={nextAyah}
            onNudge={nudge}
            loopAyah={loopAyah}
            onToggleLoopAyah={() => setLoopAyah((x) => !x)}
            loopAB={loopAB}
            onToggleLoopAB={() => setLoopAB((x) => !x)}
            rate={rate}
            onRate={setRate}
            markersOn={markersOn}
            onToggleMarkers={() => setMarkersOn((x) => !x)}
            markerEvery={markerEvery}
            onMarkerEvery={setMarkerEvery}
            aPoint={aPoint}
            bPoint={bPoint}
            onSetA={setA}
            onSetB={setB}
            singleOn={singleOn}
            onToggleSingle={toggleSingle}
          />

          {toolsCollapsed ? null : (
            <>
              <Timeline
                duration={duration}
                currentTime={uiTime}
                verses={verses}
                activeIndex={activeIndex}
                onSeek={(t) => seekTo(t, false)}
                onSeekVerse={(idx) => seekVerse(idx, true)}
                showMarkers={markersOn}
                markerEvery={markerEvery}
              />

              <SyncPanel
                verses={verses}
                activeIndex={activeIndex}
                currentTime={currentTimeRef.current}
                duration={duration}
                onUpdateVerse={updateVerse}
                onSeek={(t) => seekTo(t, false)}
                onSeekVerse={(idx) => seekVerse(idx, true)}
                onExportJson={exportJson}
                onImportJson={importJsonFile}
                onSaveDraft={saveDraft}
                onRestoreDraft={restoreDraft}
                onClearDraft={clearDraft}
                onJumpFirstUntimed={jumpFirstUntimed}
              />
            </>
          )}
        </div>

        <VersesTable
          verses={verses}
          activeIndex={activeIndex}
          onRowClick={onRowClick}
          setRowRef={setRowRef}
          markSegment={markSegment}
        />
      </main>
    </div>
  );
}
