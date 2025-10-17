import React, { useState } from 'react';
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
  isOwn?: boolean;
}

export const PollMessage = ({ question, options, totalVotes, userVote, onVote, isOwn = false }: PollMessageProps) => {
  const hasVoted = userVote !== undefined;

  return (
    <Card className={`p-4 ${
      isOwn ? 'bg-teal-600/10 border-teal-600/20' : 'bg-gradient-card backdrop-blur-glass border-glass-border'
    }`}>
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
                  ? `${isOwn ? 'border-teal-600 bg-teal-600/20' : 'border-primary bg-primary/10'}`
                  : `border-glass-border ${isOwn ? 'bg-teal-600/5' : 'bg-background/50'}`
              } ${!hasVoted ? `${isOwn ? 'hover:bg-teal-600/10' : 'hover:bg-primary/5'} cursor-pointer active:scale-95` : ''}`}>
                {hasVoted && (
                  <div className={`absolute inset-0 rounded-lg ${isOwn ? 'bg-teal-600/10' : 'bg-primary/5'}`} style={{ width: `${percentage}%` }} />
                )}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm font-medium text-foreground">{option.text}</span>
                    {isSelected && <CheckCircle2 className={`h-4 w-4 ${isOwn ? 'text-teal-600' : 'text-primary'}`} />}
                  </div>
                  {hasVoted && (
                    <span className="text-sm text-muted-foreground ml-2 font-semibold">{percentage.toFixed(0)}%</span>
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
