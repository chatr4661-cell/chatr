import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, MapPin, Briefcase, DollarSign, Clock, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function JobDetail() {
  const navigate = useNavigate();
  const { id } = useParams();

  const job = {
    id: '1',
    title: 'Senior Software Engineer',
    company: 'Tech Solutions Pvt Ltd',
    location: 'Karachi, Pakistan',
    salary: 'PKR 150,000 - 200,000/month',
    type: 'Full-time',
    postedAt: '2 days ago',
    description: `We are looking for a talented Senior Software Engineer to join our growing team. You will be responsible for designing, developing, and maintaining high-quality software solutions.

Key Responsibilities:
• Design and implement scalable software solutions
• Lead technical discussions and code reviews
• Mentor junior developers
• Collaborate with cross-functional teams
• Ensure code quality and best practices

Requirements:
• 5+ years of experience in software development
• Strong proficiency in React, Node.js, and TypeScript
• Experience with cloud platforms (AWS/Azure)
• Excellent problem-solving skills
• Good communication and teamwork abilities

Benefits:
• Competitive salary
• Health insurance
• Flexible working hours
• Remote work options
• Professional development opportunities`,
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-r from-primary via-primary-glow to-primary text-white p-4 shadow-lg">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold">Job Details</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2">{job.title}</h2>
                <p className="text-lg text-primary font-semibold">{job.company}</p>
              </div>
              <button className="p-2 rounded-full hover:bg-accent">
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{job.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">{job.salary}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Briefcase className="w-4 h-4" />
                <span className="text-sm">{job.type}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span className="text-sm">Posted {job.postedAt}</span>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="font-semibold text-lg mb-3">Job Description</h3>
              <div className="prose prose-sm max-w-none">
                <p className="whitespace-pre-line text-muted-foreground">{job.description}</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-accent/20 border-t border-border flex gap-3">
            <Button variant="outline" className="flex-1">
              Save Job
            </Button>
            <Button className="flex-1">
              Apply Now
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
