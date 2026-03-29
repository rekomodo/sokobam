import { describe, it, expect } from 'vitest';
import { Sokoban, Direction, StaticCell } from '../src/sokoban';
import { parseXBS } from '../src/parser';

/** Minimal level: 4-wide room, player at (1,1), box at (1,2), goal at (1,3). Not won. */
function makeSimpleLevel(): Sokoban {
  const grid: StaticCell[][] = [
    ['#', '#', '#', '#'],
    ['#', ' ', ' ', '.'],
    ['#', '#', '#', '#'],
  ];
  return new Sokoban(grid, { r: 1, c: 1 }, [{ r: 1, c: 2 }]);
}

describe('Sokoban', () => {
  describe('getState', () => {
    it('returns initial XBS and isWon false', () => {
      const game = makeSimpleLevel();
      const [xbs, won] = game.getState();
      expect(won).toBe(false);
      expect(xbs).toContain('@');
      expect(xbs).toContain('$');
      expect(xbs).toContain('.');
    });

    it('returns isWon true when all goals have boxes', () => {
      // Goal at (1,2), box on it, player at (1,1). Static grid: floor and goal only.
      const grid: StaticCell[][] = [
        ['#', '#', '#'],
        ['#', ' ', '.'],
        ['#', '#', '#'],
      ];
      const game = new Sokoban(grid, { r: 1, c: 1 }, [{ r: 1, c: 2 }]);
      const [, won] = game.getState();
      expect(won).toBe(true);
    });

    it('getState after tryMove(dir) returns true yields XBS with player moved in that direction', () => {
      const initialXBS = '#####\n#   #\n# @ #\n#   #\n#####';
      const expectedAfter: Record<Direction, string> = {
        [Direction.Left]: '#####\n#   #\n#@  #\n#   #\n#####',
        [Direction.Right]: '#####\n#   #\n#  @#\n#   #\n#####',
        [Direction.Up]: '#####\n# @ #\n#   #\n#   #\n#####',
        [Direction.Down]: '#####\n#   #\n#   #\n# @ #\n#####',
      };
      for (const dir of [Direction.Left, Direction.Right, Direction.Up, Direction.Down]) {
        const game = parseXBS(initialXBS);
        const ok = game.tryMove(dir);
        expect(ok).toBe(true);
        const [xbs] = game.getState();
        expect(xbs).toEqual(expectedAfter[dir]);
      }
    });

    it('getState after tryMove(dir) pushing a box returns true yields XBS with player and box moved in that direction', () => {
      const initialByDir: Record<Direction, string> = {
        [Direction.Left]: '######\n#  $@#\n######',
        [Direction.Right]: '######\n#@$  #\n######',
        [Direction.Up]: '######\n#    #\n#  $ #\n#  @ #\n######',
        [Direction.Down]: '######\n#  @ #\n#  $ #\n#    #\n######',
      };
      const expectedAfter: Record<Direction, string> = {
        [Direction.Left]: '######\n# $@ #\n######',
        [Direction.Right]: '######\n# @$ #\n######',
        [Direction.Up]: '######\n#  $ #\n#  @ #\n#    #\n######',
        [Direction.Down]: '######\n#    #\n#  @ #\n#  $ #\n######',
      };
      for (const dir of [Direction.Left, Direction.Right, Direction.Up, Direction.Down]) {
        const game = parseXBS(initialByDir[dir]);
        const ok = game.tryMove(dir);
        expect(ok).toBe(true);
        const [xbs] = game.getState();
        expect(xbs).toEqual(expectedAfter[dir]);
      }
    });
  });

  describe('tryMove', () => {
    it('moves player Left when floor is free and returns true', () => {
      // makeSimpleLevel: player (1,1). Left -> (1,0) is wall. So use a level with space to the left.
      const grid: StaticCell[][] = [
        ['#', '#', '#', '#', '#'],
        ['#', ' ', ' ', ' ', '.'],
        ['#', '#', '#', '#', '#'],
      ];
      const game = new Sokoban(grid, { r: 1, c: 2 }, []);
      const [before] = game.getState();
      const ok = game.tryMove(Direction.Left);
      expect(ok).toBe(true);
      const [after] = game.getState();
      expect(after).not.toBe(before);
      expect(after).toContain('@');
    });

    it('moves player Right when floor is free and returns true', () => {
      const game = makeSimpleLevel();
      const ok = game.tryMove(Direction.Right);
      expect(ok).toBe(true);
      const [xbs] = game.getState();
      expect(xbs).toContain('@');
    });

    it('moves player Up/Down when floor is free and returns true', () => {
      const grid: StaticCell[][] = [
        ['#', ' ', '#'],
        ['#', ' ', '#'],
        ['#', ' ', '#'],
      ];
      const game = new Sokoban(grid, { r: 1, c: 1 }, []);
      expect(game.tryMove(Direction.Up)).toBe(true);
      expect(game.tryMove(Direction.Down)).toBe(true);
    });

    it('returns false and does not move when moving into wall', () => {
      const game = makeSimpleLevel();
      const [before] = game.getState();
      expect(game.tryMove(Direction.Up)).toBe(false);
      const [after] = game.getState();
      expect(after).toBe(before);
    });

    it('pushes box onto floor when next cell is free and returns true', () => {
      const grid: StaticCell[][] = [
        ['#', '#', '#', '#'],
        ['#', ' ', ' ', ' '],
        ['#', '#', '#', '#'],
      ];
      const g = new Sokoban(grid, { r: 1, c: 1 }, [{ r: 1, c: 2 }]);
      expect(g.tryMove(Direction.Right)).toBe(true);
      const [xbs] = g.getState();
      expect(xbs).toContain('$');
      expect(xbs).toContain('@');
    });

    it('pushes box onto goal when cell is goal and returns true', () => {
      const grid: StaticCell[][] = [
        ['#', '#', '#', '#', '#'],
        ['#', ' ', ' ', ' ', '.'],
        ['#', '#', '#', '#', '#'],
      ];
      const g = new Sokoban(grid, { r: 1, c: 2 }, [{ r: 1, c: 3 }]);
      expect(g.tryMove(Direction.Right)).toBe(true);
      const [, won] = g.getState();
      expect(won).toBe(true);
    });

    it('returns false when pushing box into wall', () => {
      const grid: StaticCell[][] = [
        ['#', '#', '#', '#'],
        ['#', ' ', ' ', '#'],
        ['#', '#', '#', '#'],
      ];
      const game = new Sokoban(grid, { r: 1, c: 1 }, [{ r: 1, c: 2 }]);
      expect(game.tryMove(Direction.Right)).toBe(false);
      const [xbs] = game.getState();
      expect(xbs).toContain('$');
      expect(xbs).toContain('@');
    });

    it('returns false when pushing box into another box', () => {
      const grid: StaticCell[][] = [
        ['#', '#', '#', '#', '#'],
        ['#', ' ', ' ', ' ', ' '],
        ['#', '#', '#', '#', '#'],
      ];
      const game = new Sokoban(grid, { r: 1, c: 1 }, [{ r: 1, c: 2 }, { r: 1, c: 3 }]);
      expect(game.tryMove(Direction.Right)).toBe(false);
    });
  });

  describe('undo', () => {
    it('restores state after one successful move', () => {
      const game = makeSimpleLevel();
      const [before] = game.getState();
      game.tryMove(Direction.Right);
      game.undo();
      const [after] = game.getState();
      expect(after).toEqual(before);
    });

    it('restores state after multiple moves when undoing twice', () => {
      const game = makeSimpleLevel();
      const [initial] = game.getState();
      game.tryMove(Direction.Right);
      game.tryMove(Direction.Left);
      game.undo();
      game.undo();
      const [back] = game.getState();
      expect(back).toEqual(initial);
    });

    it('is no-op when history is empty', () => {
      const game = makeSimpleLevel();
      const [before] = game.getState();
      game.undo();
      game.undo();
      const [after] = game.getState();
      expect(after).toEqual(before);
    });

    it('undo only reverts last move, not multiple', () => {
      const game = makeSimpleLevel();
      game.tryMove(Direction.Right);
      const [afterFirst] = game.getState();
      game.tryMove(Direction.Left);
      game.undo();
      const [afterUndo] = game.getState();
      expect(afterUndo).toEqual(afterFirst);
    });
  });

  describe('reset', () => {
    it('restores the initial state after moves', () => {
      const game = makeSimpleLevel();
      const [initial] = game.getState();
      game.tryMove(Direction.Right);
      game.reset();
      const [after] = game.getState();
      expect(after).toEqual(initial);
    });

    it('clears undo history so undo is a no-op after reset', () => {
      const game = makeSimpleLevel();
      const [initial] = game.getState();
      game.tryMove(Direction.Right);
      game.reset();
      game.undo();
      const [after] = game.getState();
      expect(after).toEqual(initial);
    });

    it('is idempotent when called on a fresh puzzle', () => {
      const game = makeSimpleLevel();
      const [before] = game.getState();
      game.reset();
      const [after] = game.getState();
      expect(after).toEqual(before);
    });

    it('restores box positions after a push', () => {
      const grid: StaticCell[][] = [
        ['#', '#', '#', '#', '#'],
        ['#', ' ', ' ', ' ', '.'],
        ['#', '#', '#', '#', '#'],
      ];
      const game = new Sokoban(grid, { r: 1, c: 1 }, [{ r: 1, c: 2 }]);
      const [initial] = game.getState();
      game.tryMove(Direction.Right);
      game.tryMove(Direction.Right);
      game.reset();
      const [after] = game.getState();
      expect(after).toEqual(initial);
    });
  });
});
