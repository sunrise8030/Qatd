// src/App.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
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
  return `${base}${p}`;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const s = Math.max(0, Math.floor(sec));
  const mm = Math.floor(s / 60);
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

// Overlap-safe: if multiple verses match, pick the one with the greatest start (most recent)
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

  // fallback: closest start
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

function SurahList({ surahs, selectedId, query, onQuery, onSelect }) {
  return (
    <aside className="sidebar">
      <div className="sidebarHeader">
        <h1 className="appTitle">Quran Surahs</h1>
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
}) {
  const trackRef = useRef(null);

  const markers = useMemo(() => {
    if (!showMarkers || !Number.isFinite(duration) || duration <= 0) return [];
    return verses
      .map((v, idx) => {
        const start = Number(v?.start);
        if (!Number.isFinite(start)) return null;
        const leftPct = clamp((start / duration) * 100, 0, 100);
        return { idx, leftPct, ayah: v.ayah };
      })
      .filter(Boolean);
  }, [verses, duration, showMarkers]);

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
        </div>
        <div className="timelineHint muted">
          Drag slider • Click markers • Shift+←/→ = ±0.1s
        </div>
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

function PlayerControls({
  isPlaying,
  onPlayPause,
  onPrev,
  onNext,
  onNudge,
  loopAyah,
  onToggleLoop,
  rate,
  onRate,
  markersOn,
  onToggleMarkers,
}) {
  return (
    <div className="playerControls">
      <div className="btnRow">
        <button className="btn" type="button" onClick={onPlayPause}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button className="btn" type="button" onClick={onPrev}>
          ◀ Prev ayah
        </button>
        <button className="btn" type="button" onClick={onNext}>
          Next ayah ▶
        </button>

        <div className="divider" />

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

        <label className="chip">
          <input type="checkbox" checked={loopAyah} onChange={onToggleLoop} />
          Loop ayah (L)
        </label>

        <label className="chip">
          <input type="checkbox" checked={markersOn} onChange={onToggleMarkers} />
          Markers
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
        Space play/pause • ↑/↓ prev/next ayah • ←/→ ±1s • Shift+←/→ ±0.1s • L loop
      </div>
    </div>
  );
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
                {v.ar}
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

  // refs to avoid stale closures in key handler
  const versesRef = useRef(verses);
  const activeIndexRef = useRef(activeIndex);
  useEffect(() => {
    versesRef.current = verses;
    activeIndexRef.current = activeIndex;
  }, [verses, activeIndex]);

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

  // load verses on surah change
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
        if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Invalid verses JSON (expected array)");
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

  // audio listeners
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    const onTime = () => setCurrentTime(a.currentTime || 0);
    const onMeta = () => setDuration(a.duration || 0);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onErr = () => {
      console.error("[audio] error", a.error);
      setError("Audio could not be played. Check console for details.");
    };

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

  // rate sync
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.playbackRate = rate;
  }, [rate]);

  const seekTo = useCallback(
    (t, autoPlay = false) => {
      const a = audioRef.current;
      if (!a || !Number.isFinite(t)) return;

      const d = Number.isFinite(a.duration) ? a.duration : duration;
      const nextT =
        Number.isFinite(d) && d > 0 ? clamp(t, 0, d - 0.01) : Math.max(0, t);

      a.currentTime = nextT;
      setCurrentTime(nextT);
      if (autoPlay) a.play().catch(() => {});
    },
    [duration]
  );

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
    const idx = activeIndexRef.current > 0 ? activeIndexRef.current - 1 : 0;
    seekVerse(idx, true);
  }, [seekVerse]);

  const nextAyah = useCallback(() => {
    const vs = versesRef.current;
    if (!vs.length) return;
    const cur = activeIndexRef.current;
    const idx = cur >= 0 ? Math.min(vs.length - 1, cur + 1) : 0;
    seekVerse(idx, true);
  }, [seekVerse]);

  // active verse + autoscroll + loop
  useEffect(() => {
    if (!verses.length) return;

    const idx = findActiveVerseIndex(verses, currentTime);
    if (idx !== activeIndex) {
      setActiveIndex(idx);
      const el = rowRefs.current[idx];
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }

    if (loopAyah && idx >= 0) {
      const v = verses[idx];
      const s = Number(v?.start);
      const e = Number(v?.end);
      if (Number.isFinite(s) && Number.isFinite(e) && e > s && currentTime >= e) {
        const a = audioRef.current;
        if (a) {
          a.currentTime = s;
          a.play().catch(() => {});
        }
      }
    }
  }, [currentTime, verses, activeIndex, loopAyah]);

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing =
        tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
      if (typing) return;

      if (e.code === "Space") {
        e.preventDefault();
        onPlayPause();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        nudge(e.shiftKey ? -0.1 : -1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        nudge(e.shiftKey ? 0.1 : 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        prevAyah();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        nextAyah();
      } else if (e.key.toLowerCase() === "l") {
        setLoopAyah((x) => !x);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPlayPause, nudge, prevAyah, nextAyah]);

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

        <div className="playerCard">
          <audio ref={audioRef} src={audioSrc} preload="metadata" />

          <PlayerControls
            isPlaying={isPlaying}
            onPlayPause={onPlayPause}
            onPrev={prevAyah}
            onNext={nextAyah}
            onNudge={nudge}
            loopAyah={loopAyah}
            onToggleLoop={() => setLoopAyah((x) => !x)}
            rate={rate}
            onRate={setRate}
            markersOn={markersOn}
            onToggleMarkers={() => setMarkersOn((x) => !x)}
          />

          <Timeline
            duration={duration}
            currentTime={currentTime}
            verses={verses}
            activeIndex={activeIndex}
            onSeek={(t) => seekTo(t, false)}
            onSeekVerse={(idx) => seekVerse(idx, true)}
            showMarkers={markersOn}
          />
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
