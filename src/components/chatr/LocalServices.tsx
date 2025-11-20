import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Briefcase, Percent, Hammer, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function LocalServices() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'jobs' | 'deals' | 'services'>('jobs');

  const jobs = [
    { id: '1', title: 'Senior Software Engineer', company: 'Tech Solutions Pvt Ltd', location: 'Karachi', salary: 'PKR 150k-200k/month', type: 'Full-time' },
    { id: '2', title: 'Graphic Designer', company: 'Creative Studio', location: 'Lahore', salary: 'PKR 80k-120k/month', type: 'Full-time' },
    { id: '3', title: 'Data Analyst', company: 'Analytics Inc', location: 'Islamabad', salary: 'PKR 100k-150k/month', type: 'Remote' },
  ];

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
            {jobs.map((job) => (
              <div 
                key={job.id} 
                className="bg-white rounded-xl p-4 shadow-sm border border-border cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/job/${job.id}`)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{job.title}</h3>
                    <p className="text-sm text-primary font-medium">{job.company}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Briefcase className="w-4 h-4" />
                    {job.type}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-primary">{job.salary}</span>
                  <Button size="sm" onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/job/${job.id}`);
                  }}>View Details</Button>
                </div>
              </div>
            ))}
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
