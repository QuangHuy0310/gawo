import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { ClientToServerEvents, ServerToClientEvents } from '../shared/types.js';
import { RoomManager } from './game/roomManager.js';
import { setupSocketHandlers } from './socket/socketHandler.js';
import { setupXiangqi } from './socket/xiangqiHandler.js';

const app = express();
const server = createServer(app);

const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';

app.use(cors());
app.use(express.json());

const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager();
setupSocketHandlers(io, roomManager);
setupXiangqi(io.of('/xiangqi'));

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Serve frontend build in production
const clientDistPath = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
} else {
  app.get('*', (_req, res) => {
    res.status(200).send('Caro Server is running in development mode.');
  });
}

function getLocalIpAddresses(): string[] {
  const interfaces = os.networkInterfaces();
  const addresses: string[] = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push(iface.address);
      }
    }
  }
  return addresses;
}

server.listen(PORT, HOST, () => {
  const localIps = getLocalIpAddresses();
  console.log(`\n======================================================`);
  console.log(`  Caro Game Server đang hoạt động!`);
  console.log(`  - Máy chủ (Local): http://localhost:${PORT}`);
  if (localIps.length > 0) {
    localIps.forEach((ip) => {
      console.log(`  - Mạng LAN (Chung Wi-Fi): http://${ip}:${PORT}`);
    });
    console.log(`  => Gửi link Mạng LAN phía trên cho bạn bè để chơi chung!`);
  } else {
    console.log(`  - Mạng LAN: http://<IP_MAY_BAN>:${PORT}`);
  }
  console.log(`======================================================\n`);
});

export { app, server, io, roomManager };
