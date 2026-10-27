import type { Block } from '../../domain/entities';
import type { LocalDate } from '../../domain/values/local-date';

export interface CalendarExportGateway {
  exportDay(date: LocalDate, blocks: Block[], alarmMinutes: number): Promise<File>;
}
