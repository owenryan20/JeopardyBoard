import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BUZZIN_LIVE_URL,
  BUZZIN_SOCKET_PATH,
  buzzKey,
  findNewBuzzes,
  normalizeBuzzes,
} from '../../lib/buzzIn';
import { loadSocketIo } from '../../lib/loadSocketIo';
import { showBuzzToast, showToast } from '../../lib/toast';
import type { BuzzInBuzz, BuzzInErrPayload, BuzzInGameCreatedPayload, BuzzInSocket } from '../../types/buzzIn';
import './BuzzInIntegration.css';

const CREATE_TIMEOUT_MS = 15_000;

interface BuzzInIntegrationProps {
  className?: string;
  compact?: boolean;
  /** Slim layout for use above clue overlays. */
  overlayMode?: boolean;
  /** Discord-style translucent panel while a clue is open. */
  ghostOverlay?: boolean;
  onBuzz?: (buzz: BuzzInBuzz, order: number) => void;
}

export function BuzzInIntegration({
  className = '',
  compact = false,
  overlayMode = false,
  ghostOverlay = false,
  onBuzz,
}: BuzzInIntegrationProps) {
  const [gameCode, setGameCode] = useState('');
  const [statusMessage, setStatusMessage] = useState('Create a BuzzIn game to get started.');
  const [buzzes, setBuzzes] = useState<ReturnType<typeof normalizeBuzzes>>([]);
  const [creating, setCreating] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);

  const socketRef = useRef<BuzzInSocket | null>(null);
  const hostVerifyRef = useRef<string | null>(null);
  const gameCodeRef = useRef('');
  const intentionalDisconnectRef = useRef(false);
  const createTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCreateRef = useRef(false);
  const readyRef = useRef(false);
  const prevBuzzesRef = useRef<BuzzInBuzz[]>([]);
  const suppressBuzzToastsRef = useRef(true);
  const onBuzzRef = useRef(onBuzz);

  useEffect(() => {
    onBuzzRef.current = onBuzz;
  }, [onBuzz]);

  const clearCreateTimeout = useCallback(() => {
    if (createTimeoutRef.current) {
      clearTimeout(createTimeoutRef.current);
      createTimeoutRef.current = null;
    }
  }, []);

  const markReady = useCallback(
    (code: string) => {
      clearCreateTimeout();
      pendingCreateRef.current = false;
      readyRef.current = true;
      gameCodeRef.current = code;
      setGameCode(code);
      setCreating(false);
      setIsReady(true);
      setStatusMessage(`BuzzIn game ${code} is ready. Share the code with players on BuzzIn.live.`);
      suppressBuzzToastsRef.current = true;
    },
    [clearCreateTimeout],
  );

  const disconnectSocket = useCallback(
    (options?: { intentional?: boolean; status?: string; resetSession?: boolean }) => {
      intentionalDisconnectRef.current = options?.intentional ?? false;
      clearCreateTimeout();
      pendingCreateRef.current = false;

      const socket = socketRef.current;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
        socketRef.current = null;
      }

      setCreating(false);
      setSocketConnected(false);

      if (options?.resetSession) {
        readyRef.current = false;
        hostVerifyRef.current = null;
        gameCodeRef.current = '';
        setGameCode('');
        setIsReady(false);
        setBuzzes([]);
        prevBuzzesRef.current = [];
      }

      if (options?.status) {
        setStatusMessage(options.status);
      } else if (!options?.intentional) {
        setStatusMessage('Disconnected from BuzzIn.live');
        setIsReady(false);
        readyRef.current = false;
      }
    },
    [clearCreateTimeout],
  );

  const attachSocketListeners = useCallback(
    (socket: BuzzInSocket) => {
      socket.on('gameCreated', (data: unknown) => {
        const payload = (data ?? {}) as BuzzInGameCreatedPayload;
        const createdCode = payload.gameCode?.toString().trim();
        if (!createdCode) return;

        if (payload.hostVerifyCode !== undefined) {
          hostVerifyRef.current = String(payload.hostVerifyCode);
        }

        markReady(createdCode);
      });

      socket.on('buzzes', (data: unknown) => {
        const next = normalizeBuzzes(data);
        const previous = prevBuzzesRef.current;

        if (suppressBuzzToastsRef.current) {
          prevBuzzesRef.current = next;
          setBuzzes(next);
          suppressBuzzToastsRef.current = false;
          return;
        }

        if (next.length < previous.length) {
          prevBuzzesRef.current = next;
          setBuzzes(next);
          return;
        }

        const newBuzzes = findNewBuzzes(previous, next);
        prevBuzzesRef.current = next;
        setBuzzes(next);

        newBuzzes.forEach((buzz) => {
          const order =
            next.findIndex((entry) =>
              buzz.id ? entry.id === buzz.id : entry.username === buzz.username && entry.time === buzz.time,
            ) + 1;
          const position = order > 0 ? order : next.length;
          showBuzzToast(`${buzz.username} buzzed in! (#${position})`);
          onBuzzRef.current?.(buzz, position);
        });
      });

      socket.on('disconnect', () => {
        clearCreateTimeout();
        pendingCreateRef.current = false;
        setCreating(false);
        setSocketConnected(false);

        if (!intentionalDisconnectRef.current) {
          setIsReady(false);
          readyRef.current = false;
          setStatusMessage('Disconnected from BuzzIn.live. Reconnecting…');
        }
        intentionalDisconnectRef.current = false;
      });

      socket.on('connect_error', (error: unknown) => {
        clearCreateTimeout();
        pendingCreateRef.current = false;
        setCreating(false);
        setIsReady(false);
        setSocketConnected(false);
        readyRef.current = false;

        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Could not connect to BuzzIn.live';

        setStatusMessage(`Connection error: ${message}`);
        disconnectSocket({ intentional: true, resetSession: true });
      });

      socket.on('err', (data: unknown) => {
        const payload = (data ?? {}) as BuzzInErrPayload;
        clearCreateTimeout();
        pendingCreateRef.current = false;
        setCreating(false);
        setStatusMessage(payload.message ?? 'BuzzIn.live rejected the connection');
        disconnectSocket({ intentional: true, resetSession: true });
      });

      socket.on('connect', () => {
        setSocketConnected(true);

        if (pendingCreateRef.current) {
          setStatusMessage('Creating BuzzIn game…');
          socket.emit('hostConnect');
          return;
        }

        const code = gameCodeRef.current;
        const verify = hostVerifyRef.current;
        if (code && verify) {
          setStatusMessage(`Reconnecting to BuzzIn game ${code}…`);
          socket.emit('hostConnect', { code, hostVerifyCode: verify });
          setIsReady(true);
          readyRef.current = true;
          setStatusMessage(`BuzzIn game ${code} is ready. Share the code with players on BuzzIn.live.`);
        }
      });
    },
    [clearCreateTimeout, disconnectSocket, markReady],
  );

  const createGame = useCallback(async () => {
    disconnectSocket({ intentional: true, resetSession: true, status: 'Connecting…' });
    setCreating(true);
    setBuzzes([]);
    prevBuzzesRef.current = [];
    suppressBuzzToastsRef.current = true;

    try {
      const io = await loadSocketIo();
      const socket = io(BUZZIN_LIVE_URL, {
        transports: ['websocket'],
        path: BUZZIN_SOCKET_PATH,
      });
      socketRef.current = socket;
      attachSocketListeners(socket);
      pendingCreateRef.current = true;

      createTimeoutRef.current = setTimeout(() => {
        if (!socketRef.current) return;
        setCreating(false);
        pendingCreateRef.current = false;
        setStatusMessage('Timed out creating BuzzIn game. Try again.');
        disconnectSocket({ intentional: true, resetSession: true });
      }, CREATE_TIMEOUT_MS);
    } catch (error) {
      clearCreateTimeout();
      setCreating(false);
      pendingCreateRef.current = false;
      setStatusMessage(
        error instanceof Error ? error.message : 'Failed to load Socket.IO client',
      );
    }
  }, [attachSocketListeners, clearCreateTimeout, disconnectSocket]);

  const handleCopyCode = useCallback(async () => {
    const code = gameCode.trim();
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      showToast('Game code copied');
    } catch {
      showToast('Could not copy game code');
    }
  }, [gameCode]);

  const handleReset = useCallback(() => {
    socketRef.current?.emit('clearAllBuzzes');
  }, []);

  useEffect(
    () => () => {
      disconnectSocket({ intentional: true });
    },
    [disconnectSocket],
  );

  const canCopy = Boolean(gameCode.trim());
  const canReset = isReady && socketConnected;

  return (
    <section
      className={`buzzin-integration${compact ? ' buzzin-integration-compact' : ''}${overlayMode ? ' buzzin-integration-overlay' : ''}${ghostOverlay ? ' buzzin-integration-ghost' : ''}${className ? ` ${className}` : ''}`}
      aria-label="BuzzIn.live integration"
    >
      {!overlayMode && (
        <header className="buzzin-header">
          <h2 className="buzzin-title">BuzzIn.live</h2>
          <p className="buzzin-description">
            Create a BuzzIn room here, share the code with players on BuzzIn.live, and reset buzzers
            from this panel.
          </p>
        </header>
      )}

      {overlayMode && (
        <div className="buzzin-overlay-header">
          <h2 className="buzzin-title">BuzzIn</h2>
          {isReady && (
            <div className="buzzin-overlay-code">
              <span className="buzzin-overlay-code-value">{gameCode}</span>
              <button
                type="button"
                className="btn btn-sm buzzin-copy-btn"
                onClick={() => void handleCopyCode()}
                disabled={!canCopy}
              >
                Copy
              </button>
            </div>
          )}
        </div>
      )}

      {!overlayMode && (
        <button
          type="button"
          className="btn btn-primary buzzin-create-btn"
          onClick={() => void createGame()}
          disabled={creating}
        >
          {creating ? 'Creating…' : isReady ? 'Create new BuzzIn game' : 'Create BuzzIn game'}
        </button>
      )}

      {overlayMode && !isReady && (
        <button
          type="button"
          className="btn btn-sm btn-primary buzzin-create-btn"
          onClick={() => void createGame()}
          disabled={creating}
        >
          {creating ? 'Creating…' : 'Create BuzzIn game'}
        </button>
      )}

      {!overlayMode && (
        <div className="buzzin-code-row">
          <label className="buzzin-code-label" htmlFor="buzzin-game-code">
            Game code
          </label>
          <div className="buzzin-code-controls">
            <input
              id="buzzin-game-code"
              className="input buzzin-code-input"
              value={gameCode}
              readOnly
              placeholder="Create a game to get a code"
              aria-describedby="buzzin-status"
            />
            <button
              type="button"
              className="btn buzzin-copy-btn"
              onClick={() => void handleCopyCode()}
              disabled={!canCopy}
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {!overlayMode && (
        <p
          id="buzzin-status"
          className={`buzzin-status${isReady ? ' buzzin-status-connected' : ''}${statusMessage.startsWith('Connection error') || statusMessage.startsWith('Timed out') ? ' buzzin-status-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {statusMessage}
        </p>
      )}

      <div className="buzzin-buzz-list-wrap">
        <h3 className="buzzin-buzz-list-title">Buzz order</h3>
        {buzzes.length === 0 ? (
          <p className="buzzin-empty">No buzzes yet</p>
        ) : (
          <ol className="buzzin-buzz-list">
            {buzzes.map((buzz, index) => (
              <li key={buzzKey(buzz, index)} className="buzzin-buzz-item">
                <span className="buzzin-buzz-rank">{index + 1}</span>
                <span className="buzzin-buzz-name">{buzz.username}</span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <button
        type="button"
        className={`btn buzzin-reset-btn${overlayMode ? ' btn-sm' : ''}`}
        onClick={handleReset}
        disabled={!canReset}
      >
        Reset buzzers
      </button>
    </section>
  );
}
