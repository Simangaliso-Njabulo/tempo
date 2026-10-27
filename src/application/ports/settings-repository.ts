import type { Settings } from '../../domain/entities';

export interface SettingsRepository {
  get(): Promise<Settings | undefined>;
  put(settings: Settings): Promise<void>;
}
