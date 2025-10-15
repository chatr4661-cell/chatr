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
    <Card className="p-3 hover:shadow-2xl transition-all duration-300 border-border/40 bg-gradient-to-br from-background to-muted/20 backdrop-blur-sm hover:scale-[1.01] active:scale-[0.99] pointer-events-none">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${iconColor} shadow-xl`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-foreground mb-1">{title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-1 leading-relaxed">{description}</p>
        </div>
      </div>
    </Card>
  );
};

export default ServiceCard;
