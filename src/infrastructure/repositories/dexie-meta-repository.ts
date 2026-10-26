import type { MetaRepository } from '../../application/ports/meta-repository';
import type { MetaRecord } from '../../domain/entities';
import type { TempoDb } from '../db/tempo-db';

export class DexieMetaRepository implements MetaRepository {
  constructor(private readonly db: TempoDb) {}
  listAll() { return this.db.meta.toArray(); }
  get(key: string) { return this.db.meta.get(key); }
  async put(record: MetaRecord) { await this.db.meta.put(record); }
  async bulkPut(records: MetaRecord[]) { await this.db.meta.bulkPut(records); }
  async delete(key: string) { await this.db.meta.delete(key); }
}
