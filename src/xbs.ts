/** XBS character constants. */
export const XBS = {
  WALL: '#' as const,
  FLOOR: ' ' as const,
  GOAL: '.' as const,
  BOX: '$',
  BOX_ON_GOAL: '*',
  PLAYER: '@',
  PLAYER_ON_GOAL: '+',
} as const;
