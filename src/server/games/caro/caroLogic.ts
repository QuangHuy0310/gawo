import { BOARD_SIZE, WIN_STREAK } from './constants.js';

export interface WinCheckResult {
  won: boolean;
  winningLine: [number, number][] | null;
}

export function createEmptyBoard(size: number = BOARD_SIZE): (number | null)[][] {
  return Array.from({ length: size }, () => Array(size).fill(null));
}

export function isValidCoordinate(row: number, col: number, size: number = BOARD_SIZE): boolean {
  return row >= 0 && row < size && col >= 0 && col < size;
}

export function isValidMove(
  board: (number | null)[][],
  row: number,
  col: number,
  size: number = BOARD_SIZE
): boolean {
  if (!isValidCoordinate(row, col, size)) {
    return false;
  }
  return board[row][col] === null;
}

export function checkWin(
  board: (number | null)[][],
  lastRow: number,
  lastCol: number,
  playerIndex: number,
  winStreak: number = WIN_STREAK
): WinCheckResult {
  const size = board.length;
  if (!isValidCoordinate(lastRow, lastCol, size) || board[lastRow][lastCol] !== playerIndex) {
    return { won: false, winningLine: null };
  }

  // 4 directions: [deltaRow, deltaCol]
  // 1. Horizontal: [0, 1]
  // 2. Vertical: [1, 0]
  // 3. Main diagonal (\): [1, 1]
  // 4. Anti-diagonal (/): [1, -1]
  const axes: [number, number][] = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of axes) {
    const line: [number, number][] = [[lastRow, lastCol]];

    // Step forward (+ direction)
    let r = lastRow + dr;
    let c = lastCol + dc;
    while (isValidCoordinate(r, c, size) && board[r][c] === playerIndex) {
      line.push([r, c]);
      r += dr;
      c += dc;
    }

    // Step backward (- direction)
    r = lastRow - dr;
    c = lastCol - dc;
    while (isValidCoordinate(r, c, size) && board[r][c] === playerIndex) {
      line.unshift([r, c]);
      r -= dr;
      c -= dc;
    }

    // As decided in planner: >= 5 in a row wins, no 2-end block rule
    if (line.length >= winStreak) {
      return { won: true, winningLine: line };
    }
  }

  return { won: false, winningLine: null };
}

export function isBoardFull(board: (number | null)[][]): boolean {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[r].length; c++) {
      if (board[r][c] === null) {
        return false;
      }
    }
  }
  return true;
}
