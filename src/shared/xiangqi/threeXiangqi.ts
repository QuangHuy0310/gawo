export const kingdoms = ['Ngụy', 'Thục', 'Ngô'] as const;
export type Side = 0 | 1 | 2;
type Kind = 'general' | 'advisor' | 'elephant' | 'horse' | 'chariot' | 'cannon' | 'pawn';
export const pieceNames: Record<Kind, string> = {
  general: 'Tướng', advisor: 'Sĩ', elephant: 'Tượng', horse: 'Mã',
  chariot: 'Xe', cannon: 'Pháo', pawn: 'Tốt',
};
export const symbols: Record<Kind, string> = {
  general: '將', advisor: '士', elephant: '象', horse: '馬',
  chariot: '車', cannon: '炮', pawn: '卒',
};
type Piece = { side: Side; kind: Kind };
type Board = Array<Piece | null>;
export type XiangqiGame = {
  board: Board;
  turn: Side;
  checkedBy: Side[];
  result: { winner: Side | null; reason: 'mate' | 'joint-mate' | 'stalemate' } | null;
  lastMove: { from: number; to: number } | null;
};

const sides = [0, 1, 2] as const;
const next = (side: Side) => sides[(side + 1) % 3];
const point = (side: Side, row: number, col: number) => side * 45 + row * 9 + col;
const coordinates = (id: number) => ({
  side: sides[Math.floor(id / 45)],
  row: Math.floor(id % 45 / 9),
  col: id % 9,
});
export const intersections = Array.from({ length: 135 }, (_, id) => {
  const { side, row, col } = coordinates(id);
  const angle = side * 2 * Math.PI / 3;
  const x = col - 4;
  const y = 2.8 + 4 - row;
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
});
export const centerEntrances = sides.map((side) => point(side, 4, 4));

const ranks = sides.flatMap((side) => Array.from({ length: 5 }, (_, row) =>
  Array.from({ length: 9 }, (_, col) => point(side, row, col))));
const file = (side: Side, col: number) => Array.from({ length: 5 }, (_, row) => point(side, row, col));
const files = sides.flatMap((side) => [
  ...Array.from({ length: 4 }, (_, col) => [...file(side, col), ...file(next(side), 8 - col).reverse()]),
  [...file(side, 4), ...file(next(side), 4).reverse()],
]);
type Ray = { path: number[]; axis: 'rank' | 'file' };
const rays: Ray[][] = intersections.map(() => []);
export const boardEdges: Array<[number, number]> = [];
const drawnEdges = new Set<string>();
for (const { lines, axis } of [{ lines: ranks, axis: 'rank' }, { lines: files, axis: 'file' }] as const) {
  for (const line of lines) {
    line.forEach((id, i) => {
      if (i > 0) {
        rays[id].push({ path: line.slice(0, i).reverse(), axis });
        const previous = line[i - 1];
        const key = `${Math.min(previous, id)}-${Math.max(previous, id)}`;
        if (!drawnEdges.has(key) && !(centerEntrances.includes(previous) && centerEntrances.includes(id))) {
          boardEdges.push([previous, id]);
          drawnEdges.add(key);
        }
      }
      if (i < line.length - 1) rays[id].push({ path: line.slice(i + 1), axis });
    });
  }
}
export const palaceDiagonals: Array<[number, number]> = sides.flatMap((side) => [
  [point(side, 0, 3), point(side, 2, 5)],
  [point(side, 0, 5), point(side, 2, 3)],
]);

export function newXiangqiGame(startingSide: Side = sides[Math.floor(Math.random() * sides.length)]): XiangqiGame {
  const board: Board = intersections.map(() => null);
  const backRank: Kind[] = ['chariot', 'horse', 'elephant', 'advisor', 'general', 'advisor', 'elephant', 'horse', 'chariot'];
  for (const side of sides) {
    backRank.forEach((kind, col) => { board[point(side, 0, col)] = { kind, side }; });
    for (const col of [1, 7]) board[point(side, 2, col)] = { kind: 'cannon', side };
    for (const col of [0, 2, 4, 6, 8]) board[point(side, 3, col)] = { kind: 'pawn', side };
  }
  return { board, turn: startingSide, checkedBy: [], result: null, lastMove: null };
}

function movement(board: Board, from: number, piece: Piece): number[] {
  const { side, row, col } = coordinates(from);
  switch (piece.kind) {
    case 'chariot':
    case 'cannon': {
      const destinations: number[] = [];
      for (const { path } of rays[from]) {
        let screened = false;
        for (const target of path) {
          if (!screened && !board[target]) {
            destinations.push(target);
          } else if (!screened && piece.kind === 'cannon') {
            screened = true;
          } else if (board[target]) {
            destinations.push(target);
            break;
          }
        }
      }
      return destinations;
    }
    case 'horse':
      return rays[from].flatMap(({ path, axis }) => {
        const [leg, bend] = path;
        if (bend === undefined || board[leg]) return [];
        return rays[bend].filter((ray) => ray.axis !== axis).map((ray) => ray.path[0]);
      });
    case 'pawn':
      return rays[from].flatMap(({ path, axis }) => {
        const target = path[0];
        if (axis === 'rank') return side === piece.side ? [] : [target];
        const destination = coordinates(target);
        const forward = side === piece.side
          ? destination.side !== side || destination.row > row
          : destination.side === side && destination.row < row;
        return forward ? [target] : [];
      });
    case 'general':
    case 'advisor':
    case 'elephant': {
      const destinations: number[] = [];
      for (const dr of [-1, 0, 1]) {
        for (const dc of [-1, 0, 1]) {
          if (dr === 0 && dc === 0) continue;
          const diagonal = dr !== 0 && dc !== 0;
          if (diagonal !== (piece.kind !== 'general')) continue;
          const step = piece.kind === 'elephant' ? 2 : 1;
          const r = row + dr * step;
          const c = col + dc * step;
          if (piece.kind === 'elephant') {
            if (r < 0 || r > 4 || c < 0 || c > 8 || board[point(side, row + dr, col + dc)]) continue;
          } else if (r < 0 || r > 2 || c < 3 || c > 5) {
            continue;
          }
          destinations.push(point(side, r, c));
        }
      }
      if (piece.kind === 'general') {
        for (const { path } of rays[from]) {
          const firstPiece = path.find((id) => board[id]);
          if (firstPiece !== undefined && board[firstPiece]?.kind === 'general') destinations.push(firstPiece);
        }
      }
      return destinations;
    }
  }
}

function attackers(board: Board, side: Side): Side[] {
  const general = board.findIndex((piece) => piece?.side === side && piece.kind === 'general');
  const threats = new Set<Side>();
  board.forEach((piece, from) => {
    if (piece && piece.side !== side && movement(board, from, piece).includes(general)) threats.add(piece.side);
  });
  return [...threats];
}

export function givesXiangqiCheck(game: XiangqiGame, attacker: Side): boolean {
  return sides.some((defender) => defender !== attacker && attackers(game.board, defender).includes(attacker));
}

function afterMove(board: Board, from: number, to: number): Board {
  const nextBoard = board.slice();
  nextBoard[to] = nextBoard[from];
  nextBoard[from] = null;
  return nextBoard;
}

export function legalDestinations(game: XiangqiGame, from: number): number[] {
  const piece = game.board[from];
  if (game.result || !piece || piece.side !== game.turn) return [];
  return [...new Set(movement(game.board, from, piece))].filter((to) => {
    const target = game.board[to];
    return target?.side !== piece.side && target?.kind !== 'general'
      && attackers(afterMove(game.board, from, to), piece.side).length === 0;
  });
}

export function playXiangqiMove(game: XiangqiGame, from: number, to: number): XiangqiGame | null {
  if (!legalDestinations(game, from).includes(to)) return null;
  const board = afterMove(game.board, from, to);
  const turn = next(game.turn);
  const checkedBy = attackers(board, turn);
  const updated: XiangqiGame = { board, turn, checkedBy, result: null, lastMove: { from, to } };
  if (!board.some((piece, id) => piece?.side === turn && legalDestinations(updated, id).length > 0)) {
    updated.result = checkedBy.length === 1
      ? { winner: checkedBy[0], reason: 'mate' }
      : { winner: null, reason: checkedBy.length ? 'joint-mate' : 'stalemate' };
  }
  return updated;
}
