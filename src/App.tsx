import { useEffect, useMemo, useRef, useState } from 'react';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { reducers, tables } from './module_bindings';
import { parseXBS } from './parser';
import { Direction } from './sokoban';
import { XBSView } from './XBSView';

const UNDO_KEY = 'd';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generatePlayerCode(): string {
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/** 7×7 default puzzle: push the box right twice to solve. */
const DEFAULT_PUZZLE = [
  '#######',
  '#     #',
  '#     #',
  '# @$ .#',
  '#     #',
  '#     #',
  '#######',
].join('\n');

enum PlayerRole {
  Player1 = 'Player1',
  Player2 = 'Player2',
}

function App() {
  const conn = useSpacetimeDB();
  const [games] = useTable(tables.game);
  const registerGameCode = useReducer(reducers.registerGameCode);
  const updatePlayerState = useReducer(reducers.updatePlayerState);
  const [playerCode] = useState(generatePlayerCode);
  const [joinCode, setJoinCode] = useState('');
  const [role, setRole] = useState<PlayerRole>(PlayerRole.Player1);
  const [joinedGameCode, setJoinedGameCode] = useState<string | null>(null);

  const currentGameCode = role === PlayerRole.Player1 ? playerCode : joinedGameCode ?? '';
  const currentGame = useMemo(
    () => (games && currentGameCode ? games.find(g => g.code === currentGameCode) : undefined),
    [games, currentGameCode]
  );

  const playerSokobanRef = useRef(parseXBS(DEFAULT_PUZZLE));
  const lastGameKeyRef = useRef<string>('');
  // Only re-init Sokoban when we switch game or role, so undo history is preserved after each move
  const gameKey = `${currentGameCode}-${role}`;
  if (lastGameKeyRef.current !== gameKey) {
    lastGameKeyRef.current = gameKey;
    const initial =
      role === PlayerRole.Player1
        ? (currentGame?.player1State ?? DEFAULT_PUZZLE)
        : (currentGame?.player2State ?? DEFAULT_PUZZLE);
    playerSokobanRef.current = parseXBS(initial);
  }
  const [playerXBS, setPlayerXBS] = useState(() => playerSokobanRef.current.getState()[0]);
  const opponentXBS = useMemo(
    () =>
      role === PlayerRole.Player1
        ? (currentGame?.player2State ?? DEFAULT_PUZZLE)
        : (currentGame?.player1State ?? DEFAULT_PUZZLE),
    [role, currentGame?.player1State, currentGame?.player2State]
  );

  useEffect(() => {
    setPlayerXBS(playerSokobanRef.current.getState()[0]);
  }, [gameKey]);

  useEffect(() => {
    if (conn?.isActive) {
      registerGameCode({ code: playerCode });
    }
  }, [conn?.isActive, playerCode, registerGameCode]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentGameCode) return;
      const target = document.activeElement as HTMLElement | null;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
      const sokoban = playerSokobanRef.current;
      let didChange = false;
      if (e.key === 'ArrowLeft') {
        didChange = sokoban.tryMove(Direction.Left);
      } else if (e.key === 'ArrowRight') {
        didChange = sokoban.tryMove(Direction.Right);
      } else if (e.key === 'ArrowUp') {
        didChange = sokoban.tryMove(Direction.Up);
      } else if (e.key === 'ArrowDown') {
        didChange = sokoban.tryMove(Direction.Down);
      } else if (e.key.toLowerCase() === UNDO_KEY) {
        didChange = sokoban.undo();
      } else {
        return;
      }
      e.preventDefault();
      if (!didChange) return;
      setPlayerXBS(sokoban.getState()[0]);
      const [xbs, isWon] = sokoban.getState();
      updatePlayerState({
        code: currentGameCode,
        isPlayer1: role === PlayerRole.Player1,
        stateXbs: xbs,
        ready: isWon,
      });
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentGameCode, role, updatePlayerState]);

  const isJoined = useMemo(() => role === PlayerRole.Player2, [role]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const input = joinCode.trim();
    if (!input) return;
    const game = games?.find(g => g.code.toUpperCase() === input.toUpperCase());
    if (!game) return;
    setRole(PlayerRole.Player2);
    setJoinedGameCode(game.code);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2d231a',
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '2rem',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#e8e0d5',
          fontFamily: 'ui-monospace, monospace',
          fontSize: '1.25rem',
        }}
      >
        <div style={{ marginBottom: '0.25rem', opacity: 0.8 }}>Your code</div>
        <div style={{ fontWeight: 'bold', letterSpacing: '0.2em', marginBottom: '1.5rem' }}>{playerCode}</div>
        <div style={{ marginBottom: '0.25rem', opacity: 0.8 }}>
          {isJoined ? `Joined as ${PlayerRole.Player2}` : `Role: ${role}`}
        </div>
        <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value)}
            placeholder="Enter code"
            maxLength={8}
            disabled={isJoined}
            style={{
              padding: '0.5rem',
              fontSize: '1rem',
              backgroundColor: isJoined ? '#6b6358' : '#e8e0d5',
              color: '#2d231a',
              border: '1px solid #8b7355',
              borderRadius: '4px',
              cursor: isJoined ? 'not-allowed' : undefined,
              opacity: isJoined ? 0.7 : 1,
            }}
          />
          <button
            type="submit"
            disabled={isJoined}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '1rem',
              backgroundColor: isJoined ? '#6b6358' : '#8b7355',
              color: '#e8e0d5',
              border: 'none',
              borderRadius: '4px',
              cursor: isJoined ? 'not-allowed' : 'pointer',
              opacity: isJoined ? 0.7 : 1,
            }}
          >
            Join
          </button>
        </form>
      </div>
      <div
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '2rem',
          }}
        >
          <XBSView xbs={playerXBS} />
          <XBSView xbs={opponentXBS} scale={0.25} />
        </div>
      </div>
    </div>
  );
}

export default App;
