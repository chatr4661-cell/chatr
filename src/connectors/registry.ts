import { CONNECTOR_CATALOG } from './catalog';
import type {
  Capability,
  CapabilityGroup,
  Connector,
  ConnectorDefinition,
} from './types';
import { createConnector } from './sdk/createConnector';

/**
 * Connector Registry — single source of truth for what CHATR OS can connect to.
 * Registration is capability-first: the runtime resolves *capabilities* to
 * connectors, never the other way around.
 */
class ConnectorRegistryImpl {
  private connectors = new Map<string, Connector>();

  constructor(definitions: ConnectorDefinition[]) {
    definitions.forEach((definition) => this.register(createConnector(definition)));
  }

  register(connector: Connector): void {
    this.connectors.set(connector.id, connector);
  }

  get(id: string): Connector | undefined {
    return this.connectors.get(id);
  }

  require(id: string): Connector {
    const connector = this.get(id);
    if (!connector) throw new Error(`[ConnectorRegistry] Unknown connector "${id}"`);
    return connector;
  }

  list(): Connector[] {
    return [...this.connectors.values()];
  }

  definitions(): ConnectorDefinition[] {
    return this.list().map((c) => c.definition);
  }

  /** All connectors that can serve a capability (Gmail + Outlook + IMAP for email.read). */
  byCapability(capability: Capability): Connector[] {
    return this.list().filter((c) => c.capabilities.includes(capability));
  }

  byGroup(group: CapabilityGroup): Connector[] {
    return this.list().filter((c) => c.definition.groups.includes(group));
  }

  /** Honest marketplace counts. */
  counts(): Record<'available' | 'coming_soon' | 'community', number> {
    const counts = { available: 0, coming_soon: 0, community: 0 };
    this.definitions().forEach((d) => {
      counts[d.availability] += 1;
    });
    return counts;
  }
}

export const ConnectorRegistry = new ConnectorRegistryImpl(CONNECTOR_CATALOG);
