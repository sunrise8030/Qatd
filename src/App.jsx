// src/App.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";

const SURAH_METADATA = [
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

function resolvePublicUrl(maybeAbsolutePath) {
  const base = import.meta.env.BASE_URL || "/";
  const p = String(maybeAbsolutePath || "");
  const clean = p.startsWith("/") ? p.slice(1) : p;
  return `${base}${clean}`;
}

function normalizeForSearch(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function safeText(v) {
  const s = String(v ?? "").trim();
  return s ? s : "—";
}

function findActiveVerseIndex(verses, t) {
  if (!Array.isArray(verses) || verses.length === 0) return -1;

  for (let i = 0; i < verses.length; i += 1) {
    const v = verses[i];
    const start = Number(v.start);
    const end = Number(v.end);
    if (Number.isFinite(start) && Number.isFinite(end) && start <= t && t < end) return i;
  }

  let bestIdx = -1;
  let bestDelta = Infinity;
  for (let i = 0; i < verses.length; i += 1) {
    const start = Number(verses[i]?.start);
    if (!Number.isFinite(start)) continue;
    const delta = Math.abs(t - start);
    if (delta < bestDelta) {
      bestDelta = delta;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function SurahList({ surahs, selectedSlug, query, onQueryChange, onSelect }) {
  return (
    <aside className="sidebar" aria-label="Surah navigation">
      <div className="sidebarHeader">
        <h1 className="appTitle">Quran Surahs</h1>
        <label className="searchLabel" htmlFor="surahSearch">
          Search (name / id / slug)
        </label>
        <input
          id="surahSearch"
          className="searchInput"
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="e.g. yusuf, 12, يوسف"
          autoComplete="off"
        />
      </div>

      <div className="surahList" role="list">
        {surahs.map((s) => {
          const active = s.slug === selectedSlug;
          return (
            <button
              key={s.slug}
              type="button"
              className={`surahItem ${active ? "active" : ""}`}
              onClick={() => onSelect(s)}
              role="listitem"
              aria-current={active ? "true" : "false"}
            >
              <div className="surahItemTop">
                <span className="surahId">#{s.id}</span>
                <span className="surahSlug">{s.slug}</span>
              </div>
              <div className="surahItemNames">
                <span className="nameStrong">{s.nameTr}</span>
                <span className="nameMuted">{s.nameDe}</span>
                <span className="nameAr" dir="rtl" lang="ar">
                  {s.nameAr}
                </span>
              </div>
              <div className="surahMeta">{s.ayahCount} ayahs</div>
            </button>
          );
        })}
        {surahs.length === 0 ? <div className="emptyState">No matching surahs.</div> : null}
      </div>
    </aside>
  );
}

function AudioControls({ audioRef, audioSrc, isPlaying, onTogglePlay, currentTime }) {
  return (
    <section className="audioPanel" aria-label="Audio player">
      <audio ref={audioRef} src={audioSrc} preload="metadata" />
      <div className="audioControls">
        <button type="button" className="primaryButton" onClick={onTogglePlay}>
          {isPlaying ? "Pause" : "Play"}
        </button>
        <div className="audioHint">t={currentTime.toFixed(2)}s • click verse to seek & play</div>
      </div>
    </section>
  );
}

function SyncPanel({
  enabled,
  onToggle,
  autoNext,
  onToggleAutoNext,
  autoSeek,
  onToggleAutoSeek,
  currentTime,
  activeVerse,
  onSetStart,
  onSetEnd,
  onNudgeStart,
  onNudgeEnd,
  onDownloadJson,
}) {
  return (
    <section className="syncPanel" aria-label="Sync tools">
      <div className="syncHeader">
        <label className="syncToggle">
          <input type="checkbox" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
          <span>Sync Mode</span>
        </label>

        <label className="syncToggle">
          <input
            type="checkbox"
            checked={autoNext}
            disabled={!enabled}
            onChange={(e) => onToggleAutoNext(e.target.checked)}
          />
          <span>Auto-next</span>
        </label>

        <label className="syncToggle">
          <input
            type="checkbox"
            checked={autoSeek}
            disabled={!enabled || !autoNext}
            onChange={(e) => onToggleAutoSeek(e.target.checked)}
          />
          <span>Auto-seek</span>
        </label>

        <div className="syncTime">Current: {currentTime.toFixed(2)}s</div>
      </div>

      <div className="syncBody">
        <div className="syncRow">
          <div className="syncLabel">
            Active ayah: <strong>{activeVerse?.ayah ?? "—"}</strong>
          </div>
          <div className="syncLabel">
            start: <strong>{Number(activeVerse?.start ?? 0).toFixed(2)}</strong> • end:{" "}
            <strong>{Number(activeVerse?.end ?? 0).toFixed(2)}</strong>
          </div>
        </div>

        <div className="syncButtons">
          <button type="button" className="ghostButton" disabled={!enabled || !activeVerse} onClick={onSetStart}>
            Set START = t
          </button>
          <button type="button" className="ghostButton" disabled={!enabled || !activeVerse} onClick={onSetEnd}>
            Set END = t (next)
          </button>

          <span className="syncSpacer" />

          <button type="button" className="ghostButton" disabled={!enabled || !activeVerse} onClick={() => onNudgeStart(-0.1)}>
            Start -0.1
          </button>
          <button type="button" className="ghostButton" disabled={!enabled || !activeVerse} onClick={() => onNudgeStart(0.1)}>
            Start +0.1
          </button>
          <button type="button" className="ghostButton" disabled={!enabled || !activeVerse} onClick={() => onNudgeEnd(-0.1)}>
            End -0.1
          </button>
          <button type="button" className="ghostButton" disabled={!enabled || !activeVerse} onClick={() => onNudgeEnd(0.1)}>
            End +0.1
          </button>

          <span className="syncSpacer" />

          <button type="button" className="primaryButton" disabled={!enabled} onClick={onDownloadJson}>
            Export JSON
          </button>
        </div>

        <div className="syncHelp">
          Bu mp3 ile senkron: ayet başında <em>Set START</em>, bitince <em>Set END</em>. Auto-next açıkken END sonrası
          otomatik sonraki ayete geçer (Auto-seek açıksa audio da oraya gider).
        </div>
      </div>
    </section>
  );
}

function VerseTable({ verses, activeIndex, onVerseClick, rowRefs, syncEnabled, onPickActiveForSync }) {
  return (
    <section className="versesPanel" aria-label="Verses">
      <div className="tableHeader" role="row">
        <div className="cell cellNo" role="columnheader">No</div>
        <div className="cell cellAr" role="columnheader">Arabic</div>
        <div className="cell cellDe" role="columnheader">German</div>
        <div className="cell cellTr" role="columnheader">Turkish</div>
      </div>

      <div className="tableBody" role="rowgroup">
        {verses.map((v, idx) => {
          const isActive = idx === activeIndex;
          return (
            <button
              key={`${v.ayah}-${idx}`}
              type="button"
              className={`row ${isActive ? "rowActive" : ""}`}
              onClick={() => {
                if (syncEnabled) onPickActiveForSync(idx);
                onVerseClick(v, idx);
              }}
              ref={(el) => {
                if (el) rowRefs.current.set(idx, el);
                else rowRefs.current.delete(idx);
              }}
              aria-current={isActive ? "true" : "false"}
              title={`Seek to ${Number(v.start).toFixed(2)}s`}
            >
              <div className="cell cellNo">{v.ayah}</div>
              <div className="cell cellAr" dir="rtl" lang="ar">{safeText(v.ar)}</div>
              <div className="cell cellDe">{safeText(v.de)}</div>
              <div className="cell cellTr">{safeText(v.tr)}</div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [query, setQuery] = useState("");
  const [selectedSurah, setSelectedSurah] = useState(SURAH_METADATA[0] || null);

  const [verses, setVerses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [activeIndex, setActiveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const [syncEnabled, setSyncEnabled] = useState(true);
  const [syncIndex, setSyncIndex] = useState(-1);
  const [autoNext, setAutoNext] = useState(true);
  const [autoSeek, setAutoSeek] = useState(true);

  const audioRef = useRef(null);
  const rowRefs = useRef(new Map());
  const lastScrolledIndexRef = useRef(-1);

  const filteredSurahs = useMemo(() => {
    const q = normalizeForSearch(query.trim());
    if (!q) return SURAH_METADATA;
    return SURAH_METADATA.filter((s) => {
      const haystack = [s.slug, s.id, s.nameTr, s.nameDe, s.nameAr].map(normalizeForSearch).join(" | ");
      return haystack.includes(q);
    });
  }, [query]);

  const stopAndResetAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {}
    setIsPlaying(false);
    setActiveIndex(-1);
    setCurrentTime(0);
    setSyncIndex(-1);
    lastScrolledIndexRef.current = -1;
  }, []);

  const audioSrc = useMemo(() => (selectedSurah ? resolvePublicUrl(selectedSurah.audioUrl) : ""), [selectedSurah]);

  useEffect(() => {
    let aborted = false;

    async function loadVerses() {
      if (!selectedSurah) return;

      setLoading(true);
      setErrorMsg("");
      setVerses([]);
      setActiveIndex(-1);
      setSyncIndex(-1);
      lastScrolledIndexRef.current = -1;

      stopAndResetAudio();

      const url = resolvePublicUrl(selectedSurah.versesUrl);

      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`Fetch failed (${res.status}) for ${url}`);
        const json = await res.json();
        if (!Array.isArray(json)) throw new Error("Invalid JSON: expected an array of verses");
        if (!aborted) {
          setVerses(json);
          setSyncIndex(json.length ? 0 : -1);
        }
      } catch (err) {
        console.error("[Surah load error]", err);
        if (!aborted) setErrorMsg("Failed to load verses. Check console for details.");
      } finally {
        if (!aborted) setLoading(false);
      }
    }

    loadVerses();
    return () => {
      aborted = true;
    };
  }, [selectedSurah, stopAndResetAudio]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      const t = audio.currentTime || 0;
      setCurrentTime(t);
      const idx = findActiveVerseIndex(verses, t);
      setActiveIndex((prev) => (prev === idx ? prev : idx));
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
    };
  }, [verses]);

  useEffect(() => {
    if (activeIndex < 0) return;
    if (lastScrolledIndexRef.current === activeIndex) return;

    const el = rowRefs.current.get(activeIndex);
    if (!el) return;

    lastScrolledIndexRef.current = activeIndex;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch (err) {
      console.error("[Audio play error]", err);
      setErrorMsg("Audio could not be played. Check console for details.");
    }
  };

  const handleVerseClick = async (v, idx) => {
    const audio = audioRef.current;
    if (!audio) return;

    const target = Number(v?.start);
    if (!Number.isFinite(target)) return;

    try {
      audio.currentTime = Math.max(0, target);
      setActiveIndex(idx);
      lastScrolledIndexRef.current = idx;
      await audio.play();
    } catch (err) {
      console.error("[Audio seek/play error]", err);
      setErrorMsg("Could not seek/play audio. Check console for details.");
    }
  };

  const activeVerseForSync = useMemo(() => {
    if (syncIndex < 0) return null;
    return verses[syncIndex] ?? null;
  }, [verses, syncIndex]);

  const updateVerseTiming = (idx, patch) => {
    setVerses((prev) => {
      if (!prev[idx]) return prev;
      const next = prev.slice();
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  };

  const setStartToNow = () => {
    if (syncIndex < 0) return;
    const s = clamp(currentTime, 0, Number.POSITIVE_INFINITY);
    const end = Number(verses[syncIndex]?.end);
    const safeEnd = Number.isFinite(end) ? Math.max(end, s + 0.01) : s + 0.01;
    updateVerseTiming(syncIndex, { start: s, end: safeEnd });
  };

  const setEndToNow = async () => {
    if (syncIndex < 0) return;

    const e = clamp(currentTime, 0, Number.POSITIVE_INFINITY);
    const start = Number(verses[syncIndex]?.start);
    const safeStart = Number.isFinite(start) ? Math.min(start, e - 0.01) : Math.max(0, e - 0.5);
    const safeEnd = Math.max(e, safeStart + 0.01);

    updateVerseTiming(syncIndex, { start: Math.max(0, safeStart), end: safeEnd });

    if (!autoNext) return;

    const nextIdx = syncIndex + 1;
    if (!verses[nextIdx]) return;

    setSyncIndex(nextIdx);

    if (!autoSeek) return;

    const audio = audioRef.current;
    const nextStart = Number(verses[nextIdx]?.start);
    if (!audio || !Number.isFinite(nextStart)) return;

    try {
      audio.currentTime = Math.max(0, nextStart);
      await audio.play();
    } catch (err) {
      console.error("[Auto-seek/play error]", err);
    }
  };

  const nudgeStart = (delta) => {
    if (syncIndex < 0) return;
    const start = Number(verses[syncIndex]?.start);
    const end = Number(verses[syncIndex]?.end);
    const s = Number.isFinite(start) ? start + delta : delta;
    const e = Number.isFinite(end) ? Math.max(end, s + 0.01) : s + 0.5;
    updateVerseTiming(syncIndex, { start: Math.max(0, s), end: e });
  };

  const nudgeEnd = (delta) => {
    if (syncIndex < 0) return;
    const start = Number(verses[syncIndex]?.start);
    const end = Number(verses[syncIndex]?.end);
    const e = Number.isFinite(end) ? end + delta : delta;
    const s = Number.isFinite(start) ? Math.min(start, e - 0.01) : Math.max(0, e - 0.5);
    updateVerseTiming(syncIndex, { start: Math.max(0, s), end: Math.max(e, s + 0.01) });
  };

  const downloadSyncedJson = () => {
    if (!selectedSurah) return;
    downloadJson(`${selectedSurah.slug}.json`, verses);
  };

  if (!selectedSurah) return <div style={{ padding: 16 }}>Select a surah.</div>;

  return (
    <div className="appShell">
      <SurahList
        surahs={filteredSurahs}
        selectedSlug={selectedSurah.slug}
        query={query}
        onQueryChange={setQuery}
        onSelect={(s) => s?.slug !== selectedSurah.slug && setSelectedSurah(s)}
      />

      <main className="content" aria-label="Surah content">
        <header className="surahHeader">
          <div className="surahTitleRow">
            <div className="surahTitle">
              <span className="surahTitleMain">
                #{selectedSurah.id} — {selectedSurah.nameTr}
              </span>
              <span className="surahTitleSub">{selectedSurah.nameDe}</span>
            </div>
            <div className="surahTitleAr" dir="rtl" lang="ar">
              {selectedSurah.nameAr}
            </div>
          </div>
          <div className="surahInfo">
            <span className="pill">Slug: {selectedSurah.slug}</span>
            <span className="pill">Ayahs: {selectedSurah.ayahCount}</span>
            <span className="pill">Loaded: {Array.isArray(verses) ? verses.length : 0}</span>
          </div>
        </header>

        {errorMsg ? (
          <div className="errorBanner" role="alert">
            {errorMsg}
          </div>
        ) : null}

        <AudioControls
          audioRef={audioRef}
          audioSrc={audioSrc}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          currentTime={currentTime}
        />

        <SyncPanel
          enabled={syncEnabled}
          onToggle={setSyncEnabled}
          autoNext={autoNext}
          onToggleAutoNext={setAutoNext}
          autoSeek={autoSeek}
          onToggleAutoSeek={setAutoSeek}
          currentTime={currentTime}
          activeVerse={activeVerseForSync}
          onSetStart={setStartToNow}
          onSetEnd={setEndToNow}
          onNudgeStart={nudgeStart}
          onNudgeEnd={nudgeEnd}
          onDownloadJson={downloadSyncedJson}
        />

        {loading ? (
          <div className="loadingState">Loading verses…</div>
        ) : (
          <VerseTable
            verses={verses}
            activeIndex={activeIndex}
            onVerseClick={handleVerseClick}
            rowRefs={rowRefs}
            syncEnabled={syncEnabled}
            onPickActiveForSync={setSyncIndex}
          />
        )}
      </main>
    </div>
  );
}
