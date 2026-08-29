import { Pause, Play, SkipBack, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { resolveAudioVolume, resolveClipBounds } from '../../lib/audioClip';
import './AudioAttachmentPlayer.css';

interface AudioAttachmentPlayerProps {
  src: string;
  title?: string;
  autoplay?: boolean;
  startSec?: number;
  endSec?: number;
  volume?: number;
  /** When set, volume changes are reported (editor persistence). */
  onVolumeChange?: (volume: number) => void;
  showVolume?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioAttachmentPlayer({
  src,
  title = '',
  autoplay = false,
  startSec,
  endSec,
  volume,
  onVolumeChange,
  showVolume = true,
}: AudioAttachmentPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [vol, setVol] = useState(() => resolveAudioVolume(volume));

  const clip = resolveClipBounds(startSec, endSec, duration);
  const clipLength = Math.max(0.1, clip.end - clip.start);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    setVol(resolveAudioVolume(volume));
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = vol;
  }, [vol]);

  useEffect(() => {
    if (!autoplay) return;
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = clip.start;
    void audio.play().catch(() => {});
  }, [autoplay, src, clip.start]);

  const playFromStart = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const bounds = resolveClipBounds(startSec, endSec, audio.duration || duration);
    audio.currentTime = bounds.start;
    setCurrent(bounds.start);
    void audio.play();
    setPlaying(true);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      if (audio.currentTime < clip.start || audio.currentTime >= clip.end - 0.05) {
        audio.currentTime = clip.start;
      }
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seekInClip = (relative: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(relative)) return;
    const next = Math.min(clip.end, Math.max(clip.start, clip.start + relative));
    audio.currentTime = next;
    setCurrent(next);
  };

  const handleVolume = (next: number) => {
    const clamped = Math.min(1, Math.max(0, next));
    setVol(clamped);
    if (audioRef.current) audioRef.current.volume = clamped;
    onVolumeChange?.(clamped);
  };

  const relativeCurrent = Math.min(clipLength, Math.max(0, current - clip.start));
  const progress = clipLength > 0 ? (relativeCurrent / clipLength) * 100 : 0;

  return (
    <div className="attachment-audio-card">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="attachment-audio-element"
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;
          setDuration(audio.duration || 0);
          audio.currentTime = resolveClipBounds(startSec, endSec, audio.duration || 0).start;
          audio.volume = vol;
        }}
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (!audio) return;
          const t = audio.currentTime;
          const bounds = resolveClipBounds(startSec, endSec, audio.duration || duration);
          if (t >= bounds.end - 0.02) {
            audio.pause();
            audio.currentTime = bounds.start;
            setPlaying(false);
            setCurrent(bounds.start);
            return;
          }
          if (t < bounds.start) {
            audio.currentTime = bounds.start;
            setCurrent(bounds.start);
            return;
          }
          setCurrent(t);
        }}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      <div className="attachment-audio-controls">
        <button
          type="button"
          className="attachment-audio-restart-btn"
          onClick={playFromStart}
          aria-label="Play from start"
          title="Play from start"
        >
          <SkipBack size={18} />
        </button>

        <button
          type="button"
          className="attachment-audio-play-btn"
          onClick={togglePlay}
          aria-label={playing ? 'Pause audio' : title.trim() ? `Play ${title}` : 'Play audio'}
        >
          {playing ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
        </button>

        <div className="attachment-audio-scrub">
          <input
            type="range"
            className="attachment-audio-range"
            min={0}
            max={clipLength}
            step={0.1}
            value={relativeCurrent}
            aria-label="Audio progress"
            onChange={(e) => seekInClip(Number(e.target.value))}
          />
          <div className="attachment-audio-range-track" aria-hidden="true">
            <div className="attachment-audio-range-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <span className="attachment-audio-time" aria-live="off">
          {formatTime(relativeCurrent)} / {formatTime(clipLength)}
        </span>

        {showVolume && (
          <div className="attachment-audio-volume">
            <button
              type="button"
              className="attachment-audio-vol-btn"
              aria-label={vol <= 0.001 ? 'Unmute' : 'Mute'}
              onClick={() => handleVolume(vol <= 0.001 ? 1 : 0)}
            >
              {vol <= 0.001 ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <input
              type="range"
              className="attachment-audio-vol-range"
              min={0}
              max={1}
              step={0.01}
              value={vol}
              aria-label="Volume"
              onChange={(e) => handleVolume(Number(e.target.value))}
            />
            <span className="attachment-audio-vol-value">{vol.toFixed(2)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
