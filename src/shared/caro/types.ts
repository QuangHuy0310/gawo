export type PlayerSymbol = 'X' | 'O' | '▲' | '■';

export interface PlayerConfig {
  symbol: PlayerSymbol;
  color: string;
  badgeBg: string;
  badgeText: string;
  defaultName: string;
}

export const PLAYER_CONFIGS: PlayerConfig[] = [
  {
    symbol: 'X',
    color: '#2563EB', // Blue
    badgeBg: '#DBEAFE',
    badgeText: '#1D4ED8',
    defaultName: 'Người chơi 1 (X)',
  },
  {
    symbol: 'O',
    color: '#DC2626', // Red
    badgeBg: '#FEE2E2',
    badgeText: '#B91C1C',
    defaultName: 'Người chơi 2 (O)',
  },
  {
    symbol: '▲',
    color: '#7C3AED', // Purple
    badgeBg: '#EDE9FE',
    badgeText: '#6D28D9',
    defaultName: 'Người chơi 3 (▲)',
  },
  {
    symbol: '■',
    color: '#D97706', // Amber/Orange
    badgeBg: '#FEF3C7',
    badgeText: '#B45309',
    defaultName: 'Người chơi 4 (■)',
  },
];

export type RoomStatus = 'WAITING' | 'PLAYING' | 'FINISHED' | 'DRAW' | 'ABANDONED';

export interface Player {
  id: string;
  name: string;
  index: number;
  symbol: PlayerSymbol;
  color: string;
  isReady: boolean;
  isConnected: boolean;
  disconnectedAt: number | null;
}

export interface Move {
  row: number;
  col: number;
  playerIndex: number;
  moveNumber: number;
  timestamp: number;
}

export interface RoomState {
  roomId: string;
  hostId: string;
  maxPlayers: 3 | 4;
  status: RoomStatus;
  boardSize: number;
  board: (number | null)[][];
  players: Player[];
  currentTurnIndex: number;
  startingTurnIndex: number;
  winnerIndex: number | null;
  winningLine: [number, number][] | null;
  lastMove: Move | null;
  moveCount: number;
  disconnectTimeoutSeconds: number;
  abandonedAt: number | null;
  rematchVotes: string[];
}

export interface ClientSession {
  roomId: string;
  playerId: string;
  sessionToken: string;
  playerName: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  playerId: string;
  playerName: string;
  playerIndex: number;
  playerColor: string;
  playerSymbol: PlayerSymbol;
  content: string;
  timestamp: number;
}

// Client to Server Events
export interface ClientToServerEvents {
  'room:create': (
    payload: { playerName: string; maxPlayers: 3 | 4 },
    callback: (response: { success: boolean; session?: ClientSession; roomState?: RoomState; error?: string }) => void
  ) => void;

  'room:join': (
    payload: { roomId: string; playerName: string },
    callback: (response: { success: boolean; session?: ClientSession; roomState?: RoomState; error?: string }) => void
  ) => void;

  'room:reconnect': (
    payload: { roomId: string; playerId: string; sessionToken: string },
    callback: (response: { success: boolean; session?: ClientSession; roomState?: RoomState; error?: string }) => void
  ) => void;

  'player:ready': (
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'game:start': (
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'game:move': (
    payload: { row: number; col: number },
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'game:rematch': (
    callback?: (response: { success: boolean; error?: string }) => void
  ) => void;

  'room:leave': (
    callback?: (response: { success: boolean }) => void
  ) => void;

  'chat:send': (
    payload: { text: string },
    callback?: (response: { success: boolean; message?: ChatMessage; error?: string }) => void
  ) => void;
}

// Server to Client Events
export interface ServerToClientEvents {
  'room:updated': (roomState: RoomState) => void;
  'game:started': (roomState: RoomState) => void;
  'game:moveMade': (payload: { move: Move; roomState: RoomState }) => void;
  'game:won': (payload: { winnerIndex: number; winningLine: [number, number][]; roomState: RoomState }) => void;
  'game:draw': (roomState: RoomState) => void;
  'player:disconnected': (payload: { playerId: string; timeoutSeconds: number; roomState: RoomState }) => void;
  'player:reconnected': (payload: { playerId: string; roomState: RoomState }) => void;
  'room:abandoned': (payload: { reason: string; roomState: RoomState }) => void;
  'error:message': (message: string) => void;
  'chat:message': (message: ChatMessage) => void;
  'chat:history': (messages: ChatMessage[]) => void;
}
