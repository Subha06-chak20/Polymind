'use client';

import { DebateResult, VotingResult } from '@/lib/store';
import { Trophy, MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface ResultsDisplayProps {
  result: DebateResult | VotingResult;
  mode: 'debate' | 'voting' | null;
}

function toReadableText(text: string | undefined): string {
  if (!text) return '';

  return text
    .replace(/\r\n/g, '\n')
    .replace(/```[a-zA-Z0-9_-]*\n?/g, '')
    .replace(/```/g, '')
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*---+\s*$/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/\*([^*\n]+)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\\\[([\s\S]*?)\\\]/g, '$1')
    .replace(/\\text\{([^}]*)\}/g, '$1')
    .replace(/\\boxed\{([^}]*)\}/g, '$1')
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1/$2')
    .replace(/\\sqrt\{([^}]*)\}/g, 'sqrt($1)')
    .replace(/\\times/g, 'x')
    .replace(/\\cdot/g, '*')
    .replace(/\\qquad/g, ' ')
    .replace(/\\[,;:]/g, ' ')
    .replace(/\\!/g, '')
    .replace(/\\[a-zA-Z]+/g, '')
    .replace(/[{}]/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function ResultsDisplay({ result, mode }: ResultsDisplayProps) {
  const debateResult = result as Partial<DebateResult>;
  const votingResult = result as Partial<VotingResult>;
  const isDebateResult = Array.isArray(debateResult.rounds) && typeof debateResult.finalAnswer === 'string';
  const isVotingResult = Array.isArray(votingResult.entries) && !!votingResult.winner;
  const isDebate = mode === 'debate' ? isDebateResult : mode === 'voting' ? false : isDebateResult;
  const isVoting = mode === 'voting' ? isVotingResult : mode === 'debate' ? false : isVotingResult;
  const modelList = Array.isArray(result.participatingModels) ? result.participatingModels : [];

  return (
    <div className="space-y-6">
      {/* Final Answer */}
      <div className="p-6 bg-primary/5 border border-primary/20 rounded-lg">
        <div className="flex items-center gap-2 mb-4">
          {isVoting ? (
            <Trophy className="w-5 h-5 text-primary" />
          ) : (
            <MessageSquare className="w-5 h-5 text-primary" />
          )}
          <h3 className="text-lg font-semibold">
            {isVoting ? 'Winner' : 'Final Answer'}
          </h3>
        </div>
        <p className="whitespace-pre-wrap">
          {isDebate
            ? toReadableText((result as DebateResult).finalAnswer)
            : isVoting
              ? toReadableText((result as VotingResult).winner.content)
              : 'No result data available for this mode.'}
        </p>
        
        {isVoting && (
          <div className="mt-4 pt-4">
            <Separator className="mb-4" />
            <p className="text-sm text-muted-foreground">
              Winning Model: <Badge variant="outline" className="ml-1">{(result as VotingResult).winnerModelId}</Badge>
            </p>
          </div>
        )}
      </div>

      {/* Participating Models */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Participating Models</h3>
        <div className="flex flex-wrap gap-2">
          {modelList.map((model) => (
            <Badge
              key={model.id}
              variant="secondary"
              className="px-3 py-1"
            >
              {model.name}
            </Badge>
          ))}
        </div>
      </div>

      {/* Debate Rounds */}
      {isDebate && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Debate Rounds</h3>
          <div className="space-y-4">
            {((result as DebateResult).rounds || []).map((round) => (
              <details key={round.roundNumber} className="border rounded-lg">
                <summary className="p-4 cursor-pointer font-medium">
                  Round {round.roundNumber}
                </summary>
                <div className="p-4 pt-0 space-y-4">
                  {/* Refinements */}
                  <div>
                    <h4 className="font-medium mb-2">Refined Responses</h4>
                    <div className="space-y-2">
                      {round.refinements.map((refinement) => (
                        <div key={refinement.modelId} className="p-3 bg-muted rounded-md">
                          <p className="text-sm font-medium mb-1">{refinement.modelName}</p>
                          <p className="text-sm whitespace-pre-wrap">{toReadableText(refinement.content)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Voting Entries */}
      {isVoting && (
        <div>
          <h3 className="text-lg font-semibold mb-3">All Responses</h3>
          <div className="space-y-3">
            {((result as VotingResult).entries || []).map((entry) => (
              <details key={entry.id} className="border rounded-lg">
                <summary className="p-4 cursor-pointer font-medium">
                  {entry.modelId}
                </summary>
                <div className="p-4 pt-0">
                  <p className="whitespace-pre-wrap">{toReadableText(entry.content)}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      )}

      {/* Evaluation Reasoning */}
      {isVoting && (result as VotingResult).evaluations?.[0] && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Evaluation Reasoning</h3>
          <div className="p-4 bg-muted rounded-lg">
            <p className="whitespace-pre-wrap">{toReadableText((result as VotingResult).evaluations[0].reasoning)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
