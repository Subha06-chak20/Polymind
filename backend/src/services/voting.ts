import { v4 as uuidv4 } from 'uuid';
import { OpenRouterClient } from './openrouter.js';
import type { 
  VotingConfig, 
  VotingEntry, 
  Evaluation,
  SessionStatus,
  StreamEvent,
  AIModel
} from '../types/index.js';

// Grok model ID for evaluation
const GROK_MODEL = 'x-ai/grok-4.1-fast';

// System prompts
const PLAIN_TEXT_FORMAT_RULES = `Formatting requirements:
- Use plain text only.
- Do not use Markdown syntax (no headings, bold markers, code fences, or tables).
- Do not use LaTeX/MathJax notation.
- Write math in simple inline text, for example: x = 5 m, t = 0.5 s.
- Keep output readable with short paragraphs and numbered lines like "1) ...".`;

const RESPONSE_PROMPT = `You are participating in an AI response competition. A question or problem will be presented to you.

Your task is to provide your best, most thoughtful response. This response will be evaluated anonymously alongside responses from other AI models.

Focus on:
1. Accuracy and completeness
2. Clear reasoning and explanation
3. Practical applicability
4. Addressing the core question directly

${PLAIN_TEXT_FORMAT_RULES}`;

const EVALUATION_PROMPT = `You are an impartial judge evaluating AI responses. You will be presented with a question and several anonymous responses (labeled only as Response A, B, C, etc.).

Your task is to:
1. Evaluate each response on accuracy, completeness, clarity, and helpfulness
2. Identify the best response
3. Explain your reasoning

Important rules:
- You MUST NOT favor any response based on style alone - focus on content quality
- You MUST select exactly ONE winner
- You MUST provide clear reasoning for your choice
- Responses are anonymous - judge only by content quality

Format your response exactly as plain text:
Evaluation:
[Brief evaluation of each response]

Winner: [Single letter only, such as A or B]

Reasoning:
[Your reasoning for the selection]

${PLAIN_TEXT_FORMAT_RULES}`;

export class VotingOrchestrator {
  private client: OpenRouterClient;
  private config: VotingConfig;
  private status: SessionStatus;
  private cancelled: boolean = false;
  private modelInfo: Map<string, AIModel> = new Map();

  constructor(client: OpenRouterClient, config: VotingConfig) {
    this.client = client;
    this.config = config;
    this.status = {
      sessionId: config.sessionId,
      status: 'pending',
      progress: {
        current: 0,
        total: config.models.length + 2, // Responses + evaluation + result
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
      total: this.config.models.length + 2,
      stage
    };
  }

  private async fetchModelInfo(): Promise<void> {
    const models = await this.client.getModels();
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

  // Streaming generator for voting
  async *runVoting(prompt: string): AsyncGenerator<StreamEvent, void, unknown> {
    try {
      this.status.status = 'running';
      
      // Fetch model info
      await this.fetchModelInfo();
      
      let progressCounter = 0;

      // Phase 1: Gather responses from all models
      this.updateProgress(++progressCounter, 'Gathering responses');
      
      const entries: VotingEntry[] = [];
      const responseMap = new Map<string, string>(); // anonymous ID -> model ID

      // Generate anonymous IDs
      const anonymousIds = this.config.models.map(() => 
        String.fromCharCode(65 + Math.floor(Math.random() * 26)) + uuidv4().slice(0, 4)
      );

      // Gather all responses in parallel
      const responsePromises = this.config.models.map(async (modelId, index) => {
        const content = await this.client.call({
          model: modelId,
          systemPrompt: RESPONSE_PROMPT,
          userPrompt: prompt
        });
        
        const anonymousId = anonymousIds[index];
        responseMap.set(anonymousId, modelId);
        
        return {
          id: anonymousId,
          modelId,
          content
        };
      });

      const responses = await Promise.all(responsePromises);
      entries.push(...responses);

      // Yield each entry
      for (const entry of entries) {
        this.updateProgress(++progressCounter, `Response from ${this.modelInfo.get(entry.modelId)?.name || entry.modelId}`);
        yield {
          event: 'voting-entry',
          data: { 
            anonymousId: entry.id,
            content: entry.content 
          }
        };
      }

      if (this.cancelled) {
        yield { event: 'error', data: { error: 'Voting cancelled' } };
        return;
      }

      // Phase 2: Evaluation by Grok
      this.updateProgress(++progressCounter, 'Evaluating responses');
      yield {
        event: 'evaluation',
        data: { status: 'Evaluating all responses anonymously' }
      };

      const evaluation = await this.evaluateResponses(prompt, entries);
      
      // Find winner
      const winnerId = evaluation.selectedEntryId;
      const winnerModelId = responseMap.get(winnerId) || '';
      const winnerEntry = entries.find(e => e.id === winnerId);

      if (!winnerEntry) {
        throw new Error('Could not find winning entry');
      }

      // Phase 3: Announce winner
      yield {
        event: 'winner-announcement',
        data: {
          winnerAnonymousId: winnerId,
          winnerModelId,
          winnerModelName: this.modelInfo.get(winnerModelId)?.name || winnerModelId,
          reasoning: evaluation.reasoning
        }
      };

      yield {
        event: 'final-result',
        data: {
          prompt,
          entries: entries.map(e => ({
            ...e,
            modelName: this.modelInfo.get(e.modelId)?.name || e.modelId
          })),
          evaluations: [evaluation],
          winner: winnerEntry,
          winnerModelId,
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
  async runVotingSync(prompt: string): Promise<{
    prompt: string;
    entries: VotingEntry[];
    evaluations: Evaluation[];
    winner: VotingEntry;
    winnerModelId: string;
    participatingModels: AIModel[];
  }> {
    await this.fetchModelInfo();
    
    // Gather responses
    const entries: VotingEntry[] = [];
    const responseMap = new Map<string, string>();

    const anonymousIds = this.config.models.map(() => 
      String.fromCharCode(65 + Math.floor(Math.random() * 26)) + uuidv4().slice(0, 4)
    );

    const responsePromises = this.config.models.map(async (modelId, index) => {
      const content = await this.client.call({
        model: modelId,
        systemPrompt: RESPONSE_PROMPT,
        userPrompt: prompt
      });
      
      const anonymousId = anonymousIds[index];
      responseMap.set(anonymousId, modelId);
      
      return {
        id: anonymousId,
        modelId,
        content
      };
    });

    const responses = await Promise.all(responsePromises);
    entries.push(...responses);

    if (this.cancelled) {
      throw new Error('Voting cancelled');
    }

    // Evaluate
    const evaluation = await this.evaluateResponses(prompt, entries);
    
    // Find winner
    const winnerId = evaluation.selectedEntryId;
    const winnerModelId = responseMap.get(winnerId) || '';
    const winnerEntry = entries.find(e => e.id === winnerId);

    if (!winnerEntry) {
      throw new Error('Could not find winning entry');
    }

    return {
      prompt,
      entries,
      evaluations: [evaluation],
      winner: winnerEntry,
      winnerModelId,
      participatingModels: this.config.models.map(id => this.modelInfo.get(id)).filter(Boolean) as AIModel[]
    };
  }

  private async evaluateResponses(prompt: string, entries: VotingEntry[]): Promise<Evaluation> {
    // Format entries for evaluation (anonymously)
    const responsesText = entries.map((entry, index) => {
      const letter = String.fromCharCode(65 + index); // A, B, C, ...
      return `=== Response ${letter} ===\n${entry.content}`;
    }).join('\n\n');

    const evaluationPrompt = `Question:\n${prompt}\n\n${responsesText}\n\nEvaluate these responses and select the best one.`;

    const grokResponse = await this.client.call({
      model: GROK_MODEL,
      systemPrompt: EVALUATION_PROMPT,
      userPrompt: evaluationPrompt,
      maxTokens: 2000
    });

    // Parse the response to extract winner
    const winnerMatch =
      grokResponse.match(/(?:^|\n)\s*Winner\s*:\s*([A-Z])/i) ||
      grokResponse.match(/(?:^|\n)\s*Winner\s*-\s*([A-Z])/i) ||
      grokResponse.match(/(?:^|\n)\s*([A-Z])\s*$/i);
    const winnerLetter = winnerMatch ? winnerMatch[1].toUpperCase() : 'A';
    const winnerIndex = winnerLetter.charCodeAt(0) - 65; // A=0, B=1, etc.
    
    // Extract reasoning
    const reasoningMatch =
      grokResponse.match(/(?:^|\n)\s*Reasoning\s*:\s*([\s\S]*)$/i) ||
      grokResponse.match(/(?:^|\n)\s*Reasoning\s*-\s*([\s\S]*)$/i);
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : grokResponse;

    // Map back to anonymous ID
    const selectedEntryId = entries[winnerIndex]?.id || entries[0].id;

    return {
      grokResponse,
      selectedEntryId,
      reasoning
    };
  }
}
