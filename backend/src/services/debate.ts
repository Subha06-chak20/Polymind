import { v4 as uuidv4 } from 'uuid';
import { OpenRouterClient } from './openrouter.js';
import type { 
  DebateConfig, 
  DebateRound, 
  ModelResponse, 
  SessionStatus,
  StreamEvent,
  AIModel
} from '../types/index.js';

// System prompts for debate phases
const PLAIN_TEXT_FORMAT_RULES = `Formatting requirements:
- Use plain text only.
- Do not use Markdown syntax (no headings, bold markers, code fences, or tables).
- Do not use LaTeX/MathJax notation.
- Write math in simple inline text, for example: x = 5 m, t = 0.5 s.
- Keep output readable with short paragraphs and numbered lines like "1) ...".`;

const INITIAL_RESPONSE_PROMPT = `You are participating in a multi-AI debate. A question or problem will be presented to you and several other AI models. 

Your task is to provide your best, most thoughtful response. Consider the question carefully and provide a comprehensive answer.

Remember: This is a collaborative debate. Your goal is not to "win" but to arrive at the best possible answer through reasoned discussion.

${PLAIN_TEXT_FORMAT_RULES}`;

const CRITIQUE_PROMPT = `You are in a multi-AI debate. Below you will see the original question and responses from all participating models (including your own previous response).

Your task is to:
1. Identify the strongest points from each response
2. Identify weaknesses, errors, or gaps in reasoning
3. Note areas of agreement and disagreement between models
4. Suggest improvements or alternative perspectives

Be constructive and specific in your critique. Focus on improving the collective understanding.

${PLAIN_TEXT_FORMAT_RULES}`;

const REFINEMENT_PROMPT = `You are in a multi-AI debate. Based on the critiques you've received and the critiques of other models, refine your original response.

Your task is to:
1. Address valid criticisms
2. Incorporate insights from other models
3. Strengthen your arguments
4. Correct any errors
5. Provide a more complete and accurate response

Your refined response should be better than your original, incorporating the best ideas from the debate while maintaining your unique perspective.

${PLAIN_TEXT_FORMAT_RULES}`;

const SYNTHESIS_PROMPT = `You are the final synthesizer in a multi-AI debate. Your task is to create the best possible final answer by synthesizing the insights from all models across all rounds of debate.

Review all the responses, critiques, and refinements. Create a comprehensive final answer that:
1. Incorporates the best insights from all models
2. Resolves disagreements where possible
3. Acknowledges remaining uncertainties
4. Provides the most accurate and helpful response possible

The final answer should represent the collective wisdom of all participating models.

${PLAIN_TEXT_FORMAT_RULES}`;

export class DebateOrchestrator {
  private client: OpenRouterClient;
  private config: DebateConfig;
  private status: SessionStatus;
  private cancelled: boolean = false;
  private modelInfo: Map<string, AIModel> = new Map();

  constructor(client: OpenRouterClient, config: DebateConfig) {
    this.client = client;
    this.config = config;
    this.status = {
      sessionId: config.sessionId,
      status: 'pending',
      progress: {
        current: 0,
        total: config.rounds * 3 + 1, // Initial + (critique + refine) per round + synthesis
        stage: 'Initializing'
      }
    };
  }

  getStatus(): SessionStatus {
    return this.status;
  }

  cancel(): void {
    this.cancelled = true;
    this.status.status = 'cancelled';
  }

  private updateProgress(current: number, stage: string): void {
    this.status.progress = {
      current,
      total: this.config.rounds * 3 + 1,
      stage
    };
  }

  private async fetchModelInfo(): Promise<void> {
    console.log('fetchModelInfo: Fetching models from OpenRouter...');
    const models = await this.client.getModels();
    console.log('fetchModelInfo: Received', models.length, 'models');
    for (const model of models) {
      this.modelInfo.set(model.id, {
        id: model.id,
        name: model.name || model.id.split('/').pop() || model.id,
        provider: model.id.split('/')[0] || 'unknown',
        contextLength: model.context_length || 4096,
        pricing: {
          prompt: parseFloat(model.pricing?.prompt || '0'),
          completion: parseFloat(model.pricing?.completion || '0')
        }
      });
    }
  }

  // Streaming generator for debate
  async *runDebate(prompt: string): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      this.status.status = 'running';
      
      // Fetch model info
      await this.fetchModelInfo();
      
      const rounds: DebateRound[] = [];
      let progressCounter = 0;

      // Phase 1: Initial responses
      this.updateProgress(++progressCounter, 'Gathering initial responses');
      yield {
        event: 'round-start',
        data: { round: 0, phase: 'initial', models: this.config.models }
      };

      const initialResponses = await this.gatherResponses(prompt, INITIAL_RESPONSE_PROMPT);
      
      for (const response of initialResponses) {
        yield {
          event: 'model-response',
          data: { 
            modelId: response.modelId, 
            modelName: response.modelName,
            content: response.content 
          }
        };
      }

      yield {
        event: 'round-complete',
        data: { round: 0, responses: initialResponses }
      };

      // Debate rounds
      for (let round = 1; round <= this.config.rounds; round++) {
        if (this.cancelled) {
          yield { event: 'error', data: { error: 'Debate cancelled' } };
          return;
        }

        this.updateProgress(++progressCounter, `Round ${round}: Critiques`);
        yield {
          event: 'round-start',
          data: { round, phase: 'critique' }
        };

        // Critique phase
        const critiques = await this.gatherCritiques(prompt, initialResponses, round);
        for (const critique of critiques) {
          yield {
            event: 'model-critique',
            data: { 
              modelId: critique.modelId,
              modelName: critique.modelName,
              content: critique.content 
            }
          };
        }

        this.updateProgress(++progressCounter, `Round ${round}: Refinements`);
        yield {
          event: 'round-start',
          data: { round, phase: 'refinement' }
        };

        // Refinement phase
        const refinements = await this.gatherRefinements(prompt, initialResponses, critiques, round);
        for (const refinement of refinements) {
          yield {
            event: 'model-refinement',
            data: { 
              modelId: refinement.modelId,
              modelName: refinement.modelName,
              content: refinement.content 
            }
          };
        }

        rounds.push({
          roundNumber: round,
          responses: initialResponses,
          critiques,
          refinements
        });

        yield {
          event: 'round-complete',
          data: { round, critiques, refinements }
        };
      }

      // Final synthesis
      this.updateProgress(++progressCounter, 'Final synthesis');
      const finalAnswer = await this.synthesizeFinalAnswer(prompt, rounds);
      
      yield {
        event: 'final-result',
        data: { 
          finalAnswer,
          rounds,
          participatingModels: this.config.models.map(id => this.modelInfo.get(id)).filter(Boolean) as AIModel[]
        }
      };

      this.status.status = 'completed';
    } catch (error) {
      this.status.status = 'error';
      this.status.error = error instanceof Error ? error.message : 'Unknown error';
      yield { 
        event: 'error', 
        data: { error: error instanceof Error ? error.message : 'Unknown error' } 
      };
    }
  }

  // Synchronous version for non-streaming
  async runDebateSync(prompt: string): Promise<{ prompt: string; rounds: DebateRound[]; finalAnswer: string; participatingModels: AIModel[] }> {
    console.log('runDebateSync: Starting...');
    console.log('runDebateSync: Fetching model info...');
    await this.fetchModelInfo();
    console.log('runDebateSync: Model info fetched, models found:', this.modelInfo.size);
    
    const rounds: DebateRound[] = [];
    let currentResponses: ModelResponse[] = [];

    // Initial responses
    console.log('runDebateSync: Gathering initial responses...');
    currentResponses = await this.gatherResponses(prompt, INITIAL_RESPONSE_PROMPT);
    console.log('runDebateSync: Initial responses received:', currentResponses.length);

    // Debate rounds
    for (let round = 1; round <= this.config.rounds; round++) {
      if (this.cancelled) {
        throw new Error('Debate cancelled');
      }

      const critiques = await this.gatherCritiques(prompt, currentResponses, round);
      const refinements = await this.gatherRefinements(prompt, currentResponses, critiques, round);
      
      rounds.push({
        roundNumber: round,
        responses: currentResponses,
        critiques,
        refinements
      });

      // Use refinements as the basis for next round
      currentResponses = refinements;
    }

    // Final synthesis
    const finalAnswer = await this.synthesizeFinalAnswer(prompt, rounds);

    return {
      prompt,
      rounds,
      finalAnswer,
      participatingModels: this.config.models.map(id => this.modelInfo.get(id)).filter(Boolean) as AIModel[]
    };
  }

  private async gatherResponses(prompt: string, systemPrompt: string): Promise<ModelResponse[]> {
    console.log('gatherResponses: Starting for', this.config.models.length, 'models');
    const responses: ModelResponse[] = [];
    
    // Run all model calls in parallel
    const promises = this.config.models.map(async (modelId) => {
      console.log('gatherResponses: Calling model', modelId);
      const content = await this.client.call({
        model: modelId,
        systemPrompt,
        userPrompt: prompt
      });
      
      return {
        modelId,
        modelName: this.modelInfo.get(modelId)?.name || modelId,
        content,
        timestamp: new Date()
      };
    });

    const results = await Promise.all(promises);
    responses.push(...results);
    
    return responses;
  }

  private async gatherCritiques(
    prompt: string, 
    responses: ModelResponse[], 
    round: number
  ): Promise<ModelResponse[]> {
    const critiques: ModelResponse[] = [];
    
    // Format all responses for critique
    const responsesText = responses.map(r => 
      `=== ${r.modelName} ===\n${r.content}`
    ).join('\n\n');

    const critiquePrompt = `Original Question:\n${prompt}\n\nResponses from all models:\n${responsesText}\n\nProvide your critique of these responses.`;

    const promises = this.config.models.map(async (modelId) => {
      const content = await this.client.call({
        model: modelId,
        systemPrompt: CRITIQUE_PROMPT,
        userPrompt: critiquePrompt
      });
      
      return {
        modelId,
        modelName: this.modelInfo.get(modelId)?.name || modelId,
        content,
        round,
        timestamp: new Date()
      };
    });

    const results = await Promise.all(promises);
    critiques.push(...results);
    
    return critiques;
  }

  private async gatherRefinements(
    prompt: string,
    responses: ModelResponse[],
    critiques: ModelResponse[],
    round: number
  ): Promise<ModelResponse[]> {
    const refinements: ModelResponse[] = [];
    
    // Format critiques for each model
    const critiquesText = critiques.map(c => 
      `=== Critique by ${c.modelName} ===\n${c.content}`
    ).join('\n\n');

    const refinementPrompt = `Original Question:\n${prompt}\n\nYour original response:\n${responses.find(r => r.modelId === this.config.models[0])?.content || 'N/A'}\n\nCritiques from all models:\n${critiquesText}\n\nProvide your refined response.`;

    const promises = this.config.models.map(async (modelId) => {
      const ownResponse = responses.find(r => r.modelId === modelId);
      const specificPrompt = `Original Question:\n${prompt}\n\nYour original response:\n${ownResponse?.content || 'N/A'}\n\nCritiques from all models:\n${critiquesText}\n\nProvide your refined response.`;
      
      const content = await this.client.call({
        model: modelId,
        systemPrompt: REFINEMENT_PROMPT,
        userPrompt: specificPrompt
      });
      
      return {
        modelId,
        modelName: this.modelInfo.get(modelId)?.name || modelId,
        content,
        round,
        timestamp: new Date()
      };
    });

    const results = await Promise.all(promises);
    refinements.push(...results);
    
    return refinements;
  }

  private async synthesizeFinalAnswer(prompt: string, rounds: DebateRound[]): Promise<string> {
    // Collect all refinements from the last round
    const lastRound = rounds[rounds.length - 1];
    const allRefinements = lastRound.refinements.map(r => 
      `=== ${r.modelName} ===\n${r.content}`
    ).join('\n\n');

    const synthesisPrompt = `Original Question:\n${prompt}\n\nFinal refined responses from all models:\n${allRefinements}\n\nSynthesize the best final answer.`;

    // Use the first model for synthesis (or could use a specific synthesis model)
    const synthesizer = this.config.models[0];
    
    return await this.client.call({
      model: synthesizer,
      systemPrompt: SYNTHESIS_PROMPT,
      userPrompt: synthesisPrompt,
      maxTokens: 4000
    });
  }
}
