import { randomUUID } from 'crypto';
import {
  Player,
  RoomState,
  ClientSession,
  ChatMessage,
  PLAYER_CONFIGS,
  Move,
} from '../../shared/types.js';
import { BOARD_SIZE, DISCONNECT_TIMEOUT_SECONDS } from './constants.js';
import { createEmptyBoard, isValidMove, checkWin, isBoardFull } from './caroLogic.js';

export interface InternalPlayer extends Player {
  sessionToken: string;
  socketId: string | null;
}

export interface InternalRoom {
  roomId: string;
  hostId: string;
  maxPlayers: 3 | 4;
  status: RoomState['status'];
  boardSize: number;
  board: (number | null)[][];
  players: InternalPlayer[];
  currentTurnIndex: number;
  startingTurnIndex: number;
  winnerIndex: number | null;
  winningLine: [number, number][] | null;
  lastMove: Move | null;
  moveCount: number;
  disconnectTimeoutSeconds: number;
  abandonedAt: number | null;
  rematchVotes: Set<string>;
  abandonTimers: Map<string, NodeJS.Timeout>;
  chatMessages: ChatMessage[];
  rateLimiter: Map<string, number[]>; // playerId -> timestamps
}

// Generate human-friendly 5-char room code
function generateRoomCode(): string {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export class RoomManager {
  private rooms = new Map<string, InternalRoom>();

  constructor(
    private randomPicker: (max: number) => number = (max) => Math.floor(Math.random() * max)
  ) {}

  public createRoom(
    hostName: string,
    maxPlayers: 3 | 4,
    socketId: string
  ): { room: RoomState; session: ClientSession } {
    let roomId = generateRoomCode();
    while (this.rooms.has(roomId)) {
      roomId = generateRoomCode();
    }

    const hostId = randomUUID();
    const sessionToken = randomUUID();
    const cleanHostName = hostName.trim() || PLAYER_CONFIGS[0].defaultName;

    const hostPlayer: InternalPlayer = {
      id: hostId,
      name: cleanHostName,
      index: 0,
      symbol: PLAYER_CONFIGS[0].symbol,
      color: PLAYER_CONFIGS[0].color,
      isReady: true, // Host is ready by default
      isConnected: true,
      disconnectedAt: null,
      sessionToken,
      socketId,
    };

    const room: InternalRoom = {
      roomId,
      hostId,
      maxPlayers,
      status: 'WAITING',
      boardSize: BOARD_SIZE,
      board: createEmptyBoard(BOARD_SIZE),
      players: [hostPlayer],
      currentTurnIndex: 0,
      startingTurnIndex: 0,
      winnerIndex: null,
      winningLine: null,
      lastMove: null,
      moveCount: 0,
      disconnectTimeoutSeconds: DISCONNECT_TIMEOUT_SECONDS,
      abandonedAt: null,
      rematchVotes: new Set(),
      abandonTimers: new Map(),
      chatMessages: [],
      rateLimiter: new Map(),
    };

    this.rooms.set(roomId, room);

    return {
      room: this.toPublicRoomState(room),
      session: {
        roomId,
        playerId: hostId,
        sessionToken,
        playerName: cleanHostName,
      },
    };
  }

  public joinRoom(
    roomId: string,
    playerName: string,
    socketId: string
  ): { success: boolean; room?: RoomState; session?: ClientSession; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      return { success: false, error: 'Mã phòng không tồn tại. Vui lòng kiểm tra lại.' };
    }

    if (room.status !== 'WAITING') {
      return {
        success: false,
        error: 'Ván đấu trong phòng này đã bắt đầu hoặc đã kết thúc.',
      };
    }

    if (room.players.length >= room.maxPlayers) {
      return {
        success: false,
        error: `Phòng đã đủ số lượng người chơi tối đa (${room.maxPlayers} người).`,
      };
    }

    const playerIndex = room.players.length;
    const playerId = randomUUID();
    const sessionToken = randomUUID();
    const config = PLAYER_CONFIGS[playerIndex];
    const cleanName = playerName.trim() || config.defaultName;

    const newPlayer: InternalPlayer = {
      id: playerId,
      name: cleanName,
      index: playerIndex,
      symbol: config.symbol,
      color: config.color,
      isReady: false,
      isConnected: true,
      disconnectedAt: null,
      sessionToken,
      socketId,
    };

    room.players.push(newPlayer);

    return {
      success: true,
      room: this.toPublicRoomState(room),
      session: {
        roomId: room.roomId,
        playerId,
        sessionToken,
        playerName: cleanName,
      },
    };
  }

  public reconnect(
    roomId: string,
    playerId: string,
    sessionToken: string,
    newSocketId: string
  ): { success: boolean; room?: RoomState; session?: ClientSession; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại hoặc đã bị đóng.' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player || player.sessionToken !== sessionToken) {
      return { success: false, error: 'Phiên đăng nhập không hợp lệ hoặc không tìm thấy người chơi.' };
    }

    // Clear any pending abandon timer for this player
    const timer = room.abandonTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      room.abandonTimers.delete(playerId);
    }

    player.isConnected = true;
    player.disconnectedAt = null;
    player.socketId = newSocketId;

    return {
      success: true,
      room: this.toPublicRoomState(room),
      session: {
        roomId: room.roomId,
        playerId: player.id,
        sessionToken: player.sessionToken,
        playerName: player.name,
      },
    };
  }

  public toggleReady(
    roomId: string,
    playerId: string
  ): { success: boolean; room?: RoomState; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };
    if (room.status !== 'WAITING') return { success: false, error: 'Ván đấu đã bắt đầu.' };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Không tìm thấy người chơi.' };

    player.isReady = !player.isReady;
    return { success: true, room: this.toPublicRoomState(room) };
  }

  public startGame(
    roomId: string,
    requesterId: string
  ): { success: boolean; room?: RoomState; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };

    if (room.hostId !== requesterId) {
      return { success: false, error: 'Chỉ chủ phòng mới có quyền bắt đầu ván đấu.' };
    }

    if (room.players.length !== room.maxPlayers) {
      return {
        success: false,
        error: `Cần đủ ${room.maxPlayers} người chơi để bắt đầu (hiện có ${room.players.length}/${room.maxPlayers}).`,
      };
    }

    const notReady = room.players.find((p) => !p.isReady);
    if (notReady) {
      return {
        success: false,
        error: `Người chơi "${notReady.name}" chưa sẵn sàng.`,
      };
    }

    // Server randomly selects starting player from connected players
    const chosenIndex = this.randomPicker(room.players.length);
    const validStartingIndex = chosenIndex >= 0 && chosenIndex < room.players.length ? chosenIndex : 0;

    room.status = 'PLAYING';
    room.board = createEmptyBoard(room.boardSize);
    room.startingTurnIndex = validStartingIndex;
    room.currentTurnIndex = validStartingIndex;
    room.winnerIndex = null;
    room.winningLine = null;
    room.lastMove = null;
    room.moveCount = 0;
    room.rematchVotes.clear();

    return { success: true, room: this.toPublicRoomState(room) };
  }

  public makeMove(
    roomId: string,
    playerId: string,
    row: number,
    col: number
  ): {
    success: boolean;
    move?: Move;
    room?: RoomState;
    result?: 'CONTINUE' | 'WON' | 'DRAW';
    error?: string;
  } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };

    if (room.status !== 'PLAYING') {
      return { success: false, error: 'Ván đấu chưa bắt đầu hoặc đã kết thúc.' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Người chơi không có trong phòng.' };

    if (player.index !== room.currentTurnIndex) {
      const activePlayer = room.players[room.currentTurnIndex];
      return {
        success: false,
        error: `Chưa đến lượt của bạn. Đang là lượt của ${activePlayer?.name || 'người chơi khác'}.`,
      };
    }

    if (!isValidMove(room.board, row, col, room.boardSize)) {
      return { success: false, error: 'Nước đi không hợp lệ hoặc ô cờ đã được đánh.' };
    }

    // Apply move
    room.board[row][col] = player.index;
    room.moveCount++;

    const move: Move = {
      row,
      col,
      playerIndex: player.index,
      moveNumber: room.moveCount,
      timestamp: Date.now(),
    };
    room.lastMove = move;

    // Check win
    const winResult = checkWin(room.board, row, col, player.index);
    if (winResult.won && winResult.winningLine) {
      room.status = 'FINISHED';
      room.winnerIndex = player.index;
      room.winningLine = winResult.winningLine;

      return {
        success: true,
        move,
        room: this.toPublicRoomState(room),
        result: 'WON',
      };
    }

    // Check draw
    if (isBoardFull(room.board)) {
      room.status = 'DRAW';
      return {
        success: true,
        move,
        room: this.toPublicRoomState(room),
        result: 'DRAW',
      };
    }

    // Rotate turn to next player in circular order (0 -> 1 -> 2 -> ... -> N-1 -> 0)
    room.currentTurnIndex = (room.currentTurnIndex + 1) % room.players.length;

    return {
      success: true,
      move,
      room: this.toPublicRoomState(room),
      result: 'CONTINUE',
    };
  }

  public voteRematch(
    roomId: string,
    playerId: string
  ): { success: boolean; room?: RoomState; restarted?: boolean; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };

    if (room.status !== 'FINISHED' && room.status !== 'DRAW') {
      return { success: false, error: 'Chỉ có thể yêu cầu chơi lại khi ván cờ đã kết thúc.' };
    }

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Người chơi không tồn tại.' };

    room.rematchVotes.add(playerId);

    // If host votes or all connected players vote, restart game
    const connectedPlayers = room.players.filter((p) => p.isConnected);
    const allVoted = connectedPlayers.every((p) => room.rematchVotes.has(p.id));

    if (allVoted || room.hostId === playerId) {
      // Re-randomize starting player independently for the new rematch
      const chosenIndex = this.randomPicker(room.players.length);
      const validStartingIndex = chosenIndex >= 0 && chosenIndex < room.players.length ? chosenIndex : 0;

      room.startingTurnIndex = validStartingIndex;
      room.currentTurnIndex = validStartingIndex;
      room.board = createEmptyBoard(room.boardSize);
      room.status = 'PLAYING';
      room.winnerIndex = null;
      room.winningLine = null;
      room.lastMove = null;
      room.moveCount = 0;
      room.rematchVotes.clear();

      return {
        success: true,
        room: this.toPublicRoomState(room),
        restarted: true,
      };
    }

    return {
      success: true,
      room: this.toPublicRoomState(room),
      restarted: false,
    };
  }

  // Add chat message with rate limiting and max 100 in-memory retention
  public addChatMessage(
    roomId: string,
    playerId: string,
    text: string
  ): { success: boolean; message?: ChatMessage; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return { success: false, error: 'Người chơi không có trong phòng.' };

    const cleanText = text.trim();
    if (!cleanText || cleanText.length > 300) {
      return { success: false, error: 'Nội dung tin nhắn phải từ 1 đến 300 ký tự.' };
    }

    // Rate limit: max 5 messages per 10 seconds (10,000ms)
    const now = Date.now();
    const timestamps = room.rateLimiter.get(playerId) || [];
    const recent = timestamps.filter((t) => now - t < 10000);

    if (recent.length >= 5) {
      return {
        success: false,
        error: 'Bạn đang gửi tin nhắn quá nhanh. Vui lòng chờ vài giây trước khi gửi tiếp.',
      };
    }

    recent.push(now);
    room.rateLimiter.set(playerId, recent);

    const message: ChatMessage = {
      id: randomUUID(),
      roomId: room.roomId,
      playerId: player.id,
      playerName: player.name,
      playerIndex: player.index,
      playerColor: player.color,
      playerSymbol: player.symbol,
      content: cleanText,
      timestamp: now,
    };

    room.chatMessages.push(message);
    if (room.chatMessages.length > 100) {
      room.chatMessages.shift();
    }

    return { success: true, message };
  }

  public getChatHistory(roomId: string): ChatMessage[] {
    const room = this.rooms.get(roomId.toUpperCase());
    return room ? [...room.chatMessages] : [];
  }

  public handleDisconnect(
    socketId: string,
    onAbandon: (roomId: string, roomState: RoomState) => void
  ): { roomId: string; playerId: string; roomState: RoomState } | null {
    for (const room of this.rooms.values()) {
      const player = room.players.find((p) => p.socketId === socketId);
      if (player) {
        player.isConnected = false;
        player.disconnectedAt = Date.now();
        player.socketId = null;

        // If game is playing, initiate abandon timer
        if (room.status === 'PLAYING') {
          // Clear any existing timer
          const existing = room.abandonTimers.get(player.id);
          if (existing) clearTimeout(existing);

          const timer = setTimeout(() => {
            if (!player.isConnected && room.status === 'PLAYING') {
              room.status = 'ABANDONED';
              room.abandonedAt = Date.now();
              onAbandon(room.roomId, this.toPublicRoomState(room));
            }
          }, room.disconnectTimeoutSeconds * 1000);

          room.abandonTimers.set(player.id, timer);
        }

        return {
          roomId: room.roomId,
          playerId: player.id,
          roomState: this.toPublicRoomState(room),
        };
      }
    }
    return null;
  }

  public leaveRoom(
    roomId: string,
    playerId: string
  ): { success: boolean; room?: RoomState | null; error?: string } {
    const room = this.rooms.get(roomId.toUpperCase());
    if (!room) return { success: false, error: 'Phòng không tồn tại.' };

    const playerIndex = room.players.findIndex((p) => p.id === playerId);
    if (playerIndex === -1) return { success: false, error: 'Không tìm thấy người chơi.' };

    // Clear abandon timer if any
    const timer = room.abandonTimers.get(playerId);
    if (timer) {
      clearTimeout(timer);
      room.abandonTimers.delete(playerId);
    }

    if (room.status === 'PLAYING') {
      // In active game, leaving abandons the game
      room.status = 'ABANDONED';
      room.abandonedAt = Date.now();
      return { success: true, room: this.toPublicRoomState(room) };
    }

    // In WAITING or FINISHED, remove player
    room.players.splice(playerIndex, 1);

    if (room.players.length === 0) {
      this.rooms.delete(room.roomId);
      return { success: true, room: null };
    }

    // Re-assign indexes and configs
    room.players.forEach((p, idx) => {
      p.index = idx;
      p.symbol = PLAYER_CONFIGS[idx].symbol;
      p.color = PLAYER_CONFIGS[idx].color;
    });

    // If host left, elect next player as host
    if (room.hostId === playerId) {
      room.hostId = room.players[0].id;
      room.players[0].isReady = true;
    }

    return { success: true, room: this.toPublicRoomState(room) };
  }

  public getRoom(roomId: string): RoomState | null {
    const room = this.rooms.get(roomId.toUpperCase());
    return room ? this.toPublicRoomState(room) : null;
  }

  public getInternalRoom(roomId: string): InternalRoom | null {
    return this.rooms.get(roomId.toUpperCase()) || null;
  }

  private toPublicRoomState(room: InternalRoom): RoomState {
    return {
      roomId: room.roomId,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      status: room.status,
      boardSize: room.boardSize,
      board: room.board,
      players: room.players.map((p) => ({
        id: p.id,
        name: p.name,
        index: p.index,
        symbol: p.symbol,
        color: p.color,
        isReady: p.isReady,
        isConnected: p.isConnected,
        disconnectedAt: p.disconnectedAt,
      })),
      currentTurnIndex: room.currentTurnIndex,
      startingTurnIndex: room.startingTurnIndex,
      winnerIndex: room.winnerIndex,
      winningLine: room.winningLine,
      lastMove: room.lastMove,
      moveCount: room.moveCount,
      disconnectTimeoutSeconds: room.disconnectTimeoutSeconds,
      abandonedAt: room.abandonedAt,
      rematchVotes: Array.from(room.rematchVotes),
    };
  }
}
