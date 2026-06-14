import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './AudioAttachmentPlayer.css';

interface AudioAttachmentPlayerProps {
  src: string;
  title?: string;
  autoplay?: boolean;
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function AudioAttachmentPlayer({ src, title = '', autoplay = false }: AudioAttachmentPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    if (!autoplay) return;
    const audio = audioRef.current;
    if (!audio) return;
    void audio.play().catch(() => {});
  }, [autoplay, src]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
      setPlaying(true);
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const seek = (value: number) => {
    const audio = audioRef.current;
    if (!audio || !Number.isFinite(value)) return;
    audio.currentTime = value;
    setCurrent(value);
  };

  const progress = duration > 0 ? (current / duration) * 100 : 0;

  return (
    <div className="attachment-audio-card">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        className="attachment-audio-element"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onTimeUpdate={() => setCurrent(audioRef.current?.currentTime ?? 0)}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      <div className="attachment-audio-controls">
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
            max={duration || 0}
            step={0.1}
            value={Math.min(current, duration || 0)}
            aria-label="Audio progress"
            onChange={(e) => seek(Number(e.target.value))}
          />
          <div className="attachment-audio-range-track" aria-hidden="true">
            <div className="attachment-audio-range-fill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <span className="attachment-audio-time" aria-live="off">
          {formatTime(current)} / {formatTime(duration)}
        </span>
      </div>
    </div>
  );
}
