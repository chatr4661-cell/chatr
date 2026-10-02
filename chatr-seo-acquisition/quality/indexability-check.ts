/**
 * QUALITY CHECK 5: Technical Indexability & Core Link Check
 *
 * Invariant: Verifies title length, meta description length, canonical tag,
 * single H1, robots indexability, and clean deep link to the frozen core.
 */

export interface PageMetadata {
  title: string;
  description: string;
  canonicalUrl: string;
  h1: string;
  internalLinksCount: number;
  coreCtaUrl: string;
  noIndex: boolean;
}

export interface IndexabilityCheckResult {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export function checkIndexability(meta: PageMetadata): IndexabilityCheckResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Title checks
  if (!meta.title || meta.title.length < 25) {
    errors.push(`Title is too short (${meta.title?.length || 0} chars, minimum is 25).`);
  } else if (meta.title.length > 70) {
    warnings.push(`Title is long (${meta.title.length} chars, recommended <= 65).`);
  }

  // Description checks
  if (!meta.description || meta.description.length < 100) {
    errors.push(`Description is too short (${meta.description?.length || 0} chars, minimum is 100).`);
  } else if (meta.description.length > 170) {
    warnings.push(`Description is long (${meta.description.length} chars, recommended <= 160).`);
  }

  // Canonical checks
  if (!meta.canonicalUrl || !meta.canonicalUrl.startsWith('https://')) {
    errors.push('Canonical URL must be an absolute HTTPS URL.');
  }

  // H1 checks
  if (!meta.h1 || meta.h1.trim().length < 5) {
    errors.push('Missing or empty primary H1 header.');
  }

  // Robots check
  if (meta.noIndex) {
    errors.push('Page is marked noindex.');
  }

  // Internal link graph check
  if (meta.internalLinksCount < 3) {
    errors.push(`Insufficient internal link graph (${meta.internalLinksCount} < 3 required).`);
  }

  // Core CTA check (Hand-off must point to existing frozen Chatr URLs)
  const validCorePrefixes = ['/', '/auth', '/chat', '/download', '/help'];
  const hasValidCoreCta = validCorePrefixes.some((p) => meta.coreCtaUrl === p || meta.coreCtaUrl.startsWith(`${p}?`));
  if (!hasValidCoreCta) {
    errors.push(`Invalid Core CTA target "${meta.coreCtaUrl}". Must deep link to existing Chatr core endpoints.`);
  }

  return {
    passed: errors.length === 0,
    errors,
    warnings
  };
}
