const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Store game rooms
const rooms = new Map();
const waitingPlayers = [];

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Join existing room
  socket.on('joinRoom', ({ roomId, playerColor }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      socket.emit('error', { message: 'ห้องไม่พบหรือหมดอายุแล้ว' });
      return;
    }

    if (room.players.length >= 2) {
      socket.emit('error', { message: 'ห้องเต็มแล้ว' });
      return;
    }

    // Check if color is available
    const takenColors = room.players.map(p => p.color);
    if (takenColors.includes(playerColor)) {
      socket.emit('error', { message: `สี ${playerColor === 'white' ? 'ขาว' : 'ดำ'} ถูกเลือกแล้ว` });
      return;
    }

    const player = {
      id: socket.id,
      color: playerColor,
      name: `Player ${socket.id.slice(0, 6)}`
    };

    room.players.push(player);
    socket.join(roomId);
    socket.currentRoom = roomId;

    // Start game if 2 players
    if (room.players.length === 2) {
      room.status = 'playing';
      room.createdAt = Date.now();
      
      io.to(roomId).emit('gameStart', {
        roomId: roomId,
        players: room.players,
        turn: 'white',
        timeControl: room.timeControl
      });

      console.log(`Game started in room ${roomId}`);
    } else {
      // Send current state to the joining player
      socket.emit('waitingForPlayer', {
        roomId: roomId,
        yourColor: playerColor
      });
      
      // Notify host
      io.to(roomId).emit('playerJoined', {
        playerId: socket.id,
        color: playerColor
      });
    }
  });

  // Create new room
  socket.on('createRoom', ({ timeControl = 10 }) => {
    const roomId = uuidv4().slice(0, 8).toUpperCase();
    
    const room = {
      id: roomId,
      players: [{
        id: socket.id,
        color: 'white',
        name: `Player ${socket.id.slice(0, 6)}`
      }],
      status: 'waiting',
      timeControl: timeControl,
      createdAt: Date.now(),
      gameState: null
    };

    rooms.set(roomId, room);
    socket.join(roomId);
    socket.currentRoom = roomId;

    socket.emit('roomCreated', {
      roomId: roomId,
      yourColor: 'white',
      timeControl: timeControl
    });

    console.log(`Room created: ${roomId}`);
  });

  // Quick match
  socket.on('quickMatch', ({ timeControl = 10 }) => {
    // Check if there's a waiting player
    if (waitingPlayers.length > 0) {
      const opponent = waitingPlayers.pop();
      
      // Don't match with self
      if (opponent.id === socket.id) {
        waitingPlayers.push(opponent);
        socket.emit('searchingMatch', { searching: true });
        return;
      }

      const roomId = uuidv4().slice(0, 8).toUpperCase();
      
      const room = {
        id: roomId,
        players: [
          { id: opponent.id, color: 'white', name: `Player ${opponent.id.slice(0, 6)}` },
          { id: socket.id, color: 'black', name: `Player ${socket.id.slice(0, 6)}` }
        ],
        status: 'playing',
        timeControl: timeControl,
        createdAt: Date.now(),
        gameState: null
      };

      rooms.set(roomId, room);

      // Notify both players
      io.to(opponent.id).emit('matchFound', {
        roomId: roomId,
        yourColor: 'white',
        opponent: room.players[1],
        timeControl: timeControl
      });

      socket.emit('matchFound', {
        roomId: roomId,
        yourColor: 'black',
        opponent: room.players[0],
        timeControl: timeControl
      });

      // Start game
      setTimeout(() => {
        io.to(roomId).emit('gameStart', {
          roomId: roomId,
          players: room.players,
          turn: 'white',
          timeControl: timeControl
        });
      }, 1000);

      console.log(`Quick match created: ${roomId}`);
    } else {
      // Add to waiting queue
      waitingPlayers.push({
        id: socket.id,
        timeControl: timeControl,
        joinedAt: Date.now()
      });
      
      socket.emit('searchingMatch', { searching: true });
      console.log(`Player ${socket.id} added to quick match queue`);
    }
  });

  // Cancel quick match search
  socket.on('cancelQuickMatch', () => {
    const index = waitingPlayers.findIndex(p => p.id === socket.id);
    if (index > -1) {
      waitingPlayers.splice(index, 1);
      socket.emit('searchCancelled', {});
      console.log(`Player ${socket.id} cancelled quick match search`);
    }
  });

  // Make move
  socket.on('makeMove', ({ roomId, move, gameState }) => {
    const room = rooms.get(roomId);
    
    if (!room || room.status !== 'playing') {
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      return;
    }

    // Broadcast move to all players in room
    socket.to(roomId).emit('opponentMove', {
      move: move,
      gameState: gameState,
      turn: gameState.turn
    });

    console.log(`Move made in room ${roomId} by ${player.color}`);
  });

  // Resign
  socket.on('resign', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      return;
    }

    const winner = player.color === 'white' ? 'black' : 'white';
    
    io.to(roomId).emit('gameOver', {
      reason: 'resign',
      winner: winner,
      message: `${player.color === 'white' ? 'White' : 'Black'} ยอมแพ้แล้ว!`
    });

    // Clean up room after delay
    setTimeout(() => {
      rooms.delete(roomId);
    }, 60000);

    console.log(`Game over in room ${roomId}: ${player.color} resigned`);
  });

  // Draw offer
  socket.on('offerDraw', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    const player = room.players.find(p => p.id === socket.id);
    if (!player) {
      return;
    }

    socket.to(roomId).emit('drawOffer', {
      from: player.color
    });

    console.log(`Draw offered in room ${roomId} by ${player.color}`);
  });

  // Accept draw
  socket.on('acceptDraw', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    io.to(roomId).emit('gameOver', {
      reason: 'draw',
      winner: null,
      message: 'เสมอ!'
    });

    // Clean up room after delay
    setTimeout(() => {
      rooms.delete(roomId);
    }, 60000);

    console.log(`Game over in room ${roomId}: draw accepted`);
  });

  // Decline draw
  socket.on('declineDraw', ({ roomId }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    socket.to(roomId).emit('drawDeclined', {});

    console.log(`Draw declined in room ${roomId}`);
  });

  // Time out
  socket.on('timeout', ({ roomId, winner }) => {
    const room = rooms.get(roomId);
    
    if (!room) {
      return;
    }

    io.to(roomId).emit('gameOver', {
      reason: 'timeout',
      winner: winner,
      message: `หมดเวลา! ${winner === 'white' ? 'White' : 'Black'} ชนะ`
    });

    // Clean up room after delay
    setTimeout(() => {
      rooms.delete(roomId);
    }, 60000);

    console.log(`Game over in room ${roomId}: timeout`);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);

    // Remove from waiting queue
    const waitIndex = waitingPlayers.findIndex(p => p.id === socket.id);
    if (waitIndex > -1) {
      waitingPlayers.splice(waitIndex, 1);
    }

    // Handle active game
    if (socket.currentRoom) {
      const room = rooms.get(socket.currentRoom);
      
      if (room && room.status === 'playing') {
        const player = room.players.find(p => p.id === socket.id);
        
        if (player) {
          const winner = player.color === 'white' ? 'black' : 'white';
          
          io.to(socket.currentRoom).emit('gameOver', {
            reason: 'disconnect',
            winner: winner,
            message: `${player.color === 'white' ? 'White' : 'Black'} ออกจากเกม!`
          });

          // Clean up room
          setTimeout(() => {
            rooms.delete(socket.currentRoom);
          }, 60000);
        }
      }

      socket.leave(socket.currentRoom);
    }
  });
});

// Clean up old rooms every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [roomId, room] of rooms.entries()) {
    // Remove rooms older than 2 hours that are not in progress
    if (room.status === 'waiting' && now - room.createdAt > 2 * 60 * 60 * 1000) {
      rooms.delete(roomId);
      console.log(`Removed old waiting room: ${roomId}`);
    }
    
    // Remove completed games older than 1 hour
    if (room.status === 'finished' && now - room.finishedAt > 60 * 60 * 1000) {
      rooms.delete(roomId);
      console.log(`Removed old finished game: ${roomId}`);
    }
  }
  
  // Clean up waiting players older than 10 minutes
  const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
  for (let i = waitingPlayers.length - 1; i >= 0; i--) {
    if (waitingPlayers[i].joinedAt < tenMinutesAgo) {
      const removed = waitingPlayers.splice(i, 1)[0];
      console.log(`Removed stale waiting player: ${removed.id}`);
    }
  }
}, 5 * 60 * 1000);

server.listen(PORT, () => {
  console.log(`🎮 Chess server running on port ${PORT}`);
  console.log(`🌐 Local: http://localhost:${PORT}`);
  console.log(`🌍 Network: http://${getLocalIP()}:${PORT}`);
});

function getLocalIP() {
  const interfaces = require('os').networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}
