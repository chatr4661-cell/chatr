import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Pill, Video, MapPin, FlaskConical, Calendar, Wallet,
  Shield, Bell, Settings
} from 'lucide-react';
import logo from '@/assets/chatr-logo.png';
import { FamilyControlToggle } from './FamilyControlToggle';

interface FamilyMember {
  id: string;
  name: string;
  relationship: 'self' | 'mother' | 'father' | 'spouse' | 'child' | 'other';
  avatar?: string;
  hasAlerts?: boolean;
  alertCount?: number;
}

interface CareDashboardHeaderProps {
  userName: string;
  familyMembers: FamilyMember[];
  selectedMember: FamilyMember | null;
  onSelectMember: (member: FamilyMember) => void;
  healthScore?: number;
  unreadAlerts?: number;
}

const quickServices = [
  { icon: Pill, label: 'Medicines', route: '/care/medicines', color: 'from-emerald-500 to-teal-600', badge: '25% OFF' },
  { icon: Video, label: 'Teleconsult', route: '/teleconsultation', color: 'from-blue-500 to-indigo-600' },
  { icon: MapPin, label: 'Doctors', route: '/local-healthcare', color: 'from-purple-500 to-violet-600' },
  { icon: FlaskConical, label: 'Labs', route: '/lab-reports', color: 'from-pink-500 to-rose-600' },
  { icon: Calendar, label: 'Bookings', route: '/booking', color: 'from-orange-500 to-amber-600' },
  { icon: Wallet, label: 'Wallet', route: '/health-wallet', color: 'from-green-500 to-emerald-600' },
];

export function CareDashboardHeader({
  userName,
  familyMembers,
  selectedMember,
  onSelectMember,
  healthScore = 85,
  unreadAlerts = 0
}: CareDashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 blur-3xl transform translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/20 blur-3xl transform -translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 relative z-10">
        {/* Top Bar */}
        <div className="flex items-center justify-between mb-4">
          <motion.img 
            src={logo} 
            alt="Chatr" 
            className="h-6 cursor-pointer" 
            onClick={() => navigate('/')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => navigate('/notifications')}
            >
              <div className="relative">
                <Bell className="h-5 w-5" />
                {unreadAlerts > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center">
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </div>
            </Button>
            <FamilyControlToggle
              members={familyMembers}
              selectedMember={selectedMember}
              onSelectMember={onSelectMember}
            />
          </div>
        </div>

        {/* Hero Text with Health Score */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between mb-5"
        >
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Hey {userName} 👋
            </h1>
            {selectedMember?.relationship !== 'self' && (
              <p className="text-blue-100 text-sm">
                Managing care for {selectedMember?.name}
              </p>
            )}
          </div>
          
          {/* Health Score Circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative"
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30">
              <div className="text-center">
                <div className="text-xl font-bold">{healthScore}</div>
                <div className="text-[8px] text-white/80">Health Score</div>
              </div>
            </div>
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-white/50"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              style={{ borderStyle: 'dashed' }}
            />
          </motion.div>
        </motion.div>

        {/* Quick Services Grid */}
        <div className="grid grid-cols-6 gap-2 mb-4">
          {quickServices.map((service, idx) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="text-center relative"
              onClick={() => navigate(service.route)}
            >
              <motion.div 
                className={`w-10 h-10 mx-auto rounded-xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-1 cursor-pointer shadow-lg`}
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.95 }}
              >
                <service.icon className="h-5 w-5 text-white" />
              </motion.div>
              <p className="text-[10px] text-white/90">{service.label}</p>
              {service.badge && (
                <Badge className="absolute -top-1 left-1/2 transform -translate-x-1/2 text-[8px] py-0 px-1 bg-yellow-400 text-yellow-900">
                  {service.badge}
                </Badge>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
