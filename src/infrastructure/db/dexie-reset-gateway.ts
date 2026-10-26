import type { ResetGateway } from '../../application/ports/reset-gateway';
import type { UnitOfWork } from '../../application/ports/unit-of-work';
import type { TempoDb } from './tempo-db';

export class DexieResetGateway implements ResetGateway {
  constructor(
    private readonly db: TempoDb,
    private readonly uow: UnitOfWork,
  ) {}

  resetAll(): Promise<void> {
    return this.uow.run(
      ['tasks', 'blocks', 'routines', 'routineExceptions', 'settings', 'meta'],
      async () => {
        await Promise.all([
          this.db.tasks.clear(),
          this.db.blocks.clear(),
          this.db.routines.clear(),
          this.db.routineExceptions.clear(),
          this.db.settings.clear(),
          this.db.meta.clear(),
        ]);
      },
    );
  }
}
