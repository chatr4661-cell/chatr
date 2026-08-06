import type { ConnectorDefinition } from './types';

/**
 * Connector maturity — what a customer can rely on.
 * Kept as metadata beside the catalog so definitions stay declarative.
 *
 * production — fully supported and monitored
 * beta       — stable, feedback welcome
 * preview    — functional but evolving
 * community  — third-party maintained
 */
export type ConnectorMaturity = 'production' | 'beta' | 'preview' | 'community';

export const MATURITY_LABEL: Record<ConnectorMaturity, string> = {
  production: 'Production',
  beta: 'Beta',
  preview: 'Preview',
  community: 'Community',
};

export const MATURITY_BLURB: Record<ConnectorMaturity, string> = {
  production: 'Fully supported and monitored.',
  beta: 'Stable — feedback welcome.',
  preview: 'Functional but still evolving.',
  community: 'Maintained by the community.',
};

/** Explicit overrides; anything absent is derived from availability. */
const OVERRIDES: Record<string, ConnectorMaturity> = {
  gmail: 'production',
  google_calendar: 'production',
  google_drive: 'production',
  google_contacts: 'production',
  google_meet: 'beta',
  outlook: 'production',
  outlook_calendar: 'production',
  onedrive: 'beta',
  microsoft_teams: 'beta',
  slack: 'production',
  discord: 'preview',
  github: 'production',
  gitlab: 'preview',
  jira: 'beta',
  confluence: 'preview',
  notion: 'beta',
  trello: 'preview',
  asana: 'beta',
  linkedin: 'preview',
  salesforce: 'beta',
  hubspot: 'beta',
  zoom: 'beta',
  stripe: 'production',
  razorpay: 'production',
  dropbox: 'beta',
  imap: 'preview',
};

export function maturityOf(definition: ConnectorDefinition): ConnectorMaturity {
  const override = OVERRIDES[definition.id];
  if (override) return override;
  if (definition.availability === 'community') return 'community';
  if (definition.availability === 'coming_soon') return 'preview';
  return 'beta';
}

export function maturityCounts(
  definitions: ConnectorDefinition[],
): Record<ConnectorMaturity, number> {
  const counts: Record<ConnectorMaturity, number> = {
    production: 0,
    beta: 0,
    preview: 0,
    community: 0,
  };
  definitions.forEach((d) => {
    counts[maturityOf(d)] += 1;
  });
  return counts;
}
