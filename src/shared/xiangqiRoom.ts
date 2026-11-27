import type { XiangqiGame } from './threeXiangqi.js';

export type XiangqiRoom = {
  code: string;
  players: Array<{ name: string; connected: boolean }>;
  game: XiangqiGame | null;
};

type EntryReply = (reply: { token: string; code: string } | { error: string }) => void;
export interface XiangqiClientEvents {
  enter: (request: { code?: string; name?: string; token?: string }, reply: EntryReply) => void;
  move: (from: number, to: number) => void;
  rematch: () => void;
  leave: () => void;
}
export interface XiangqiServerEvents {
  room: (room: XiangqiRoom, seat: number) => void;
  closed: (reason: string) => void;
}
