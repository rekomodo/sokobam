import { schema, table, t } from 'spacetimedb/server';

const DEFAULT_PUZZLE = [
  '#######',
  '#     #',
  '#     #',
  '# @$ .#',
  '#     #',
  '#     #',
  '#######',
].join('\n');

const LEVEL_COUNT = 50; // HARDCODED FOR NOW

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

/** Deterministic level pick: partial Fisher–Yates */
function pickDistinctIndices(n: number, levelCount: number, seed: bigint): number[] {
  const indices = Array.from({ length: levelCount }, (_, i) => i);
  let state = seed & 0xffffffffffffffffn;
  const randInt = (minInclusive: number, maxExclusive: number): number => {
    const span = maxExclusive - minInclusive;
    state = (state * 6364136223846793005n + 1442695040888963407n) & 0xffffffffffffffffn;
    return minInclusive + Number(state % BigInt(span));
  };
  for (let i = 0; i < n; i++) {
    const j = randInt(i, levelCount);
    const tmp = indices[i]!;
    indices[i] = indices[j]!;
    indices[j] = tmp;
  }
  return indices.slice(0, n);
}

function getLevels(n: number, microsSinceUnixEpoch: bigint): number[] {
  return pickDistinctIndices(n, LEVEL_COUNT, microsSinceUnixEpoch);
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
    levelIndices: [],
    winner: 0,
  });
});

/** Call when the host is closing the app to remove their game row. */
export const deregister_game_code = spacetimedb.reducer({ code: t.string() }, (ctx, { code }) => {
  const game = ctx.db.game.code.find(code);
  if (game) ctx.db.game.code.delete(code);
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

    const updated = ctx.db.game.code.find(code);
    if (updated && updated.player1Ready && updated.player2Ready) {
      ctx.db.game.code.update({
        ...updated,
        started: true,
        levelIndices: getLevels(3, ctx.timestamp.microsSinceUnixEpoch),
      });
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
