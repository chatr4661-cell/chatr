import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Users, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface FamilyMember {
  id: string;
  name: string;
  relationship: 'self' | 'mother' | 'father' | 'spouse' | 'child' | 'other';
  avatar?: string;
  hasAlerts?: boolean;
  alertCount?: number;
}

interface FamilyControlToggleProps {
  members: FamilyMember[];
  selectedMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember) => void;
}

const relationshipEmoji: Record<string, string> = {
  self: '👤',
  mother: '👩',
  father: '👨',
  spouse: '💑',
  child: '👶',
  other: '👪',
};

export function FamilyControlToggle({ 
  members, 
  selectedMember, 
  onSelectMember 
}: FamilyControlToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className="h-10 gap-2 bg-background/80 backdrop-blur-sm border-primary/20"
        >
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={selectedMember?.avatar} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {relationshipEmoji[selectedMember?.relationship || 'self']}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {selectedMember?.relationship === 'self' ? 'You' : selectedMember?.name}
            </span>
            {selectedMember?.hasAlerts && (
              <Badge variant="destructive" className="h-4 w-4 p-0 text-[10px] flex items-center justify-center">
                {selectedMember.alertCount}
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          Managing Care For
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {members.map((member) => (
          <DropdownMenuItem
            key={member.id}
            onClick={() => onSelectMember(member)}
            className="flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.avatar} />
                <AvatarFallback className="bg-muted text-sm">
                  {relationshipEmoji[member.relationship]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {member.relationship === 'self' ? 'Yourself' : member.name}
                </p>
                <p className="text-xs text-muted-foreground capitalize">{member.relationship}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {member.hasAlerts && (
                <Badge variant="destructive" className="h-5 w-5 p-0 text-[10px] flex items-center justify-center">
                  {member.alertCount}
                </Badge>
              )}
              {selectedMember?.id === member.id && (
                <Check className="h-4 w-4 text-primary" />
              )}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-primary cursor-pointer">
          <Users className="h-4 w-4 mr-2" />
          Add Family Member
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
