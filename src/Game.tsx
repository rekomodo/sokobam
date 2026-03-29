import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';
import { useReducer, useSpacetimeDB, useTable } from 'spacetimedb/react';
import { reducers, tables } from './module_bindings';
import { parseXBS } from './parser';
import { Direction } from './sokoban';
import { DEFAULT_PUZZLE, getLevelPuzzle } from './puzzles';

const UNDO_KEY = 'q';
const RESET_KEY = 'r';
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
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

export const WINNER_PLAYER1 = 1;
export const WINNER_PLAYER2 = 2;

export const CODE_LENGTH = 5;

function generatePlayerCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

export enum PlayerRole {
  Player1 = 'Player1',
  Player2 = 'Player2',
}

export type GameSessionValue = {
  playerXBS: string;
  opponentXBS: string;
  currentGameCode: string;
  playerCode: string;
  isPlayer1: boolean;
  winner: number;
  joinInput: string;
  setJoinInput: (v: string) => void;
  joinError: string | null;
  setJoinError: (v: string | null) => void;
  handleJoin: (e: FormEvent) => void;
  joinInputRef: React.RefObject<HTMLInputElement>;
  gameAreaRef: React.RefObject<HTMLDivElement>;
};

const GameSessionContext = createContext<GameSessionValue | null>(null);

export function useGameSession(): GameSessionValue {
  const ctx = useContext(GameSessionContext);
  if (!ctx) throw new Error('useGameSession must be used within GameSessionProvider');
  return ctx;
}

export function GameSessionProvider({ children }: { children: ReactNode }) {
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
      const isReset = e.key.toLowerCase() === RESET_KEY;
      const dir = ARROW_DIR[e.key];
      if (!isUndo && !isReset && dir === undefined) return;

      e.preventDefault();
      const sokoban = playerSokobanRef.current;

      let didChange: boolean;
      if (isReset) {
        sokoban.reset();
        didChange = true;
      } else {
        didChange = isUndo ? sokoban.undo() : sokoban.tryMove(dir);
      }

      if (!didChange) return;

      let result = sokoban.getState();
      let xbs = result[0];
      const isWon = result[1];
      setPlayerXBS(xbs);

      if (matchState === MatchState.PLAYING && isWon) {
        if (localLevelIndex + 1 < levelIndices.length) {
          setLocalLevelIndex(i => i + 1);
          xbs = sokoban.getState()[0];
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

  const handleJoin = useCallback(
    (e: FormEvent) => {
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
    },
    [games, joinInput]
  );

  const value = useMemo<GameSessionValue>(
    () => ({
      playerXBS,
      opponentXBS,
      currentGameCode,
      playerCode,
      isPlayer1,
      winner,
      joinInput,
      setJoinInput,
      joinError,
      setJoinError,
      handleJoin,
      joinInputRef,
      gameAreaRef,
    }),
    [
      playerXBS,
      opponentXBS,
      currentGameCode,
      playerCode,
      isPlayer1,
      winner,
      joinInput,
      joinError,
      handleJoin,
    ]
  );

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}
