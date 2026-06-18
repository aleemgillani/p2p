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
    maxHttpBufferSize: 1e8
  });

  io.on('connection', (socket) => {
    console.log('Connected:', socket.id);

    socket.on('create-room', (roomId) => {
      rooms[roomId] = [socket.id];
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.emit('room-created', { roomId });
    });

    socket.on('join-room', (roomId) => {
      if (!rooms[roomId]) rooms[roomId] = [];
      if (rooms[roomId].length >= 2) { socket.emit('room-full'); return; }
      rooms[roomId].push(socket.id);
      socket.join(roomId);
      socket.data.roomId = roomId;
      if (rooms[roomId].length === 2) {
        io.to(rooms[roomId][0]).emit('receiver-joined', { roomId });
        socket.emit('joined-as-receiver', { roomId });
      }
    });

    socket.on('offer', ({ roomId, offer }) => socket.to(roomId).emit('offer', { offer }));
    socket.on('answer', ({ roomId, answer }) => socket.to(roomId).emit('answer', { answer }));
    socket.on('ice-candidate', ({ roomId, candidate }) => socket.to(roomId).emit('ice-candidate', { candidate }));

    socket.on('disconnect', () => {
      const roomId = socket.data.roomId;
      if (roomId && rooms[roomId]) {
        rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
        socket.to(roomId).emit('peer-disconnected');
        if (rooms[roomId].length === 0) delete rooms[roomId];
      }
    });
  });

  httpServer.listen(3000, () => {
    console.log('> Ready on http://localhost:3000');
  });
});