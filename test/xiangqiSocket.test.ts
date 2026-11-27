import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io, type Socket } from 'socket.io-client';
import { expect, it } from 'vitest';
import { setupXiangqi } from '../src/server/socket/xiangqiHandler.js';
import type { XiangqiClientEvents, XiangqiRoom, XiangqiServerEvents } from '../src/shared/xiangqiRoom.js';

type Client = Socket<XiangqiServerEvents, XiangqiClientEvents>;

it('starts a shared board with three seats and restores a disconnected seat', async () => {
  const http = createServer();
  const server = new Server(http);
  setupXiangqi(server.of('/xiangqi'));
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${(http.address() as AddressInfo).port}/xiangqi`;
  const clients: Client[] = [];

  const connect = async () => {
    const client: Client = io(url, { forceNew: true, transports: ['websocket'] });
    clients.push(client);
    await new Promise<void>((resolve, reject) => {
      client.once('connect', resolve);
      client.once('connect_error', reject);
    });
    return client;
  };
  const enter = (client: Client, request: { code?: string; token?: string; name?: string }) =>
    new Promise<{ code: string; token: string }>((resolve, reject) => {
      client.emit('enter', request, (reply) => 'error' in reply ? reject(new Error(reply.error)) : resolve(reply));
    });
  const nextState = (client: Client) => new Promise<[XiangqiRoom, number]>((resolve) =>
    client.once('room', (room, seat) => resolve([room, seat])));

  try {
    const [wei, shu, wu] = await Promise.all([connect(), connect(), connect()]);
    const { code } = await enter(wei, { name: 'An' });
    const shuEntry = await enter(shu, { code, name: 'Bình' });
    const started = nextState(wu);
    await enter(wu, { code, name: 'Chi' });
    const [initial, seat] = await started;
    expect(seat).toBe(2);
    const startingSide = initial.game!.turn;
    expect([0, 1, 2]).toContain(startingSide);

    const moved = nextState(wu);
    const from = startingSide * 45 + 27;
    const to = startingSide * 45 + 36;
    [wei, shu, wu][startingSide].emit('move', from, to);
    expect((await moved)[0].game?.lastMove).toEqual({ from, to });

    const paused = nextState(wu);
    shu.disconnect();
    expect((await paused)[0].players[1].connected).toBe(false);
    const replacement = await connect();
    const restored = nextState(replacement);
    await enter(replacement, shuEntry);
    const [resumed, restoredSeat] = await restored;
    expect(restoredSeat).toBe(1);
    expect(resumed.game?.turn).toBe((startingSide + 1) % 3);
    expect(resumed.players.map((player) => player.connected)).toEqual([true, true, true]);
  } finally {
    clients.forEach((client) => client.disconnect());
    await server.close();
  }
});
