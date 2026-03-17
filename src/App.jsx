// src/App.jsx
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
  return `${base}${p}`;
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

function getStickyPlayerBottomPx() {
  const el = document.querySelector(".playerSticky");
  if (!el) return 0;
  const r = el.getBoundingClientRect();
  return Math.max(0, r.bottom);
}

function ensureRowVisible(el, padding = 10) {
  if (!el) return;
  const r = el.getBoundingClientRect();
  const stickyBottom = getStickyPlayerBottomPx();
  const topSafe = stickyBottom + padding;
  const bottomSafe = window.innerHeight - padding;

  const hiddenUnderSticky = r.top < topSafe;
  const belowViewport = r.bottom > bottomSafe;

  if (hiddenUnderSticky || belowViewport) {
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
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

function Timeline({ duration, currentTime, verses, activeIndex, onSeek, onSeekVerse, showMarkers, markerEvery }) {
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

function base64EncodeUtf8(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

async function githubGetFileSha({ owner, repo, path, token, branch }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll(
    "%2F",
    "/"
  )}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, {
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
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replaceAll("%2F", "/")}`;
  const body = {
    message,
    content: contentBase64,
    branch,
    ...(sha ? { sha } : {}),
  };
  const res = await fetch(url, {
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

  // ✅ NEW: commit hook
  onCommitGithub,
}) {
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [jumpAyah, setJumpAyah] = useState("");
  const [jumpTime, setJumpTime] = useState("");
  const fileRef = useRef(null);

  // ✅ commit UI
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
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      if (!ghRemember) {
        localStorage.removeItem("qatd:ghcfg");
        return;
      }
      localStorage.setItem(
        "qatd:ghcfg",
        JSON.stringify({ repo: ghRepo, branch: ghBranch, path: ghPath, token: ghToken, remember: true })
      );
    } catch {
      // ignore
    }
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

  // auto-apply debounced
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
      ghMsg.trim() ||
      `sync: update ${path} (${new Date().toISOString().slice(0, 19).replace("T", " ")})`;

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
              <input className="miniInput" value={jumpAyah} onChange={(e) => setJumpAyah(e.target.value)} inputMode="numeric" />
            </label>
            <button className="btnSmall" type="button" onClick={jumpToAyah}>
              Go
            </button>

            <label className="miniLabel">
              Jump time (s)
              <input className="miniInput" value={jumpTime} onChange={(e) => setJumpTime(e.target.value)} inputMode="decimal" />
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
          </div>

          {commitOpen ? (
            <>
              <div className="syncRow">
                <label className="miniLabel">
                  Repo (owner/repo)
                  <input className="miniInput" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} placeholder="yourname/yourrepo" />
                </label>
                <label className="miniLabel">
                  Branch
                  <input className="miniInput" value={ghBranch} onChange={(e) => setGhBranch(e.target.value)} placeholder="main" />
                </label>
              </div>

              <div className="syncRow">
                <label className="miniLabel">
                  File path in repo
                  <input className="miniInput" value={ghPath} onChange={(e) => setGhPath(e.target.value)} placeholder="public/data/yusuf.json" />
                </label>
                <label className="miniLabel">
                  Commit message
                  <input className="miniInput" value={ghMsg} onChange={(e) => setGhMsg(e.target.value)} placeholder="optional" />
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
  const [markerEvery, setMarkerEvery] = useState(2);

  const [loopAB, setLoopAB] = useState(false);
  const [aPoint, setAPoint] = useState(null);
  const [bPoint, setBPoint] = useState(null);

  const [toolsCollapsed, setToolsCollapsed] = useState(true);

  useEffect(() => {
    document.title = "Türkçe-Almanca Kur’an Player";
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("qatd:toolsCollapsed");
      if (raw === "0") setToolsCollapsed(false);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("qatd:toolsCollapsed", toolsCollapsed ? "1" : "0");
    } catch {
      // ignore
    }
  }, [toolsCollapsed]);

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

    setLoopAyah(false);
    setLoopAB(false);
    setAPoint(null);
    setBPoint(null);

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

  const updateVerse = useCallback((idx, patch) => {
    setVerses((prev) => {
      if (!prev[idx]) return prev;
      const next = [...prev];
      const v = { ...next[idx], ...patch };

      const s = Number(v.start);
      const e = Number(v.end);

      if (Number.isFinite(s)) v.start = Math.max(0, s);
      if (Number.isFinite(e)) v.end = Math.max(0, e);
      if (Number.isFinite(v.start) && Number.isFinite(v.end) && v.end <= v.start) {
        v.end = v.start + 0.01;
      }

      next[idx] = v;
      return next;
    });
  }, []);

  // autosave draft (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(versesRef.current));
      } catch {
        // ignore
      }
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
    } catch {
      // ignore
    }
  }, [draftKey]);

  const restoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      setVerses(parsed);
    } catch {
      // ignore
    }
  }, [draftKey]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
    } catch {
      // ignore
    }
  }, [draftKey]);

  const jumpFirstUntimed = useCallback(() => {
    const vs = versesRef.current;
    const idx = vs.findIndex((v) => !Number.isFinite(Number(v?.start)) || !Number.isFinite(Number(v?.end)));
    if (idx >= 0) seekVerse(idx, true);
  }, [seekVerse]);

  // loop behavior
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

    if (loopAyah && verses.length) {
      const idx = findActiveVerseIndex(verses, currentTime);
      if (idx >= 0) {
        const v = verses[idx];
        const s = Number(v?.start);
        const e = Number(v?.end);
        if (Number.isFinite(s) && Number.isFinite(e) && e > s && currentTime >= e) {
          a.currentTime = s;
          a.play().catch(() => {});
        }
      }
    }
  }, [currentTime, verses, loopAyah, loopAB, aPoint, bPoint]);

  // ✅ active index update + "nearest" ensure visible (no page-top jump)
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

  // keyboard shortcuts
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
      if (k === "a") {
        setA();
        return;
      }
      if (k === "b") {
        setB();
        return;
      }

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

  // ✅ GitHub commit action (called by SyncPanel)
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
