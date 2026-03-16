/**
 * Sokoban ADT: game state, player position, tryMove, undo, getState (XBS format).
 */

import { XBS } from './xbs';

export enum Direction {
  Left,
  Right,
  Up,
  Down,
}

/** Static cell: wall, floor, or goal. */
export type StaticCell = (typeof XBS.WALL) | (typeof XBS.FLOOR) | (typeof XBS.GOAL);

/**
 * Internal representation: static grid (walls/floors/goals), player position,
 * and box positions. Easy to map to XBS: one char per cell.
 */
export class Sokoban {
  private readonly width: number;
  private readonly height: number;
  /** Grid of non-entity cells: '#' wall, ' ' floor, '.' goal. */
  private readonly staticGrid: StaticCell[][];
  private player: { r: number; c: number };
  /** Box positions as "r,c" keys. */
  private boxes: Set<string>;
  /** History of (player, boxes) after each successful move for undo. */
  private readonly history: Array<{ player: { r: number; c: number }; boxes: Set<string> }> = [];

  constructor(
    staticGrid: StaticCell[][],
    initialPlayer: { r: number; c: number },
    initialBoxes: Array<{ r: number; c: number }>
  ) {
    this.height = staticGrid.length;
    this.width = staticGrid[0]?.length ?? 0;
    this.staticGrid = staticGrid.map(row => [...row]);
    this.player = { ...initialPlayer };
    this.boxes = new Set(initialBoxes.map(b => `${b.r},${b.c}`));
  }

  private cellKey(r: number, c: number): string {
    return `${r},${c}`;
  }

  private isWall(r: number, c: number): boolean {
    if (r < 0 || r >= this.height || c < 0 || c >= this.width) return true;
    return this.staticGrid[r][c] === XBS.WALL;
  }

  private hasBox(r: number, c: number): boolean {
    return this.boxes.has(this.cellKey(r, c));
  }

  /** Moves the player in the given direction if possible. Returns true iff the player moved. */
  tryMove(dir: Direction): boolean {
    const { r, c } = this.player;
    let dr = 0,
      dc = 0;
    switch (dir) {
      case Direction.Left:
        dc = -1;
        break;
      case Direction.Right:
        dc = 1;
        break;
      case Direction.Up:
        dr = -1;
        break;
      case Direction.Down:
        dr = 1;
        break;
    }
    const nr = r + dr;
    const nc = c + dc;
    if (this.isWall(nr, nc)) return false;
    const nnr = nr + dr;
    const nnc = nc + dc;
    if (this.hasBox(nr, nc)) {
      if (this.isWall(nnr, nnc) || this.hasBox(nnr, nnc)) return false;
    }
    this.history.push({
      player: { ...this.player },
      boxes: new Set(this.boxes),
    });
    if (this.hasBox(nr, nc)) {
      this.boxes.delete(this.cellKey(nr, nc));
      this.boxes.add(this.cellKey(nnr, nnc));
    }
    this.player = { r: nr, c: nc };
    return true;
  }

  /** Undo the last successful move. Returns true iff something was undone. */
  undo(): boolean {
    const prev = this.history.pop();
    if (!prev) return false;
    this.player = prev.player;
    this.boxes = new Set(prev.boxes);
    return true;
  }

  /** Check whether every goal has a box on it. */
  private isSolved(): boolean {
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        if (this.staticGrid[r][c] === XBS.GOAL && !this.boxes.has(this.cellKey(r, c))) return false;
      }
    }
    return true;
  }

  /**
   * Returns [xbsString, isWon].
   * XBS: one character per cell, rows newline-separated.
   */
  getState(): [string, boolean] {
    const rows: string[] = [];
    for (let r = 0; r < this.height; r++) {
      let row = '';
      for (let c = 0; c < this.width; c++) {
        const isPlayer = this.player.r === r && this.player.c === c;
        const hasBox = this.boxes.has(this.cellKey(r, c));
        const goal = this.staticGrid[r][c] === XBS.GOAL;
        if (isPlayer) row += goal ? XBS.PLAYER_ON_GOAL : XBS.PLAYER;
        else if (hasBox) row += goal ? XBS.BOX_ON_GOAL : XBS.BOX;
        else row += this.staticGrid[r][c];
      }
      rows.push(row);
    }
    const xbs = rows.join('\n');
    const won = this.isSolved();
    return [xbs, won];
  }
}
