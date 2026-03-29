import { useState } from 'react';
import { XBSView } from './XBSView';
import {
  CODE_LENGTH,
  GameSessionProvider,
  useGameSession,
  WINNER_PLAYER1,
  WINNER_PLAYER2,
  UNDO_KEY,
  RESET_KEY,
} from './Game';

// TODO: placeholder — the actual puzzle count is determined server-side by levelIndices.length
const PUZZLE_COUNT_DISPLAY = 3;

const MONO = 'ui-monospace, monospace';

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    backgroundColor: '#2d231a',
  },
  topBar: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1rem',
    padding: '1rem 2rem',
    fontFamily: MONO,
    color: '#e8e0d5',
    fontSize: '1rem',
    flexShrink: 0,
  },
  codeLabel: {
    opacity: 0.7,
    fontSize: '0.875rem',
  },
  codeValue: {
    fontWeight: 'bold' as const,
    letterSpacing: '0.15em',
    fontSize: '1.1rem',
  },
  joinForm: {
    display: 'flex',
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: '0.5rem',
  },
  joinError: {
    color: '#c95c5c',
    fontSize: '0.8rem',
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
    fontFamily: MONO,
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
    borderRadius: '8px',
  },
  overlay: {
    position: 'fixed' as const,
    inset: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  modal: {
    backgroundColor: '#3d3028',
    color: '#e8e0d5',
    fontFamily: MONO,
    borderRadius: '12px',
    padding: '2.5rem 3rem',
    maxWidth: '480px',
    width: '90vw',
    lineHeight: 1.7,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  modalTitle: {
    margin: '0 0 1.25rem',
    fontSize: '1.5rem',
    fontWeight: 'bold' as const,
  },
  modalText: {
    margin: '0 0 0.75rem',
    fontSize: '0.95rem',
    opacity: 0.9,
  },
  kbd: {
    display: 'inline-block',
    padding: '0.1rem 0.45rem',
    backgroundColor: '#5a4a3a',
    border: '1px solid #7a6a5a',
    borderRadius: '4px',
    fontSize: '0.85rem',
    fontFamily: MONO,
  },
  playButton: {
    marginTop: '1.25rem',
    padding: '0.6rem 2rem',
    fontSize: '1.1rem',
    fontFamily: MONO,
    fontWeight: 'bold' as const,
    backgroundColor: '#8b7355',
    color: '#e8e0d5',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
  },
} as const;

function inputStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 0.6rem',
    fontSize: '0.95rem',
    fontFamily: MONO,
    backgroundColor: disabled ? '#4a3e34' : '#e8e0d5',
    color: disabled ? '#9a8e82' : '#2d231a',
    border: '1px solid #8b7355',
    borderRadius: '4px',
    width: '10rem',
    cursor: disabled ? 'not-allowed' : undefined,
  };
}

function buttonStyle(disabled: boolean): React.CSSProperties {
  return {
    padding: '0.4rem 1rem',
    fontSize: '0.95rem',
    fontFamily: MONO,
    backgroundColor: disabled ? '#4a3e34' : '#8b7355',
    color: disabled ? '#9a8e82' : '#e8e0d5',
    border: 'none',
    borderRadius: '4px',
    cursor: disabled ? 'not-allowed' : 'pointer',
  };
}

function InstructionsModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div style={styles.overlay} onClick={onDismiss}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 style={styles.modalTitle}>How to Play</h2>
        <p style={styles.modalText}>
          <span style={styles.kbd}>&larr;</span>{' '}
          <span style={styles.kbd}>&uarr;</span>{' '}
          <span style={styles.kbd}>&darr;</span>{' '}
          <span style={styles.kbd}>&rarr;</span>{' '}
          to move &nbsp;&middot;&nbsp;{' '}
          <span style={styles.kbd}>{UNDO_KEY.toUpperCase()}</span> to undo &nbsp;&middot;&nbsp;{' '}
          <span style={styles.kbd}>{RESET_KEY.toUpperCase()}</span> to reset
        </p>
        <p style={styles.modalText}>
          Share your game code with a friend, or enter theirs to join.
          The game starts once both players push the box onto the goal tile.
        </p>
        {/* TODO: PUZZLE_COUNT_DISPLAY is a placeholder — sync with the server-side level count */}
        <p style={styles.modalText}>
          The first player to solve all {PUZZLE_COUNT_DISPLAY} puzzles wins!
        </p>
        <button style={styles.playButton} onClick={onDismiss}>
          Play
        </button>
      </div>
    </div>
  );
}

function AppShell() {
  const [showInstructions, setShowInstructions] = useState(true);
  const {
    playerXBS,
    opponentXBS,
    playerCode,
    currentGameCode,
    isPlayer1,
    joined,
    winner,
    joinInput,
    setJoinInput,
    joinError,
    handleJoin,
    joinInputRef,
    gameAreaRef,
  } = useGameSession();

  const joinDisabled = !isPlayer1 || joined;

  return (
    <div style={styles.root}>
      {showInstructions && <InstructionsModal onDismiss={() => setShowInstructions(false)} />}

      <div style={styles.topBar}>
        <span style={styles.codeLabel}>Your code</span>
        <span style={styles.codeValue}>{playerCode}</span>

        <form onSubmit={handleJoin} style={styles.joinForm}>
          <input
            ref={joinInputRef}
            type="text"
            value={joinDisabled ? '' : joinInput}
            onChange={e => setJoinInput(e.target.value)}
            placeholder={
              !isPlayer1 ? `Joined ${currentGameCode}`
              : joined ? 'Opponent joined'
              : "Friend's code"
            }
            maxLength={CODE_LENGTH}
            disabled={joinDisabled}
            style={inputStyle(joinDisabled)}
          />
          <button type="submit" disabled={joinDisabled} style={buttonStyle(joinDisabled)}>
            Join
          </button>
        </form>

        {joinError && <span style={styles.joinError}>{joinError}</span>}
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
