import React from 'react';
import { motion } from 'framer-motion';
import { 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  Pill,
  Activity,
  Heart,
  Droplet,
  Brain
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';

interface CarePath {
  id: string;
  name: string;
  type: 'diabetes' | 'bp' | 'cardiac' | 'thyroid' | 'cholesterol' | 'mental';
  status: 'stable' | 'attention' | 'critical' | 'improving';
  progress: number;
  lastAction: string;
  nextAction: string;
  dueDate?: string;
  memberName?: string;
}

interface CarePathCardProps {
  path: CarePath;
  isFamily?: boolean;
}

const pathIcons = {
  diabetes: Droplet,
  bp: Heart,
  cardiac: Heart,
  thyroid: Activity,
  cholesterol: Activity,
  mental: Brain,
};

const pathColors = {
  diabetes: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-500', gradient: 'from-purple-500 to-purple-600' },
  bp: { bg: 'bg-red-50', border: 'border-red-200', icon: 'text-red-500', gradient: 'from-red-500 to-rose-600' },
  cardiac: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'text-rose-500', gradient: 'from-rose-500 to-pink-600' },
  thyroid: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'text-teal-500', gradient: 'from-teal-500 to-cyan-600' },
  cholesterol: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'text-orange-500', gradient: 'from-orange-500 to-amber-600' },
  mental: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-500', gradient: 'from-indigo-500 to-violet-600' },
};

const statusConfig = {
  stable: { label: 'Stable', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle },
  attention: { label: 'Needs Attention', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: AlertTriangle },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  improving: { label: 'Improving', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
};

export function CarePathCard({ path, isFamily }: CarePathCardProps) {
  const navigate = useNavigate();
  const Icon = pathIcons[path.type];
  const colors = pathColors[path.type];
  const status = statusConfig[path.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
    >
      <Card 
        className={`overflow-hidden cursor-pointer border-l-4 ${colors.border} hover:shadow-md transition-all`}
        onClick={() => navigate(`/care/path/${path.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center`}>
                <Icon className={`h-5 w-5 ${colors.icon}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{path.name}</h3>
                  {isFamily && path.memberName && (
                    <Badge variant="outline" className="text-[10px] py-0">
                      {path.memberName}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{path.lastAction}</p>
              </div>
            </div>
            <Badge className={`${status.color} gap-1 text-[10px]`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Care Progress</span>
              <span className="font-medium">{path.progress}%</span>
            </div>
            <Progress value={path.progress} className="h-1.5" />
          </div>

          {/* Next Action */}
          <div className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{path.nextAction}</span>
            </div>
            {path.dueDate && (
              <span className="text-xs text-primary font-medium">{path.dueDate}</span>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
