import { Router } from 'express';
import { OpenRouterClient } from '../services/openrouter.js';
import type { AIModel } from '../types/index.js';

const router = Router();

// Curated list of recommended models (will be filtered from available models)
const RECOMMENDED_MODELS = [
  // MiniMax
  'minimax/minimax-m2.5',

  // Moonshot AI
  'moonshotai/kimi-k2.5',
  'moonshotai/kimi-k2-thinking',

  // Z.ai
  'z-ai/glm-5',
  'z-ai/glm-4.7',

  // Baidu
  'baidu/ernie-4.5-vl-424b-a47b',

  // ByteDance Seed
  'bytedance-seed/seed-2.0-mini',
  'bytedance-seed/seed-1.6',

  // DeepSeek
  'deepseek/deepseek-v3.2',
  'deepseek/deepseek-r1',

  // Anthropic
  'anthropic/claude-sonnet-4.6',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.6',
  'anthropic/claude-opus-4.5',

  // Qwen
  'qwen/qwen3.5-35b-a3b',
  'qwen/qwen3.5-397b-a17b',
  'qwen/qwen3-235b-a22b',
  'qwen/qwen-max',
  'qwen/qwen3-max-thinking',
  'qwen/qwen3-max',

  // OpenAI
  'openai/gpt-5.3-chat',
  'openai/gpt-5.2-chat',
  'openai/gpt-5.1-chat',
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/o3-pro',
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',

  // Meta Llama
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',

  // Perplexity
  'perplexity/sonar-pro',

  // Mistral
  'mistralai/devstral-2512',
  'mistralai/mistral-large-2512',

  // Nvidia (Free)
  'nvidia/nemotron-3-nano-30b-a3b:free',

  // OpenAI (Free)
  'openai/gpt-oss-120b:free',
  'openai/gpt-oss-20b:free',

  // Meta (Free)
  'meta-llama/llama-3.3-70b-instruct:free',

  // Xiaomi
  'xiaomi/mimo-v2-flash',

  // Google
  'google/gemini-3.1-flash-lite-preview',
  'google/gemini-3.1-pro-preview',
];

// GET /api/models - List available models
router.get('/', async (req, res) => {
  try {
    const apiKey = req.openRouterKey;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    const client = new OpenRouterClient(apiKey);
    const allModels = await client.getModels();

    // Filter to only recommended models and format for frontend
    const models: AIModel[] = allModels
      .filter(model => RECOMMENDED_MODELS.includes(model.id))
      .map(model => ({
        id: model.id,
        name: model.name || model.id.split('/').pop() || model.id,
        provider: model.id.split('/')[0] || 'unknown',
        contextLength: model.context_length || 4096,
        pricing: {
          prompt: parseFloat(String(model.pricing?.prompt || '0')),
          completion: parseFloat(String(model.pricing?.completion || '0'))
        }
      }))
      .sort((a, b) => {
        // Sort by provider, then by name
        const providerCompare = a.provider.localeCompare(b.provider);
        if (providerCompare !== 0) return providerCompare;
        return a.name.localeCompare(b.name);
      });

    res.json({
      success: true,
      count: models.length,
      models
    });
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({
      error: 'Failed to fetch models',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// GET /api/models/all - List all available models (unfiltered)
router.get('/all', async (req, res) => {
  try {
    const apiKey = req.openRouterKey;

    if (!apiKey) {
      return res.status(401).json({ error: 'API key is required' });
    }

    const client = new OpenRouterClient(apiKey);
    const allModels = await client.getModels();

    const models: AIModel[] = allModels.map(model => ({
      id: model.id,
      name: model.name || model.id.split('/').pop() || model.id,
      provider: model.id.split('/')[0] || 'unknown',
      contextLength: model.context_length || 4096,
      pricing: {
        prompt: parseFloat(String(model.pricing?.prompt || '0')),
        completion: parseFloat(String(model.pricing?.completion || '0'))
      }
    }));

    res.json({
      success: true,
      count: models.length,
      models
    });
  } catch (error) {
    console.error('Error fetching all models:', error);
    res.status(500).json({
      error: 'Failed to fetch models',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
