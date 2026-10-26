import type { StorageGateway } from '../../application/ports/storage-gateway';

export class BrowserStorageGateway implements StorageGateway {
  async requestPersistence() {
    return (await navigator.storage?.persist?.()) ?? false;
  }

  async persisted() {
    return (await navigator.storage?.persisted?.()) ?? false;
  }

  async estimate() {
    const result = await navigator.storage?.estimate?.();
    return result ? { usage: result.usage ?? 0, quota: result.quota ?? 0 } : undefined;
  }
}
