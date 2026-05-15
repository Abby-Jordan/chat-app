import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomroutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import { Server } from "socket.io";
import { initSocket } from "./socket/socketHandler.js";
import path from "path";
import { fileURLToPath } from "url";
dotenv.config();
connectDb();


const app = express();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)
app.use('/api/upload', uploadRoutes)

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
    },
});

initSocket(io)
app.set('io', io) // make io accessible in controllers via req.app.get('io')

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});