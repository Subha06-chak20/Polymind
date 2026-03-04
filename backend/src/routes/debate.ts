import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { OpenRouterClient } from '../services/openrouter.js';
import { DebateOrchestrator } from '../services/debate.js';
import type { DebateRequest, DebateResponse } from '../types/index.js';

const router = Router();

// Store active sessions (in production, use Redis or similar)
const sessions = new Map<string, DebateOrchestrator>();

// POST /api/debate - Start a new debate session
router.post('/', async (req, res) => {
  console.log('Received debate request:', JSON.stringify(req.body, null, 2));
  const apiKey = req.openRouterKey;
  const {
    prompt,
    models,
    rounds = 3,
    systemPrompt,
    stream = false
  } = req.body as DebateRequest;
  let sessionId: string | null = null;
  let orchestrator: DebateOrchestrator | null = null;
  let isCancelled = false;

  const cancelDebate = (reason: string) => {
    if (isCancelled) return;
    isCancelled = true;
    console.warn(`Cancelling debate${sessionId ? ` ${sessionId}` : ''}: ${reason}`);
    if (orchestrator) {
      orchestrator.cancel();
    }
  };

  const onRequestAborted = () => {
    cancelDebate('request aborted by client');
  };

  const onResponseClose = () => {
    if (!res.writableEnded) {
      cancelDebate('response closed before completion');
    }
  };

  req.on('aborted', onRequestAborted);
  res.on('close', onResponseClose);

  try {
    console.log('API Key present:', !!apiKey);
    console.log('Prompt:', prompt?.substring(0, 100));
    console.log('Models:', models);

    if (!apiKey) {
      console.log('Error: API key missing');
      return res.status(401).json({ error: 'API key is required' });
    }

    if (!prompt || typeof prompt !== 'string') {
      console.log('Error: Prompt missing or invalid');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    if (!models || !Array.isArray(models) || models.length < 2) {
      console.log('Error: Models invalid or insufficient');
      return res.status(400).json({ error: 'At least 2 models are required for debate' });
    }

    if (models.length > 10) {
      console.log('Error: Too many models');
      return res.status(400).json({ error: 'Maximum 10 models allowed for debate' });
    }

    sessionId = uuidv4();
    console.log('Creating orchestrator with sessionId:', sessionId);

    const client = new OpenRouterClient(apiKey);
    orchestrator = new DebateOrchestrator(client, {
      sessionId,
      models,
      rounds,
      systemPrompt,
      stream
    });

    if (isCancelled) {
      orchestrator.cancel();
    }

    sessions.set(sessionId, orchestrator);

    if (stream) {
      // Set up SSE for streaming
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      try {
        for await (const event of orchestrator.runDebate(prompt)) {
          if (isCancelled || res.writableEnded) {
            break;
          }
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }

        if (!res.writableEnded) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } catch (error) {
        if (isCancelled) {
          console.warn(`Streaming debate cancelled${sessionId ? ` ${sessionId}` : ''}`);
          if (!res.writableEnded) {
            res.end();
          }
        } else if (!res.writableEnded) {
          res.write(`data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`);
          res.end();
        }
      }
    } else {
      // Non-streaming response
      console.log('Starting non-streaming debate...');

      const result = await orchestrator.runDebateSync(prompt);
      console.log('Debate completed, sending response...');
      const response = {
        success: true,
        sessionId,
        ...result
      } as DebateResponse;
      console.log('Response size:', JSON.stringify(response).length, 'characters');
      res.json(response);
      console.log('Response sent successfully');
    }
  } catch (error) {
    const isDebateCancelled = error instanceof Error && error.message === 'Debate cancelled';

    if (isDebateCancelled) {
      console.warn(`Debate cancelled${sessionId ? ` ${sessionId}` : ''}`);
      if (!res.headersSent && !res.writableEnded) {
        res.status(499).json({
          error: 'Debate cancelled',
          message: 'Request was cancelled before completion'
        });
      }
      return;
    }

    console.error('Error in debate:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    if (!res.headersSent && !res.writableEnded) {
      res.status(500).json({
        error: 'Failed to run debate',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  } finally {
    req.off('aborted', onRequestAborted);
    res.off('close', onResponseClose);
    if (sessionId) {
      sessions.delete(sessionId);
    }
  }
});

// GET /api/debate/:sessionId - Get debate session status
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

// DELETE /api/debate/:sessionId - Cancel/delete a debate session
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
