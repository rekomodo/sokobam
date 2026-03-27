import { XBSView } from './XBSView';
import {
  CODE_LENGTH,
  GameSessionProvider,
  PlayerRole,
  useGameSession,
  WINNER_PLAYER1,
  WINNER_PLAYER2,
} from './Game';

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

function AppShell() {
  const {
    playerXBS,
    opponentXBS,
    playerCode,
    isPlayer1,
    winner,
    joinInput,
    setJoinInput,
    joinError,
    handleJoin,
    joinInputRef,
    gameAreaRef,
  } = useGameSession();

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
            maxLength={CODE_LENGTH}
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
            {winner === (isPlayer1 ? WINNER_PLAYER1 : WINNER_PLAYER2) ? 'You won!' : 'Opponent won!'}
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

function App() {
  return (
    <GameSessionProvider>
      <AppShell />
    </GameSessionProvider>
  );
}

export default App;
