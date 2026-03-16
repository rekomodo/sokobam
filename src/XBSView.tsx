import './XBSView.css';
import { XBS } from './xbs';

const BASE_FONT_SIZE = 2.25;

export interface XBSViewProps {
  xbs: string;
  /** Optional class name for the root element. */
  className?: string;
  /** Scale factor for the grid (default 1). e.g. 0.25 for one fourth the size. */
  scale?: number;
}

const cellClass: Record<string, string> = {
  [XBS.WALL]: 'xbs-cell xbs-wall',
  [XBS.FLOOR]: 'xbs-cell xbs-floor',
  [XBS.GOAL]: 'xbs-cell xbs-goal',
  [XBS.BOX]: 'xbs-cell xbs-box',
  [XBS.BOX_ON_GOAL]: 'xbs-cell xbs-box-on-goal',
  [XBS.PLAYER]: 'xbs-cell xbs-player',
  [XBS.PLAYER_ON_GOAL]: 'xbs-cell xbs-player-on-goal',
};

function getCellClass(ch: string): string {
  return cellClass[ch] ?? 'xbs-cell xbs-floor';
}

/**
 * Displays an XBS puzzle string as a grid.
 */
export function XBSView({ xbs, className, scale = 1 }: XBSViewProps) {
  const rows = xbs.split(/\r?\n/).filter(row => row.length > 0);
  if (rows.length === 0) return null;

  const width = Math.max(...rows.map(r => r.length));
  const fontSize = BASE_FONT_SIZE * scale;

  return (
    <pre
      className={className}
      style={{
        fontFamily: 'ui-monospace, monospace',
        fontSize: `${fontSize}rem`,
        lineHeight: 1.2,
        margin: 0,
        display: 'inline-block',
      }}
      aria-label="Sokoban level"
    >
      {rows.map((row, r) => (
        <span key={r} style={{ display: 'block' }}>
          {Array.from({ length: width }, (_, c) => {
            const ch = c < row.length ? row[c] : ' ';
            return (
              <span key={c} className={getCellClass(ch)}>
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </pre>
  );
}

export default XBSView;
