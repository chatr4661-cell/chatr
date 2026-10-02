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
  const rootSchemas = Array.isArray(schemaData) ? schemaData : [schemaData];
  const schemaTypesFound: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rootSchemas.length; i++) {
    const s = rootSchemas[i];

    if (!s['@context'] || typeof s['@context'] !== 'string' || !s['@context'].includes('schema.org')) {
      errors.push(`Schema #${i + 1} missing valid @context ('https://schema.org')`);
    }

    const itemsToCheck: Array<Record<string, unknown>> = [];
    if (Array.isArray(s['@graph'])) {
      for (const node of s['@graph']) {
        if (typeof node === 'object' && node !== null) {
          itemsToCheck.push(node as Record<string, unknown>);
        }
      }
    } else {
      itemsToCheck.push(s);
    }

    for (const item of itemsToCheck) {
      if (!item['@type'] || typeof item['@type'] !== 'string') {
        errors.push(`Schema item missing @type`);
        continue;
      }

      schemaTypesFound.push(item['@type']);

      // Check specific schema types
      if (item['@type'] === 'JobPosting') {
        if (!item['title']) errors.push('JobPosting missing required property: title');
        if (!item['description']) errors.push('JobPosting missing required property: description');
        if (!item['hiringOrganization']) errors.push('JobPosting missing required property: hiringOrganization');
      }

      if (item['@type'] === 'FAQPage') {
        if (!Array.isArray(item['mainEntity']) || item['mainEntity'].length === 0) {
          errors.push('FAQPage missing non-empty mainEntity array');
        }
      }

      if (item['@type'] === 'LocalBusiness' || item['@type'] === 'Organization') {
        if (!item['name']) errors.push(`${item['@type']} missing required property: name`);
      }
    }
  }

  return {
    passed: errors.length === 0 && schemaTypesFound.length > 0,
    schemaTypesFound,
    errors
  };
}
