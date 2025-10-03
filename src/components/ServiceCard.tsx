import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
}

const ServiceCard = ({ icon: Icon, title, description, iconColor }: ServiceCardProps) => {
  return (
    <Card className="p-2 hover:shadow-elevated transition-all duration-300 cursor-pointer border-glass-border bg-gradient-card backdrop-blur-glass hover:scale-[1.01] active:scale-[0.99]">
      <div className="flex items-center gap-2">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${iconColor} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xs font-semibold text-foreground mb-0.5">{title}</h3>
          <p className="text-[10px] text-muted-foreground line-clamp-1">{description}</p>
        </div>
      </div>
    </Card>
  );
};

export default ServiceCard;
