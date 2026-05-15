import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import { createServer } from "http";
import authRoutes from "./routes/authRoutes.js";
import roomRoutes from "./routes/roomroutes.js";
import { Server } from "socket.io";
import { initSocket } from "./socket/socketHandler.js";
dotenv.config();
connectDb();


const app = express();

app.use(express.json());
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
}));

app.use('/api/auth', authRoutes)
app.use('/api/rooms', roomRoutes)

const httpServer = createServer(app);

const io = new Server(httpServer, {
    cors: {
        origin: process.env.CLIENT_URL,
        credentials: true,
    },
});

initSocket(io)

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});