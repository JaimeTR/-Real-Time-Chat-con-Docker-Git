// Map to store connected users: username -> socket.id
const users = new Map();

// Hardcoded user database for credential validation
const USER_DB = {
  'JaimeTR': 'admin123',
  'ElenaVance': 'admin123',
  'JordanSmith': 'admin123',
  'AlexRivera': 'admin123'
};

module.exports = function(io) {
  io.on('connection', (socket) => {
    console.log(`A user connected: ${socket.id}`);

    // Handle registration of a username and password
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

      // Validate credentials against hardcoded database
      if (!USER_DB.hasOwnProperty(trimmedUsername) || USER_DB[trimmedUsername] !== password) {
        return callback({ success: false, error: 'Invalid username or password.' });
      }

      if (users.has(trimmedUsername)) {
        return callback({ success: false, error: 'User is already logged in elsewhere.' });
      }

      // Assign username to socket session
      socket.username = trimmedUsername;
      users.set(trimmedUsername, socket.id);
      
      console.log(`User registered: ${trimmedUsername} (${socket.id})`);
      
      // Acknowledge registration success
      callback({ success: true, username: trimmedUsername });

      // Broadcast the updated list of online users to all clients
      io.emit('updateUserList', Array.from(users.keys()));
    });

    // Handle private messages
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
        
        // Emit to recipient
        io.to(recipientSocketId).emit('privateMessage', msgPayload);
        
        console.log(`Private message from ${socket.username} to ${to}: "${message.trim()}"`);
        if (callback) callback({ success: true, payload: msgPayload });
      } else {
        console.log(`Private message from ${socket.username} to ${to} failed: User offline`);
        if (callback) callback({ success: false, error: 'User is offline or does not exist.' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      if (socket.username) {
        users.delete(socket.username);
        console.log(`User removed: ${socket.username}`);
        // Broadcast the updated list of online users to all clients
        io.emit('updateUserList', Array.from(users.keys()));
      }
    });
  });

  // Return reference to users map so index.js REST router can query it
  return { users };
};
