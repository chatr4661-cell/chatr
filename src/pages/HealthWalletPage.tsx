import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import HealthWallet from '@/components/HealthWallet';
import logo from '@/assets/chatr-logo.png';

export default function HealthWalletPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-purple-600 to-pink-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-4">
            <img src={logo} alt="Chatr" className="h-8 cursor-pointer" onClick={() => navigate('/')} />
            <Button variant="ghost" size="sm" className="text-white" onClick={() => navigate('/care')}>
              Back to Care Access
            </Button>
          </div>
          <h1 className="text-3xl font-bold mb-2">Health Wallet</h1>
          <p className="text-purple-100">Manage your healthcare finances & rewards</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <HealthWallet />
      </div>
    </div>
  );
}