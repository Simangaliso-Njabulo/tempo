import type { SettingsRepository } from '../../application/ports/settings-repository';
import type { Settings } from '../../domain/entities';
import type { TempoDb } from '../db/tempo-db';

export class DexieSettingsRepository implements SettingsRepository {
  constructor(private readonly db: TempoDb) {}
  get() { return this.db.settings.get('app'); }
  async put(settings: Settings) { await this.db.settings.put(settings); }
}
