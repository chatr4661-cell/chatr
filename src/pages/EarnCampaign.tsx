import React from 'react';
import { ArrowLeft, Zap, Gift, Users, IndianRupee, CheckCircle2, Star, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SEOHead } from '@/components/SEOHead';

const STEPS = [
  { icon: '📱', title: 'Install Chatr', desc: 'Download & create your account in 30 seconds' },
  { icon: '🎯', title: 'Complete tasks', desc: 'Voice recordings, photo tags, ratings — 30 sec each' },
  { icon: '💰', title: 'Earn instantly', desc: '₹5-50 per task, withdraw via UPI anytime' },
];

const TASKS = [
  { type: '🎤 Voice', name: 'Record a sentence in your language', reward: '₹5' },
  { type: '📸 Photo', name: 'Tag objects in a picture', reward: '₹10' },
  { type: '⭐ Rating', name: 'Rate a local shop', reward: '₹5' },
  { type: '🗣️ Survey', name: 'Answer 3 quick questions', reward: '₹15' },
  { type: '📍 Local', name: 'Verify a business address', reward: '₹20' },
  { type: '🎧 Audio', name: 'Transcribe a 15-sec clip', reward: '₹50' },
];

export default function EarnCampaign() {
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Earn ₹100/Day with Chatr — Zero Skills Needed"
        description="Complete simple 30-second tasks and earn real money daily. Voice recordings, photo tags, surveys — withdraw via UPI instantly."
        keywords="earn money, micro tasks, chatr earn, upi, daily income"
      />
      <div className="min-h-screen bg-background pb-24">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/70 text-primary-foreground p-6 pb-10">
          <Button variant="ghost" size="icon" className="text-primary-foreground mb-4" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-3"
          >
            <div className="text-6xl">💰</div>
            <h1 className="text-3xl font-extrabold">Earn ₹100/Day</h1>
            <p className="text-lg opacity-90">Zero skills. 30 seconds per task. Real money.</p>
            <Button
              size="lg"
              variant="secondary"
              className="mt-4 text-lg px-8 font-bold"
              onClick={() => navigate('/micro-tasks')}
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Earning Now
            </Button>
          </motion.div>
        </div>

        <div className="p-4 space-y-6 -mt-4">
          {/* How it works */}
          <Card className="shadow-lg">
            <CardContent className="pt-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                How it works
              </h2>
              <div className="space-y-4">
                {STEPS.map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="text-2xl">{step.icon}</div>
                    <div>
                      <p className="font-semibold">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Sample tasks */}
          <Card>
            <CardContent className="pt-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                Today's tasks
              </h2>
              <div className="space-y-3">
                {TASKS.map((task, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{task.type.split(' ')[0]}</span>
                      <div>
                        <p className="font-medium text-sm">{task.name}</p>
                        <p className="text-xs text-muted-foreground">{task.type}</p>
                      </div>
                    </div>
                    <span className="font-bold text-green-600">{task.reward}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
            <CardContent className="pt-6">
              <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                <IndianRupee className="w-5 h-5 text-green-600" />
                Community earnings
              </h2>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">₹0</p>
                  <p className="text-xs text-muted-foreground">Total earned</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Active earners</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-orange-500">0</p>
                  <p className="text-xs text-muted-foreground">Tasks today</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Referral */}
          <Card>
            <CardContent className="pt-6 text-center space-y-3">
              <Users className="w-10 h-10 mx-auto text-primary" />
              <h2 className="font-bold text-lg">Invite & Earn ₹50</h2>
              <p className="text-sm text-muted-foreground">
                Every friend who joins and completes their first task earns you ₹50
              </p>
              <Button className="w-full" onClick={() => navigate('/referral')}>
                <Gift className="w-4 h-4 mr-2" />
                Share Invite Link
              </Button>
            </CardContent>
          </Card>

          {/* CTA */}
          <Button
            size="lg"
            className="w-full text-lg font-bold h-14"
            onClick={() => navigate('/micro-tasks')}
          >
            <Zap className="w-5 h-5 mr-2" />
            Start Earning — It's Free!
          </Button>
        </div>
      </div>
    </>
  );
}
