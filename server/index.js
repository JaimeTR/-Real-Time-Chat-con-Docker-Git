const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const initSocketModule = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Initialize Socket.io events and get online users map reference
const { users } = initSocketModule(io);

// Parse JSON bodies (required for API event injection)
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint for event injection (e.g., from PHP backend)
app.post('/api/notify', (req, res) => {
  const { message, to } = req.body;

  if (!message || typeof message !== 'string' || message.trim() === '') {
    return res.status(400).json({ success: false, error: 'Message content is required.' });
  }

  const trimmedMessage = message.trim();

  // If a specific recipient is targeted
  if (to && typeof to === 'string' && to.trim() !== '') {
    const targetUser = to.trim();
    const recipientSocketId = users.get(targetUser);

    if (recipientSocketId) {
      // Emit targeted system event to recipient
      io.to(recipientSocketId).emit('systemMessage', {
        message: trimmedMessage,
        to: targetUser,
        timestamp: new Date().toISOString()
      });
      console.log(`Targeted system notification sent to ${targetUser}: "${trimmedMessage}"`);
      return res.status(200).json({ success: true, delivered: true, recipient: targetUser });
    } else {
      console.log(`Targeted system notification to ${targetUser} failed: User offline`);
      return res.status(404).json({ success: false, error: `Recipient '${targetUser}' is offline.` });
    }
  }

  // Global system notification (broadcast to all connected clients)
  io.emit('systemMessage', {
    message: trimmedMessage,
    timestamp: new Date().toISOString()
  });
  
  console.log(`Global system notification broadcast: "${trimmedMessage}"`);
  return res.status(200).json({ success: true, delivered: true, broadcast: true });
});

// Fallback to index.html for single page application styling
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Socket.io Chat server running on port ${PORT}`);
});
