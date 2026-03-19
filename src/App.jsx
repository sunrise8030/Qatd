/* =========================
   src/App.jsx
   ========================= */
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
];

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

function findActiveVerseIndex(verses, t) {
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
  const effectiveBottom = overlayTop != null ? Math.min(viewportBottom, overlayTop - padding) : viewportBottom;

  const above = r.top < viewportTop;
  const below = r.bottom > effectiveBottom;

  if (above || below) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

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

function base64EncodeUtf8(text) {
  const bytes = new TextEncoder().encode(String(text ?? ""));
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

async function ghFetch(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error(
      "Network error (fetch failed). Check: internet/firewall, adblock, VPN, GitHub blocked."
    );
  }
}

async function githubGetFileSha({ owner, repo, path, token, branch }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll(
    "%2F",
    "/"
  )}?ref=${encodeURIComponent(branch)}`;

  const res = await ghFetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub GET failed: ${res.status} ${res.statusText} :: ${t}`);
  }
  const data = await res.json();
  return data?.sha || null;
}

async function githubPutFile({ owner, repo, path, token, branch, message, contentBase64, sha }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll(
    "%2F",
    "/"
  )}`;

  const body = {
    message,
    content: contentBase64,
    branch,
    ...(sha ? { sha } : {}),
  };

  const res = await ghFetch(url, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GitHub PUT failed: ${res.status} ${res.statusText} :: ${t}`);
  }
  return res.json();
}

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

/* ---------- Popup (new window) helpers ---------- */

function buildPopupHtml(title) {
  const safeTitle = String(title || "Aktif Ayet");
  return `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${safeTitle}</title>
<style>
  :root{
    --bg:#0b0f16;
    --panel:rgba(15,21,32,0.82);
    --border:rgba(255,255,255,0.10);
    --text:rgba(255,255,255,0.92);
    --muted:rgba(255,255,255,0.68);
    --accent:rgba(99,179,237,1);
  }
  *{ box-sizing:border-box; }
  html,body{
    height:100%;
    margin:0;
    background:
      radial-gradient(900px 600px at 30% 15%, rgba(120,120,255,0.12), transparent 55%),
      radial-gradient(900px 600px at 70% 35%, rgba(255,120,120,0.10), transparent 55%),
      var(--bg);
    color:var(--text);
    font-family: ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial,"Noto Sans";
  }
  .wrap{
    min-height:100%;
    display:grid;
    place-items:center;
    padding:16px;
  }
  .card{
    width:min(980px, 100%);
    border:1px solid var(--border);
    background:var(--panel);
    backdrop-filter: blur(10px);
    border-radius:18px;
    padding:18px;
  }
  .top{
    display:flex;
    justify-content:space-between;
    gap:12px;
    flex-wrap:wrap;
    align-items:center;
    margin-bottom:12px;
  }
  .badge{
    font-size:12px;
    color:var(--muted);
    border:1px solid var(--border);
    background:rgba(0,0,0,0.20);
    padding:6px 10px;
    border-radius:999px;
  }
  .btn{
    border:1px solid var(--border);
    background:rgba(0,0,0,0.25);
    color:var(--text);
    cursor:pointer;
    padding:10px 12px;
    border-radius:12px;
    font-weight:800;
  }
  .btn:hover{ border-color:rgba(255,255,255,0.18); }
  .ar{
    direction: rtl;
    unicode-bidi: isolate-override;
    text-align:right;
    font-family: "Noto Naskh Arabic","Amiri","Scheherazade New","Noto Sans Arabic", serif;
    font-size: clamp(26px, 4.5vw, 46px);
    line-height: 1.65;
    margin-top:10px;
  }
  .tr{
    font-size: clamp(16px, 2.7vw, 24px);
    line-height: 1.55;
    margin-top:14px;
  }
  .de{
    font-size: clamp(14px, 2.4vw, 20px);
    line-height: 1.5;
    margin-top:10px;
    color: var(--muted);
  }
  .hint{
    margin-top:14px;
    color: var(--muted);
    font-size: 12px;
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <div class="top">
        <div class="badge" id="meta">Aktif ayet: —</div>
        <button class="btn" id="closeBtn">Kapat</button>
      </div>
      <div class="ar" id="ar">—</div>
      <div class="tr" id="tr">—</div>
      <div class="de" id="de">—</div>
      <div class="hint">Not: Bu pencere ana sayfadan canlı güncellenir.</div>
    </div>
  </div>
<script>
  const metaEl = document.getElementById('meta');
  const arEl = document.getElementById('ar');
  const trEl = document.getElementById('tr');
  const deEl = document.getElementById('de');
  const closeBtn = document.getElementById('closeBtn');

  closeBtn.addEventListener('click', () => window.close());

  function applyVerse(payload){
    const ayah = payload && payload.ayah != null ? payload.ayah : '—';
    metaEl.textContent = 'Aktif ayet: ' + ayah;
    arEl.textContent = (payload && payload.ar || '—').trim();
    trEl.textContent = (payload && payload.tr || '—').trim();
    deEl.textContent = (payload && payload.de || '—').trim();
    document.title = 'Ayet ' + ayah;
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'verse') applyVerse(d.payload || {});
  });

  // tell opener we're ready
  try { window.opener && window.opener.postMessage({ type:'popup-ready' }, '*'); } catch {}
</script>
</body>
</html>`;
}

function openVersePopupWindow({ title }) {
  const w = window.open(
    "",
    "ayat_popup",
    "popup=yes,width=920,height=620,resizable=yes,scrollbars=no"
  );
  if (!w) return null;

  w.document.open();
  w.document.write(buildPopupHtml(title));
  w.document.close();
  return w;
}

/* ---------- Modal (fallback) ---------- */

function VerseModal({ open, verse, ayahLabel, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="verseModalBackdrop" role="dialog" aria-modal="true" aria-label="Aktif ayet popup">
      <div className="verseModalCard">
        <div className="verseModalTop">
          <div className="badge">Aktif ayet: {ayahLabel}</div>
          <button className="btnSmall btnToggle" type="button" onClick={onClose}>
            Kapat (Esc)
          </button>
        </div>
        <div className="verseModalAr" dir="rtl">
          {(verse?.ar || "—").trim()}
        </div>
        <div className="verseModalTr">{(verse?.tr || "—").trim()}</div>
        <div className="verseModalDe">{(verse?.de || "—").trim()}</div>
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

  popupOpen,
  onOpenPopup,
  onClosePopup,
}) {
  return (
    <div className="playerControls">
      <div className="liveTimeBar">
        <div className="liveTime">
          <span className="liveLabel">LIVE</span>
          <span className="liveSec">{Number.isFinite(currentTime) ? currentTime.toFixed(2) : "0.00"}s</span>
          <span className="liveDur muted">/ {Number.isFinite(duration) ? duration.toFixed(2) : "0.00"}s</span>
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

          {popupOpen ? (
            <button className="btnSmall btnToggle" type="button" onClick={onClosePopup} title="Popup kapat">
              Popup kapat
            </button>
          ) : (
            <button className="btnSmall btnToggle" type="button" onClick={onOpenPopup} title="Yeni pencere popup">
              Popup aç
            </button>
          )}

          <button className="btnSmall btnToggle" type="button" onClick={onToggleCollapsed} title="Toggle tools">
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
            Space play/pause • ↑/↓ prev/next • ←/→ ±1s • Shift+←/→ ±0.1s • S start • E end • N end+next • L loop ayah •
            Shift+L loop AB • A/B set points
          </div>
        </>
      )}
    </div>
  );
}

/* --- SyncPanel + VersesTable same as your current file --- */
/* (kısaltmıyorum: sende zaten var; burada aynen kalabilir) */

function SyncPanel(props) {
  // keep your existing SyncPanel exactly as is
  return props.children ?? null;
}

function VersesTable({ verses, activeIndex, onRowClick, rowRefs }) {
  return (
    <div className="tableWrap" role="region" aria-label="Verses">
      <div className="tableHeader">
        <div className="colNo">No</div>
        <div className="colAr">Arabic</div>
        <div className="colDe">German</div>
        <div className="colTr">Turkish</div>
      </div>

      <div className="tableBody" role="table">
        {verses.map((v, idx) => {
          const active = idx === activeIndex;
          return (
            <button
              key={`${v.ayah}-${idx}`}
              type="button"
              className={`row ${active ? "active" : ""}`}
              onClick={() => onRowClick(idx)}
              ref={(el) => {
                rowRefs.current[idx] = el;
              }}
            >
              <div className="cell colNo">{v.ayah}</div>
              <div className="cell colAr" dir="rtl">
                {(v.ar || "").trimStart()}
              </div>
              <div className="cell colDe">{v.de}</div>
              <div className="cell colTr">{v.tr}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedSurah, setSelectedSurah] = useState(SURAHES[0]);
  const [verses, setVerses] = useState([]);
  const [error, setError] = useState("");

  const audioRef = useRef(null);
  const rowRefs = useRef([]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
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

  const popupWinRef = useRef(null);
  const [popupModalOpen, setPopupModalOpen] = useState(false);
  const [popupIsOpen, setPopupIsOpen] = useState(false);

  useEffect(() => {
    document.title = "Türkçe-Almanca Kur’an Player";
  }, []);

  const versesRef = useRef(verses);
  const activeIndexRef = useRef(activeIndex);
  const currentTimeRef = useRef(currentTime);
  const durationRef = useRef(duration);

  useEffect(() => {
    versesRef.current = verses;
    activeIndexRef.current = activeIndex;
    currentTimeRef.current = currentTime;
    durationRef.current = duration;
  }, [verses, activeIndex, currentTime, duration]);

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

  const audioSrc = useMemo(() => (selectedSurah ? resolvePublicUrl(selectedSurah.audioUrl) : ""), [selectedSurah]);
  const versesSrc = useMemo(() => (selectedSurah ? resolvePublicUrl(selectedSurah.versesUrl) : ""), [selectedSurah]);

  useEffect(() => {
    let cancelled = false;

    setError("");
    setVerses([]);
    setActiveIndex(-1);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

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
        if (!Array.isArray(data)) throw new Error(`Invalid verses JSON (expected array) | url=${versesSrc}`);

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
  }, [versesSrc]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setCurrentTime(a.currentTime || 0);
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
    setCurrentTime(nextT);
    if (autoPlay) a.play().catch(() => {});
  }, []);

  const seekVerse = useCallback(
    (idx, autoPlay = true) => {
      const v = versesRef.current[idx];
      if (!v) return;
      const start = Number(v.start);
      if (!Number.isFinite(start)) return;
      seekTo(start, autoPlay);
    },
    [seekTo]
  );

  const onPlayPause = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => {});
    else a.pause();
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

  useEffect(() => {
    if (!verses.length) return;
    const idx = findActiveVerseIndex(verses, currentTime);
    if (idx === -1 || idx === activeIndex) return;

    setActiveIndex(idx);

    const el = rowRefs.current[idx];
    if (el) ensureRowVisible(el, 10);
  }, [currentTime, verses, activeIndex]);

  const setA = useCallback(() => setAPoint(currentTimeRef.current), []);
  const setB = useCallback(() => setBPoint(currentTimeRef.current), []);

  const activeVerse = useMemo(() => (activeIndex >= 0 ? verses[activeIndex] : null), [activeIndex, verses]);
  const activeVersePayload = useMemo(() => {
    if (!activeVerse) return { ayah: null, ar: "", tr: "", de: "" };
    return {
      ayah: activeVerse.ayah,
      ar: activeVerse.ar || "",
      tr: activeVerse.tr || "",
      de: activeVerse.de || "",
    };
  }, [activeVerse]);

  const closePopup = useCallback(() => {
    const w = popupWinRef.current;
    popupWinRef.current = null;
    if (w && !w.closed) w.close();
    setPopupIsOpen(false);
    setPopupModalOpen(false);
  }, []);

  const openPopup = useCallback(() => {
    const title = selectedSurah ? `${selectedSurah.nameTr} — Aktif Ayet` : "Aktif Ayet";
    const w = openVersePopupWindow({ title });
    if (!w) {
      // popup blocked -> modal fallback
      setPopupModalOpen(true);
      setPopupIsOpen(true);
      return;
    }
    popupWinRef.current = w;
    setPopupModalOpen(false);
    setPopupIsOpen(true);
  }, [selectedSurah]);

  // keep popup state in sync (if user closes window manually)
  useEffect(() => {
    if (!popupIsOpen) return;
    const t = window.setInterval(() => {
      const w = popupWinRef.current;
      if (w && w.closed) {
        popupWinRef.current = null;
        setPopupIsOpen(false);
      }
    }, 400);
    return () => window.clearInterval(t);
  }, [popupIsOpen]);

  // send updates to popup window (or modal just renders from state)
  useEffect(() => {
    if (!popupIsOpen) return;

    const w = popupWinRef.current;
    if (w && !w.closed) {
      try {
        w.postMessage({ type: "verse", payload: activeVersePayload }, "*");
      } catch {
        // ignore
      }
      return;
    }
    // if no window (blocked) but popupIsOpen, modal is in use
  }, [popupIsOpen, activeVersePayload]);

  // if popup window signals ready, push current verse immediately
  useEffect(() => {
    const onMsg = (ev) => {
      if (!ev?.data || typeof ev.data !== "object") return;
      if (ev.data.type === "popup-ready") {
        const w = popupWinRef.current;
        if (w && !w.closed) {
          try {
            w.postMessage({ type: "verse", payload: activeVersePayload }, "*");
          } catch {
            // ignore
          }
        }
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [activeVersePayload]);

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

        <VerseModal
          open={popupModalOpen}
          verse={activeVerse}
          ayahLabel={activeVerse?.ayah != null ? String(activeVerse.ayah) : "—"}
          onClose={closePopup}
        />

        <div className={`playerCard playerSticky ${toolsCollapsed ? "collapsed" : ""}`}>
          <audio ref={audioRef} src={audioSrc} preload="metadata" />

          <PlayerControls
            isPlaying={isPlaying}
            currentTime={currentTime}
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
            popupOpen={popupIsOpen}
            onOpenPopup={openPopup}
            onClosePopup={closePopup}
          />

          {toolsCollapsed ? null : (
            <>
              <Timeline
                duration={duration}
                currentTime={currentTime}
                verses={verses}
                activeIndex={activeIndex}
                onSeek={(t) => seekTo(t, false)}
                onSeekVerse={(idx) => seekVerse(idx, true)}
                showMarkers={markersOn}
                markerEvery={markerEvery}
              />

              {/* NOTE: SyncPanel burada sende full; yukarıdaki stub'ı kendi SyncPanel'in ile değiştir */}
              <SyncPanel />
            </>
          )}
        </div>

        <VersesTable
          verses={verses}
          activeIndex={activeIndex}
          onRowClick={(idx) => seekVerse(idx, true)}
          rowRefs={rowRefs}
        />
      </main>
    </div>
  );
}
