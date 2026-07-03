# Real-Time Chat Workspace (Express + Socket.io + Docker)

An elegant, highly-responsive chat workspace featuring real-time private messaging. This application features a premium user interface inspired by Slack and Microsoft Teams, designed using a dark/light contrasted color system and Google Fonts.

The development environment is fully containerized, reproducible, and secure.

---

## Architecture Overview

The system uses a client-server architecture with bidirectional real-time communication provided by Socket.io.

```
                  +----------------------------------+
                  |         Express Server           |
                  |     (Static File Hosting)        |
                  +----------------------------------+
                                   ^
                                   | HTTP Request / Static Files
                                   v
                  +----------------------------------+
                  |         Client Browser           |
                  |     (HTML5 + Vanilla CSS/JS)     |
                  +----------------------------------+
                                   ^
                                   | Socket.io Connection
                                   v
             ==============================================
             |          SOCKET.IO MESSAGING FLOW          |
             ==============================================
             
  [Client 1 (Alex)]                                   [Client 2 (Elena)]
         |                                                    |
         | --- 1. Register ('register', 'Alex') ---------->   |
         | <--- 2. Acknowledge Registration (Success) ------  |
         |                                                    |
         | <--- 3. Broadcast online list ('updateUserList') --| <--- Connected
         |                                                    |
         | --- 4. Send Message ('privateMessage') --------->  |
         |    { to: 'Elena', message: 'Hello!' }              |
         |                                                    |
         |                                                    | (Server routes using
         |                                                    |  Elena's socket.id)
         |                                                    v
         | <------------------------------------------------- | --- 5. Deliver Message
         |                                                    |    { from: 'Alex', ... }
```

### Key Messaging Protocols:
1. **User Registration (`register` event)**: When a client logs in, they submit a username. The server validates if the username is alphanumeric and not already taken. If valid, the server associates the socket session with the username and stores it in an active map.
2. **User Directory (`updateUserList` event)**: On connection, registration, or disconnection, the server broadcasts the updated array of active usernames to all connected sockets.
3. **Private Messaging Routing (`privateMessage` event)**: A client sends a message targeting a specific recipient. The server retrieves the recipient's socket ID from its map and targets them directly using `io.to(socketId).emit('privateMessage')`.
4. **Offline Resilience**: If a message is sent to an offline user, the server replies with an error callback, which is handled gracefully by the sender's client.

---

## Docker & Containerization

The application is containerized for maximum reproducibility using an optimized multi-stage concept:

* **Base Image**: Uses `node:20-alpine` to ensure minimal image footprint and reduce vulnerability surface.
* **Dependency Installation**: Runs `npm ci --only=production` which uses `package-lock.json` directly for deterministic builds and excludes development dependencies.
* **Security Hardening**: Swaps execution ownership to the pre-configured non-root `node` user instead of leaving container processes running as `root`.
* **Compose Orchestration**: Uses `docker-compose.yml` to define port forwarding (`3000:3000`), volume binding, and configuration parameters.

---

## Setup & Running the Application

### Method 1: Running with Docker (Recommended)

1. Ensure you have **Docker** and **Docker Compose** installed.
2. Clone the repository and navigate to the project directory:
   ```bash
   cd socket-chat
   ```
3. Build and launch the container in the background:
   ```bash
   docker compose up -d --build
   ```
4. Access the workspace at: **`http://localhost:3000`**
5. To view container logs:
   ```bash
   docker compose logs -f
   ```
6. To shut down the container:
   ```bash
   docker compose down
   ```

### Method 2: Running Locally (Node.js required)

1. Ensure **Node.js (v18+)** is installed.
2. Install production dependencies:
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   npm start
   ```
4. Access the workspace at: **`http://localhost:3000`**

---

## Authentication & Credentials

To test the application, use any of the following pre-configured credentials:

| Username | Password | Role |
| :--- | :--- | :--- |
| `JaimeTR` | `admin123` | Administrator / Candidate |
| `ElenaVance` | `admin123` | Senior Product Designer |
| `JordanSmith` | `admin123` | Tech Lead |
| `AlexRivera` | `admin123` | Support Engineer |

---

## How to Test Private Messaging

1. Open a browser tab at `http://localhost:3000` and login as **`JaimeTR`** with password **`admin123`**.
2. Open a second **incognito** browser tab or a different browser at `http://localhost:3000` and login as **`ElenaVance`** with password **`admin123`**.
3. In both screens, you will immediately see the other user appear in the **Recent Messages** list under the sidebar.
4. Click on **Elena Vance** in Jaime's sidebar. Type a message and hit send.
5. In Elena's browser window, see the message arrive in real-time. Click on **JaimeTR** in Elena's sidebar to reply privately!

---

## How to Test PHP Event Injection (Parte 2)

We have implemented an API REST endpoint on the Node server and a native PHP script (`notificador.php`) to trigger live notifications.

### 1. HTTP Endpoint Details:
* **Route**: `POST http://localhost:3000/api/notify`
* **Headers**: `Content-Type: application/json`
* **JSON Body**:
  ```json
  {
    "message": "Server Alert: Disk space at 95%",
    "to": "JaimeTR" 
  }
  ```
  *(Note: The `to` parameter is optional. If provided, it targets that specific online user; if omitted, it broadcasts globally to all online users).*

### 2. Testing the Notifier via CLI:
Run the script from your terminal:
```bash
# A. Send a global broadcast message
php notificador.php "Server Alert: CPU Load is at 92%"

# B. Send a targeted message to a specific user (must be online)
php notificador.php "Important: Password update required" JaimeTR
```

### 3. Testing the Notifier via Browser:
If you have a local PHP web server, copy `notificador.php` to its web root and open:
* **Broadcast**: `http://localhost/notificador.php?message=Alert+from+browser`
* **Targeted**: `http://localhost/notificador.php?message=Secure+Notice&to=JaimeTR`
*(The script renders a styled HTML card indicating if the injection succeeded or failed).*

---

## Git Workflow Details

We follow a clean, atomic Git committing strategy where each task is committed step-by-step:

* **First Commit**: Created an empty commit to initialize the repository.
* **Task 2**: Created core Node files, package dependencies, and `.gitignore`.
* **Task 3**: Implemented the main Express + Socket.io server logic.
* **Task 4**: Designed and implemented the high-fidelity user interface.
* **Task 5**: Created the Dockerfile and docker-compose configurations.
* **Task 6**: Added full documentation (this README) and finalized commits.

### Push to GitHub/GitLab

To link this repository to your remote cloud hosting:

```bash
# 1. Add your remote repository origin URL
git remote add origin <YOUR_REMOTE_REPOSITORY_URL>

# 2. Rename the current branch to main (if master)
git branch -M main

# 3. Push your commits to the cloud
git push -u origin main
```
