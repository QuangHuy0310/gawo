import { describe, it, expect } from 'vitest';
import {
  createEmptyBoard,
  isValidCoordinate,
  isValidMove,
  checkWin,
  isBoardFull,
} from '../src/server/game/caroLogic.js';

describe('Caro Game Logic (30x30 Board)', () => {
  it('should initialize a 30x30 empty board', () => {
    const board = createEmptyBoard(30);
    expect(board.length).toBe(30);
    expect(board[0].length).toBe(30);
    expect(board[0][0]).toBeNull();
    expect(board[29][29]).toBeNull();
  });

  it('should correctly validate coordinates for 30x30 board', () => {
    expect(isValidCoordinate(0, 0, 30)).toBe(true);
    expect(isValidCoordinate(29, 29, 30)).toBe(true);
    expect(isValidCoordinate(-1, 5, 30)).toBe(false);
    expect(isValidCoordinate(5, 30, 30)).toBe(false);
    expect(isValidCoordinate(30, 30, 30)).toBe(false);
  });

  it('should validate moves properly on 30x30 board', () => {
    const board = createEmptyBoard(30);
    expect(isValidMove(board, 14, 14, 30)).toBe(true);
    expect(isValidMove(board, 29, 29, 30)).toBe(true);

    board[29][29] = 0; // Player 0 places at corner
    expect(isValidMove(board, 29, 29, 30)).toBe(false);
    expect(isValidMove(board, -1, 5, 30)).toBe(false);
    expect(isValidMove(board, 30, 10, 30)).toBe(false);
  });

  it('should detect horizontal win with 5 consecutive pieces', () => {
    const board = createEmptyBoard(30);
    const player = 1;
    // (15, 10) to (15, 14)
    for (let c = 10; c <= 13; c++) {
      board[15][c] = player;
    }
    board[15][14] = player;

    const result = checkWin(board, 15, 14, player);
    expect(result.won).toBe(true);
    expect(result.winningLine?.length).toBe(5);
  });

  it('should detect horizontal win with >= 5 pieces (6 in a row wins as per rules)', () => {
    const board = createEmptyBoard(30);
    const player = 2;
    for (let c = 10; c <= 15; c++) {
      board[8][c] = player;
    }
    const result = checkWin(board, 8, 15, player);
    expect(result.won).toBe(true);
    expect(result.winningLine?.length).toBe(6);
  });

  it('should detect vertical win with 5 consecutive pieces', () => {
    const board = createEmptyBoard(30);
    const player = 0;
    for (let r = 12; r <= 16; r++) {
      board[r][7] = player;
    }
    const result = checkWin(board, 16, 7, player);
    expect(result.won).toBe(true);
    expect(result.winningLine?.length).toBe(5);
  });

  it('should detect main diagonal (\\) win', () => {
    const board = createEmptyBoard(30);
    const player = 3;
    for (let i = 0; i < 5; i++) {
      board[10 + i][10 + i] = player;
    }
    const result = checkWin(board, 12, 12, player);
    expect(result.won).toBe(true);
    expect(result.winningLine?.length).toBe(5);
  });

  it('should detect anti-diagonal (/) win', () => {
    const board = createEmptyBoard(30);
    const player = 1;
    for (let i = 0; i < 5; i++) {
      board[18 + i][18 - i] = player;
    }
    const result = checkWin(board, 20, 16, player);
    expect(result.won).toBe(true);
    expect(result.winningLine?.length).toBe(5);
  });

  it('should NOT win when blocked with fewer than 5 pieces in multiplayer', () => {
    const board = createEmptyBoard(30);
    board[15][4] = 2;
    board[15][5] = 0;
    board[15][6] = 0;
    board[15][7] = 0;
    board[15][8] = 1;

    const result = checkWin(board, 15, 7, 0);
    expect(result.won).toBe(false);
  });

  it('should work correctly on all 30x30 board boundaries and corners', () => {
    const board = createEmptyBoard(30);
    const player = 0;

    // 1. Top Edge (0, 0) to (0, 4)
    for (let c = 0; c < 5; c++) {
      board[0][c] = player;
    }
    const resultTop = checkWin(board, 0, 0, player);
    expect(resultTop.won).toBe(true);

    // 2. Bottom-Right Corner (29, 25) to (29, 29)
    for (let c = 25; c < 30; c++) {
      board[29][c] = 1;
    }
    const resultBottomRight = checkWin(board, 29, 29, 1);
    expect(resultBottomRight.won).toBe(true);

    // 3. Right edge vertical (25, 29) to (29, 29)
    const boardRight = createEmptyBoard(30);
    for (let r = 25; r < 30; r++) {
      boardRight[r][29] = 2;
    }
    const resultRight = checkWin(boardRight, 29, 29, 2);
    expect(resultRight.won).toBe(true);

    // 4. Diagonal hitting corner (29, 29): (25, 25) to (29, 29)
    const boardDiag = createEmptyBoard(30);
    for (let i = 0; i < 5; i++) {
      boardDiag[25 + i][25 + i] = 3;
    }
    const resultDiag = checkWin(boardDiag, 29, 29, 3);
    expect(resultDiag.won).toBe(true);

    // 5. Anti-diagonal hitting corner (29, 0): (25, 4) to (29, 0)
    const boardAntiDiag = createEmptyBoard(30);
    for (let i = 0; i < 5; i++) {
      boardAntiDiag[25 + i][4 - i] = 0;
    }
    const resultAntiDiag = checkWin(boardAntiDiag, 29, 0, 0);
    expect(resultAntiDiag.won).toBe(true);
  });

  it('should identify full board correctly', () => {
    const smallBoard: (number | null)[][] = [
      [0, 1],
      [2, 3],
    ];
    expect(isBoardFull(smallBoard)).toBe(true);

    smallBoard[1][1] = null;
    expect(isBoardFull(smallBoard)).toBe(false);
  });
});
