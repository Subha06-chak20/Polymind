import type { 
  OpenRouterMessage, 
  OpenRouterRequest, 
  OpenRouterResponse,
  OpenRouterModel 
} from '../types/index.js';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1';

export interface CallOptions {
  model: string;
  systemPrompt?: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
}

export class OpenRouterClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async call(options: CallOptions): Promise<string> {
    console.log('OpenRouterClient.call: Starting for model', options.model);
    const messages: OpenRouterMessage[] = [];
    
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: options.userPrompt
    });

    const request: OpenRouterRequest = {
      model: options.model,
      messages,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7
    };

    try {
      console.log('OpenRouterClient.call: Sending request to OpenRouter API...');
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://polymind.app',
          'X-Title': 'Polymind'
        },
        body: JSON.stringify(request)
      });

      console.log('OpenRouterClient.call: Response status:', response.status);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenRouterClient.call: Error response:', errorText);
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as OpenRouterResponse;
      
      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response choices returned from OpenRouter');
      }

      return data.choices[0].message.content;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error calling OpenRouter: ${String(error)}`);
    }
  }

  async getModels(): Promise<OpenRouterModel[]> {
    console.log('OpenRouterClient.getModels: Fetching models...');
    try {
      const response = await fetch(`${OPENROUTER_API_URL}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json() as { data: OpenRouterModel[] };
      return data.data;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error fetching models: ${String(error)}`);
    }
  }

  // Streaming support for real-time responses
  async *callStream(options: CallOptions): AsyncGenerator<string, void, unknown> {
    const messages: OpenRouterMessage[] = [];
    
    if (options.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt
      });
    }
    
    messages.push({
      role: 'user',
      content: options.userPrompt
    });

    const request: OpenRouterRequest = {
      model: options.model,
      messages,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature ?? 0.7,
      stream: true
    };

    try {
      const response = await fetch(`${OPENROUTER_API_URL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://polymind.app',
          'X-Title': 'Polymind'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      if (!response.body) {
        throw new Error('No response body received');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                yield content;
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Unknown error in streaming: ${String(error)}`);
    }
  }
}

// Helper function to create client
export function createOpenRouterClient(apiKey: string): OpenRouterClient {
  return new OpenRouterClient(apiKey);
}
