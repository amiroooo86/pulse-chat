import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import './database/db.js';
import auth from './routes/auth.js';
import users from './routes/users.js';
import groups from './routes/groups.js';
import conversations from './routes/conversations.js';
import messages from './routes/messages.js';
import upload from './routes/upload.js';
import pulsy from './routes/pulsy.js';
import { registerSockets } from './sockets/chat.js';
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}
const app = express();
const server = http.createServer(app);
const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const uploadDirectory = path.resolve(process.env.UPLOAD_DIR || './uploads');
const io = new Server(server, {
  cors: {
    origin: clientUrl
  }
});
app.set('io', io);
registerSockets(io);
app.use(cors({
  origin: clientUrl
}));
app.use(express.json({
  limit: '1mb'
}));
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 180,
  standardHeaders: true,
  legacyHeaders: false
}));
app.use('/uploads', express.static(uploadDirectory));
app.get('/api/health', (req, res) => res.json({
  ok: true
}));
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/groups', groups);
app.use('/api/conversations', conversations);
app.use('/api/messages', messages);
app.use('/api/upload', upload);
app.use('/api/pulsy', pulsy);
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({
    message: 'Internal server error'
  });
});
const port = Number(process.env.PORT || 3000);
server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
