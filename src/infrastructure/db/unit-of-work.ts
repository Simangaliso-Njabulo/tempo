import type { StoreName, UnitOfWork } from '../../application/ports/unit-of-work';
import type { TempoDb } from './tempo-db';

export class DexieUnitOfWork implements UnitOfWork {
  constructor(private readonly db: TempoDb) {}
  run<T>(stores: StoreName[], fn: () => Promise<T>): Promise<T> {
    const tables = stores.map((store) => this.db.table(store));
    return this.db.transaction('rw', tables, fn);
  }
}
