// backend/app.ts
import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app: Application = express();

// Middleware
app.use(cors());  // Enable CORS for frontend communication
app.use(express.json());  // Parse JSON request bodies
app.use(express.urlencoded({ extended: true }));  // Parse URL-encoded bodies

// Basic test route
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'OwnUrVoice API is running' });
});

export default app;