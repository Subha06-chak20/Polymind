import { create } from 'zustand';

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  contextLength: number;
  pricing: {
    prompt: number;
    completion: number;
  };
}

export interface ModelResponse {
  modelId: string;
  modelName: string;
  content: string;
  round?: number;
  timestamp: string;
}

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

export interface VotingEntry {
  id: string;
  modelId: string;
  content: string;
}

export interface Evaluation {
  grokResponse: string;
  selectedEntryId: string;
  reasoning: string;
}

export interface VotingResult {
  prompt: string;
  entries: VotingEntry[];
  evaluations: Evaluation[];
  winner: VotingEntry;
  winnerModelId: string;
  participatingModels: AIModel[];
}

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

interface ArenaState {
  // API Key
  apiKey: string | null;
  setApiKey: (key: string) => void;
  
  // Models
  availableModels: AIModel[];
  setAvailableModels: (models: AIModel[]) => void;
  selectedModels: string[];
  toggleModel: (modelId: string) => void;
  selectAllModels: () => void;
  clearModels: () => void;
  
  // Mode
  mode: 'debate' | 'voting' | null;
  setMode: (mode: 'debate' | 'voting') => void;
  
  // Debate settings
  debateRounds: number;
  setDebateRounds: (rounds: number) => void;
  
  // Session
  status: SessionStatus | null;
  setStatus: (status: SessionStatus | null) => void;
  
  // Results
  result: DebateResult | VotingResult | null;
  setResult: (result: DebateResult | VotingResult | null) => void;
  
  // Reset
  reset: () => void;
}

export const useArenaStore = create<ArenaState>((set, get) => ({
  // API Key
  apiKey: null,
  setApiKey: (key) => set({ apiKey: key }),
  
  // Models
  availableModels: [],
  setAvailableModels: (models) => set({ availableModels: models }),
  selectedModels: [],
  toggleModel: (modelId) => {
    const { selectedModels } = get();
    const isSelected = selectedModels.includes(modelId);
    set({
      selectedModels: isSelected
        ? selectedModels.filter((id) => id !== modelId)
        : [...selectedModels, modelId],
    });
  },
  selectAllModels: () => {
    const { availableModels } = get();
    set({ selectedModels: availableModels.map((m) => m.id) });
  },
  clearModels: () => set({ selectedModels: [] }),
  
  // Mode
  mode: null,
  setMode: (mode) =>
    set((state) =>
      state.mode === mode
        ? state
        : {
            mode,
            status: null,
            result: null,
          }
    ),
  
  // Debate settings
  debateRounds: 3,
  setDebateRounds: (rounds) => set({ debateRounds: rounds }),
  
  // Session
  status: null,
  setStatus: (status) => set({ status }),
  
  // Results
  result: null,
  setResult: (result) => set({ result }),
  
  // Reset
  reset: () => set({
    status: null,
    result: null,
    selectedModels: [],
    mode: null,
  }),
}));
