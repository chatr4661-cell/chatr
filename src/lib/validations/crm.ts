import { z } from 'zod';

// Lead validation schema
export const leadSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens and apostrophes'),
  
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  
  company: z.string()
    .trim()
    .max(200, 'Company name must be less than 200 characters')
    .optional()
    .or(z.literal('')),
  
  status: z.enum(['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  
  source: z.enum(['manual', 'chat', 'website', 'referral', 'social', 'advertisement', 'other']),
  
  deal_value: z.number()
    .min(0, 'Deal value must be positive')
    .max(999999999, 'Deal value is too large')
    .optional()
    .default(0),
  
  probability: z.number()
    .min(0, 'Probability must be between 0 and 100')
    .max(100, 'Probability must be between 0 and 100')
    .optional()
    .default(0),
  
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  
  notes: z.string()
    .trim()
    .max(5000, 'Notes must be less than 5000 characters')
    .optional()
    .or(z.literal('')),
  
  tags: z.array(z.string().trim().max(50)).max(10, 'Maximum 10 tags allowed').optional().default([]),
});

// Activity validation schema
export const activitySchema = z.object({
  activity_type: z.enum(['call', 'meeting', 'email', 'note', 'task', 'message']),
  
  subject: z.string()
    .trim()
    .min(1, 'Subject is required')
    .max(200, 'Subject must be less than 200 characters'),
  
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  
  scheduled_at: z.string().optional(),
  
  duration_minutes: z.number()
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration cannot exceed 24 hours')
    .optional(),
  
  outcome: z.string()
    .trim()
    .max(500, 'Outcome must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

export type LeadFormData = z.infer<typeof leadSchema>;
export type ActivityFormData = z.infer<typeof activitySchema>;
