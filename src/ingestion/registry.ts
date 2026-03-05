import { SourceAdapter } from './types.js';
import { Config } from '../config.js';

/**
 * Manages the lifecycle and execution of all configured source adapters.
 */
export class SourceRegistry {
    private adapters = new Map<string, SourceAdapter>();

    /**
     * Registers a new adapter instance.
     */
    register(adapter: SourceAdapter): void {
        if (this.adapters.has(adapter.id)) {
            throw new Error(`Adapter with id '${adapter.id}' is already registered.`);
        }
        this.adapters.set(adapter.id, adapter);
    }

    /**
     * Retrieves an adapter by its ID.
     */
    getAdapter(id: string): SourceAdapter | undefined {
        return this.adapters.get(id);
    }

    /**
     * Returns all registered adapters.
     */
    getAllAdapters(): SourceAdapter[] {
        return Array.from(this.adapters.values());
    }

    /**
     * Initializes all registered adapters that have matching configurations.
     * If an adapter is registered but has no configuration, it will not be initialized.
     */
    async initializeAll(config: Config): Promise<void> {
        for (const sourceConfig of config.sources) {
            const adapter = this.adapters.get(sourceConfig.id);
            if (adapter) {
                await adapter.init(sourceConfig);
            } else {
                console.warn(`Configuration provided for unknown source adapter: ${sourceConfig.id}`);
            }
        }
    }

    /**
     * Runs a full scan across all initialized adapters and aggregates the results.
     */
    async scanAll(): Promise<import('./types.js').RawNode[]> {
        const allNodes: import('./types.js').RawNode[] = [];
        for (const adapter of this.adapters.values()) {
            const nodes = await adapter.scan();
            allNodes.push(...nodes);
        }
        return allNodes;
    }
}
