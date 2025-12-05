import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';

interface PersonalizedCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  gradient: string;
  route: string;
}

export const PersonalizedCard: React.FC<PersonalizedCardProps> = ({
  icon: Icon,
  title,
  description,
  gradient,
  route
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(route)}
      className="flex-shrink-0 w-32 cursor-pointer hover:scale-105 transition-transform duration-200"
    >
      <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-3 border border-border/50 shadow-sm hover:shadow-md transition-all h-full">
        <div className={`${gradient} p-2.5 rounded-xl w-fit mb-2 shadow-md`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h4 className="font-semibold text-sm text-foreground line-clamp-1">{title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
      </div>
    </div>
  );
};
