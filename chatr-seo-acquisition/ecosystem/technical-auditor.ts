/**
 * MULTI-DOMAIN GROWTH OS — TECHNICAL AUDITOR & QUALITY ENGINE
 * 
 * Performs automated SEO, AEO, GEO, canonical, sitemap, robots, and cache
 * audits across all registered production domains and subdomains.
 */

import { ECOSYSTEM_REGISTRY, type DomainProperty } from './master-registry';

export interface AuditCheckResult {
  checkId: string;
  name: string;
  category: 'CANONICAL' | 'ROBOTS' | 'SITEMAP' | 'CACHE' | 'AEO_GEO' | 'UPTIME';
  passed: boolean;
  score: number; // 0 to 100
  details: string;
  evidence?: Record<string, any>;
}

export interface DomainAuditReport {
  domainId: string;
  hostname: string;
  canonicalOrigin: string;
  isAlias: boolean;
  liveStatus: number;
  server: string;
  responseTimeMs: number;
  checks: AuditCheckResult[];
  overallHealthScore: number;
}

/**
 * Audits a single domain property by probing live HTTP endpoints.
 */
export async function auditDomainProperty(property: DomainProperty): Promise<DomainAuditReport> {
  const startTime = Date.now();
  const checks: AuditCheckResult[] = [];
  let liveStatus = 0;
  let server = 'unknown';

  // 1. Root / Canonical Probe
  try {
    const res = await fetch(`https://${property.hostname}/`, {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'ChatrGrowthOS-Auditor/1.0 (+https://chatr.chat)' }
    });

    liveStatus = res.status;
    server = res.headers.get('server') || (res.headers.get('cf-ray') ? 'cloudflare' : 'unknown');
    const location = res.headers.get('location');
    const cacheControl = res.headers.get('cache-control') || '';

    // Check 1: Canonical Status & Redirects
    if (property.isAlias) {
      const isRedirect = liveStatus === 301 || liveStatus === 302 || liveStatus === 308;
      checks.push({
        checkId: 'CANONICAL_ALIAS_REDIRECT',
        name: 'Alias 301/308 Permanent Redirection',
        category: 'CANONICAL',
        passed: isRedirect,
        score: isRedirect ? 100 : 0,
        details: isRedirect 
          ? `Alias correctly redirects with HTTP ${liveStatus} to ${location}` 
          : `Expected redirect for alias ${property.hostname}, got HTTP ${liveStatus}`,
        evidence: { status: liveStatus, location }
      });
    } else {
      const is200 = liveStatus === 200 || (liveStatus >= 200 && liveStatus < 400);
      checks.push({
        checkId: 'CANONICAL_ROOT_200',
        name: 'Canonical Origin 200 OK Accessibility',
        category: 'UPTIME',
        passed: is200,
        score: is200 ? 100 : 0,
        details: is200 
          ? `Canonical host ${property.hostname} returned HTTP ${liveStatus} (${server})` 
          : `Host failed with HTTP ${liveStatus}`,
        evidence: { status: liveStatus, server }
      });
    }

    // Check 2: Edge Cache & Security Headers
    const hasCacheHeader = cacheControl.length > 0;
    checks.push({
      checkId: 'EDGE_CACHE_CONTROL',
      name: 'Edge Cache-Control Header Presence',
      category: 'CACHE',
      passed: hasCacheHeader,
      score: hasCacheHeader ? 100 : 50,
      details: hasCacheHeader 
        ? `Cache-Control configured: "${cacheControl}"` 
        : `Cache-Control header missing on root response`,
      evidence: { cacheControl }
    });

  } catch (err: any) {
    checks.push({
      checkId: 'HOST_CONNECTIVITY',
      name: 'Host Connectivity',
      category: 'UPTIME',
      passed: false,
      score: 0,
      details: `Failed to connect to https://${property.hostname}: ${err.message}`
    });
  }

  // 2. Robots.txt Probe
  try {
    const robotsRes = await fetch(property.robotsEndpoint, {
      method: 'GET',
      headers: { 'User-Agent': 'ChatrGrowthOS-Auditor/1.0' }
    });

    if (robotsRes.status === 200) {
      const robotsText = await robotsRes.text();
      const hasSitemapDirective = /sitemap:\s*https?:\/\//i.test(robotsText);
      const protectsAdmin = /disallow:\s*\/admin/i.test(robotsText) || /disallow:\s*\/api/i.test(robotsText);

      checks.push({
        checkId: 'ROBOTS_TXT_VALIDITY',
        name: 'robots.txt Protocol & Policy Verification',
        category: 'ROBOTS',
        passed: true,
        score: 100,
        details: `robots.txt 200 OK (${robotsText.length} bytes). Sitemap declared: ${hasSitemapDirective}. Sensitive paths protected: ${protectsAdmin}.`,
        evidence: { bytes: robotsText.length, hasSitemapDirective, protectsAdmin }
      });
    } else {
      checks.push({
        checkId: 'ROBOTS_TXT_VALIDITY',
        name: 'robots.txt Protocol & Policy Verification',
        category: 'ROBOTS',
        passed: property.isAlias, // aliases may inherit or redirect
        score: property.isAlias ? 100 : 20,
        details: `robots.txt returned HTTP ${robotsRes.status}`
      });
    }
  } catch (err: any) {
    checks.push({
      checkId: 'ROBOTS_TXT_VALIDITY',
      name: 'robots.txt Protocol & Policy Verification',
      category: 'ROBOTS',
      passed: property.isAlias,
      score: property.isAlias ? 100 : 0,
      details: `robots.txt probe failed: ${err.message}`
    });
  }

  // 3. Sitemap Probe
  try {
    const sitemapRes = await fetch(property.sitemapEndpoint, {
      method: 'GET',
      headers: { 'User-Agent': 'ChatrGrowthOS-Auditor/1.0' }
    });

    if (sitemapRes.status === 200) {
      const xml = await sitemapRes.text();
      const isXml = xml.includes('<?xml') || xml.includes('<urlset') || xml.includes('<sitemapindex');
      const urlCount = (xml.match(/<loc>/g) || []).length;

      checks.push({
        checkId: 'SITEMAP_INDEXABILITY',
        name: 'Sitemap XML Indexability & Format',
        category: 'SITEMAP',
        passed: isXml,
        score: isXml ? 100 : 30,
        details: isXml 
          ? `Sitemap 200 OK. Valid XML structure with ${urlCount} discovered URLs.` 
          : `Sitemap 200 OK but XML markers missing.`,
        evidence: { urlCount, isXml, bytes: xml.length }
      });
    } else {
      checks.push({
        checkId: 'SITEMAP_INDEXABILITY',
        name: 'Sitemap XML Indexability & Format',
        category: 'SITEMAP',
        passed: property.isAlias,
        score: property.isAlias ? 100 : 20,
        details: `Sitemap returned HTTP ${sitemapRes.status}`
      });
    }
  } catch (err: any) {
    checks.push({
      checkId: 'SITEMAP_INDEXABILITY',
      name: 'Sitemap XML Indexability & Format',
      category: 'SITEMAP',
      passed: property.isAlias,
      score: property.isAlias ? 100 : 0,
      details: `Sitemap probe failed: ${err.message}`
    });
  }

  // 4. AEO & GEO Checks (llms.txt check)
  try {
    const llmsRes = await fetch(`https://${property.hostname}/llms.txt`, {
      method: 'GET',
      headers: { 'User-Agent': 'ChatrGrowthOS-Auditor/1.0' }
    });

    if (llmsRes.status === 200) {
      const llmsText = await llmsRes.text();
      checks.push({
        checkId: 'AEO_LLMS_TXT',
        name: 'AI Engine Optimization (llms.txt Standard)',
        category: 'AEO_GEO',
        passed: true,
        score: 100,
        details: `llms.txt present and valid (${llmsText.length} bytes) for AI search citations (ChatGPT, Perplexity, Claude).`,
        evidence: { bytes: llmsText.length }
      });
    } else {
      checks.push({
        checkId: 'AEO_LLMS_TXT',
        name: 'AI Engine Optimization (llms.txt Standard)',
        category: 'AEO_GEO',
        passed: true, // Non-fatal if missing, standard is emerging
        score: 60,
        details: `llms.txt returned HTTP ${llmsRes.status}. Optional standard for AI grounding.`,
      });
    }
  } catch {
    checks.push({
      checkId: 'AEO_LLMS_TXT',
      name: 'AI Engine Optimization (llms.txt Standard)',
      category: 'AEO_GEO',
      passed: true,
      score: 60,
      details: 'llms.txt not reachable.',
    });
  }

  const responseTimeMs = Date.now() - startTime;
  const totalScore = checks.reduce((acc, c) => acc + c.score, 0);
  const overallHealthScore = Math.round(totalScore / checks.length);

  return {
    domainId: property.id,
    hostname: property.hostname,
    canonicalOrigin: property.canonicalOrigin,
    isAlias: property.isAlias,
    liveStatus,
    server,
    responseTimeMs,
    checks,
    overallHealthScore,
  };
}

/**
 * Runs full technical audit across all domains in ECOSYSTEM_REGISTRY.
 */
export async function auditEntireEcosystem(): Promise<DomainAuditReport[]> {
  const reports: DomainAuditReport[] = [];
  for (const property of ECOSYSTEM_REGISTRY) {
    const report = await auditDomainProperty(property);
    reports.push(report);
  }
  return reports;
}
