import type { DayPlan, DayPlanReader } from '../../application/ports/day-plan-reader';
import { defaultSettings } from '../../domain/entities/settings';
import type { LocalDate } from '../../domain/values/local-date';
import type { TempoDb } from '../db/tempo-db';

export class DexieDayPlanReader implements DayPlanReader {
  constructor(private readonly db: TempoDb) {}

  async read(date: LocalDate): Promise<DayPlan> {
    const [blocks, tasks, routines, routineExceptions, settings, meta] = await Promise.all([
      this.db.blocks.where('date').equals(date).sortBy('startMin'),
      this.db.tasks.toArray(),
      this.db.routines.toArray(),
      this.db.routineExceptions.where('date').equals(date).toArray(),
      this.db.settings.get('app'),
      this.db.meta.toArray(),
    ]);
    return { date, blocks, tasks, routines, routineExceptions, settings: settings ?? defaultSettings(0), meta };
  }
}
