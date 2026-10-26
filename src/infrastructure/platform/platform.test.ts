import { BrowserShareGateway } from './browser-share-gateway';
import { BrowserStorageGateway } from './browser-storage-gateway';
import { isStandalone } from './standalone';

function override(target: object, key: string, value: unknown): () => void {
  const record = target as Record<string, unknown>;
  const original = Object.getOwnPropertyDescriptor(record, key);
  Object.defineProperty(record, key, { configurable: true, value });
  return () => {
    if (original) Object.defineProperty(record, key, original);
    else Reflect.deleteProperty(record, key);
  };
}

describe('isStandalone', () => {
  it('detects standalone display mode', () => {
    const restoreMatchMedia = override(window, 'matchMedia', () => ({ matches: true }));
    try {
      expect(isStandalone()).toBe(true);
    } finally {
      restoreMatchMedia();
    }
  });

  it('detects the iOS navigator flag and defaults to false', () => {
    const restoreMatchMedia = override(window, 'matchMedia', () => ({ matches: false }));
    const restoreStandalone = override(navigator, 'standalone', true);
    try {
      expect(isStandalone()).toBe(true);
    } finally {
      restoreStandalone();
      restoreMatchMedia();
    }
    expect(isStandalone()).toBe(false);
  });
});

describe('BrowserStorageGateway', () => {
  it('fails closed when the Storage API is unavailable', async () => {
    const restore = override(navigator, 'storage', undefined);
    try {
      const gateway = new BrowserStorageGateway();
      await expect(gateway.requestPersistence()).resolves.toBe(false);
      await expect(gateway.persisted()).resolves.toBe(false);
      await expect(gateway.estimate()).resolves.toBeUndefined();
    } finally {
      restore();
    }
  });

  it('reports persistence and a zero-filled estimate', async () => {
    const restore = override(navigator, 'storage', {
      persist: () => Promise.resolve(true),
      persisted: () => Promise.resolve(true),
      estimate: () => Promise.resolve({}),
    });
    try {
      const gateway = new BrowserStorageGateway();
      await expect(gateway.requestPersistence()).resolves.toBe(true);
      await expect(gateway.persisted()).resolves.toBe(true);
      await expect(gateway.estimate()).resolves.toEqual({ usage: 0, quota: 0 });
    } finally {
      restore();
    }
  });
});

describe('BrowserShareGateway', () => {
  it('shares a file when the platform supports it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    const restoreShare = override(navigator, 'share', share);
    const restoreCanShare = override(navigator, 'canShare', () => true);
    try {
      const gateway = new BrowserShareGateway();
      const file = new File(['{}'], 'tempo.json', { type: 'application/json' });
      expect(gateway.canShareFile(file)).toBe(true);
      await expect(gateway.shareFile(file, 'TEMPO backup')).resolves.toBe('shared');
      expect(share).toHaveBeenCalledWith({ files: [file], title: 'TEMPO backup' });
    } finally {
      restoreCanShare();
      restoreShare();
    }
  });

  it('downloads the file when sharing is unavailable', async () => {
    vi.useFakeTimers();
    const restoreShare = override(navigator, 'share', undefined);
    const restoreCanShare = override(navigator, 'canShare', undefined);
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const createObjectURL = vi.fn(() => 'blob:tempo');
    const revokeObjectURL = vi.fn();
    const restoreCreate = override(URL, 'createObjectURL', createObjectURL);
    const restoreRevoke = override(URL, 'revokeObjectURL', revokeObjectURL);
    try {
      const gateway = new BrowserShareGateway();
      const file = new File(['{}'], 'tempo.json', { type: 'application/json' });
      expect(gateway.canShareFile(file)).toBe(false);
      await expect(gateway.shareFile(file, 'TEMPO backup')).resolves.toBe('downloaded');
      expect(createObjectURL).toHaveBeenCalledWith(file);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revokeObjectURL).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:tempo');
    } finally {
      vi.useRealTimers();
      vi.restoreAllMocks();
      restoreRevoke();
      restoreCreate();
      restoreCanShare();
      restoreShare();
    }
  });
});
