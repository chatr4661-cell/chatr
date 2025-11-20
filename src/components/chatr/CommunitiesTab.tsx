import React, { useState } from 'react';
import { Users as UsersIcon, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CommunitiesHome } from './CommunitiesHome';
import { useNavigate } from 'react-router-dom';

interface CommunitiesTabProps {
  userId: string;
}

export function CommunitiesTab({ userId }: CommunitiesTabProps) {
  return <CommunitiesHome userId={userId} />;
}
