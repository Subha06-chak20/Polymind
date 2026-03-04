'use client';

import { SessionStatus } from '@/lib/store';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface ProgressIndicatorProps {
  status: SessionStatus;
}

export function ProgressIndicator({ status }: ProgressIndicatorProps) {
  const progress = status.progress;
  const percentage = progress ? Math.round((progress.current / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        {status.status === 'running' && (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        )}
        <div className="flex-1">
          <p className="font-medium">{progress?.stage || 'Processing...'}</p>
          <p className="text-sm text-muted-foreground">Status: {status.status}</p>
        </div>
        <Badge variant="outline">{percentage}%</Badge>
      </div>

      <Progress value={percentage} />

      {status.status === 'error' && status.error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{status.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
