import { toLocalDate, type LocalDate } from '../../domain/values/local-date';
import type { BlockRepository } from '../ports/block-repository';
import type { CalendarExportGateway } from '../ports/calendar-export-gateway';
import type { Clock } from '../ports/clock';
import type { SettingsRepository } from '../ports/settings-repository';
import type { ShareGateway } from '../ports/share-gateway';

export function makeExportIcs(deps: {
  blocks: BlockRepository;
  settings: SettingsRepository;
  calendar: CalendarExportGateway;
  share: ShareGateway;
  clock: Clock;
}) {
  return async (date?: LocalDate) => {
    const target = date ?? toLocalDate(deps.clock.now());
    const [blocks, settings] = await Promise.all([deps.blocks.listByDate(target), deps.settings.get()]);
    const file = await deps.calendar.exportDay(target, blocks, settings?.icsAlarmMinutes ?? 10);
    const method = await deps.share.shareFile(file, `TEMPO ${target}`);
    return { fileName: file.name, method };
  };
}
