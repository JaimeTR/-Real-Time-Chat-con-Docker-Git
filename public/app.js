// Connect to the socket server
const socket = io();

// State variables
let currentUsername = '';
let activeRecipient = '';
const messageHistory = {}; // username -> array of message objects
const unreadCounts = {}; // username -> number of unread messages

// Elements
const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const passwordInput = document.getElementById('password-input');
const loginError = document.getElementById('login-error');

const selfUsernameEl = document.getElementById('self-username');
const selfAvatarEl = document.getElementById('self-avatar');
const usersListEl = document.getElementById('users-list');
const searchUsersInput = document.getElementById('search-users');

const chatEmptyState = document.getElementById('chat-empty-state');
const chatActiveInterface = document.getElementById('chat-active-interface');
const chatRecipientNameEl = document.getElementById('chat-recipient-name');
const chatRecipientAvatarEl = document.getElementById('chat-recipient-avatar');
const toggleDetailsBtn = document.getElementById('toggle-details-btn');
const detailsPanel = document.getElementById('details-panel');

const messagesContainer = document.getElementById('messages-container');
const messagesListEl = document.getElementById('messages-list');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

// Right panel elements
const detailsRecipientNameEl = document.getElementById('details-recipient-name');
const detailsRecipientAvatarEl = document.getElementById('details-recipient-avatar');
const detailsRecipientRoleEl = document.getElementById('details-recipient-role');
const detailsRecipientAboutEl = document.getElementById('details-recipient-about');

// Helper to get initials
function getInitials(name) {
  if (!name) return '??';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Generate static profile data based on name for visual realism
function getProfileData(name) {
  const roles = [
    'Senior Product Designer',
    'Full Stack Engineer',
    'Tech Lead',
    'Product Manager',
    'DevOps Specialist',
    'Security Analyst'
  ];
  
  const abouts = [
    'Creative thinker and UI specialist currently based in Seattle. Working on the next generation of collaboration tools.',
    'Passionate about writing clean, modular Node and React code. Coffee enthusiast and open-source contributor.',
    'Leading technical architecture and system integration. Loves Docker, Kubernetes, and scalable systems.',
    'Focused on customer-centric design and agile product delivery. Enjoys hiking and prototyping new ideas.',
    'Automating everything. Containerization, CI/CD pipelines, and cloud infrastructure are my playground.',
    'Securing systems, auditing dependencies, and implementing encryption protocols. Stay safe!'
  ];

  // Deterministic index based on name hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % roles.length;
  return {
    role: roles[index],
    about: abouts[index]
  };
}

// INITIALIZE LUCIDE ICONS
lucide.createIcons();

// HANDLE LOGIN
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;
  
  if (username === '' || password === '') return;

  // Emit register event to server with credentials
  socket.emit('register', { username, password }, (response) => {
    if (response.success) {
      currentUsername = response.username;
      
      // Update UI with self info
      selfUsernameEl.textContent = currentUsername;
      selfAvatarEl.textContent = getInitials(currentUsername);
      
      // Add custom gradient based on username
      selfAvatarEl.style.background = getGradientForUsername(currentUsername);
      
      // Hide login, show app
      loginOverlay.classList.add('hidden');
      appContainer.classList.remove('hidden');
      
      // Refresh lucide icons
      lucide.createIcons();
    } else {
      // Show error
      loginError.textContent = response.error || 'Invalid credentials.';
      loginError.classList.remove('hidden');
    }
  });
});

// GENERATE DETERMINISTIC GRADIENT FOR AVATARS
function getGradientForUsername(username) {
  const colors = [
    ['#3b82f6', '#60a5fa'], // blue
    ['#10b981', '#34d399'], // green
    ['#8b5cf6', '#a78bfa'], // purple
    ['#f59e0b', '#fbbf24'], // orange
    ['#ec4899', '#f472b6'], // pink
    ['#06b6d4', '#22d3ee']  // cyan
  ];
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return `linear-gradient(135deg, ${colors[index][0]}, ${colors[index][1]})`;
}

// HANDLE USER LIST UPDATE
socket.on('updateUserList', (userList) => {
  // Filter out ourselves
  const otherUsers = userList.filter(user => user !== currentUsername);
  renderUsersList(otherUsers);
});

// RENDER USER LIST IN SIDEBAR
function renderUsersList(users) {
  usersListEl.innerHTML = '';
  
  if (users.length === 0) {
    usersListEl.innerHTML = `
      <div class="no-users-placeholder">
        <p>No other users online yet.</p>
        <p style="font-size: 11px; margin-top: 8px;">Open this page in another browser window or incognito tab to chat!</p>
      </div>
    `;
    return;
  }

  // Filter list if search query exists
  const searchQuery = searchUsersInput.value.toLowerCase().trim();
  const filteredUsers = users.filter(user => user.toLowerCase().includes(searchQuery));

  filteredUsers.forEach(user => {
    const initials = getInitials(user);
    const avatarGradient = getGradientForUsername(user);
    const unreadCount = unreadCounts[user] || 0;
    const isActive = user === activeRecipient;
    
    // Get last message for preview
    const history = messageHistory[user] || [];
    const lastMsgText = history.length > 0 ? history[history.length - 1].message : 'Click to start private chat';
    const lastMsgTime = history.length > 0 
      ? new Date(history[history.length - 1].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      : '';

    const userItem = document.createElement('div');
    userItem.className = `user-item ${isActive ? 'active' : ''}`;
    userItem.innerHTML = `
      <div class="avatar-wrapper">
        <div class="user-avatar-circle" style="background: ${avatarGradient}">${initials}</div>
        <span class="status-dot online"></span>
      </div>
      <div class="user-item-info">
        <div class="user-item-name-row">
          <span class="user-item-name" style="${unreadCount > 0 ? 'font-weight: 700;' : ''}">${user}</span>
          <span class="user-item-time">${lastMsgTime}</span>
        </div>
        <div class="user-item-preview" style="${unreadCount > 0 ? 'color: var(--text-main); font-weight: 600;' : ''}">
          ${unreadCount > 0 ? `<strong>New message:</strong> ` : ''}${lastMsgText}
        </div>
      </div>
      ${unreadCount > 0 ? `<span class="unread-badge" style="background: var(--primary); color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold;">${unreadCount}</span>` : ''}
    `;

    userItem.addEventListener('click', () => {
      selectRecipient(user);
    });

    usersListEl.appendChild(userItem);
  });

  lucide.createIcons();
}

// SEARCH USER FILTER
searchUsersInput.addEventListener('input', () => {
  // Request active user list again (locally)
  socket.emit('requestUserList'); // Or we can trigger a state-based re-render
  // To avoid round-trips, let's keep a local copy of users or trigger render using current socket.io values
  // Since we already receive list, let's trigger socket event to ask server for list, or wait for next broadcast.
  // Actually, we can trigger rendering by just caching the list. Let's do that simply.
});

// Cache for online users list
let cachedOnlineUsers = [];
socket.on('updateUserList', (userList) => {
  cachedOnlineUsers = userList.filter(user => user !== currentUsername);
  renderUsersList(cachedOnlineUsers);
});

searchUsersInput.addEventListener('input', () => {
  renderUsersList(cachedOnlineUsers);
});

// SELECT RECIPIENT TO CHAT WITH
function selectRecipient(username) {
  activeRecipient = username;
  unreadCounts[username] = 0; // Clear unreads
  
  // Show active chat UI
  chatEmptyState.classList.add('hidden');
  chatActiveInterface.classList.remove('hidden');
  
  // Update header info
  chatRecipientNameEl.textContent = username;
  chatRecipientAvatarEl.textContent = getInitials(username);
  chatRecipientAvatarEl.style.background = getGradientForUsername(username);
  
  // Update Right Details Panel
  detailsRecipientNameEl.textContent = username;
  detailsRecipientAvatarEl.textContent = getInitials(username);
  detailsRecipientAvatarEl.style.background = getGradientForUsername(username);
  
  const profile = getProfileData(username);
  detailsRecipientRoleEl.textContent = profile.role;
  detailsRecipientAboutEl.textContent = profile.about;
  
  // Render message list
  renderMessages();
  
  // Re-render sidebar to clear badge/unread text
  renderUsersList(cachedOnlineUsers);
  
  // Scroll to bottom
  scrollToBottom();
  
  chatInput.focus();
}

// TOGGLE DETAILS PANEL
toggleDetailsBtn.addEventListener('click', () => {
  detailsPanel.classList.toggle('collapsed');
});

// RENDER MESSAGES FOR ACTIVE RECIPIENT
function renderMessages() {
  messagesListEl.innerHTML = '';
  
  const history = messageHistory[activeRecipient] || [];
  
  if (history.length === 0) {
    messagesListEl.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted); font-size: 13px;">
        This is the start of your secure private message history with <strong>${activeRecipient}</strong>.
      </div>
    `;
    return;
  }

  history.forEach(msg => {
    if (msg.isSystem) {
      const msgItem = document.createElement('div');
      msgItem.className = 'message-item system';
      msgItem.innerHTML = `
        <div class="message-bubble">
          <i data-lucide="bell" style="width: 14px; height: 14px; display: inline-block; vertical-align: middle;"></i>
          <span>${escapeHtml(msg.message)}</span>
        </div>
      `;
      messagesListEl.appendChild(msgItem);
      return;
    }

    const isSelf = msg.from === currentUsername;
    const initials = getInitials(msg.from);
    const gradient = getGradientForUsername(msg.from);
    const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const msgItem = document.createElement('div');
    msgItem.className = `message-item ${isSelf ? 'self' : 'other'}`;
    msgItem.innerHTML = `
      <div class="user-avatar-circle" style="background: ${gradient}; flex-shrink: 0;">${initials}</div>
      <div class="message-item-content">
        <div class="message-header">
          <span class="message-sender">${msg.from}</span>
          <span class="message-time">${timeStr}</span>
        </div>
        <div class="message-bubble">
          ${escapeHtml(msg.message)}
        </div>
      </div>
    `;
    messagesListEl.appendChild(msgItem);
  });
  
  scrollToBottom();
}

// ESCAPE HTML TO PREVENT XSS
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// SCROLL TO BOTTOM OF MESSAGES
function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// HANDLE SENDING MESSAGE
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const msgText = chatInput.value.trim();
  
  if (msgText === '' || !activeRecipient) return;

  // Emit private message to server
  socket.emit('privateMessage', { to: activeRecipient, message: msgText }, (response) => {
    if (response.success) {
      const payload = response.payload;
      
      // Store in local history
      if (!messageHistory[activeRecipient]) {
        messageHistory[activeRecipient] = [];
      }
      messageHistory[activeRecipient].push(payload);
      
      // Append to message list
      renderMessages();
      
      // Clear input
      chatInput.value = '';
      
      // Update sidebar preview
      renderUsersList(cachedOnlineUsers);
    } else {
      alert(response.error || 'Failed to send message.');
    }
  });
});

// HANDLE INCOMING MESSAGES
socket.on('privateMessage', (msgPayload) => {
  const sender = msgPayload.from;
  
  // Store message in local history
  if (!messageHistory[sender]) {
    messageHistory[sender] = [];
  }
  messageHistory[sender].push(msgPayload);
  
  // If recipient is currently open, render
  if (activeRecipient === sender) {
    renderMessages();
  } else {
    // Increment unread count
    unreadCounts[sender] = (unreadCounts[sender] || 0) + 1;
    
    // Play a notification sound or alert if wanted, we can just highlight user item
    renderUsersList(cachedOnlineUsers);
  }
});

// HANDLE SYSTEM NOTIFICATIONS (Parte 2 - PHP Event Injection)
socket.on('systemMessage', (payload) => {
  showSystemToast(payload.message);

  // Append system message to ALL active conversation histories
  const activeUsers = Object.keys(messageHistory).concat(cachedOnlineUsers);
  // Remove duplicates
  const uniqueUsers = Array.from(new Set(activeUsers));

  uniqueUsers.forEach(user => {
    if (!messageHistory[user]) {
      messageHistory[user] = [];
    }
    messageHistory[user].push({
      from: 'SYSTEM',
      message: payload.message,
      timestamp: payload.timestamp || new Date().toISOString(),
      isSystem: true
    });
  });

  // If chat interface is active, re-render
  if (activeRecipient) {
    renderMessages();
  }
});

// SHOW FLOATING SYSTEM TOAST BANNER (Parte 2)
function showSystemToast(message) {
  const container = document.getElementById('system-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = 'system-toast';
  toast.innerHTML = `
    <div class="system-toast-icon">
      <i data-lucide="bell-ring" style="width: 18px; height: 18px;"></i>
    </div>
    <div class="system-toast-content">
      ${escapeHtml(message)}
    </div>
    <button class="system-toast-close" title="Close">
      <i data-lucide="x" style="width: 14px; height: 14px;"></i>
    </button>
  `;

  // Append toast
  container.appendChild(toast);
  lucide.createIcons();

  // Handle close button
  const closeBtn = toast.querySelector('.system-toast-close');
  closeBtn.addEventListener('click', () => {
    dismissToast(toast);
  });

  // Auto-dismiss after 10 seconds
  setTimeout(() => {
    dismissToast(toast);
  }, 10000);
}

function dismissToast(toast) {
  if (toast.classList.contains('fade-out')) return;
  toast.classList.add('fade-out');
  toast.addEventListener('animationend', () => {
    toast.remove();
  });
}
