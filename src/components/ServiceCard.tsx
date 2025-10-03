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
    <Card className="p-6 hover:shadow-elevated transition-all duration-300 cursor-pointer border-border/50 bg-gradient-card hover:scale-[1.02]">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${iconColor}`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-lg font-semibold mb-2 text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Card>
  );
};

export default ServiceCard;
