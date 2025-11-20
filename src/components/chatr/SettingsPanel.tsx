import React from 'react';
import { Bell, Lock, Database, HelpCircle, Palette, User, LogOut, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface SettingsPanelProps {
  user: any;
}

export function SettingsPanel({ user }: SettingsPanelProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/auth');
  };

  const settings = [
    {
      category: 'Account',
      items: [
        { icon: User, label: 'Account', phone: '+1 234 557 890' },
        { icon: Bell, label: 'Notifications' },
        { icon: Lock, label: 'Privacy' },
        { icon: Database, label: 'Data and Storage' },
      ]
    },
    {
      category: 'HELP',
      items: [
        { icon: Palette, label: 'Appearance' },
        { icon: HelpCircle, label: 'Account' },
      ]
    }
  ];

  return (
    <div className="h-full bg-white">
      {/* Header */}
      <div className="px-4 py-6" style={{ background: 'linear-gradient(135deg, hsl(263, 70%, 50%), hsl(263, 70%, 60%))' }}>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Profile Section */}
      <div className="px-4 py-6 bg-gradient-to-b from-[hsl(263,70%,55%)] to-white">
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-white overflow-hidden mb-3">
            <img
              src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop"
              alt="Profile"
              className="w-full h-full object-cover"
            />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Ashley</h2>
          <p className="text-sm text-gray-600">teash</p>
          <p className="text-sm text-gray-600 mt-1">Hey there! I am using CHATR</p>
        </div>
      </div>

      <div className="px-4 pb-20">
        {/* Settings Groups */}
        {settings.map((group, idx) => (
          <div key={idx} className="mb-6">
            {group.category !== 'Account' && (
              <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">{group.category}</h3>
            )}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {group.items.map((item, itemIdx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={itemIdx}
                    className={`flex items-center gap-3 p-4 ${
                      itemIdx !== group.items.length - 1 ? 'border-b border-gray-100' : ''
                    } cursor-pointer hover:bg-gray-50 transition-colors`}
                  >
                    <div className="w-6 h-6 text-[hsl(263,70%,50%)] flex items-center justify-center">
                      {item.icon === User && '👤'}
                      {item.icon === Bell && '🔔'}
                      {item.icon === Lock && '🔒'}
                      {item.icon === Database && '💾'}
                      {item.icon === Palette && '🎨'}
                      {item.icon === HelpCircle && '❓'}
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-900">{item.label}</span>
                      {item.phone && (
                        <p className="text-sm text-gray-500">{item.phone}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 mb-3 px-2">LOGOUT</h3>
          <button
            onClick={handleLogout}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center gap-3 hover:bg-gray-50 transition-colors"
          >
            <LogOut className="w-5 h-5 text-red-500" />
            <span className="font-medium text-red-500">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}
