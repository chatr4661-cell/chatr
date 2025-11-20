import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, Percent, Hammer } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LocalServices() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'jobs' | 'deals' | 'services'>('jobs');

  const tabs = [
    { id: 'jobs', label: 'Jobs', icon: Briefcase },
    { id: 'deals', label: 'Deals', icon: Percent },
    { id: 'services', label: 'Services', icon: Hammer },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search Jobs"
            className="pl-10 bg-muted border-0"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className="flex-1 gap-2"
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {activeTab === 'jobs' && (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Jobs</h3>
              <div className="space-y-3">
                {[
                  { title: 'Firetverid', company: 'Tech Co', salary: '₹25k-50k/month' },
                  { title: 'Graphic Designer', company: 'Design Studio', salary: '₹25k-50k/month' },
                  { title: 'Data Analyst', company: 'Analytics Inc', salary: '₹8-10 LPA' },
                ].map((job, idx) => (
                  <div
                    key={idx}
                    onClick={() => navigate('/local-jobs')}
                    className="p-4 bg-card rounded-2xl border cursor-pointer hover:border-primary transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold">{job.title}</h4>
                        <p className="text-sm text-muted-foreground">{job.company}</p>
                        <p className="text-sm font-medium text-primary mt-1">{job.salary}</p>
                      </div>
                      <Button size="sm">Apply</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold">Jobs ALL</h3>
                <Button variant="link" size="sm" className="text-primary">
                  Apply
                </Button>
              </div>
              <div className="space-y-3">
                {[
                  { title: 'Frontend Developer', company: 'Startup', time: '4 mo ago' },
                  { title: 'Therapist', company: 'Healthcare', time: '3 d ago' },
                ].map((job, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-card rounded-2xl border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{job.title}</h4>
                        <p className="text-xs text-muted-foreground">{job.time}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'deals' && (
          <div className="text-center py-12 text-muted-foreground">
            <Percent className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No deals available right now</p>
          </div>
        )}

        {activeTab === 'services' && (
          <div className="text-center py-12 text-muted-foreground">
            <Hammer className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Services coming soon</p>
          </div>
        )}
      </div>
    </div>
  );
}
