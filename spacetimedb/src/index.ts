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
      player1Ready: t.bool(),
      player2State: t.string(),
      player2Ready: t.bool(),
      started: t.bool(),
      levelIndices: t.array(t.i16()),
      winner: t.u8(),
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

const DEFAULT_LEVEL_INDICES: number[] = [];

function getLevels(n: number): number[] {
  return Array.from({ length: n }, (_, i) => i);
}

/** Call this with the client's game code when they connect to create the game row. */
export const register_game_code = spacetimedb.reducer({ code: t.string() }, (ctx, { code }) => {
  const existing = ctx.db.game.code.find(code);
  if (existing) return;
  ctx.db.game.insert({
    code,
    player1State: DEFAULT_PUZZLE,
    player1Ready: false,
    player2State: DEFAULT_PUZZLE,
    player2Ready: false,
    started: false,
    levelIndices: DEFAULT_LEVEL_INDICES,
    winner: 0,
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
    if (!game.started) {
      if (isPlayer1) {
        ctx.db.game.code.update({ ...game, player1State: stateXbs, player1Ready: ready });
      } else {
        ctx.db.game.code.update({ ...game, player2State: stateXbs, player2Ready: ready });
      }
    }
    const updated = ctx.db.game.code.find(code);
    if (updated && updated.player1Ready && updated.player2Ready) {
      ctx.db.game.code.update({ ...updated, started: true, levelIndices: getLevels(3) });
    }
  }
);

export const claim_winner = spacetimedb.reducer(
  {
    code: t.string(),
    winner: t.u8(),
  },
  (ctx, { code, winner }) => {
    const game = ctx.db.game.code.find(code);
    if (!game) return;
    if (game.winner !== 0) return;
    ctx.db.game.code.update({ ...game, winner });
  }
);
