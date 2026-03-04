import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OpenRouterClient } from '../services/openrouter.js';
import { VotingOrchestrator } from '../services/voting.js';
import type { VotingRequest, VotingResponse } from '../types/index.js';

const router = Router();

// Store active sessions (in production, use Redis or similar)
const sessions = new Map<string, VotingOrchestrator>();

// POST /api/voting - Start a new voting session
router.post('/', async (req, res) => {
  try {
    const apiKey = req.openRouterKey;
    const { 
      prompt, 
      models, 
      systemPrompt,
      stream = false 
    } = req.body as VotingRequest;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!models || !Array.isArray(models) || models.length < 2) {
      return res.status(400).json({ error: 'At least 2 models are required for voting' });
    }

    if (models.length > 30) {
      return res.status(400).json({ error: 'Maximum 30 models allowed for voting' });
    }

    const sessionId = uuidv4();
    const client = new OpenRouterClient(apiKey);
    const orchestrator = new VotingOrchestrator(client, {
      sessionId,
      models,
      systemPrompt,
      stream
    });

    sessions.set(sessionId, orchestrator);

    if (stream) {
      // Set up SSE for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const event of orchestrator.runVoting(prompt)) {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (error) {
        res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming response
      const result = await orchestrator.runVotingSync(prompt);
      res.json({
        success: true,
        sessionId,
        ...result
      } as VotingResponse);
    }
  } catch (error) {
    console.error('Error in voting:', error);
    res.status(500).json({
      error: 'Failed to run voting',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/voting/:sessionId - Get voting session status
router.get('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  res.json({
    success: true,
    sessionId,
    status: session.getStatus()
  });
});

// DELETE /api/voting/:sessionId - Cancel/delete a voting session
router.delete('/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }

  session.cancel();
  sessions.delete(sessionId);

  res.json({
    success: true,
    message: 'Session cancelled'
  });
});

export default router;
