# ✨ Full-Stack Real-Time WebChat

A modern, real-time web chat application featuring direct messaging, group chats, an interactive AI companion, profile customization, and secure JWT-based authentication. 

Built beautifully with **React + Vite**, **Node.js/Express**, **MongoDB**, and **Socket.io**.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

---

## 🚀 Features
- **Real-Time Messaging:** Instant websocket communication via Socket.io.
- **Group Chats:** Create and manage group chats instantly.
- **AI Companion:** Comes pre-configured with an "AI Bot" powered by Groq/LLaMa that naturally interacts in individual and group chats.
- **Profile Customization:** Support for setting Name, Password, and Avatar URL.
- **Secure Authentication:** JWT-based user lifecycle & encrypted passwords directly over Axios middleware.
- **Forgot Password:** Local reset flows.
- **Dynamic UI/UX:** Complete bespoke, modern aesthetic designed natively with CSS—no bloated frameworks.

---

## 📂 Project Structure

```bash
📦 chat-app
 ┣ 📂 client       # React / Vite frontend
 ┃ ┣ 📂 src        # Components, UI, contexts
 ┃ ┗ 📜 .env       # Environment config
 ┣ 📂 server       # Node.js / Express / Socket.io backend
 ┃ ┣ 📂 controllers
 ┃ ┣ 📂 models
 ┃ ┣ 📂 socket
 ┃ ┗ 📜 .env       # Backend secrets (MONGO_URI, JWT_SECRET, GROQ_API_KEY)
 ┗ 📜 README.md
```

---

## 🛠️ Local Development Setup

To run this project locally, you will need two terminal windows open. 

### 1. Backend Server Setup
```bash
cd server
yarn install

# Ensure you have a .env file created inside /server
# MONGO_URI=your_mongodb_connection_string
# JWT_SECRET=your_jwt_secret
# GROQ_API_KEY=your_groq_api_key
# PORT=5000
# CLIENT_URL=http://localhost:5173

yarn dev
```

### 2. Frontend Client Setup
```bash
cd client
yarn install

# Create a .env file inside /client with the following:
# VITE_SERVER_URL=http://localhost:5000

yarn dev
```

The application should now be accessible at `http://localhost:5173`.

---

## 🚀 Deployment Guide (100% Free Tier)

Deploying both sides requires zero cost if you use standard robust free tiers like **Vercel** and **Render**.

### Step 1: Frontend (Vercel)
Vercel is perfect for deploying Vite + React. 
1. Create a GitHub repository and push this full `chat-app` directory. Make sure `.env` files and `node_modules` are NOT pushed (they are ignored by default).
2. Go to **vercel.com** and click **Create New Project**.
3. Import your GitHub repository.
4. **Root Directory:** Edit to `/client`.
5. **Environment Variables:** Add `VITE_SERVER_URL` and temporarily set it to `https://your-backend-live-url.onrender.com` (You will deploy the backend next, so you can update this value after).
6. Click **Deploy**.

### Step 2: Backend (Render)
Render's Web Services offer native continuous deployment from GitHub for Node apps.
1. Go to **render.com** and create a New **Web Service**.
2. Connect your GitHub repository.
3. **Root Directory:** Edit to `server`.
4. **Build Command:** `yarn install`
5. **Start Command:** `node index.js`
6. **Environment Variables:**
   - Add all key-values from your local `server/.env`.
   - Specifically update `CLIENT_URL` to point to the frontend Vercel URL you created above!
7. Click **Create Web Service**.

**(Important)**: Once Render finishes deploying the backend, copy the Web Service URL. Go back to Vercel properties, update `VITE_SERVER_URL` to match it precisely, and trigger a **redeploy** on Vercel so the frontend bakes the proper URL in!

---

*For production MongoDB, use the FREE Tier of MongoDB Atlas (M0 Cluster).*
