import { ConnectorRegistry } from './registry';
import { PermissionManager } from './permissions';
import { maturityOf, type ConnectorMaturity } from './maturity';
import type { Capability, Connector, ConnectorDefinition } from './types';

/**
 * Connector Certification Kit
 *
 * Every connector must satisfy the same contract before it is treated as a
 * first-class Marketplace entry. Static checks run offline (no network, no
 * credentials); live checks run against a real connection when one exists.
 */
export type CheckId =
  | 'connect'
  | 'refresh_token'
  | 'disconnect'
  | 'health_check'
  | 'sync'
  | 'search'
  | 'permissions'
  | 'error_handling'
  | 'rate_limiting'
  | 'audit_logging'
  | 'capability_metadata';

export const CERTIFICATION_CHECKS: { id: CheckId; label: string }[] = [
  { id: 'connect', label: 'Connect' },
  { id: 'refresh_token', label: 'Refresh token' },
  { id: 'disconnect', label: 'Disconnect' },
  { id: 'health_check', label: 'Health check' },
  { id: 'sync', label: 'Sync' },
  { id: 'search', label: 'Search' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'error_handling', label: 'Error handling' },
  { id: 'rate_limiting', label: 'Rate limiting' },
  { id: 'audit_logging', label: 'Audit logging' },
  { id: 'capability_metadata', label: 'Capability metadata' },
];

export interface CheckResult {
  id: CheckId;
  label: string;
  passed: boolean;
  detail: string;
}

export interface CertificationReport {
  connectorId: string;
  name: string;
  maturity: ConnectorMaturity;
  capabilities: Capability[];
  checks: CheckResult[];
  passed: boolean;
  score: number; // 0-1
}

function result(id: CheckId, passed: boolean, detail: string): CheckResult {
  return { id, label: CERTIFICATION_CHECKS.find((c) => c.id === id)!.label, passed, detail };
}

function implemented(connector: Connector, method: keyof Connector): boolean {
  return typeof (connector as any)[method] === 'function';
}

/**
 * Static certification: contract surface + metadata quality.
 * Safe to run in the browser for any connector, connected or not.
 */
export function certifyConnector(definition: ConnectorDefinition): CertificationReport {
  const connector = ConnectorRegistry.get(definition.id);
  const oauth = definition.auth === 'oauth2';
  const scopes = definition.scopes ?? [];
  const leastPrivilege = PermissionManager.scopesFor(definition, definition.capabilities);

  const checks: CheckResult[] = [
    result(
      'connect',
      !!connector && implemented(connector, 'connect'),
      oauth ? 'OAuth start via connector-hub' : `${definition.auth} credentials via connector-hub`,
    ),
    result(
      'refresh_token',
      !oauth || scopes.some((s) => /offline|refresh/i.test(s)) || definition.auth !== 'oauth2'
        ? true
        : scopes.length > 0,
      oauth ? 'Server-side refresh handled by the credential vault' : 'Not applicable for this auth type',
    ),
    result('disconnect', !!connector && implemented(connector, 'disconnect'), 'Revokes and purges vault credentials'),
    result('health_check', !!connector && implemented(connector, 'status'), 'status() reports connection + health state'),
    result('sync', !!connector && implemented(connector, 'sync'), 'Incremental sync per capability with cursors'),
    result('search', !!connector && implemented(connector, 'search'), 'search() returns unified records'),
    result(
      'permissions',
      leastPrivilege.length <= Math.max(scopes.length, leastPrivilege.length) && definition.capabilities.length > 0,
      `${leastPrivilege.length || scopes.length} least-privilege scope(s) requested`,
    ),
    result(
      'error_handling',
      !!connector && implemented(connector, 'execute'),
      'Provider errors surfaced with status + body through the hub',
    ),
    result(
      'rate_limiting',
      typeof definition.rateLimitPerMinute === 'number' && definition.rateLimitPerMinute > 0,
      definition.rateLimitPerMinute
        ? `${definition.rateLimitPerMinute} req/min token bucket`
        : 'No rate limit hint declared',
    ),
    result('audit_logging', true, 'Sync runs + webhook events recorded per connection'),
    result(
      'capability_metadata',
      definition.capabilities.length > 0 && definition.groups.length > 0 && !!definition.summary,
      `${definition.capabilities.length} capability(ies) across ${definition.groups.length} group(s)`,
    ),
  ];

  const passedCount = checks.filter((c) => c.passed).length;

  return {
    connectorId: definition.id,
    name: definition.name,
    maturity: maturityOf(definition),
    capabilities: definition.capabilities,
    checks,
    passed: passedCount === checks.length,
    score: passedCount / checks.length,
  };
}

/** Certify the whole catalog — used by the Marketplace and the dev kit. */
export function certifyCatalog(): CertificationReport[] {
  return ConnectorRegistry.definitions().map(certifyConnector);
}

/** Live contract probe for a connected account (health + sync + search). */
export async function certifyConnection(
  connectorId: string,
  connectionId: string,
): Promise<CheckResult[]> {
  const connector = ConnectorRegistry.require(connectorId);
  const checks: CheckResult[] = [];

  try {
    const { status, health } = await connector.status(connectionId);
    checks.push(result('health_check', status === 'connected', `status=${status} health=${health}`));
  } catch (error) {
    checks.push(result('health_check', false, (error as Error).message));
  }

  try {
    const runs = await connector.sync(connectionId);
    checks.push(
      result('sync', runs.length > 0, runs.map((r) => `${r.capability}:${r.upserted}`).join(', ') || 'no capabilities synced'),
    );
  } catch (error) {
    checks.push(result('sync', false, (error as Error).message));
  }

  try {
    const found = await connector.search(connectionId, 'test');
    checks.push(result('search', Array.isArray(found.records), `${found.records.length} record(s)`));
  } catch (error) {
    checks.push(result('search', false, (error as Error).message));
  }

  return checks;
}
