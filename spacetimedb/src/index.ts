import { schema, table, t } from 'spacetimedb/server';

const spacetimedb = schema({
  game: table(
    {
      name: 'game',
      public: true,
    },
    {
      code: t.string().primaryKey(),
      player1State: t.string(),
      player1LevelIndex: t.i16(),
      player1Ready: t.bool(),

      player2State: t.string(),
      player2LevelIndex: t.i16(),
      player2Ready: t.bool(),

      levelIndices: t.array(t.i16()),
    }
  ),
});
export default spacetimedb;

/** 7×7 default puzzle: push the box right twice to solve. Must match client DEFAULT_PUZZLE. */
const DEFAULT_PUZZLE = [
  '#######',
  '#     #',
  '#     #',
  '# @$ .#',
  '#     #',
  '#     #',
  '#######',
].join('\n');

const DEFAULT_LEVEL_INDEX = -1;
const DEFAULT_LEVEL_INDICES: number[] = [];
const TESTING_LEVEL_INDICES: number[] = [0, 1, 2];

/** Call this with the client's game code when they connect to create the game row. */
export const register_game_code = spacetimedb.reducer({ code: t.string() }, (ctx, { code }) => {
  const existing = ctx.db.game.code.find(code);
  if (existing) return;
  ctx.db.game.insert({
    code,
    player1State: DEFAULT_PUZZLE,
    player1LevelIndex: DEFAULT_LEVEL_INDEX,
    player1Ready: false,
    player2State: DEFAULT_PUZZLE,
    player2LevelIndex: DEFAULT_LEVEL_INDEX,
    player2Ready: false,
    levelIndices: DEFAULT_LEVEL_INDICES,
  });
});

/** Update the current player's state and ready flag for a game. */
export const update_player_state = spacetimedb.reducer(
  {
    code: t.string(),
    isPlayer1: t.bool(),
    stateXbs: t.string(),
    ready: t.bool(),
  },
  (ctx, { code, isPlayer1, stateXbs, ready }) => {
    const game = ctx.db.game.code.find(code);
    if (!game) return;
    if (isPlayer1) {
      ctx.db.game.code.update({ ...game, player1State: stateXbs, player1Ready: ready });
    } else {
      ctx.db.game.code.update({ ...game, player2State: stateXbs, player2Ready: ready });
    }
  }
);
