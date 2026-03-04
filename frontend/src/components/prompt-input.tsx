'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useArenaStore } from '@/lib/store';
import { Play, Loader2 } from 'lucide-react';

interface PromptInputProps {
  disabled?: boolean;
  onSubmit: () => void;
}

export function PromptInput({ disabled, onSubmit }: PromptInputProps) {
  const { apiKey, selectedModels, mode, debateRounds, setStatus, setResult } = useArenaStore();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const promptLength = prompt.trim().length;

  const handleSubmit = async () => {
    if (!prompt.trim() || !apiKey || selectedModels.length < 2 || !mode) return;

    setLoading(true);
    onSubmit();

    try {
      const backendUrl = 'http://localhost:3001';
      const endpoint = mode === 'debate' ? `${backendUrl}/api/debate` : `${backendUrl}/api/voting`;

      const body = mode === 'debate'
        ? { prompt, models: selectedModels, rounds: debateRounds }
        : { prompt, models: selectedModels };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-OpenRouter-Key': apiKey,
        },
        body: JSON.stringify(body),
      });

      const contentType = response.headers.get('content-type') || '';
      let payload: unknown = null;
      if (contentType.includes('application/json')) {
        payload = await response.json();
      } else {
        const text = await response.text();
        payload = text ? { message: text } : null;
      }

      if (!response.ok) {
        const payloadObject =
          payload && typeof payload === 'object'
            ? (payload as { message?: unknown; error?: unknown })
            : null;
        const messageFromBody =
          typeof payloadObject?.message === 'string'
            ? payloadObject.message
            : typeof payloadObject?.error === 'string'
              ? payloadObject.error
              : null;
        const message = messageFromBody ?? `Failed to start session (${response.status})`;

        setStatus({
          sessionId: '',
          status: 'error',
          error: message,
        });
        return;
      }

      setResult(payload as Parameters<typeof setResult>[0]);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Request failed: ${message}`);
      setStatus({
        sessionId: '',
        status: 'error',
        error: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            void handleSubmit();
          }
        }}
        placeholder="Enter your question or prompt here..."
        className="min-h-36 resize-none"
        disabled={disabled || loading}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="outline">{selectedModels.length} models</Badge>
          <Badge variant="secondary">{mode || 'No mode selected'}</Badge>
          <Badge variant="outline">{promptLength} chars</Badge>
          <p className="text-xs text-muted-foreground">Tip: Ctrl/Cmd + Enter to run</p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={disabled || loading || !prompt.trim()}
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Start {mode === 'debate' ? 'Debate' : 'Voting'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
