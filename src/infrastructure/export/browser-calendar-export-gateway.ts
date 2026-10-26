import type { CalendarExportGateway } from '../../application/ports/calendar-export-gateway';
import type { Block } from '../../domain/entities';
import type { LocalDate } from '../../domain/values/local-date';
import { buildIcs } from './ics-writer';

export class BrowserCalendarExportGateway implements CalendarExportGateway {
  exportDay(date: LocalDate, blocks: Block[], alarmMinutes: number): Promise<File> {
    return Promise.resolve(new File([buildIcs(blocks, date, alarmMinutes)], `tempo-${date}.ics`, { type: 'text/calendar' }));
  }
}
