import { LucideIcon, ChevronRight } from "lucide-react";
import { IndianRupee, GraduationCap, Stethoscope } from "lucide-react";

interface ServiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  iconColor: string;
  route?: string;
  badge?: string;
  badgeColor?: string;
  onClick?: () => void;
}

const ServiceCard = ({ icon: Icon, title, description, iconColor, route, badge, badgeColor, onClick }: ServiceCardProps) => {
  const handleClick = () => {
    if (onClick) onClick();
    if (route) window.location.href = route;
  };

  // Get badge icon based on badge text
  const getBadgeIcon = () => {
    if (badge === 'Earn ₹') return IndianRupee;
    if (badge === 'Apply') return GraduationCap;
    if (badge === 'Join') return Stethoscope;
    return null;
  };

  const BadgeIcon = getBadgeIcon();

  // Get badge gradient based on badge type
  const getBadgeGradient = () => {
    if (badge === 'Earn ₹') return 'from-orange-500 to-amber-500';
    if (badge === 'Apply') return 'from-purple-500 to-pink-500';
    if (badge === 'Join') return 'from-emerald-500 to-teal-500';
    return 'from-primary to-primary';
  };

  return (
    <div 
      onClick={handleClick}
      className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
    >
      {/* Icon with badge overlay */}
      <div className="relative flex-shrink-0">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${iconColor} shadow-lg`}>
          <Icon className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        {badge && (
          <div className={`absolute -top-1.5 -left-1.5 bg-gradient-to-r ${getBadgeGradient()} text-white text-[8px] px-1.5 py-0.5 rounded-md font-bold shadow-md`}>
            {badge}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="text-[11px] text-muted-foreground line-clamp-1">{description}</p>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
    </div>
  );
};

export default ServiceCard;
