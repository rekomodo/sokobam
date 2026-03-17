import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { reducers, tables } from './module_bindings';
import { parseSokFile, parseXBS } from './parser';
import { Direction } from './sokoban';
import { XBSView } from './XBSView';
import microbanSok from './puzzles/DavidWSkinner Microban.sok?raw';

const UNDO_KEY = 'q';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_PUZZLE = [
  '#######',
  '#     #',
  '#     #',
  '# @$ .#',
  '#     #',
  '#     #',
  '#######',
].join('\n');

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    backgroundColor: '#2d231a',
  },
  sidebar: {
    position: 'absolute' as const,
    left: '2rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#e8e0d5',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '1.25rem',
  },
  gameArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    alignItems: 'center',
    gap: '2rem',
    outline: 'none',
  },
  boardsRow: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: '2rem',
  },
  winnerBanner: {
    padding: '1rem 2rem',
    backgroundColor: '#8b7355',
    color: '#e8e0d5',
    fontFamily: 'ui-monospace, monospace',
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
    borderRadius: '8px',
  },
} as const;

/** Level puzzles; index matches levelIndices. */
const LEVEL_PUZZLES = parseSokFile(microbanSok);

function getLevelPuzzle(levelIndex: number): string {
  return LEVEL_PUZZLES[levelIndex] ?? DEFAULT_PUZZLE;
}

const ARROW_DIR: Record<string, Direction> = {
  ArrowLeft: Direction.Left,
  ArrowRight: Direction.Right,
  ArrowUp: Direction.Up,
  ArrowDown: Direction.Down,
};

enum MatchState {
  WAITING = 'WAITING',
  PLAYING = 'PLAYING',
}

const WINNER_PLAYER1 = 1;
const WINNER_PLAYER2 = 2;

const CODE_LENGTH = 8;
function generatePlayerCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

enum PlayerRole {
  Player1 = 'Player1',
  Player2 = 'Player2',
}

function App() {
  const conn = useSpacetimeDB();
  const [games] = useTable(tables.game);
  const registerGameCode = useReducer(reducers.registerGameCode);
  const updatePlayerState = useReducer(reducers.updatePlayerState);
  const claimWinner = useReducer(reducers.claimWinner);
  const deregisterGameCode = useReducer(reducers.deregisterGameCode);
  const [playerCode] = useState(generatePlayerCode);
  const [joinInput, setJoinInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinedGameCode, setJoinedGameCode] = useState<string | null>(null);
  const [localLevelIndex, setLocalLevelIndex] = useState(0);
  const joinInputRef = useRef<HTMLInputElement>(null);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conn?.isActive) registerGameCode({ code: playerCode });
  }, [conn?.isActive, playerCode, registerGameCode]);

  const unloadRef = useRef<{
    conn: ReturnType<typeof useSpacetimeDB>;
    code: string;
    deregister: typeof deregisterGameCode;
    isHost: boolean;
  } | null>(null);
  unloadRef.current = { conn, code: playerCode, deregister: deregisterGameCode, isHost: joinedGameCode === null };

  useEffect(() => {
    const onBeforeUnload = () => {
      const u = unloadRef.current;
      if (u?.isHost && u.code && u.conn?.isActive) u.deregister({ code: u.code });
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const currentGameCode = useMemo(() => joinedGameCode ?? playerCode, [joinedGameCode, playerCode]);
  const isPlayer1 = useMemo(() => joinedGameCode === null, [joinedGameCode]);
  const currentGame = useMemo(
    () => (games && currentGameCode ? games.find(g => g.code === currentGameCode) : undefined),
    [games, currentGameCode]
  );

  const matchState = currentGame?.started ? MatchState.PLAYING : MatchState.WAITING;
  const levelIndices = currentGame?.levelIndices ?? [];
  const winner = currentGame?.winner ?? 0;

  useEffect(() => {
    if (matchState === MatchState.PLAYING) {
      setLocalLevelIndex(0);
      gameAreaRef.current?.focus();
    }
  }, [matchState]);

  const playerSokobanRef = useRef(parseXBS(DEFAULT_PUZZLE));
  const initKey =
    matchState === MatchState.PLAYING
      ? `${currentGameCode}-${localLevelIndex}`
      : `${currentGameCode}-w`;

  useEffect(() => {
    const initial =
      matchState === MatchState.PLAYING
        ? getLevelPuzzle(levelIndices[localLevelIndex] ?? 0)
        : (isPlayer1 ? currentGame?.player1State : currentGame?.player2State) ?? DEFAULT_PUZZLE;
    playerSokobanRef.current = parseXBS(initial);
  }, [initKey]);

  const [playerXBS, setPlayerXBS] = useState(() => playerSokobanRef.current.getState()[0]);
  const opponentXBS = useMemo(
    () =>
      isPlayer1
        ? (currentGame?.player2State ?? DEFAULT_PUZZLE)
        : (currentGame?.player1State ?? DEFAULT_PUZZLE),
    [isPlayer1, currentGame?.player2State, currentGame?.player1State]
  );

  useEffect(() => {
    setPlayerXBS(playerSokobanRef.current.getState()[0]);
  }, [initKey]); 

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!currentGameCode) return;
      const isUndo = e.key.toLowerCase() === UNDO_KEY;
      const dir = ARROW_DIR[e.key];
      if (!isUndo && dir === undefined) return;

      e.preventDefault();
      const sokoban = playerSokobanRef.current;
      const didChange = isUndo ? sokoban.undo() : sokoban.tryMove(dir);

      if (!didChange) return;
      const [xbs, isWon] = sokoban.getState();
      setPlayerXBS(xbs);

      if (matchState === MatchState.PLAYING && isWon) {
        if (localLevelIndex + 1 < levelIndices.length) {
          setLocalLevelIndex(i => i + 1);
        } else {
          claimWinner({ code: currentGameCode, winner: isPlayer1 ? WINNER_PLAYER1 : WINNER_PLAYER2 });
        }
      }

      updatePlayerState({
        code: currentGameCode,
        isPlayer1,
        stateXbs: xbs,
        ready: isWon && matchState === MatchState.WAITING,
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentGameCode,
    isPlayer1,
    matchState,
    localLevelIndex,
    levelIndices.length,
    updatePlayerState,
    claimWinner,
  ]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    const code = joinInput.trim();
    if (!code || code.length !== CODE_LENGTH) {
      setJoinError('Enter a valid game code');
      return;
    }
    const game = games?.find(g => String(g.code).toUpperCase() === code.toUpperCase());
    if (!game) {
      setJoinError('Game not found. Is the host connected?');
      return;
    }
    setJoinedGameCode(game.code);
    joinInputRef.current?.blur();
    gameAreaRef.current?.focus();
  };

  return (
    <div style={styles.root}>
      <div style={styles.sidebar}>
        <div style={{ marginBottom: '0.25rem', opacity: 0.8 }}>Your code</div>
        <div style={{ fontWeight: 'bold', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>{playerCode}</div>
        <div style={{ marginBottom: '0.25rem', opacity: 0.8 }}>
          {isPlayer1 ? `Role: ${PlayerRole.Player1}` : `Joined as ${PlayerRole.Player2}`}
        </div>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            ref={joinInputRef}
            type="text"
            value={joinInput}
            onChange={e => setJoinInput(e.target.value)}
            placeholder="Enter code"
            maxLength={8}
            disabled={!isPlayer1}
            style={{
              padding: '0.5rem',
              fontSize: '1rem',
              backgroundColor: isPlayer1 ? '#e8e0d5' : '#6b6358',
              color: '#2d231a',
              border: '1px solid #8b7355',
              borderRadius: '4px',
              cursor: isPlayer1 ? undefined : 'not-allowed',
              opacity: isPlayer1 ? 1 : 0.7,
            }}
          />
          <button
            type="submit"
            disabled={!isPlayer1}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              backgroundColor: isPlayer1 ? '#8b7355' : '#6b6358',
              color: '#e8e0d5',
              border: 'none',
              borderRadius: '4px',
              cursor: isPlayer1 ? 'pointer' : 'not-allowed',
              opacity: isPlayer1 ? 1 : 0.7,
            }}
          >
            Join
          </button>
          {joinError && (
            <div style={{ color: '#c95c5c', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              {joinError}
            </div>
          )}
        </form>
      </div>
      <div ref={gameAreaRef} tabIndex={0} style={styles.gameArea}>
        {winner !== 0 && (
          <div style={styles.winnerBanner}>
            {winner === (isPlayer1 ? WINNER_PLAYER1 : WINNER_PLAYER2)
              ? 'You won!'
              : 'Opponent won!'}
          </div>
        )}
        <div style={styles.boardsRow}>
          <XBSView xbs={playerXBS} />
          <XBSView xbs={opponentXBS} scale={0.40} />
        </div>
      </div>
    </div>
  );
}

export default App;
