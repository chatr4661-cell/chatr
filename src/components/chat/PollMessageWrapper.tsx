import React, { useState } from 'react';
import { PollMessage } from '@/components/PollMessage';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PollMessageWrapperProps {
  messageId: string;
  data: {
    question: string;
    options: string[];
  };
}

export const PollMessageWrapper: React.FC<PollMessageWrapperProps> = ({ messageId, data }) => {
  const [pollData, setPollData] = useState({
    options: data.options.map(opt => ({ text: opt, votes: 0 })),
    totalVotes: 0,
    userVote: undefined as number | undefined
  });

  const handleVote = async (optionIndex: number) => {
    try {
      // In a real implementation, store votes in a separate table
      // For now, just update local state optimistically
      const newOptions = [...pollData.options];
      newOptions[optionIndex].votes += 1;
      
      setPollData({
        options: newOptions,
        totalVotes: pollData.totalVotes + 1,
        userVote: optionIndex
      });

      toast.success('Vote recorded');
    } catch (error) {
      toast.error('Failed to vote');
    }
  };

  return (
    <PollMessage
      question={data.question}
      options={pollData.options}
      totalVotes={pollData.totalVotes}
      userVote={pollData.userVote}
      onVote={handleVote}
    />
  );
};
