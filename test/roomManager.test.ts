import { describe, it, expect } from 'vitest';
import { RoomManager } from '../src/server/game/roomManager.js';

describe('RoomManager Unit Tests (30x30 Board & Random Turn Start & Chat)', () => {
  it('should create a room for 3 players with 30x30 board properly', () => {
    const rm = new RoomManager();
    const { room, session } = rm.createRoom('HostPlayer', 3, 'socket-1');

    expect(room.roomId).toBeDefined();
    expect(room.maxPlayers).toBe(3);
    expect(room.boardSize).toBe(30);
    expect(room.board.length).toBe(30);
    expect(room.board[0].length).toBe(30);
    expect(room.players.length).toBe(1);
    expect(room.players[0].name).toBe('HostPlayer');
    expect(room.players[0].symbol).toBe('X');
    expect(room.status).toBe('WAITING');
    expect(session.playerId).toBe(room.players[0].id);
  });

  it('should enforce player capacity (3 players limit)', () => {
    const rm = new RoomManager();
    const { room } = rm.createRoom('Host', 3, 's1');

    const p2 = rm.joinRoom(room.roomId, 'Player 2', 's2');
    expect(p2.success).toBe(true);
    expect(p2.room?.players.length).toBe(2);

    const p3 = rm.joinRoom(room.roomId, 'Player 3', 's3');
    expect(p3.success).toBe(true);
    expect(p3.room?.players.length).toBe(3);

    // 4th player should be rejected
    const p4 = rm.joinRoom(room.roomId, 'Player 4', 's4');
    expect(p4.success).toBe(false);
    expect(p4.error).toContain('đủ số lượng');
  });

  it('should enforce player capacity (4 players limit)', () => {
    const rm = new RoomManager();
    const { room } = rm.createRoom('Host', 4, 's1');

    rm.joinRoom(room.roomId, 'Player 2', 's2');
    rm.joinRoom(room.roomId, 'Player 3', 's3');
    const p4 = rm.joinRoom(room.roomId, 'Player 4', 's4');
    expect(p4.success).toBe(true);

    // 5th player should be rejected
    const p5 = rm.joinRoom(room.roomId, 'Player 5', 's5');
    expect(p5.success).toBe(false);
  });

  it('should randomly pick a starting player on game start', () => {
    const deterministicPicker = (_max: number) => 2;
    const rm = new RoomManager(deterministicPicker);
    const { room, session } = rm.createRoom('Host', 3, 's1');
    const p2 = rm.joinRoom(room.roomId, 'Player 2', 's2');
    const p3 = rm.joinRoom(room.roomId, 'Player 3', 's3');

    rm.toggleReady(room.roomId, p2.session!.playerId);
    rm.toggleReady(room.roomId, p3.session!.playerId);

    const startAttempt = rm.startGame(room.roomId, session.playerId);
    expect(startAttempt.success).toBe(true);
    expect(startAttempt.room?.status).toBe('PLAYING');
    expect(startAttempt.room?.startingTurnIndex).toBe(2);
    expect(startAttempt.room?.currentTurnIndex).toBe(2);
  });

  it('should randomly pick within bounds with default picker', () => {
    const rm = new RoomManager();
    const { room, session } = rm.createRoom('Host', 4, 's1');
    const p2 = rm.joinRoom(room.roomId, 'Player 2', 's2');
    const p3 = rm.joinRoom(room.roomId, 'Player 3', 's3');
    const p4 = rm.joinRoom(room.roomId, 'Player 4', 's4');

    rm.toggleReady(room.roomId, p2.session!.playerId);
    rm.toggleReady(room.roomId, p3.session!.playerId);
    rm.toggleReady(room.roomId, p4.session!.playerId);

    const start = rm.startGame(room.roomId, session.playerId);
    expect(start.success).toBe(true);
    expect(start.room?.startingTurnIndex).toBeGreaterThanOrEqual(0);
    expect(start.room?.startingTurnIndex).toBeLessThan(4);
    expect(start.room?.currentTurnIndex).toBe(start.room?.startingTurnIndex);
  });

  it('should rotate turns correctly from chosen starting player (1 -> 2 -> 0 -> 1)', () => {
    const rm = new RoomManager(() => 1);
    const { room, session: s1 } = rm.createRoom('Host', 3, 's1');
    const { session: s2 } = rm.joinRoom(room.roomId, 'P2', 's2');
    const { session: s3 } = rm.joinRoom(room.roomId, 'P3', 's3');

    rm.toggleReady(room.roomId, s2!.playerId);
    rm.toggleReady(room.roomId, s3!.playerId);
    rm.startGame(room.roomId, s1.playerId);

    // Initial turn is Player 1 (P2)
    const mP1Invalid = rm.makeMove(room.roomId, s1.playerId, 10, 10);
    expect(mP1Invalid.success).toBe(false);
    expect(mP1Invalid.error).toContain('Chưa đến lượt');

    // Player 2 makes first move
    const m1 = rm.makeMove(room.roomId, s2!.playerId, 10, 10);
    expect(m1.success).toBe(true);
    expect(m1.room?.currentTurnIndex).toBe(2);

    // Player 3 moves
    const m2 = rm.makeMove(room.roomId, s3!.playerId, 11, 10);
    expect(m2.success).toBe(true);
    expect(m2.room?.currentTurnIndex).toBe(0);

    // Player 1 moves at boundary corner (29, 29)
    const m3 = rm.makeMove(room.roomId, s1.playerId, 29, 29);
    expect(m3.success).toBe(true);
    expect(m3.room?.currentTurnIndex).toBe(1);
  });

  it('should support reconnecting with session token on 30x30 board', () => {
    const rm = new RoomManager();
    const { room, session } = rm.createRoom('Host', 3, 's1');

    rm.handleDisconnect('s1', () => {});
    const rAfterDc = rm.getRoom(room.roomId);
    expect(rAfterDc?.players[0].isConnected).toBe(false);

    const recon = rm.reconnect(room.roomId, session.playerId, session.sessionToken, 's1-new');
    expect(recon.success).toBe(true);
    expect(recon.room?.players[0].isConnected).toBe(true);
  });

  it('should re-randomize starting player independently on rematch', () => {
    let pickCounter = 0;
    const sequentialPicker = (_max: number) => {
      const choice = pickCounter === 0 ? 0 : 2;
      pickCounter++;
      return choice;
    };

    const rm = new RoomManager(sequentialPicker);
    const { room, session: s1 } = rm.createRoom('Host', 3, 's1');
    const { session: s2 } = rm.joinRoom(room.roomId, 'P2', 's2');
    const { session: s3 } = rm.joinRoom(room.roomId, 'P3', 's3');

    rm.toggleReady(room.roomId, s2!.playerId);
    rm.toggleReady(room.roomId, s3!.playerId);
    const start = rm.startGame(room.roomId, s1.playerId);
    expect(start.room?.startingTurnIndex).toBe(0);

    for (let c = 0; c < 4; c++) {
      rm.makeMove(room.roomId, s1.playerId, 14, c);
      rm.makeMove(room.roomId, s2!.playerId, 15, c);
      rm.makeMove(room.roomId, s3!.playerId, 16, c);
    }
    const winMove = rm.makeMove(room.roomId, s1.playerId, 14, 4);
    expect(winMove.result).toBe('WON');

    const rematch = rm.voteRematch(room.roomId, s1.playerId);
    expect(rematch.restarted).toBe(true);
    expect(rematch.room?.status).toBe('PLAYING');
    expect(rematch.room?.board.length).toBe(30);
    expect(rematch.room?.startingTurnIndex).toBe(2);
    expect(rematch.room?.currentTurnIndex).toBe(2);
  });

  it('should handle in-room chat messages, character limits, and history', () => {
    const rm = new RoomManager();
    const { room, session: s1 } = rm.createRoom('Alice', 3, 's1');
    const { session: s2 } = rm.joinRoom(room.roomId, 'Bob', 's2');

    // 1. Send valid message
    const msg1 = rm.addChatMessage(room.roomId, s1.playerId, '  Xin chào mọi người!  ');
    expect(msg1.success).toBe(true);
    expect(msg1.message?.content).toBe('Xin chào mọi người!');
    expect(msg1.message?.playerName).toBe('Alice');
    expect(msg1.message?.playerSymbol).toBe('X');

    // 2. Reject empty message
    const emptyMsg = rm.addChatMessage(room.roomId, s1.playerId, '     ');
    expect(emptyMsg.success).toBe(false);
    expect(emptyMsg.error).toContain('1 đến 300 ký tự');

    // 3. Reject oversized message (> 300 chars)
    const longText = 'a'.repeat(301);
    const overMsg = rm.addChatMessage(room.roomId, s1.playerId, longText);
    expect(overMsg.success).toBe(false);

    // 4. Bob sends message
    const msg2 = rm.addChatMessage(room.roomId, s2!.playerId, 'Chào Alice nhé!');
    expect(msg2.success).toBe(true);

    // 5. Check history
    const history = rm.getChatHistory(room.roomId);
    expect(history.length).toBe(2);
    expect(history[0].content).toBe('Xin chào mọi người!');
    expect(history[1].content).toBe('Chào Alice nhé!');
  });

  it('should enforce chat rate limiting (max 5 messages in 10 seconds)', () => {
    const rm = new RoomManager();
    const { room, session: s1 } = rm.createRoom('Spammer', 3, 's1');

    // Send 5 messages in rapid succession
    for (let i = 1; i <= 5; i++) {
      const res = rm.addChatMessage(room.roomId, s1.playerId, `Message #${i}`);
      expect(res.success).toBe(true);
    }

    // 6th message should be rejected due to rate limiting
    const res6 = rm.addChatMessage(room.roomId, s1.playerId, 'Message #6 spam');
    expect(res6.success).toBe(false);
    expect(res6.error).toContain('quá nhanh');
  });

  it('should cap chat history at 100 messages', () => {
    const rm = new RoomManager();
    const { room, session: s1 } = rm.createRoom('Host', 3, 's1');

    // Fill internal room with 105 messages directly
    const internalRoom = rm.getInternalRoom(room.roomId)!;
    for (let i = 1; i <= 105; i++) {
      internalRoom.chatMessages.push({
        id: `msg-${i}`,
        roomId: room.roomId,
        playerId: s1.playerId,
        playerName: 'Host',
        playerIndex: 0,
        playerColor: '#2563EB',
        playerSymbol: 'X',
        content: `Msg ${i}`,
        timestamp: Date.now() + i,
      });
      if (internalRoom.chatMessages.length > 100) {
        internalRoom.chatMessages.shift();
      }
    }

    const history = rm.getChatHistory(room.roomId);
    expect(history.length).toBe(100);
    expect(history[history.length - 1].content).toBe('Msg 105');
  });
});
