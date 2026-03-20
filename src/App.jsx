/* =========================================================
   src/App.jsx
   ========================================================= */
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

// Overlap-safe
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
  const effectiveBottom =
    overlayTop != null ? Math.min(viewportBottom, overlayTop - padding) : viewportBottom;

  const above = r.top < viewportTop;
  const below = r.bottom > effectiveBottom;

  if (above || below) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
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

  const body = { message, content: contentBase64, branch, ...(sha ? { sha } : {}) };

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

/**
 * VerticalWheel (single player overlay)
 * - Drag up/down / wheel / arrow keys
 * - Acceleration: hızlı input => 1..5 step
 * - Inertia: bırakınca momentum
 */
function VerticalWheel({ disabled, onStep }) {
  const wrapRef = useRef(null);

  // click anim
  const tickTimerRef = useRef(null);

  // drag state
  const draggingRef = useRef(false);
  const lastYRef = useRef(0);
  const lastMoveTsRef = useRef(0);

  // acceleration
  const lastStepTsRef = useRef(0);
  const burstRef = useRef(0);

  // inertia
  const inertiaRafRef = useRef(0);
  const inertiaVelRef = useRef(0); // px/ms
  const inertiaAccumRef = useRef(0); // px accumulated
  const inertiaLastTsRef = useRef(0);

  useEffect(() => {
    return () => {
      if (tickTimerRef.current) window.clearTimeout(tickTimerRef.current);
      if (inertiaRafRef.current) cancelAnimationFrame(inertiaRafRef.current);
    };
  }, []);

  const doTick = () => {
    const el = wrapRef.current;
    if (!el) return;

    el.classList.remove("tick");
    void el.offsetWidth;
    el.classList.add("tick");

    if (tickTimerRef.current) window.clearTimeout(tickTimerRef.current);
    tickTimerRef.current = window.setTimeout(() => el.classList.remove("tick"), 140);

    try {
      if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
        navigator.vibrate(8);
      }
    } catch {}
  };

  const computeMultiplier = () => {
    const now = performance.now();
    const dt = now - (lastStepTsRef.current || 0);
    lastStepTsRef.current = now;

    if (dt < 110) burstRef.current = Math.min(6, burstRef.current + 1);
    else if (dt < 170) burstRef.current = Math.min(5, Math.max(1, burstRef.current));
    else if (dt < 250) burstRef.current = Math.min(3, Math.max(1, burstRef.current));
    else burstRef.current = 0;

    if (burstRef.current <= 0) return 1;
    if (burstRef.current <= 2) return 2;
    if (burstRef.current <= 4) return 3;
    if (burstRef.current === 5) return 4;
    return 5;
  };

  const step = (dir, times = 1) => {
    const n = clamp(times, 1, 10);
    for (let i = 0; i < n; i += 1) onStep(dir);
    doTick();
  };

  const acceleratedStep = (dir, extra = 0) => {
    const mul = clamp(computeMultiplier() + extra, 1, 10);
    step(dir, mul);
  };

  const stopInertia = () => {
    if (inertiaRafRef.current) cancelAnimationFrame(inertiaRafRef.current);
    inertiaRafRef.current = 0;
    inertiaVelRef.current = 0;
    inertiaAccumRef.current = 0;
    inertiaLastTsRef.current = 0;
  };

  const startInertia = () => {
    const vel = inertiaVelRef.current;
    if (!Number.isFinite(vel) || Math.abs(vel) < 0.04) {
      stopInertia();
      return;
    }

    inertiaLastTsRef.current = performance.now();
    const TH_PX = 22;
    const DECAY_PER_MS = 0.0068;
    const MAX_MS = 1200;
    const startTs = performance.now();

    const tick = () => {
      const now = performance.now();
      const dt = now - (inertiaLastTsRef.current || now);
      inertiaLastTsRef.current = now;

      const sign = Math.sign(inertiaVelRef.current || vel);
      const speed = Math.abs(inertiaVelRef.current || vel);
      const nextSpeed = Math.max(0, speed * (1 - DECAY_PER_MS * dt));
      inertiaVelRef.current = sign * nextSpeed;

      inertiaAccumRef.current += inertiaVelRef.current * dt;

      while (Math.abs(inertiaAccumRef.current) >= TH_PX) {
        // px>0 => down => NEXT (+1), px<0 => up => PREV (-1)
        const dir = inertiaAccumRef.current > 0 ? +1 : -1;
        const extra = nextSpeed > 0.55 ? 2 : nextSpeed > 0.35 ? 1 : 0;
        acceleratedStep(dir, extra);
        inertiaAccumRef.current -= dir * TH_PX;
      }

      const elapsed = now - startTs;
      if (nextSpeed < 0.04 || elapsed > MAX_MS) {
        stopInertia();
        return;
      }
      inertiaRafRef.current = requestAnimationFrame(tick);
    };

    inertiaRafRef.current = requestAnimationFrame(tick);
  };

  const onPointerDown = (e) => {
    if (disabled) return;
    stopInertia();
    draggingRef.current = true;
    lastYRef.current = e.clientY;
    lastMoveTsRef.current = performance.now();
    wrapRef.current?.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (disabled || !draggingRef.current) return;

    const now = performance.now();
    const dy = e.clientY - lastYRef.current;
    const dt = Math.max(1, now - (lastMoveTsRef.current || now));
    lastMoveTsRef.current = now;
    lastYRef.current = e.clientY;

    inertiaVelRef.current = dy / dt;

    const TH_PX = 22;
    const abs = Math.abs(dy);
    if (abs >= TH_PX) {
      const extra = abs >= 90 ? 3 : abs >= 65 ? 2 : abs >= 40 ? 1 : 0;
      acceleratedStep(dy > 0 ? +1 : -1, extra);
    }
  };

  const onPointerUp = () => {
    draggingRef.current = false;
    burstRef.current = 0;
    startInertia();
  };

  const onWheel = (e) => {
    if (disabled) return;
    e.preventDefault();
    stopInertia();

    const abs = Math.abs(e.deltaY);
    const extra = abs >= 220 ? 3 : abs >= 140 ? 2 : abs >= 80 ? 1 : 0;

    inertiaVelRef.current = clamp((e.deltaY / 1200) * 0.9, -0.9, 0.9);
    acceleratedStep(e.deltaY > 0 ? +1 : -1, extra);
    startInertia();
  };

  return (
    <div className={`spWheelWrap ${disabled ? "disabled" : ""}`}>
      <div className="spWheelLabel muted">Çark</div>
      <div
        ref={wrapRef}
        className="spWheel"
        role="slider"
        aria-label="Ayet çarkı (dikey)"
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onKeyDown={(e) => {
          if (disabled) return;
          stopInertia();
          if (e.key === "ArrowUp") {
            e.preventDefault();
            acceleratedStep(-1, e.repeat ? 1 : 0);
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            acceleratedStep(+1, e.repeat ? 1 : 0);
          }
        }}
        title="Yukarı/aşağı sürükle • mouse wheel • ↑/↓ • hızlıysa hızlanır • bırakınca momentum"
      >
        <div className="spWheelThumb" />
      </div>
      <div className="spWheelHint muted">↑ prev • ↓ next</div>
    </div>
  );
}

/**
 * Single Player (centered overlay, blur BACK)
 * - Çark + Repeat burada (dikey)
 * - Close => pause
 * - No close-on-backdrop-click
 */
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
  repeatAutoReset,
  onToggleRepeatAutoReset,
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

  const ay = verse?.ayah != null ? String(verse.ayah) : "—";
  const repeatTitle =
    repeatMode === 0 ? "Tekrar: kapalı" : repeatMode === 1 ? "Tekrar: 1×" : "Tekrar: 2×";

  return (
    <div className="singlePlayerBackdrop" role="dialog" aria-modal="true" aria-label="Single Player">
      <div className="singlePlayerCard">
        <div className="singlePlayerLayout">
          <div className="singlePlayerLines">
            <div className="singlePlayerLine singlePlayerLineAr" dir="rtl">
              {(verse?.ar || "—").trim()}
            </div>

            <div className="singlePlayerLine singlePlayerLineDe">{(verse?.de || "—").trim()}</div>

            <div className="singlePlayerControls">
              <div className="singlePlayerAyahNo">#{ay}</div>
              <div className="singlePlayerBtns">
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
              </div>
            </div>

            <div className="singlePlayerLine singlePlayerLineTr">{(verse?.tr || "—").trim()}</div>
          </div>

          {/* ✅ RIGHT SIDE VERTICAL CONTROLS */}
          <div className="spSideRail">
            <VerticalWheel disabled={dialDisabled} onStep={onDialStep} />

            <button
              className={`btnRepeat spRepeatBtn ${repeatMode ? "on" : "off"}`}
              type="button"
              onClick={onToggleRepeat}
              title={repeatTitle}
              aria-label={repeatTitle}
            >
              <span className="repeatIcon" aria-hidden="true">
                {repeatMode === 0 ? "r" : repeatMode === 1 ? "r" : "rr"}
              </span>
              <span className="repeatText">Tekrar</span>
            </button>

            <label className="chip spRepeatReset" title="Ayah değişince tekrar sayacı sıfırlansın">
              <input type="checkbox" checked={repeatAutoReset} onChange={onToggleRepeatAutoReset} />
              Auto-reset
            </label>

            <button className="spBtn spBtnClose spCloseBtn" type="button" onClick={onClose} aria-label="Close">
              ✕
            </button>
          </div>
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

          <button className={`btnSinglePlayer ${singleOn ? "on" : ""}`} type="button" onClick={onToggleSingle}>
            {singleOn ? "Single Player: ON" : "Single Player"}
          </button>

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
  onCommitGithub,
}) {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [jumpAyah, setJumpAyah] = useState("");
  const [jumpTime, setJumpTime] = useState("");
  const fileRef = useRef(null);

  const [commitOpen, setCommitOpen] = useState(false);
  const [ghRepo, setGhRepo] = useState("");
  const [ghBranch, setGhBranch] = useState("main");
  const [ghPath, setGhPath] = useState("public/data/yusuf.json");
  const [ghToken, setGhToken] = useState("");
  const [ghMsg, setGhMsg] = useState("");
  const [ghRemember, setGhRemember] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("qatd:ghcfg");
      if (!saved) return;
      const cfg = JSON.parse(saved);
      if (cfg?.repo) setGhRepo(cfg.repo);
      if (cfg?.branch) setGhBranch(cfg.branch);
      if (cfg?.path) setGhPath(cfg.path);
      if (cfg?.token) setGhToken(cfg.token);
      if (cfg?.remember === false) setGhRemember(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (!ghRemember) {
        localStorage.removeItem("qatd:ghcfg");
        return;
      }
      localStorage.setItem(
        "qatd:ghcfg",
        JSON.stringify({
          repo: ghRepo,
          branch: ghBranch,
          path: ghPath,
          token: ghToken,
          remember: true,
        })
      );
    } catch {}
  }, [ghRepo, ghBranch, ghPath, ghToken, ghRemember]);

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

  const doCommit = async () => {
    const repoStr = ghRepo.trim();
    const token = ghToken.trim();
    const path = ghPath.trim();
    const branch = ghBranch.trim() || "main";

    if (!repoStr.includes("/")) {
      alert("Repo format: owner/repo");
      return;
    }
    if (!token) {
      alert("Token required (fine-grained PAT: Contents RW on that repo).");
      return;
    }
    if (!path) {
      alert("File path required (e.g. public/data/yusuf.json)");
      return;
    }

    const [owner, repo] = repoStr.split("/", 2);
    const jsonText = JSON.stringify(verses, null, 2);
    const content = base64EncodeUtf8(jsonText);
    const message =
      ghMsg.trim() || `sync: update ${path} (${new Date().toISOString().slice(0, 19).replace("T", " ")})`;

    await onCommitGithub({ owner, repo, path, branch, token, message, content });
    setGhMsg("");
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
                <div className={`deltaPill ${deltaOk ? "" : "muted"}`}>Δ {deltaOk ? `${delta.toFixed(2)}s` : "—"}</div>
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

          <div className="syncRow">
            <button className="btnSmall" type="button" onClick={() => setCommitOpen((x) => !x)}>
              {commitOpen ? "Hide commit" : "Commit to GitHub"}
            </button>

            <button
              className="btnSmall"
              type="button"
              onClick={async () => {
                try {
                  const r = await fetch("https://api.github.com/rate_limit");
                  alert(`GitHub reachable ✅ (${r.status})`);
                } catch {
                  alert("GitHub not reachable ❌ (Failed to fetch). Check network/adblock/firewall.");
                }
              }}
            >
              Test GitHub
            </button>
          </div>

          {commitOpen ? (
            <>
              <div className="syncRow">
                <label className="miniLabel">
                  Repo (owner/repo)
                  <input
                    className="miniInput"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    placeholder="yourname/yourrepo"
                  />
                </label>

                <label className="miniLabel">
                  Branch
                  <input
                    className="miniInput"
                    value={ghBranch}
                    onChange={(e) => setGhBranch(e.target.value)}
                    placeholder="main"
                  />
                </label>
              </div>

              <div className="syncRow">
                <label className="miniLabel">
                  File path in repo
                  <input
                    className="miniInput"
                    value={ghPath}
                    onChange={(e) => setGhPath(e.target.value)}
                    placeholder="public/data/yusuf.json"
                  />
                </label>

                <label className="miniLabel">
                  Commit message
                  <input
                    className="miniInput"
                    value={ghMsg}
                    onChange={(e) => setGhMsg(e.target.value)}
                    placeholder="optional"
                  />
                </label>
              </div>

              <div className="syncRow">
                <label className="miniLabel" style={{ minWidth: 290 }}>
                  GitHub token (PAT)
                  <input
                    className="miniInput"
                    value={ghToken}
                    onChange={(e) => setGhToken(e.target.value)}
                    placeholder="ghp_... / github_pat_..."
                    type="password"
                  />
                </label>

                <label className="chip" title="Store token in localStorage on this browser">
                  <input type="checkbox" checked={ghRemember} onChange={(e) => setGhRemember(e.target.checked)} />
                  Remember token
                </label>

                <button className="btnSmall" type="button" onClick={doCommit}>
                  Commit now
                </button>
              </div>

              <div className="syncRow muted">
                Note: Needs PAT with <span className="mono">Contents: Read/Write</span> on that repo.
              </div>
            </>
          ) : null}
        </div>
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
  const [singleOn, setSingleOn] = useState(false);

  // repeat: 0 off, 1 => 1 tekrar, 2 => 2 tekrar
  const [repeatMode, setRepeatMode] = useState(0);
  const [repeatAutoReset, setRepeatAutoReset] = useState(true);
  const repeatRef = useRef({ idx: -1, done: 0 });

  const resetRepeatCounter = useCallback((idx = -1) => {
    repeatRef.current = { idx, done: 0 };
  }, []);

  useEffect(() => {
    document.title = "Türkçe-Almanca Kur’an Player";
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
    try {
      const raw = localStorage.getItem("qatd:repeatAutoReset");
      if (raw === "0") setRepeatAutoReset(false);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("qatd:repeatAutoReset", repeatAutoReset ? "1" : "0");
    } catch {}
  }, [repeatAutoReset]);

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

  useEffect(() => {
    let cancelled = false;

    setError("");
    setVerses([]);
    setActiveIndex(-1);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSingleOn(false);
    setRepeatMode(0);
    resetRepeatCounter(-1);

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
  }, [versesSrc, resetRepeatCounter]);

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

      if (repeatAutoReset) resetRepeatCounter(idx);
      seekTo(start, autoPlay);
    },
    [seekTo, resetRepeatCounter, repeatAutoReset]
  );

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

  const dialStep = useCallback(
    (dir) => {
      const vs = versesRef.current;
      if (!vs.length) return;
      const cur = activeIndexRef.current;
      const base = cur >= 0 ? cur : 0;
      const next = clamp(base + dir, 0, vs.length - 1);
      seekVerse(next, true);
    },
    [seekVerse]
  );

  const updateVerse = useCallback((idx, patch) => {
    setVerses((prev) => {
      if (!prev[idx]) return prev;
      const next = [...prev];
      const v = { ...next[idx], ...patch };

      const s = Number(v.start);
      const e = Number(v.end);

      if (Number.isFinite(s)) v.start = Math.max(0, s);
      if (Number.isFinite(e)) v.end = Math.max(0, e);
      if (Number.isFinite(v.start) && Number.isFinite(v.end) && v.end <= v.start) v.end = v.start + 0.01;

      next[idx] = v;
      return next;
    });
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(versesRef.current));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [draftKey, verses]);

  const exportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(versesRef.current, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedSurah.slug}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [selectedSurah.slug]);

  const importJsonFile = useCallback((file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        if (!Array.isArray(parsed)) throw new Error("Imported JSON must be an array");
        setVerses(parsed);
        setError("");
      } catch (e) {
        setError(`Import failed: ${e.message}`);
      }
    };
    reader.readAsText(file);
  }, []);

  const saveDraft = useCallback(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify(versesRef.current));
    } catch {}
  }, [draftKey]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setVerses(parsed);
    } catch {}
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
  }, [draftKey]);

  const jumpFirstUntimed = useCallback(() => {
    const vs = versesRef.current;
    const idx = vs.findIndex((v) => !Number.isFinite(Number(v?.start)) || !Number.isFinite(Number(v?.end)));
    if (idx >= 0) seekVerse(idx, true);
  }, [seekVerse]);

  // Loop / Repeat engine (priority: loopAB > loopAyah > repeatMode)
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    if (loopAB && aPoint != null && bPoint != null) {
      const lo = Math.min(aPoint, bPoint);
      const hi = Math.max(aPoint, bPoint);
      if (currentTime >= hi) {
        a.currentTime = lo;
        a.play().catch(() => {});
      }
      return;
    }

    if (!verses.length) return;

    const idx = findActiveVerseIndex(verses, currentTime);
    if (idx < 0) return;
    const v = verses[idx];
    const s = Number(v?.start);
    const e = Number(v?.end);
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) return;

    if (loopAyah) {
      if (currentTime >= e) {
        a.currentTime = s;
        a.play().catch(() => {});
      }
      return;
    }

    if (repeatMode > 0 && currentTime >= e) {
      const st = repeatRef.current;
      const sameIdx = st.idx === idx;

      const done = sameIdx ? st.done : 0;
      const target = repeatMode;

      if (done < target) {
        repeatRef.current = { idx, done: done + 1 };
        a.currentTime = s;
        a.play().catch(() => {});
        return;
      }

      repeatRef.current = { idx: -1, done: 0 };
      const nextIdx = Math.min(verses.length - 1, idx + 1);
      seekVerse(nextIdx, true);
    }
  }, [currentTime, verses, loopAyah, loopAB, aPoint, bPoint, repeatMode, seekVerse]);

  useEffect(() => {
    if (!verses.length) return;
    const idx = findActiveVerseIndex(verses, currentTime);
    if (idx === -1 || idx === activeIndex) return;

    setActiveIndex(idx);

    const el = rowRefs.current[idx];
    if (el) ensureRowVisible(el, 10);

    if (repeatAutoReset) resetRepeatCounter(idx);
  }, [currentTime, verses, activeIndex, resetRepeatCounter, repeatAutoReset]);

  const setA = useCallback(() => setAPoint(currentTimeRef.current), []);
  const setB = useCallback(() => setBPoint(currentTimeRef.current), []);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || document.activeElement?.isContentEditable;
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
  }, [onPlayPause, nudge, prevAyah, nextAyah, updateVerse, seekVerse, setA, setB]);

  const commitGithub = useCallback(async ({ owner, repo, path, branch, token, message, content }) => {
    try {
      setError("");
      const sha = await githubGetFileSha({ owner, repo, path, token, branch });
      await githubPutFile({ owner, repo, path, token, branch, message, contentBase64: content, sha });
      alert(`Committed ✅ ${owner}/${repo}:${branch}/${path}`);
    } catch (e) {
      console.error(e);
      alert(String(e?.message || e));
    }
  }, []);

  const activeVerse = useMemo(() => (activeIndex >= 0 ? verses[activeIndex] : null), [activeIndex, verses]);

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

  const toggleRepeat = useCallback(() => {
    setRepeatMode((m) => (m === 0 ? 1 : m === 1 ? 2 : 0));
    if (repeatAutoReset) resetRepeatCounter(activeIndexRef.current);
  }, [resetRepeatCounter, repeatAutoReset]);

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
          onDialStep={dialStep}
          repeatMode={repeatMode}
          onToggleRepeat={toggleRepeat}
          repeatAutoReset={repeatAutoReset}
          onToggleRepeatAutoReset={() => setRepeatAutoReset((x) => !x)}
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
            singleOn={singleOn}
            onToggleSingle={toggleSingle}
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

              <SyncPanel
                verses={verses}
                activeIndex={activeIndex}
                currentTime={currentTime}
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
                onCommitGithub={commitGithub}
              />
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
