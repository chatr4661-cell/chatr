/**
 * QUALITY CHECK 4: Valid Structured Data & Schema Check
 *
 * Invariant: Every generated acquisition page must contain valid JSON-LD
 * schema that adheres to schema.org and Google Search guidelines.
 */

export interface SchemaCheckResult {
  passed: boolean;
  schemaTypesFound: string[];
  errors: string[];
}

export function checkStructuredData(schemaData: Record<string, unknown> | Array<Record<string, unknown>>): SchemaCheckResult {
  const schemas = Array.isArray(schemaData) ? schemaData : [schemaData];
  const schemaTypesFound: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < schemas.length; i++) {
    const s = schemas[i];

    if (!s['@context'] || typeof s['@context'] !== 'string' || !s['@context'].includes('schema.org')) {
      errors.push(`Schema #${i + 1} missing valid @context ('https://schema.org')`);
    }

    if (!s['@type'] || typeof s['@type'] !== 'string') {
      errors.push(`Schema #${i + 1} missing @type`);
      continue;
    }

    schemaTypesFound.push(s['@type']);

    // Check specific schema types
    if (s['@type'] === 'JobPosting') {
      if (!s['title']) errors.push('JobPosting missing required property: title');
      if (!s['description']) errors.push('JobPosting missing required property: description');
      if (!s['hiringOrganization']) errors.push('JobPosting missing required property: hiringOrganization');
    }

    if (s['@type'] === 'FAQPage') {
      if (!Array.isArray(s['mainEntity']) || s['mainEntity'].length === 0) {
        errors.push('FAQPage missing non-empty mainEntity array');
      }
    }

    if (s['@type'] === 'LocalBusiness' || s['@type'] === 'Organization') {
      if (!s['name']) errors.push(`${s['@type']} missing required property: name`);
    }
  }

  return {
    passed: errors.length === 0 && schemaTypesFound.length > 0,
    schemaTypesFound,
    errors
  };
}
