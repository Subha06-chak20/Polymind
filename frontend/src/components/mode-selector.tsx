'use client';

import { useArenaStore } from '@/lib/store';
import { MessageSquare, Vote } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function ModeSelector() {
  const { mode, setMode, debateRounds, setDebateRounds } = useArenaStore();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <button onClick={() => setMode('debate')} className="text-left">
          <Card className={cn('transition-colors', mode === 'debate' ? 'border-primary bg-primary/5' : 'hover:border-primary/40')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Debate Mode
                {mode === 'debate' && <Badge variant="secondary">Selected</Badge>}
              </CardTitle>
              <CardDescription>
                Models collaborate through rounds of critique and refinement to produce one final answer.
              </CardDescription>
            </CardHeader>
          </Card>
        </button>

        <button onClick={() => setMode('voting')} className="text-left">
          <Card className={cn('transition-colors', mode === 'voting' ? 'border-primary bg-primary/5' : 'hover:border-primary/40')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Vote className="h-5 w-5" />
                Voting Mode
                {mode === 'voting' && <Badge variant="secondary">Selected</Badge>}
              </CardTitle>
              <CardDescription>
                Each model submits an independent answer and one evaluator chooses the strongest response.
              </CardDescription>
            </CardHeader>
          </Card>
        </button>
      </div>

      {mode === 'debate' && (
        <div className="rounded-lg border bg-muted/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Label htmlFor="debate-rounds">Debate Rounds</Label>
            <Badge variant="outline">{debateRounds}</Badge>
          </div>
          <Slider
            id="debate-rounds"
            min={1}
            max={5}
            step={1}
            value={[debateRounds]}
            onValueChange={(value) => setDebateRounds(value[0] ?? debateRounds)}
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>1 round</span>
            <span>5 rounds</span>
          </div>
        </div>
      )}
    </div>
  );
}
