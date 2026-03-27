import { parseSokFile } from './parser';
import microbanSok from './puzzles/DavidWSkinner Microban.sok?raw';
import sasquatchISok from './puzzles/DavidWSkinner Sasquatch I.sok?raw';

export const DEFAULT_PUZZLE = [
  '#######',
  '#     #',
  '#     #',
  '# @$ .#',
  '#     #',
  '#     #',
  '#######',
].join('\n');

// export const LEVEL_PUZZLES = [...parseSokFile(microbanSok), ...parseSokFile(sasquatchISok)];
export const LEVEL_PUZZLES = parseSokFile(microbanSok);

export function getLevelPuzzle(levelIndex: number): string {
  return LEVEL_PUZZLES[levelIndex] ?? DEFAULT_PUZZLE;
}
