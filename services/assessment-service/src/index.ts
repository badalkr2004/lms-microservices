import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { Server } from 'socket.io';
import { createServer } from 'http';

dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? process.env.FRONTEND_URL : "*",
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

const PORT = process.env.ASSESSMENT_SERVICE_PORT || 3004;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Socket.IO for real-time proctoring
io.on('connection', (socket) => {
  console.log('Proctoring client connected:', socket.id);
  
  socket.on('join-assessment', (data) => {
    socket.join(`assessment-${data.assessmentId}`);
    console.log(`User ${data.userId} joined assessment ${data.assessmentId}`);
  });

  socket.on('proctoring-data', (data) => {
    // Process proctoring data (webcam snapshots, AI analysis, etc.)
    console.log('Received proctoring data:', data.type);
    // TODO: Implement YOLO-based violation detection
  });

  socket.on('disconnect', () => {
    console.log('Proctoring client disconnected:', socket.id);
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Assessment Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedClients: io.engine.clientsCount,
  });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Assessment service error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

server.listen(PORT, () => {
  console.log(`📝 Assessment Service running on port ${PORT}`);
  console.log(`🔒 Proctoring WebSocket server ready`);
});
