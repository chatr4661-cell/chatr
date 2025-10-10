import { z } from 'zod';

/**
 * Production-ready input validation schemas
 * Prevents injection attacks and ensures data integrity
 */

export const messageSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message too long (max 10,000 characters)'),
  media_url: z.string().url().optional().or(z.literal('')),
  location_latitude: z.number().min(-90).max(90).optional(),
  location_longitude: z.number().min(-180).max(180).optional(),
});

export const profileSchema = z.object({
  username: z.string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be less than 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  bio: z.string()
    .trim()
    .max(500, 'Bio must be less than 500 characters')
    .optional(),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email too long'),
  phone_number: z.string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
    .optional(),
});

export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be less than 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const groupNameSchema = z.string()
  .trim()
  .min(3, 'Group name must be at least 3 characters')
  .max(100, 'Group name must be less than 100 characters');

export const sanitizeHtml = (input: string): string => {
  // Basic HTML sanitization - remove script tags and dangerous attributes
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/on\w+='[^']*'/gi, '');
};

export const sanitizeUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }
    return parsed.toString();
  } catch {
    return '';
  }
};

export const useInputValidation = () => {
  const validateMessage = (content: string, mediaUrl?: string) => {
    return messageSchema.safeParse({ 
      content, 
      media_url: mediaUrl 
    });
  };

  const validateProfile = (data: any) => {
    return profileSchema.safeParse(data);
  };

  const validatePassword = (password: string) => {
    return passwordSchema.safeParse(password);
  };

  const validateGroupName = (name: string) => {
    return groupNameSchema.safeParse(name);
  };

  return {
    validateMessage,
    validateProfile,
    validatePassword,
    validateGroupName,
    sanitizeHtml,
    sanitizeUrl,
  };
};
