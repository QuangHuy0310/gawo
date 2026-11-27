import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createServer, Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ClientIO, Socket as ClientSocket } from 'socket.io-client';
import { ClientToServerEvents, ServerToClientEvents, RoomState, ChatMessage } from '../src/shared/caro/types.js';
import { RoomManager } from '../src/server/games/caro/roomManager.js';
import { setupSocketHandlers } from '../src/server/games/caro/socketHandler.js';

describe('Realtime Socket Flow Integration Test (30x30 Board & Random Turn Start & Chat)', () => {
  let httpServer: HttpServer;
  let ioServer: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;
  let port: number;
  let client1: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let client2: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let client3: ClientSocket<ServerToClientEvents, ClientToServerEvents>;
  let client4: ClientSocket<ServerToClientEvents, ClientToServerEvents>;

  beforeAll(async () => {
    httpServer = createServer();
    ioServer = new SocketIOServer(httpServer, {
      cors: { origin: '*' },
    });
    // Create RoomManager with deterministic picker for predictable test flow (starts with player 0)
    const roomManager = new RoomManager(() => 0);
    setupSocketHandlers(ioServer, roomManager);

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        const addr = httpServer.address();
        port = typeof addr === 'object' && addr ? addr.port : 3001;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (client1) client1.disconnect();
    if (client2) client2.disconnect();
    if (client3) client3.disconnect();
    if (client4) client4.disconnect();
    ioServer.close();
    httpServer.close();
  });

  it('should run a complete 3-player game cycle on 30x30 board with random starting turn and realtime chat', async () => {
    const serverUrl = `http://localhost:${port}`;

    const connectClient = () => {
      return new Promise<ClientSocket<ServerToClientEvents, ClientToServerEvents>>((resolve) => {
        const socket = ClientIO(serverUrl, {
          transports: ['websocket'],
          forceNew: true,
        });
        socket.on('connect', () => resolve(socket));
      });
    };

    client1 = await connectClient();
    client2 = await connectClient();
    client3 = await connectClient();
    client4 = await connectClient();

    let roomId = '';

    // 1. Client 1 creates room for 3 players
    await new Promise<void>((resolve) => {
      client1.emit('room:create', { playerName: 'Alice', maxPlayers: 3 }, (res) => {
        expect(res.success).toBe(true);
        expect(res.roomState?.maxPlayers).toBe(3);
        expect(res.roomState?.boardSize).toBe(30);
        expect(res.roomState?.players[0].name).toBe('Alice');
        roomId = res.session!.roomId;
        resolve();
      });
    });

    // 2. Client 2 joins room
    await new Promise<void>((resolve) => {
      client2.emit('room:join', { roomId, playerName: 'Bob' }, (res) => {
        expect(res.success).toBe(true);
        expect(res.roomState?.players.length).toBe(2);
        resolve();
      });
    });

    // 3. Client 3 joins room
    await new Promise<void>((resolve) => {
      client3.emit('room:join', { roomId, playerName: 'Charlie' }, (res) => {
        expect(res.success).toBe(true);
        expect(res.roomState?.players.length).toBe(3);
        resolve();
      });
    });

    // 4. Test In-Room Chat: Alice sends chat message
    const chatPromise = new Promise<ChatMessage>((resolve) => {
      client2.on('chat:message', (msg) => {
        resolve(msg);
      });
    });

    await new Promise<void>((resolve) => {
      client1.emit('chat:send', { text: 'Chào Bob và Charlie!' }, (res) => {
        expect(res?.success).toBe(true);
        expect(res?.message?.content).toBe('Chào Bob và Charlie!');
        expect(res?.message?.playerName).toBe('Alice');
        expect(res?.message?.playerSymbol).toBe('X');
        resolve();
      });
    });

    const receivedChat = await chatPromise;
    expect(receivedChat.content).toBe('Chào Bob và Charlie!');
    expect(receivedChat.playerName).toBe('Alice');

    // 5. Client 4 tries to join -> room is full!
    await new Promise<void>((resolve) => {
      client4.emit('room:join', { roomId, playerName: 'David' }, (res) => {
        expect(res.success).toBe(false);
        expect(res.error).toContain('đủ số lượng');
        resolve();
      });
    });

    // 6. Client 2 & 3 toggle ready
    await new Promise<void>((resolve) => {
      client2.emit('player:ready', (res) => {
        expect(res?.success).toBe(true);
        resolve();
      });
    });

    await new Promise<void>((resolve) => {
      client3.emit('player:ready', (res) => {
        expect(res?.success).toBe(true);
        resolve();
      });
    });

    // 7. Client 1 starts game
    const gameStartPromise = new Promise<RoomState>((resolve) => {
      client2.on('game:started', (state) => {
        resolve(state);
      });
    });

    await new Promise<void>((resolve) => {
      client1.emit('game:start', (res) => {
        expect(res?.success).toBe(true);
        resolve();
      });
    });

    const startedState = await gameStartPromise;
    expect(startedState.status).toBe('PLAYING');
    expect(startedState.boardSize).toBe(30);
    expect(startedState.startingTurnIndex).toBe(0);
    expect(startedState.currentTurnIndex).toBe(0);

    // Map clients array
    const clients = [client1, client2, client3];
    const firstClient = clients[startedState.currentTurnIndex];
    const otherClient = clients[(startedState.currentTurnIndex + 1) % 3];

    // 8. Verify out-of-turn rejection
    await new Promise<void>((resolve) => {
      otherClient.emit('game:move', { row: 14, col: 1 }, (res) => {
        expect(res?.success).toBe(false);
        expect(res?.error).toContain('Chưa đến lượt');
        resolve();
      });
    });

    // First player makes move at center (14, 14)
    await new Promise<void>((resolve) => {
      firstClient.emit('game:move', { row: 14, col: 14 }, (res) => {
        expect(res?.success).toBe(true);
        resolve();
      });
    });

    // 9. Winning sequence: Player 0 places 5 in a row horizontally
    const winPromise = new Promise<{ winnerIndex: number; winningLine: [number, number][] }>((resolve) => {
      client3.on('game:won', (payload) => {
        resolve(payload);
      });
    });

    // Complete the round moves: Player 1, Player 2
    await new Promise<void>((r) => client2.emit('game:move', { row: 15, col: 14 }, () => r()));
    await new Promise<void>((r) => client3.emit('game:move', { row: 16, col: 14 }, () => r()));

    // Round 2
    await new Promise<void>((r) => client1.emit('game:move', { row: 14, col: 15 }, () => r()));
    await new Promise<void>((r) => client2.emit('game:move', { row: 15, col: 15 }, () => r()));
    await new Promise<void>((r) => client3.emit('game:move', { row: 16, col: 15 }, () => r()));

    // Round 3
    await new Promise<void>((r) => client1.emit('game:move', { row: 14, col: 16 }, () => r()));
    await new Promise<void>((r) => client2.emit('game:move', { row: 15, col: 16 }, () => r()));
    await new Promise<void>((r) => client3.emit('game:move', { row: 16, col: 16 }, () => r()));

    // Round 4
    await new Promise<void>((r) => client1.emit('game:move', { row: 14, col: 17 }, () => r()));
    await new Promise<void>((r) => client2.emit('game:move', { row: 15, col: 17 }, () => r()));
    await new Promise<void>((r) => client3.emit('game:move', { row: 16, col: 17 }, () => r()));

    // Round 5: Winning move for Player 0 at (14, 18)!
    await new Promise<void>((r) => client1.emit('game:move', { row: 14, col: 18 }, () => r()));

    const winPayload = await winPromise;
    expect(winPayload.winnerIndex).toBe(0);
    expect(winPayload.winningLine.length).toBe(5);

    // 10. Rematch
    await new Promise<void>((resolve) => {
      client1.emit('game:rematch', (res) => {
        expect(res?.success).toBe(true);
        resolve();
      });
    });
  });
});
