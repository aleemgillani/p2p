const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const rooms = {};

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  const io = new Server(httpServer, {
    cors: { origin: '*' },
    maxHttpBufferSize: 1e8,
    // Increase ping timeout to avoid premature disconnects during transfers
    pingTimeout: 120000,
    pingInterval: 25000
  });

  io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    socket.on('create-room', (roomId) => {
      rooms[roomId] = { members: [socket.id], createdAt: Date.now() };
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.emit('room-created', { roomId });
      console.log(`[Server] Room ${roomId} created by ${socket.id}`);
    });

    socket.on('join-room', (roomId) => {
      if (!rooms[roomId]) {
        console.log(`[Server] Room ${roomId} not found`);
        socket.emit('room-not-found');
        return;
      }
      if (rooms[roomId].members.length >= 2) {
        socket.emit('room-full');
        return;
      }
      rooms[roomId].members.push(socket.id);
      socket.join(roomId);
      socket.data.roomId = roomId;
      console.log(`[Server] ${socket.id} joined room ${roomId} (${rooms[roomId].members.length} members)`);
      if (rooms[roomId].members.length === 2) {
        // Notify sender that receiver has joined
        io.to(rooms[roomId].members[0]).emit('receiver-joined', { roomId });
        // Notify receiver that they have joined
        socket.emit('joined-as-receiver', { roomId });
      }
    });

    // Relay signaling messages
    socket.on('offer', ({ roomId, offer }) => {
      console.log(`[Server] Relaying offer in room ${roomId}`);
      socket.to(roomId).emit('offer', { offer });
    });

    socket.on('answer', ({ roomId, answer }) => {
      console.log(`[Server] Relaying answer in room ${roomId}`);
      socket.to(roomId).emit('answer', { answer });
    });

    socket.on('ice-candidate', ({ roomId, candidate }) => {
      socket.to(roomId).emit('ice-candidate', { candidate });
    });

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      console.log(`[Server] Disconnected: ${socket.id} from room ${roomId}`);
      if (roomId && rooms[roomId]) {
        rooms[roomId].members = rooms[roomId].members.filter(id => id !== socket.id);
        socket.to(roomId).emit('peer-disconnected');
        if (rooms[roomId].members.length === 0) {
          delete rooms[roomId];
          console.log(`[Server] Room ${roomId} deleted (empty)`);
        }
      }
    });
  });

  // Clean up stale rooms every 10 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [roomId, room] of Object.entries(rooms)) {
      // Remove rooms older than 2 hours with no members
      if (room.members.length === 0 || now - room.createdAt > 2 * 60 * 60 * 1000) {
        delete rooms[roomId];
        console.log(`[Server] Cleaned up stale room: ${roomId}`);
      }
    }
  }, 10 * 60 * 1000);

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});