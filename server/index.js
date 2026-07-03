const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Base de datos de credenciales simulada para las pruebas
const USER_DB = {
  'JaimeTR': 'admin123',
  'ElenaVance': 'admin123',
  'JordanSmith': 'admin123',
  'AlexRivera': 'admin123'
};

// Mapa para almacenar usuarios en línea: username -> socket.id
const users = new Map();

io.on('connection', (socket) => {
  console.log(`A user connected: ${socket.id}`);

  // Registro de sesión y validación de credenciales
  socket.on('register', (credentials, callback) => {
    if (!credentials || typeof credentials !== 'object') {
      return callback({ success: false, error: 'Invalid registration payload.' });
    }

    const { username, password } = credentials;

    if (!username || typeof username !== 'string' || !password || typeof password !== 'string') {
      return callback({ success: false, error: 'Username and password are required.' });
    }
    
    const trimmedUsername = username.trim();
    
    if (trimmedUsername === '') {
      return callback({ success: false, error: 'Username cannot be empty.' });
    }

    // Validar contraseña
    if (!USER_DB.hasOwnProperty(trimmedUsername) || USER_DB[trimmedUsername] !== password) {
      return callback({ success: false, error: 'Invalid username or password.' });
    }

    // Validar si el usuario ya está conectado
    if (users.has(trimmedUsername)) {
      return callback({ success: false, error: 'User is already logged in elsewhere.' });
    }

    socket.username = trimmedUsername;
    users.set(trimmedUsername, socket.id);
    
    console.log(`User registered: ${trimmedUsername} (${socket.id})`);
    callback({ success: true, username: trimmedUsername });

    // Notificar la lista actualizada a todos los clientes
    io.emit('updateUserList', Array.from(users.keys()));
  });

  // Manejo de mensajes privados
  socket.on('privateMessage', ({ to, message }, callback) => {
    if (!socket.username) {
      return callback({ success: false, error: 'You are not registered.' });
    }

    if (!to || !message || message.trim() === '') {
      return callback({ success: false, error: 'Invalid recipient or empty message.' });
    }

    const recipientSocketId = users.get(to);
    
    if (recipientSocketId) {
      const msgPayload = {
        from: socket.username,
        to: to,
        message: message.trim(),
        timestamp: new Date().toISOString()
      };
      
      // Enviar directamente al socket del destinatario
      io.to(recipientSocketId).emit('privateMessage', msgPayload);
      
      console.log(`Private message from ${socket.username} to ${to}: "${message.trim()}"`);
      if (callback) callback({ success: true, payload: msgPayload });
    } else {
      if (callback) callback({ success: false, error: 'User is offline or does not exist.' });
    }
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    if (socket.username) {
      users.delete(socket.username);
      io.emit('updateUserList', Array.from(users.keys()));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.io Chat server running on port ${PORT}`);
});