'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useArenaStore } from '@/lib/store';
import { Check, Search, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ModelSelector() {
  const {
    apiKey,
    availableModels,
    setAvailableModels,
    selectedModels,
    toggleModel,
    selectAllModels,
    clearModels
  } = useArenaStore();

  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/models', {
        headers: {
          'X-OpenRouter-Key': apiKey!,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch models');
      }

      const data = await response.json();
      setAvailableModels(data.models);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch models');
    } finally {
      setLoading(false);
    }
  }, [apiKey, setAvailableModels]);

  useEffect(() => {
    if (apiKey && availableModels.length === 0) {
      fetchModels();
    }
  }, [apiKey, availableModels.length, fetchModels]);

  const filteredModels = availableModels.filter((model) =>
    model.name.toLowerCase().includes(search.toLowerCase()) ||
    model.provider.toLowerCase().includes(search.toLowerCase())
  );

  const groupedModels = filteredModels.reduce((acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof availableModels>);

  if (!apiKey) {
    return (
      <p className="text-muted-foreground">
        Please connect your OpenRouter API key first.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Model Load Failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={fetchModels}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search models..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={selectAllModels}>
          Select All
        </Button>
        <Button variant="outline" size="sm" onClick={clearModels}>
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={selectedModels.length >= 2 ? 'secondary' : 'destructive'}>
          {selectedModels.length} selected
        </Badge>
        <Badge variant="outline">
          Showing {filteredModels.length} of {availableModels.length}
        </Badge>
        <p className="text-sm text-muted-foreground">Minimum 2 models required</p>
      </div>

      <ScrollArea className="h-96 rounded-lg border p-4">
        <div className="space-y-4">
          {filteredModels.length === 0 && (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              No models match your search.
            </div>
          )}
          {Object.entries(groupedModels).map(([provider, models]) => (
            <div key={provider}>
              <div className="mb-2 flex items-center gap-2">
                <h3 className="text-sm font-semibold uppercase text-muted-foreground">{provider}</h3>
                <Badge variant="outline">{models.length}</Badge>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                {models.map((model) => {
                  const isSelected = selectedModels.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => toggleModel(model.id)}
                      title={model.name}
                      className={cn(
                        'rounded-md border p-3 text-left transition-all',
                        isSelected
                          ? 'border-primary bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/30'
                          : 'bg-background hover:bg-accent'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isSelected && <Check className="h-4 w-4" />}
                        <span className="text-sm font-medium leading-snug break-words">{model.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
