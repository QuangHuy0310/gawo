import { Server, Socket } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  RoomState,
} from '../../shared/types.js';
import { RoomManager } from '../game/roomManager.js';

export function setupSocketHandlers(
  io: Server<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
) {
  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    let currentRoomId: string | null = null;
    let currentPlayerId: string | null = null;

    // Helper to get socket room name
    const roomChannel = (roomId: string) => `room:${roomId.toUpperCase()}`;

    // 1. Create Room
    socket.on('room:create', ({ playerName, maxPlayers }, callback) => {
      try {
        const { room, session } = roomManager.createRoom(playerName, maxPlayers, socket.id);
        currentRoomId = room.roomId;
        currentPlayerId = session.playerId;

        socket.join(roomChannel(room.roomId));
        callback({ success: true, session, roomState: room });
        io.to(roomChannel(room.roomId)).emit('room:updated', room);
        socket.emit('chat:history', roomManager.getChatHistory(room.roomId));
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Lỗi khi tạo phòng' });
      }
    });

    // 2. Join Room
    socket.on('room:join', ({ roomId, playerName }, callback) => {
      try {
        const result = roomManager.joinRoom(roomId, playerName, socket.id);
        if (!result.success || !result.room || !result.session) {
          callback({ success: false, error: result.error });
          return;
        }

        currentRoomId = result.room.roomId;
        currentPlayerId = result.session.playerId;

        socket.join(roomChannel(result.room.roomId));
        callback({ success: true, session: result.session, roomState: result.room });
        io.to(roomChannel(result.room.roomId)).emit('room:updated', result.room);
        socket.emit('chat:history', roomManager.getChatHistory(result.room.roomId));
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Lỗi khi tham gia phòng' });
      }
    });

    // 3. Reconnect
    socket.on('room:reconnect', ({ roomId, playerId, sessionToken }, callback) => {
      try {
        const result = roomManager.reconnect(roomId, playerId, sessionToken, socket.id);
        if (!result.success || !result.room || !result.session) {
          callback({ success: false, error: result.error });
          return;
        }

        currentRoomId = result.room.roomId;
        currentPlayerId = playerId;

        socket.join(roomChannel(result.room.roomId));
        callback({ success: true, session: result.session, roomState: result.room });

        io.to(roomChannel(result.room.roomId)).emit('player:reconnected', {
          playerId,
          roomState: result.room,
        });
        io.to(roomChannel(result.room.roomId)).emit('room:updated', result.room);
        socket.emit('chat:history', roomManager.getChatHistory(result.room.roomId));
      } catch (err: any) {
        callback({ success: false, error: err.message || 'Lỗi khi kết nối lại' });
      }
    });

    // 4. Toggle Ready
    socket.on('player:ready', (callback) => {
      if (!currentRoomId || !currentPlayerId) {
        callback?.({ success: false, error: 'Chưa tham gia phòng nào.' });
        return;
      }

      const result = roomManager.toggleReady(currentRoomId, currentPlayerId);
      if (!result.success || !result.room) {
        callback?.({ success: false, error: result.error });
        return;
      }

      callback?.({ success: true });
      io.to(roomChannel(currentRoomId)).emit('room:updated', result.room);
    });

    // 5. Start Game
    socket.on('game:start', (callback) => {
      if (!currentRoomId || !currentPlayerId) {
        callback?.({ success: false, error: 'Chưa tham gia phòng nào.' });
        return;
      }

      const result = roomManager.startGame(currentRoomId, currentPlayerId);
      if (!result.success || !result.room) {
        callback?.({ success: false, error: result.error });
        return;
      }

      callback?.({ success: true });
      io.to(roomChannel(currentRoomId)).emit('game:started', result.room);
      io.to(roomChannel(currentRoomId)).emit('room:updated', result.room);
    });

    // 6. Make Move
    socket.on('game:move', ({ row, col }, callback) => {
      if (!currentRoomId || !currentPlayerId) {
        callback?.({ success: false, error: 'Chưa tham gia phòng nào.' });
        return;
      }

      const result = roomManager.makeMove(currentRoomId, currentPlayerId, row, col);
      if (!result.success || !result.room || !result.move) {
        callback?.({ success: false, error: result.error });
        return;
      }

      callback?.({ success: true });

      const channel = roomChannel(currentRoomId);
      if (result.result === 'WON' && result.room.winnerIndex !== null && result.room.winningLine) {
        io.to(channel).emit('game:won', {
          winnerIndex: result.room.winnerIndex,
          winningLine: result.room.winningLine,
          roomState: result.room,
        });
      } else if (result.result === 'DRAW') {
        io.to(channel).emit('game:draw', result.room);
      } else {
        io.to(channel).emit('game:moveMade', {
          move: result.move,
          roomState: result.room,
        });
      }

      io.to(channel).emit('room:updated', result.room);
    });

    // 7. Vote Rematch
    socket.on('game:rematch', (callback) => {
      if (!currentRoomId || !currentPlayerId) {
        callback?.({ success: false, error: 'Chưa tham gia phòng nào.' });
        return;
      }

      const result = roomManager.voteRematch(currentRoomId, currentPlayerId);
      if (!result.success || !result.room) {
        callback?.({ success: false, error: result.error });
        return;
      }

      callback?.({ success: true });
      const channel = roomChannel(currentRoomId);

      if (result.restarted) {
        io.to(channel).emit('game:started', result.room);
      }
      io.to(channel).emit('room:updated', result.room);
    });

    // 8. Chat Send
    socket.on('chat:send', ({ text }, callback) => {
      if (!currentRoomId || !currentPlayerId) {
        callback?.({ success: false, error: 'Chưa tham gia phòng nào.' });
        return;
      }

      const result = roomManager.addChatMessage(currentRoomId, currentPlayerId, text);
      if (!result.success || !result.message) {
        callback?.({ success: false, error: result.error });
        return;
      }

      callback?.({ success: true, message: result.message });
      io.to(roomChannel(currentRoomId)).emit('chat:message', result.message);
    });

    // 9. Leave Room
    socket.on('room:leave', (callback) => {
      if (currentRoomId && currentPlayerId) {
        const channel = roomChannel(currentRoomId);
        const result = roomManager.leaveRoom(currentRoomId, currentPlayerId);
        socket.leave(channel);

        if (result.room) {
          io.to(channel).emit('room:updated', result.room);
        }

        currentRoomId = null;
        currentPlayerId = null;
        callback?.({ success: true });
      } else {
        callback?.({ success: true });
      }
    });

    // 10. Socket Disconnect
    socket.on('disconnect', () => {
      const result = roomManager.handleDisconnect(socket.id, (roomId, abandonedRoom) => {
        io.to(roomChannel(roomId)).emit('room:abandoned', {
          reason: 'Một người chơi đã ngắt kết nối quá thời gian chờ (60s). Ván đấu bị hủy.',
          roomState: abandonedRoom,
        });
        io.to(roomChannel(roomId)).emit('room:updated', abandonedRoom);
      });

      if (result) {
        io.to(roomChannel(result.roomId)).emit('player:disconnected', {
          playerId: result.playerId,
          timeoutSeconds: result.roomState.disconnectTimeoutSeconds,
          roomState: result.roomState,
        });
        io.to(roomChannel(result.roomId)).emit('room:updated', result.roomState);
      }
    });
  });
}
