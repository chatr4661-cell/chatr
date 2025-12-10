/**
 * JOB-MATCHING AI AGENT
 * Handles job search, applications, career advice, resume matching
 */

import { AgentType, DetectedIntent } from '../types';
import { memoryLayer } from '../memoryLayer';
import { AgentResponse, AgentContext } from './personalAI';

/**
 * Job-Matching AI Agent
 * Finds jobs, matches skills, helps with applications
 */
class JobAIAgent {
  readonly type: AgentType = 'jobs';
  readonly name = 'Job-Matching AI';

  /**
   * Process a job-related query
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    const { query, intent } = context;
    
    // Detect job-related patterns
    const patterns = this.detectPatterns(query);
    const jobCategory = this.classifyJobCategory(query);
    
    // Build response
    const response = await this.generateResponse(context, patterns, jobCategory);
    
    // Store in memory
    memoryLayer.agentRemember(this.type, `Job search: ${query}`, {
      jobCategory,
      patterns,
      skills: intent.entities.skill,
      timestamp: new Date().toISOString(),
    });
    
    // Track job preferences
    this.trackJobPreferences(query, intent);
    
    return response;
  }

  /**
   * Detect job-related patterns
   */
  private detectPatterns(query: string): string[] {
    const patterns: string[] = [];
    const queryLower = query.toLowerCase();
    
    if (/job|work|position|vacancy|opening|hiring/i.test(queryLower)) patterns.push('job_search');
    if (/apply|application|submit|send resume/i.test(queryLower)) patterns.push('application');
    if (/salary|pay|compensation|ctc|package/i.test(queryLower)) patterns.push('salary');
    if (/resume|cv|portfolio/i.test(queryLower)) patterns.push('resume');
    if (/interview|prepare|question/i.test(queryLower)) patterns.push('interview');
    if (/skill|experience|qualification/i.test(queryLower)) patterns.push('skills');
    if (/remote|work from home|wfh|hybrid/i.test(queryLower)) patterns.push('remote');
    if (/fresher|entry level|no experience/i.test(queryLower)) patterns.push('fresher');
    if (/part.?time|freelance|contract|gig/i.test(queryLower)) patterns.push('flexible');
    if (/career|growth|switch|transition/i.test(queryLower)) patterns.push('career');
    
    return patterns;
  }

  /**
   * Classify job category
   */
  private classifyJobCategory(query: string): string {
    const queryLower = query.toLowerCase();
    
    // Tech & IT
    if (/software|developer|programmer|coding|engineer/i.test(queryLower)) return 'tech';
    if (/data|analyst|science|machine learning|ai/i.test(queryLower)) return 'data';
    if (/design|ui|ux|graphic|creative/i.test(queryLower)) return 'design';
    
    // Business
    if (/marketing|sales|business development|bd/i.test(queryLower)) return 'sales_marketing';
    if (/finance|accounting|ca|chartered/i.test(queryLower)) return 'finance';
    if (/hr|human resource|recruitment/i.test(queryLower)) return 'hr';
    if (/manager|management|lead|director/i.test(queryLower)) return 'management';
    
    // Healthcare
    if (/doctor|nurse|medical|healthcare|pharma/i.test(queryLower)) return 'healthcare';
    
    // Education
    if (/teacher|professor|education|tutor|faculty/i.test(queryLower)) return 'education';
    
    // Others
    if (/driver|delivery|logistics/i.test(queryLower)) return 'logistics';
    if (/customer|support|service/i.test(queryLower)) return 'customer_support';
    if (/content|writer|editor|copywriter/i.test(queryLower)) return 'content';
    if (/legal|lawyer|advocate/i.test(queryLower)) return 'legal';
    
    return 'general';
  }

  /**
   * Generate job-focused response
   */
  private async generateResponse(
    context: AgentContext,
    patterns: string[],
    jobCategory: string
  ): Promise<AgentResponse> {
    const { query, intent } = context;
    const actions: AgentResponse['actions'] = [];
    let confidence = 0.8;
    let message = '';
    
    const location = intent.entities.location || '';
    const skill = intent.entities.skill || '';
    const categoryName = this.getCategoryDisplayName(jobCategory);
    
    // Handle job search
    if (patterns.includes('job_search')) {
      message = `I'm searching for ${categoryName} jobs${location ? ` in ${location}` : ''}${skill ? ` requiring ${skill}` : ''}. `;
      
      // Add remote filter
      if (patterns.includes('remote')) {
        message += `Filtering for remote/WFH opportunities. `;
      }
      
      // Add fresher filter
      if (patterns.includes('fresher')) {
        message += `Looking for entry-level positions that welcome freshers. `;
      }
      
      confidence = 0.85;
    }
    
    // Handle job application
    if (patterns.includes('application')) {
      const jobId = this.extractJobId(query);
      actions.push({
        type: 'apply_job',
        data: {
          jobId: jobId || 'pending',
          category: jobCategory,
          location,
        },
        ready: !!jobId,
      });
      message += `Ready to help you apply! `;
      confidence = 0.9;
    }
    
    // Handle salary queries
    if (patterns.includes('salary')) {
      message += `I can show salary ranges for ${categoryName} positions. `;
      confidence = 0.75;
    }
    
    // Handle resume help
    if (patterns.includes('resume')) {
      message += `I can help optimize your resume for ${categoryName} roles. Would you like tips?`;
      confidence = 0.8;
    }
    
    // Handle interview preparation
    if (patterns.includes('interview')) {
      message += `Let me help you prepare for your ${categoryName} interview with common questions and tips.`;
      confidence = 0.85;
    }
    
    // Handle career advice
    if (patterns.includes('career')) {
      message += `I can provide career guidance for transitioning into ${categoryName}. What's your current background?`;
      confidence = 0.75;
    }
    
    // Default message
    if (!message) {
      message = `I'm here to help with your job search. Looking for ${categoryName} opportunities? Tell me more about your skills and preferences.`;
    }
    
    // Add navigation to job listings
    actions.push({
      type: 'navigate',
      data: {
        destination: '/chatr-world/jobs',
        query: query,
        filters: {
          category: jobCategory,
          location,
          remote: patterns.includes('remote'),
          fresher: patterns.includes('fresher'),
        },
      },
      ready: true,
    });
    
    return {
      message: message.trim(),
      confidence,
      actions,
      metadata: {
        patterns,
        jobCategory,
        matchedSkills: skill ? [skill] : [],
      },
    };
  }

  /**
   * Extract job ID from query
   */
  private extractJobId(query: string): string | null {
    const match = query.match(/job[_\\-\\s]?id[:\s]*(\w+)/i) || 
                  query.match(/apply[:\s]*(\w{8,})/i);
    return match ? match[1] : null;
  }

  /**
   * Get display name for category
   */
  private getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
      tech: 'Software & IT',
      data: 'Data & Analytics',
      design: 'Design & Creative',
      sales_marketing: 'Sales & Marketing',
      finance: 'Finance & Accounting',
      hr: 'Human Resources',
      management: 'Management',
      healthcare: 'Healthcare',
      education: 'Education',
      logistics: 'Logistics & Delivery',
      customer_support: 'Customer Support',
      content: 'Content & Writing',
      legal: 'Legal',
      general: 'all',
    };
    return names[category] || category;
  }

  /**
   * Track job preferences in memory
   */
  private trackJobPreferences(query: string, intent: DetectedIntent): void {
    const jobPrefs = memoryLayer.getPreference<{
      skills: string[];
      locations: string[];
      categories: string[];
    }>('job_preferences') || { skills: [], locations: [], categories: [] };
    
    if (intent.entities.skill && !jobPrefs.skills.includes(intent.entities.skill)) {
      jobPrefs.skills.push(intent.entities.skill);
    }
    
    if (intent.entities.location && !jobPrefs.locations.includes(intent.entities.location)) {
      jobPrefs.locations.push(intent.entities.location);
    }
    
    const category = this.classifyJobCategory(query);
    if (category !== 'general' && !jobPrefs.categories.includes(category)) {
      jobPrefs.categories.push(category);
    }
    
    memoryLayer.inferPreference('job_preferences', jobPrefs);
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): string[] {
    return [
      'Search job listings',
      'Apply for positions',
      'Resume optimization',
      'Interview preparation',
      'Salary insights',
      'Career advice',
    ];
  }
}

export const jobAI = new JobAIAgent();
