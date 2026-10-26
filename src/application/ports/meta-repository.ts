import type { MetaRecord } from '../../domain/entities';

export interface MetaRepository {
  listAll(): Promise<MetaRecord[]>;
  get(key: string): Promise<MetaRecord | undefined>;
  put(record: MetaRecord): Promise<void>;
  bulkPut(records: MetaRecord[]): Promise<void>;
  delete(key: string): Promise<void>;
}
