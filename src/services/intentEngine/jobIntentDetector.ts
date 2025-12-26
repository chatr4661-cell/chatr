/**
 * Job Intent Detector - Recognizes job search intent from natural language
 * Part of CHATR Action Engine - Intent → Execution
 */

export interface JobIntent {
  isJobSearch: boolean;
  confidence: number;
  extractedData: {
    location?: string;
    jobType?: 'full-time' | 'part-time' | 'freelance' | 'wfh' | 'internship';
    urgency: 'immediate' | 'normal' | 'low';
    experienceLevel?: 'fresher' | 'experienced' | 'senior';
    salary?: { min?: number; max?: number };
    skills?: string[];
    category?: string;
  };
  suggestedFilters: string[];
}

// Job-related patterns
const JOB_PATTERNS = [
  // Direct job mentions
  /\b(job|jobs|work|vacancy|vacancies|opening|openings|career|careers|hiring|hire|employment|employ)\b/i,
  // Need/want patterns
  /\b(need|want|looking\s+for|searching\s+for|find|finding)\s+(a\s+)?(job|work|employment)\b/i,
  // Role patterns
  /\b(developer|engineer|manager|executive|assistant|driver|delivery|teacher|nurse|doctor|chef|cook|sales|marketing|analyst|designer|accountant|clerk|operator|technician|mechanic|electrician|plumber)\b/i,
  // Salary patterns
  /\b(salary|pay|earning|income|₹|rs\.?|rupees?|lakh|lpa|monthly|per\s+month|ctc)\b/i,
  // Experience patterns
  /\b(fresher|freshers|experienced|experience|years?\s+exp|yrs?\s+exp)\b/i,
  // Work type patterns
  /\b(full[\s-]?time|part[\s-]?time|wfh|work\s+from\s+home|remote|freelance|contract|internship|intern)\b/i,
];

// Location patterns for India
const LOCATION_PATTERNS = [
  /\b(in|at|near|around)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/,
  /\b(delhi|mumbai|bangalore|bengaluru|chennai|hyderabad|pune|kolkata|noida|gurgaon|gurugram|ahmedabad|jaipur|lucknow|chandigarh|indore|bhopal|patna|ranchi|bhubaneswar|thiruvananthapuram|kochi|coimbatore|vadodara|surat|nagpur|visakhapatnam|vijayawada)\b/i,
];

// Job type patterns
const JOB_TYPE_PATTERNS: Record<string, RegExp> = {
  'full-time': /\b(full[\s-]?time|permanent|regular)\b/i,
  'part-time': /\b(part[\s-]?time)\b/i,
  'wfh': /\b(wfh|work\s+from\s+home|remote|work\s+remotely)\b/i,
  'freelance': /\b(freelance|freelancing|contract|gig)\b/i,
  'internship': /\b(internship|intern|trainee)\b/i,
};

// Experience level patterns
const EXPERIENCE_PATTERNS: Record<string, RegExp> = {
  'fresher': /\b(fresher|freshers|fresh\s+graduate|no\s+experience|0\s+years?|first\s+job)\b/i,
  'experienced': /\b(experienced|[1-5]\s*years?\s*(exp|experience)?|mid[\s-]?level)\b/i,
  'senior': /\b(senior|[5-9]\d*\s*years?\s*(exp|experience)?|lead|manager|head)\b/i,
};

// Category mapping
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  'IT & Software': ['developer', 'software', 'programmer', 'coding', 'tech', 'it', 'engineer', 'devops', 'data', 'ai', 'ml'],
  'Sales & Marketing': ['sales', 'marketing', 'business development', 'bd', 'digital marketing', 'seo', 'advertising'],
  'Healthcare': ['doctor', 'nurse', 'medical', 'healthcare', 'hospital', 'pharma', 'pharmacy', 'lab'],
  'Education': ['teacher', 'tutor', 'professor', 'lecturer', 'education', 'training', 'coaching'],
  'Finance': ['accountant', 'finance', 'banking', 'ca', 'accounts', 'audit', 'taxation'],
  'Delivery & Logistics': ['delivery', 'driver', 'logistics', 'courier', 'warehouse', 'supply chain'],
  'Hospitality': ['chef', 'cook', 'hotel', 'restaurant', 'hospitality', 'food', 'catering'],
  'Customer Support': ['customer', 'support', 'call center', 'bpo', 'telecaller', 'helpdesk'],
  'Design': ['designer', 'ui', 'ux', 'graphic', 'creative', 'photoshop', 'figma'],
  'Construction': ['construction', 'civil', 'architect', 'site', 'builder', 'contractor'],
};

// Urgency indicators
const URGENCY_PATTERNS = {
  immediate: /\b(urgent|urgently|immediately|today|asap|now|quick|fast)\b/i,
  low: /\b(eventually|sometime|later|maybe|exploring|browsing)\b/i,
};

/**
 * Detect job search intent from a query
 */
export function detectJobIntent(query: string): JobIntent {
  const normalizedQuery = query.toLowerCase().trim();
  
  // Check if it's a job search
  let matchCount = 0;
  for (const pattern of JOB_PATTERNS) {
    if (pattern.test(normalizedQuery)) {
      matchCount++;
    }
  }
  
  const isJobSearch = matchCount >= 1;
  const confidence = Math.min(matchCount / 3, 1); // Max confidence at 3 matches
  
  if (!isJobSearch) {
    return {
      isJobSearch: false,
      confidence: 0,
      extractedData: { urgency: 'normal' },
      suggestedFilters: [],
    };
  }
  
  // Extract location
  let location: string | undefined;
  for (const pattern of LOCATION_PATTERNS) {
    const match = query.match(pattern);
    if (match) {
      location = match[2] || match[1] || match[0];
      // Capitalize properly
      location = location.charAt(0).toUpperCase() + location.slice(1).toLowerCase();
      break;
    }
  }
  
  // Extract job type
  let jobType: JobIntent['extractedData']['jobType'];
  for (const [type, pattern] of Object.entries(JOB_TYPE_PATTERNS)) {
    if (pattern.test(normalizedQuery)) {
      jobType = type as JobIntent['extractedData']['jobType'];
      break;
    }
  }
  
  // Extract experience level
  let experienceLevel: JobIntent['extractedData']['experienceLevel'];
  for (const [level, pattern] of Object.entries(EXPERIENCE_PATTERNS)) {
    if (pattern.test(normalizedQuery)) {
      experienceLevel = level as JobIntent['extractedData']['experienceLevel'];
      break;
    }
  }
  
  // Extract category
  let category: string | undefined;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => normalizedQuery.includes(kw))) {
      category = cat;
      break;
    }
  }
  
  // Determine urgency
  let urgency: JobIntent['extractedData']['urgency'] = 'normal';
  if (URGENCY_PATTERNS.immediate.test(normalizedQuery)) {
    urgency = 'immediate';
  } else if (URGENCY_PATTERNS.low.test(normalizedQuery)) {
    urgency = 'low';
  }
  
  // Generate suggested filters based on missing data
  const suggestedFilters: string[] = [];
  if (!jobType) {
    suggestedFilters.push('Full-time', 'Part-time', 'Work from Home', 'Fresher-friendly');
  }
  if (!location) {
    suggestedFilters.push('Near me', 'Remote only');
  }
  if (!experienceLevel) {
    suggestedFilters.push('Fresher', '1-3 years', '3-5 years');
  }
  suggestedFilters.push('Urgent hiring', 'Top companies');
  
  return {
    isJobSearch,
    confidence,
    extractedData: {
      location,
      jobType,
      urgency,
      experienceLevel,
      category,
    },
    suggestedFilters: suggestedFilters.slice(0, 6), // Max 6 filters
  };
}

/**
 * Quick check if query might be job-related (faster than full detection)
 */
export function isLikelyJobQuery(query: string): boolean {
  const q = query.toLowerCase();
  return JOB_PATTERNS.slice(0, 3).some(p => p.test(q));
}
