import { Sokoban, StaticCell } from './sokoban';
import { XBS } from './xbs';

/**
 * Parses a valid XBS description and returns a Sokoban instance.
 * XBS: # wall, space floor, . goal, $ box, * box on goal, @ player, + player on goal.
 */
export function parseXBS(xbs: string): Sokoban {
  const lines = xbs.split(/\r?\n/).filter(line => line.length > 0);
  if (lines.length === 0) throw new Error('XBS must have at least one row');

  const height = lines.length;
  const width = Math.max(...lines.map(l => l.length));

  const staticGrid: StaticCell[][] = [];
  let player: { r: number; c: number } | null = null;
  const boxes: Array<{ r: number; c: number }> = [];

  for (let r = 0; r < height; r++) {
    const row: StaticCell[] = [];
    const line = lines[r];
    for (let c = 0; c < width; c++) {
      const ch = c < line.length ? line[c] : ' ';
      switch (ch) {
        case XBS.WALL:
          row.push(XBS.WALL);
          break;
        case XBS.FLOOR:
        case XBS.BOX:
        case XBS.PLAYER:
          row.push(XBS.FLOOR);
          if (ch === XBS.PLAYER) {
            if (player !== null) throw new Error('XBS must contain exactly one player (@ or +)');
            player = { r, c };
          } else if (ch === XBS.BOX) {
            boxes.push({ r, c });
          }
          break;
        case XBS.GOAL:
        case XBS.BOX_ON_GOAL:
        case XBS.PLAYER_ON_GOAL:
          row.push(XBS.GOAL);
          if (ch === XBS.PLAYER_ON_GOAL) {
            if (player !== null) throw new Error('XBS must contain exactly one player (@ or +)');
            player = { r, c };
          } else if (ch === XBS.BOX_ON_GOAL) {
            boxes.push({ r, c });
          }
          break;
        default:
          row.push(XBS.FLOOR);
      }
    }
    staticGrid.push(row);
  }

  if (player === null) throw new Error('XBS must contain exactly one player (@ or +)');
  return new Sokoban(staticGrid, player, boxes);
}

/**
 * Parses a .sok file and returns a list of XBS puzzle strings (one per level).
 * Discards level numbers, Title, Author, and any Comment/Comment-End metadata.
 */
export function parseSokFile(content: string): string[] {
  const lines = content.split(/\r?\n/);
  const puzzles: string[] = [];
  let i = 0;

  while (i < lines.length) {
    while (i < lines.length && !/^\s*\d+\s*$/.test(lines[i])) i++;
    if (i >= lines.length) break;
    i++;
    const gridLines: string[] = [];
    while (
      i < lines.length &&
      !/^Title:/i.test(lines[i]) &&
      !/^Author:/i.test(lines[i]) &&
      !/^Comment:/i.test(lines[i]) &&
      !/^Comment-End:/i.test(lines[i]) &&
      !/^\s*\d+\s*$/.test(lines[i])
    ) {
      gridLines.push(lines[i]);
      i++;
    }
    if (gridLines.length > 0) {
      const width = Math.max(...gridLines.map(l => l.length));
      const normalized = gridLines.map(l => l.padEnd(width));
      puzzles.push(normalized.join('\n'));
    }
  }

  return puzzles;
}
