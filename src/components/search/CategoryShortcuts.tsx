import { Card } from '@/components/ui/card';
import { 
  Utensils, 
  Stethoscope, 
  Briefcase, 
  Wrench, 
  GraduationCap, 
  Plane, 
  Calendar, 
  Tag,
  Rocket,
  Users
} from 'lucide-react';

const categories = [
  { name: 'Food', icon: Utensils, query: 'food near me', color: 'bg-orange-500/10 text-orange-600' },
  { name: 'Health', icon: Stethoscope, query: 'doctor near me', color: 'bg-red-500/10 text-red-600' },
  { name: 'Jobs', icon: Briefcase, query: 'jobs available', color: 'bg-green-500/10 text-green-600' },
  { name: 'Services', icon: Wrench, query: 'home services', color: 'bg-blue-500/10 text-blue-600' },
  { name: 'Learning', icon: GraduationCap, query: 'tutors near me', color: 'bg-purple-500/10 text-purple-600' },
  { name: 'Travel', icon: Plane, query: 'travel services', color: 'bg-cyan-500/10 text-cyan-600' },
  { name: 'Events', icon: Calendar, query: 'events near me', color: 'bg-pink-500/10 text-pink-600' },
  { name: 'Deals', icon: Tag, query: 'deals and offers', color: 'bg-yellow-500/10 text-yellow-600' },
  { name: 'Startups', icon: Rocket, query: 'startups', color: 'bg-indigo-500/10 text-indigo-600' },
  { name: 'People', icon: Users, query: 'find people', color: 'bg-teal-500/10 text-teal-600' },
];

export const CategoryShortcuts = ({ onCategoryClick }: { onCategoryClick: (query: string) => void }) => {
  return (
    <div className="mb-6">
      <h3 className="font-semibold text-sm mb-3">Browse by Category</h3>
      <div className="grid grid-cols-5 gap-3">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <Card
              key={category.name}
              className={`p-4 cursor-pointer hover:shadow-md transition-all ${category.color} border-0`}
              onClick={() => onCategoryClick(category.query)}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{category.name}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
