import { describe, expect, it } from 'vitest';
import { legalDestinations, newXiangqiGame, playXiangqiMove } from '../src/shared/threeXiangqi.js';

describe('Cờ Tướng Tam Quốc', () => {
  it('starts with 16 pieces per side and enforces turn order and horse legs', () => {
    const game = newXiangqiGame(0);
    for (const side of [0, 1, 2]) expect(game.board.filter((piece) => piece?.side === side)).toHaveLength(16);
    expect(legalDestinations(game, 28)).toEqual([]);
    expect(legalDestinations(game, 46)).toEqual([]);
    expect(legalDestinations(game, 1)).toContain(18);
    game.board[10] = { side: 0, kind: 'pawn' };
    expect(legalDestinations(game, 1)).not.toContain(18);
    expect(playXiangqiMove(game, 27, 36)?.turn).toBe(1);
  });

  it('uses the same river lane for cannons and chariots with different capture rules', () => {
    const game = newXiangqiGame(0);
    game.board.fill(null);
    game.board[4] = { side: 0, kind: 'general' };
    game.board[49] = { side: 1, kind: 'general' };
    game.board[94] = { side: 2, kind: 'general' };
    game.board[13] = { side: 0, kind: 'pawn' };
    game.board[27] = { side: 0, kind: 'cannon' };
    game.board[36] = { side: 2, kind: 'pawn' };
    game.board[89] = { side: 1, kind: 'chariot' };
    expect(legalDestinations(game, 27)).toContain(89);
    expect(legalDestinations(game, 27)).not.toContain(36);
    game.board[27] = { side: 0, kind: 'chariot' };
    expect(legalDestinations(game, 27)).toContain(36);
    expect(legalDestinations(game, 27)).not.toContain(89);
  });

  it('allows a third-party move to break a check before the checked player acts', () => {
    const game = newXiangqiGame(0);
    game.board.fill(null);
    game.board[4] = { side: 0, kind: 'general' };
    game.board[49] = { side: 1, kind: 'general' };
    game.board[94] = { side: 2, kind: 'general' };
    game.board[13] = { side: 0, kind: 'pawn' };
    game.board[58] = { side: 1, kind: 'pawn' };
    game.board[103] = { side: 0, kind: 'chariot' };
    game.board[114] = { side: 1, kind: 'horse' };
    game.board[27] = { side: 0, kind: 'pawn' };
    const afterWei = playXiangqiMove(game, 27, 36)!;
    expect(afterWei.turn).toBe(1);
    expect(afterWei.result).toBeNull();
    const afterShu = playXiangqiMove(afterWei, 114, 103)!;
    expect(afterShu.turn).toBe(2);
    expect(afterShu.checkedBy).toEqual([]);
  });

  it.each([0, 2] as const)('resolves mate when the checked side gets its turn (second attacker: %i)', (attacker) => {
    const game = newXiangqiGame(0);
    game.board.fill(null);
    game.board[4] = { side: 0, kind: 'general' };
    game.board[49] = { side: 1, kind: 'general' };
    game.board[94] = { side: 2, kind: 'general' };
    game.board[13] = { side: 0, kind: 'pawn' };
    game.board[67] = { side: 0, kind: 'chariot' };
    game.board[45] = { side: attacker, kind: 'chariot' };
    game.board[27] = { side: 0, kind: 'pawn' };
    expect(playXiangqiMove(game, 27, 36)?.result).toEqual(attacker === 0
      ? { winner: 0, reason: 'mate' }
      : { winner: null, reason: 'joint-mate' });
  });

  it('lets the central pawn cross into either neighboring sector without landing at the center', () => {
    const game = newXiangqiGame(0);
    game.board[40] = game.board[31];
    game.board[31] = null;
    expect(game.board).toHaveLength(135);
    expect(legalDestinations(game, 40)).toEqual(expect.arrayContaining([85, 130]));
    expect(playXiangqiMove(game, 40, 135)).toBeNull();
  });
});
