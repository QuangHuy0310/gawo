import { randomBytes, randomUUID } from 'node:crypto';
import type { Namespace } from 'socket.io';
import { newXiangqiGame, playXiangqiMove } from '../../shared/threeXiangqi.js';
import type { XiangqiClientEvents, XiangqiRoom, XiangqiServerEvents } from '../../shared/xiangqiRoom.js';

type Player = { name: string; token: string; socketId: string | null; timeout?: ReturnType<typeof setTimeout> };
type Room = { code: string; players: Player[]; game: XiangqiRoom['game']; votes: Set<string> };

export function setupXiangqi(namespace: Namespace<XiangqiClientEvents, XiangqiServerEvents>) {
  const rooms = new Map<string, Room>();
  function broadcast(room: Room) {
    const state: XiangqiRoom = {
      code: room.code,
      game: room.game,
      players: room.players.map(({ name, socketId }) => ({ name, connected: socketId !== null })),
    };
    room.players.forEach(({ socketId }, seat) => {
      if (socketId) namespace.to(socketId).emit('room', state, seat);
    });
  }

  function remove(room: Room, player: Player) {
    clearTimeout(player.timeout);
    if (room.game) {
      namespace.to(room.code).emit('closed', 'Phòng đã đóng vì có người rời ván.');
      namespace.in(room.code).socketsLeave(room.code);
      room.players.forEach((member) => clearTimeout(member.timeout));
      rooms.delete(room.code);
      return;
    }
    room.players.splice(room.players.indexOf(player), 1);
    if (room.players.length) broadcast(room);
    else rooms.delete(room.code);
  }

  namespace.on('connection', (socket) => {
    let room: Room | undefined;
    let player: Player | undefined;
    const isMember = () => room && player && rooms.get(room.code) === room
      && room.players.includes(player) && player.socketId === socket.id;

    socket.on('enter', (request, reply) => {
      if (typeof reply !== 'function' || !request || typeof request !== 'object') return;
      if (isMember()) return reply({ error: 'Bạn đã ở trong phòng.' });
      const code = typeof request.code === 'string' ? request.code.trim().toUpperCase() : '';
      if (request.token) {
        room = rooms.get(code);
        player = room?.players.find((member) => member.token === request.token);
        if (!room || !player) return reply({ error: 'Phiên chơi đã kết thúc.' });
        if (player.socketId) namespace.sockets.get(player.socketId)?.leave(code);
        clearTimeout(player.timeout);
        player.socketId = socket.id;
      } else {
        room = code ? rooms.get(code) : undefined;
        if (code && !room) return reply({ error: 'Không tìm thấy phòng.' });
        if (room && room.players.length >= 3) return reply({ error: 'Phòng đã đủ 3 người.' });
        if (!room) {
          let newCode: string;
          do { newCode = randomBytes(3).toString('hex').toUpperCase(); } while (rooms.has(newCode));
          room = { code: newCode, players: [], game: null, votes: new Set() };
          rooms.set(newCode, room);
        }
        const name = typeof request.name === 'string' ? request.name.trim().slice(0, 20) : '';
        player = { name: name || 'Người chơi', token: randomUUID(), socketId: socket.id };
        room.players.push(player);
        if (room.players.length === 3) room.game = newXiangqiGame();
      }
      socket.join(room.code);
      reply({ token: player.token, code: room.code });
      broadcast(room);
    });

    socket.on('move', (from, to) => {
      if (!room?.game || !player || !isMember() || room.players.some((member) => !member.socketId)) return;
      if (room.players[room.game.turn] !== player || !Number.isInteger(from) || !Number.isInteger(to)) return;
      const updated = playXiangqiMove(room.game, from, to);
      if (updated) {
        room.game = updated;
        broadcast(room);
      }
    });

    socket.on('rematch', () => {
      if (!room?.game?.result || !player || !isMember()) return;
      room.votes.add(player.token);
      if (room.votes.size === 3) {
        room.votes.clear();
        room.game = newXiangqiGame();
        broadcast(room);
      }
    });

    socket.on('leave', () => {
      if (!room || !player || !isMember()) return;
      socket.leave(room.code);
      remove(room, player);
      room = undefined;
      player = undefined;
    });

    socket.on('disconnect', () => {
      if (!room || !player || !isMember()) return;
      const disconnectedRoom = room;
      const disconnectedPlayer = player;
      player.socketId = null;
      player.timeout = setTimeout(() => remove(disconnectedRoom, disconnectedPlayer), 60_000);
      player.timeout.unref();
      broadcast(room);
    });
  });
}
