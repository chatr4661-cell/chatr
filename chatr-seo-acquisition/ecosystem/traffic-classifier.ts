/**
 * MULTI-DOMAIN GROWTH OS — TRAFFIC CLASSIFIER & VERIFICATION ENGINE
 * 
 * Accurately classifies multi-domain HTTP traffic into 4 mutually exclusive categories:
 *  1. SEARCH_ENGINE_CRAWLER (Legitimate search indexers - Googlebot, Bingbot)
 *  2. AI_GROUNDING_CRAWLER (Authorized AI search/grounding - ClaudeBot, GPTBot, Perplexity)
 *  3. AUTOMATED_SCRAPER_NOISE (Aggressive bots, scrapers, headless spiders)
 *  4. VERIFIED_HUMAN_SESSION (Real users with active browser interaction & telemetry)
 * 
 * CORE PRINCIPLE:
 * Cloudflare request spikes and edge transfers must NEVER be treated as human visitors.
 * Only Layer 4 verified human sessions are counted in acquisition, conversion, and CAC models.
 */

export type TrafficCategory = 
  | 'SEARCH_ENGINE_CRAWLER'
  | 'AI_GROUNDING_CRAWLER'
  | 'AUTOMATED_SCRAPER_NOISE'
  | 'VERIFIED_HUMAN_SESSION';

export interface TrafficEvaluationInput {
  userAgent: string;
  ipAddress?: string;
  requestPath: string;
  httpMethod: string;
  hasClientSessionCookie: boolean;
  hasHumanInteractionTelemetry?: boolean;
  dwellTimeSeconds?: number;
  jsExecuted?: boolean;
  secChUa?: string;
  referer?: string;
}

export interface TrafficClassificationResult {
  category: TrafficCategory;
  confidenceScore: number; // 0.0 to 1.0
  isCountableAsHumanVisitor: boolean;
  botFamily?: string;
  rationale: string;
  recommendedCachePolicy: 'SERVE_EDGE_CACHE' | 'SERVE_DYNAMIC' | 'RATE_LIMIT_CHALLENGE';
}

const SEARCH_ENGINE_PATTERNS: Array<{ family: string; pattern: RegExp }> = [
  { family: 'Googlebot', pattern: /googlebot|google-inspectiontool|adsbot-google|mediapartners-google/i },
  { family: 'Bingbot', pattern: /bingbot|msnbot|bingpreview/i },
  { family: 'Yandex', pattern: /yandexbot|yandexaccessibility/i },
  { family: 'DuckDuckGo', pattern: /duckduckbot/i },
  { family: 'Baidu', pattern: /baiduspider/i },
];

const AI_GROUNDING_PATTERNS: Array<{ family: string; pattern: RegExp }> = [
  { family: 'OAI-SearchBot', pattern: /oai-searchbot/i },
  { family: 'GPTBot', pattern: /gptbot/i },
  { family: 'Google-Extended', pattern: /google-extended/i },
  { family: 'ClaudeBot', pattern: /claudebot|anthropic-ai/i },
  { family: 'PerplexityBot', pattern: /perplexitybot/i },
  { family: 'Cohere', pattern: /cohere-ai/i },
  { family: 'Applebot-Extended', pattern: /applebot-extended/i },
];

const SUSPICIOUS_SCRAPER_PATTERNS: Array<{ family: string; pattern: RegExp }> = [
  { family: 'Python-Scraper', pattern: /python-requests|aiohttp|urllib|scrapy|mechanize/i },
  { family: 'CLI-Tool', pattern: /curl\/|wget\/|httpie|postmanruntime|insomnia/i },
  { family: 'Headless-Spider', pattern: /headlesschrome|phantomjs|puppeteer|playwright|selenium/i },
  { family: 'Generic-Bot', pattern: /semrushbot|ahrefsbot|mj12bot|dotbot|petalbot|bytespider/i },
];

/**
 * Classifies an incoming web request or telemetry log entry.
 */
export function classifyTraffic(input: TrafficEvaluationInput): TrafficClassificationResult {
  const ua = input.userAgent || '';

  // 1. Check for Legitimate Search Crawlers
  for (const bot of SEARCH_ENGINE_PATTERNS) {
    if (bot.pattern.test(ua)) {
      return {
        category: 'SEARCH_ENGINE_CRAWLER',
        confidenceScore: 0.99,
        isCountableAsHumanVisitor: false,
        botFamily: bot.family,
        rationale: `Verified search engine indexing robot (${bot.family}). Obey robots.txt and sitemap.`,
        recommendedCachePolicy: 'SERVE_EDGE_CACHE',
      };
    }
  }

  // 2. Check for Authorized AI Grounding Crawlers
  for (const bot of AI_GROUNDING_PATTERNS) {
    if (bot.pattern.test(ua)) {
      return {
        category: 'AI_GROUNDING_CRAWLER',
        confidenceScore: 0.95,
        isCountableAsHumanVisitor: false,
        botFamily: bot.family,
        rationale: `Authorized AI search / knowledge retrieval crawler (${bot.family}).`,
        recommendedCachePolicy: 'SERVE_EDGE_CACHE',
      };
    }
  }

  // 3. Check for Known Scrapers & Crawl Waste
  for (const bot of SUSPICIOUS_SCRAPER_PATTERNS) {
    if (bot.pattern.test(ua)) {
      return {
        category: 'AUTOMATED_SCRAPER_NOISE',
        confidenceScore: 0.92,
        isCountableAsHumanVisitor: false,
        botFamily: bot.family,
        rationale: `Automated scraper / crawler waste detected (${bot.family}). Exclude from all growth reports.`,
        recommendedCachePolicy: 'RATE_LIMIT_CHALLENGE',
      };
    }
  }

  // 4. Human Session Verification Heuristics
  const hasBrowserFeatures = input.jsExecuted === true || (input.secChUa && input.secChUa.length > 5);
  const hasUserInteraction = input.hasHumanInteractionTelemetry === true || (input.dwellTimeSeconds && input.dwellTimeSeconds >= 10);
  const hasActiveSession = input.hasClientSessionCookie === true;

  if (hasBrowserFeatures && (hasUserInteraction || hasActiveSession)) {
    return {
      category: 'VERIFIED_HUMAN_SESSION',
      confidenceScore: 0.98,
      isCountableAsHumanVisitor: true,
      rationale: 'Verified human visitor: confirmed browser execution, interaction events, and realistic dwell time.',
      recommendedCachePolicy: 'SERVE_DYNAMIC',
    };
  }

  // 5. Ambiguous / Single Request Edge Hits (e.g. unhydrated bounce or unknown bot)
  if (!input.hasClientSessionCookie && !input.hasHumanInteractionTelemetry && (!input.dwellTimeSeconds || input.dwellTimeSeconds < 2)) {
    return {
      category: 'AUTOMATED_SCRAPER_NOISE',
      confidenceScore: 0.75,
      isCountableAsHumanVisitor: false,
      botFamily: 'Unverified-Single-Hit',
      rationale: 'Sub-2-second unhydrated edge hit with no interaction telemetry. Filtered out as automated or phantom bounce.',
      recommendedCachePolicy: 'SERVE_EDGE_CACHE',
    };
  }

  // Default fallback for real browsers before interaction telemetry is fully received
  return {
    category: 'VERIFIED_HUMAN_SESSION',
    confidenceScore: 0.80,
    isCountableAsHumanVisitor: true,
    rationale: 'Standard browser request with initial user headers awaiting deep interaction heartbeat.',
    recommendedCachePolicy: 'SERVE_DYNAMIC',
  };
}

/**
 * Filter and compute real human vs bot statistics from a telemetry dataset.
 */
export function summarizeTrafficQuality(events: TrafficEvaluationInput[]): {
  totalRequests: number;
  verifiedHumanSessions: number;
  searchEngineCrawls: number;
  aiGroundingCrawls: number;
  automatedScraperNoise: number;
  humanSharePercent: string;
  botNoiseSharePercent: string;
} {
  let human = 0;
  let search = 0;
  let ai = 0;
  let scraper = 0;

  for (const ev of events) {
    const res = classifyTraffic(ev);
    if (res.category === 'VERIFIED_HUMAN_SESSION') human++;
    else if (res.category === 'SEARCH_ENGINE_CRAWLER') search++;
    else if (res.category === 'AI_GROUNDING_CRAWLER') ai++;
    else scraper++;
  }

  const total = events.length || 1;
  return {
    totalRequests: events.length,
    verifiedHumanSessions: human,
    searchEngineCrawls: search,
    aiGroundingCrawls: ai,
    automatedScraperNoise: scraper,
    humanSharePercent: `${((human / total) * 100).toFixed(1)}%`,
    botNoiseSharePercent: `${(((search + ai + scraper) / total) * 100).toFixed(1)}%`,
  };
}
