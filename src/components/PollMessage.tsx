import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';

interface PollMessageProps {
  question: string;
  options: Array<{ text: string; votes: number }>;
  totalVotes: number;
  userVote?: number;
  onVote: (optionIndex: number) => void;
}

export const PollMessage = ({ question, options, totalVotes, userVote, onVote }: PollMessageProps) => {
  const hasVoted = userVote !== undefined;

  return (
    <Card className="p-4 bg-gradient-card backdrop-blur-glass border-glass-border">
      <h4 className="font-semibold text-foreground mb-3">{question}</h4>
      <div className="space-y-2">
        {options.map((option, index) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isSelected = userVote === index;

          return (
            <button
              key={index}
              onClick={() => !hasVoted && onVote(index)}
              disabled={hasVoted}
              className="w-full text-left"
            >
              <div className={`relative p-3 rounded-lg border transition-all ${
                isSelected 
                  ? 'border-primary bg-primary/10' 
                  : 'border-glass-border bg-background/50'
              } ${!hasVoted ? 'hover:bg-primary/5 cursor-pointer' : ''}`}>
                {hasVoted && (
                  <div className="absolute inset-0 bg-primary/5 rounded-lg" style={{ width: `${percentage}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium text-foreground">{option.text}</span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                  </div>
                  {hasVoted && (
                    <span className="text-sm text-muted-foreground ml-2">{percentage.toFixed(0)}%</span>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
      </p>
    </Card>
  );
};
