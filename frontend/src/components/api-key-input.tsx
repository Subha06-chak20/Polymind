'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useArenaStore } from '@/lib/store';
import { Key, Eye, EyeOff, Check } from 'lucide-react';

export function ApiKeyInput() {
  const { apiKey, setApiKey } = useArenaStore();
  const [inputValue, setInputValue] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSave = () => {
    if (inputValue.startsWith('sk-or-')) {
      setApiKey(inputValue);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setApiKey('');
  };

  if (apiKey) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Check className="h-5 w-5 text-emerald-600" />
          <Badge variant="secondary">API Key connected</Badge>
        </div>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type={showKey ? 'text' : 'password'}
            placeholder="sk-or-..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="pl-10 pr-10"
          />
          <Button
            type="button"
            onClick={() => setShowKey(!showKey)}
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <Button onClick={handleSave} disabled={!inputValue.startsWith('sk-or-')}>
          Connect
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Get your API key from{' '}
        <a
          href="https://openrouter.ai/keys"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          openrouter.ai/keys
        </a>
      </p>
    </div>
  );
}
