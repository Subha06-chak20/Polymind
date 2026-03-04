import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

// Import routes
import modelsRouter from './routes/models.js';
import debateRouter from './routes/debate.js';
import votingRouter from './routes/voting.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// API Key validation middleware
app.use((req, res, next) => {
  // Skip validation for health check
  if (req.path === '/health') {
    return next();
  }
  
  // Debug: Log all headers
  console.log('Headers received:', JSON.stringify(req.headers, null, 2));
  
  // Check for API key in headers or body
  const apiKey = req.headers['x-openrouter-key'] as string || req.body?.apiKey;
  console.log('API key from header:', req.headers['x-openrouter-key']);
  console.log('API key from body:', req.body?.apiKey);
  
  if (!apiKey && req.path.startsWith('/api/')) {
    return res.status(401).json({ 
      error: 'OpenRouter API key is required. Provide it in X-OpenRouter-Key header or apiKey in request body.' 
    });
  }
  
  // Store API key for use in route handlers
  req.openRouterKey = apiKey;
  next();
});

// Routes
app.use('/api/models', modelsRouter);
app.use('/api/debate', debateRouter);
app.use('/api/voting', votingRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Polymind Backend Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API endpoints:`);
  console.log(`  - GET  /api/models - List available models`);
  console.log(`  - POST /api/debate - Start a debate session`);
  console.log(`  - POST /api/voting - Start a voting session`);
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      openRouterKey?: string;
    }
  }
}
