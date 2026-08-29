import { Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { TileAttachment } from '../../types/board';
import {
  formatAudioClock,
  normalizeAudioClipBound,
  normalizeAudioVolume,
  parseAudioClock,
  resolveAudioVolume,
  resolveClipBounds,
  shiftClipWindow,
} from '../../lib/audioClip';
import { getMediaBlob } from '../../lib/mediaStorage';
import './AudioTrimModal.css';

interface AudioTrimModalProps {
  attachment: TileAttachment;
  onCancel: () => void;
  onSave: (result: {
    audioStartSec?: number;
    audioEndSec?: number;
    volume?: number;
  }) => void;
}

type DragState =
  | { type: 'start' }
  | { type: 'end' }
  | { type: 'pan'; originX: number; start: number; end: number };

const PEAK_COUNT = 120;

async function buildPeaks(src: string): Promise<number[]> {
  try {
    const response = await fetch(src);
    if (!response.ok) return [];
    const buffer = await response.arrayBuffer();
    const ctx = new AudioContext();
    try {
      const decoded = await ctx.decodeAudioData(buffer.slice(0));
      const channel = decoded.getChannelData(0);
      const block = Math.max(1, Math.floor(channel.length / PEAK_COUNT));
      const peaks: number[] = [];
      for (let i = 0; i < PEAK_COUNT; i++) {
        let max = 0;
        const start = i * block;
        const end = Math.min(channel.length, start + block);
        for (let j = start; j < end; j++) {
          const v = Math.abs(channel[j] ?? 0);
          if (v > max) max = v;
        }
        peaks.push(max);
      }
      const peakMax = Math.max(...peaks, 0.001);
      return peaks.map((p) => p / peakMax);
    } finally {
      await ctx.close();
    }
  } catch {
    return [];
  }
}

export function AudioTrimModal({ attachment, onCancel, onSave }: AudioTrimModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const boundsRef = useRef({ start: 0, end: 0, duration: 0 });

  const [src, setSrc] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [startText, setStartText] = useState('00:00.000');
  const [endText, setEndText] = useState('00:00.000');
  const [playing, setPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [volume, setVolume] = useState(() => resolveAudioVolume(attachment.volume));

  boundsRef.current = { start, end, duration };

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    async function load() {
      setMissing(false);
      setSrc(null);
      if (attachment.storage === 'local' && attachment.mediaId) {
        const blob = await getMediaBlob(attachment.mediaId);
        if (cancelled) return;
        if (!blob) {
          setMissing(true);
          return;
        }
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
        return;
      }
      const url = attachment.url?.trim();
      if (url) setSrc(url);
      else setMissing(true);
    }

    void load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachment.mediaId, attachment.storage, attachment.url]);

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    void buildPeaks(src).then((next) => {
      if (!cancelled) setPeaks(next);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const syncTexts = (s: number, e: number) => {
    setStartText(formatAudioClock(s));
    setEndText(formatAudioClock(e));
  };

  const applyBounds = (nextStart: number, nextEnd: number, durationOverride?: number) => {
    const durationSafe =
      (durationOverride ?? boundsRef.current.duration) > 0
        ? (durationOverride ?? boundsRef.current.duration)
        : Math.max(nextEnd, nextStart + 0.1);
    let s = Math.min(Math.max(0, nextStart), Math.max(0, durationSafe - 0.05));
    let e = Math.min(Math.max(s + 0.05, nextEnd), durationSafe || nextEnd);
    if (e <= s) e = Math.min(durationSafe, s + 0.05);
    setStart(s);
    setEnd(e);
    syncTexts(s, e);
    setPlayhead((p) => Math.min(e, Math.max(s, p)));
  };

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const handle = dragRef.current;
      if (!handle || !trackRef.current) return;
      const { start: s0, end: e0, duration: d0 } = boundsRef.current;
      if (d0 <= 0) return;
      const rect = trackRef.current.getBoundingClientRect();
      if (handle.type === 'pan') {
        const deltaSec = ((event.clientX - handle.originX) / rect.width) * d0;
        const next = shiftClipWindow(handle.start, handle.end, deltaSec, d0);
        applyBounds(next.start, next.end, d0);
        return;
      }
      const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      const t = ratio * d0;
      if (handle.type === 'start') {
        applyBounds(Math.min(t, e0 - 0.05), e0, d0);
      } else {
        applyBounds(s0, Math.max(t, s0 + 0.05), d0);
      }
    };
    const onUp = () => {
      dragRef.current = null;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // applyBounds uses boundsRef / setters; listeners mount once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const playFromStart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = start;
    setPlayhead(start);
    void audio.play();
    setPlaying(true);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      playFromStart();
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seekRelative = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const next = Math.min(end, Math.max(start, (audio.currentTime || start) + delta));
    audio.currentTime = next;
    setPlayhead(next);
  };

  const commitStartText = () => {
    const parsed = parseAudioClock(startText);
    if (parsed === null) {
      setStartText(formatAudioClock(start));
      return;
    }
    applyBounds(parsed, end);
  };

  const commitEndText = () => {
    const parsed = parseAudioClock(endText);
    if (parsed === null) {
      setEndText(formatAudioClock(end));
      return;
    }
    applyBounds(start, parsed);
  };

  const handleOk = () => {
    const clip = normalizeAudioClipBound(start, end, duration);
    onSave({ ...clip, volume: normalizeAudioVolume(volume) });
  };

  const handleVolume = (next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setVolume(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
  };

  const title = attachment.title?.trim() || 'Audio';
  const startPct = duration > 0 ? (start / duration) * 100 : 0;
  const endPct = duration > 0 ? (end / duration) * 100 : 100;
  const playPct = duration > 0 ? (playhead / duration) * 100 : 0;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="audio-trim-title">
      <div className="modal audio-trim-modal">
        <div className="modal-header">
          <h2 id="audio-trim-title">Trim Audio</h2>
          <button type="button" className="btn btn-ghost btn-icon" aria-label="Close" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body audio-trim-body">
          {missing || !src ? (
            <p className="field-error" role="status">
              Audio not available to trim.
            </p>
          ) : (
            <>
              <div className="audio-trim-meta">
                <span className="audio-trim-name">{title}</span>
                <span className="audio-trim-duration">Duration: {formatAudioClock(duration)}</span>
              </div>

              <audio
                ref={audioRef}
                src={src}
                preload="metadata"
                onLoadedMetadata={() => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  const d = audio.duration || 0;
                  setDuration(d);
                  const bounds = resolveClipBounds(
                    attachment.audioStartSec,
                    attachment.audioEndSec,
                    d,
                  );
                  setStart(bounds.start);
                  setEnd(bounds.end);
                  syncTexts(bounds.start, bounds.end);
                  audio.currentTime = bounds.start;
                  setPlayhead(bounds.start);
                  audio.volume = volume;
                }}
                onTimeUpdate={() => {
                  const audio = audioRef.current;
                  if (!audio) return;
                  const { start: s, end: e } = boundsRef.current;
                  if (audio.currentTime >= e - 0.02) {
                    audio.pause();
                    audio.currentTime = s;
                    setPlaying(false);
                    setPlayhead(s);
                    return;
                  }
                  setPlayhead(audio.currentTime);
                }}
                onPause={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
              />

              <div className="audio-trim-waveform" ref={trackRef}>
                <div className="audio-trim-peaks" aria-hidden="true">
                  {(peaks.length > 0 ? peaks : Array.from({ length: PEAK_COUNT }, () => 0.35)).map(
                    (peak, i) => (
                      <span
                        key={i}
                        className="audio-trim-peak"
                        style={{ height: `${Math.max(8, peak * 100)}%` }}
                      />
                    ),
                  )}
                </div>
                <div
                  className="audio-trim-selection"
                  style={{ left: `${startPct}%`, width: `${Math.max(0, endPct - startPct)}%` }}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dragRef.current = {
                      type: 'pan',
                      originX: e.clientX,
                      start,
                      end,
                    };
                  }}
                  role="presentation"
                />
                <div className="audio-trim-playhead" style={{ left: `${playPct}%` }} />
                <button
                  type="button"
                  className="audio-trim-handle audio-trim-handle-start"
                  style={{ left: `${startPct}%` }}
                  aria-label="Start trim"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { type: 'start' };
                  }}
                >
                  <span className="audio-trim-handle-label">{formatAudioClock(start)}</span>
                </button>
                <button
                  type="button"
                  className="audio-trim-handle audio-trim-handle-end"
                  style={{ left: `${endPct}%` }}
                  aria-label="End trim"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    dragRef.current = { type: 'end' };
                  }}
                >
                  <span className="audio-trim-handle-label">{formatAudioClock(end)}</span>
                </button>
              </div>

              <div className="audio-trim-times">
                <label className="audio-trim-time-field">
                  <span>Start Time</span>
                  <input
                    className="input input-sm"
                    value={startText}
                    onChange={(e) => setStartText(e.target.value)}
                    onBlur={commitStartText}
                    onKeyDown={(e) => e.key === 'Enter' && commitStartText()}
                  />
                </label>
                <label className="audio-trim-time-field">
                  <span>End Time</span>
                  <input
                    className="input input-sm"
                    value={endText}
                    onChange={(e) => setEndText(e.target.value)}
                    onBlur={commitEndText}
                    onKeyDown={(e) => e.key === 'Enter' && commitEndText()}
                  />
                </label>
              </div>

              <div className="audio-trim-transport-row">
                <div className="audio-trim-transport">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label="Play from start"
                    title="Play from start"
                    onClick={playFromStart}
                  >
                    <SkipBack size={18} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary btn-icon audio-trim-play"
                    aria-label={playing ? 'Pause' : 'Play from start'}
                    onClick={togglePlay}
                  >
                    {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label="Skip forward"
                    onClick={() => seekRelative(1)}
                  >
                    <SkipForward size={18} />
                  </button>
                </div>

                <div className="audio-trim-volume">
                  <button
                    type="button"
                    className="btn btn-ghost btn-icon"
                    aria-label={volume <= 0.001 ? 'Unmute' : 'Mute'}
                    onClick={() => handleVolume(volume <= 0.001 ? 1 : 0)}
                  >
                    {volume <= 0.001 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <input
                    type="range"
                    className="audio-trim-volume-range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={volume}
                    aria-label="Volume"
                    onChange={(e) => handleVolume(Number(e.target.value))}
                  />
                  <span className="audio-trim-volume-value">{volume.toFixed(2)}</span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handleOk} disabled={!src || missing}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
