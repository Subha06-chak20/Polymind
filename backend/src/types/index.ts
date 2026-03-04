// Core types for Polymind

// Model representation
export interface AIModel {
  id: string;           // OpenRouter model ID
  name: string;         // Display name
  provider: string;     // e.g., openai, anthropic, google
  contextLength: number;
  pricing: {
    prompt: number;     // Price per 1M tokens
    completion: number;
  };
}

// User configuration
export interface AppConfig {
  apiKey: string;       // User's OpenRouter API key
  selectedModels: string[];  // Model IDs
  mode: 'debate' | 'voting';
  debateRounds: number; // 1-5, configurable
}

// Request/Response types
export interface PromptRequest {
  prompt: string;
  config: AppConfig;
}

export interface ModelResponse {
  modelId: string;
  modelName: string;
  content: string;
  round?: number;       // For debate mode
  timestamp: Date;
}

// Debate mode types
export interface DebateRound {
  roundNumber: number;
  responses: ModelResponse[];
  critiques: ModelResponse[];
  refinements: ModelResponse[];
}

export interface DebateResult {
  prompt: string;
  rounds: DebateRound[];
  finalAnswer: string;
  participatingModels: AIModel[];
}

// Voting mode types
export interface VotingEntry {
  id: string;           // Anonymous ID for evaluation
  modelId: string;      // Real model ID - hidden during voting
  content: string;
}

export interface VoteResult {
  prompt: string;
  entries: VotingEntry[];
  evaluations: Evaluation[];
  winner: VotingEntry;
  winnerModelId: string;
  participatingModels: AIModel[];
}

export interface Evaluation {
  grokResponse: string;
  selectedEntryId: string;
  reasoning: string;
}

// Context management types
export interface ContextBudget {
  minContextWindow: number;
  maxPromptTokens: number;
  availableForResponses: number;
  perModelBudget: number;
}

export interface ResponseSummary {
  modelId: string;
  keyPoints: string;
  originalLength: number;
}

export interface PreparedContext {
  type: 'full' | 'summarized';
  responses?: ModelResponse[];
  summaries?: ResponseSummary[];
  fullResponses?: ModelResponse[];
  totalModels?: number;
}

// Streaming event types
export type StreamEventType = 
  | 'round-start'
  | 'model-response'
  | 'model-critique'
  | 'model-refinement'
  | 'round-complete'
  | 'voting-entry'
  | 'evaluation'
  | 'winner-announcement'
  | 'final-result'
  | 'error'
  | 'warning';

export interface StreamEvent {
  event: StreamEventType;
  data: Record<string, unknown>;
}

// Configuration
export interface ContextConfig {
  strategy: 'summarize' | 'truncate' | 'select-top' | 'fail';
  maxSummaryTokens: number;
  fullResponseCount: number;
  warnOnSummarization: boolean;
  minRequiredContext: number;
}

export interface ValidationResult {
  valid: boolean;
  warning: string | null;
}

// OpenRouter API types
export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterRequest {
  model: string;
  messages: OpenRouterMessage[];
  max_tokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface OpenRouterResponse {
  id: string;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterModel {
  id: string;
  name: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  top_provider?: {
    max_completion_tokens?: number;
  };
}

// API Request types
export interface DebateRequest {
  prompt: string;
  models: string[];
  rounds?: number;
  systemPrompt?: string;
  stream?: boolean;
}

export interface DebateResponse {
  success: boolean;
  sessionId: string;
  prompt: string;
  rounds: DebateRound[];
  finalAnswer: string;
  participatingModels: AIModel[];
}

export interface VotingRequest {
  prompt: string;
  models: string[];
  systemPrompt?: string;
  stream?: boolean;
}

export interface VotingResponse {
  success: boolean;
  sessionId: string;
  prompt: string;
  entries: VotingEntry[];
  evaluations: Evaluation[];
  winner: VotingEntry;
  winnerModelId: string;
  participatingModels: AIModel[];
}

// Debate orchestrator config
export interface DebateConfig {
  sessionId: string;
  models: string[];
  rounds: number;
  systemPrompt?: string;
  stream: boolean;
}

// Voting orchestrator config
export interface VotingConfig {
  sessionId: string;
  models: string[];
  systemPrompt?: string;
  stream: boolean;
}

// Session status
export interface SessionStatus {
  sessionId: string;
  status: 'pending' | 'running' | 'completed' | 'cancelled' | 'error';
  progress?: {
    current: number;
    total: number;
    stage: string;
  };
  error?: string;
}
