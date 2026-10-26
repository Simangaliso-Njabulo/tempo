import { defaultSettings, type Settings } from '../../domain/entities/settings';
import { DomainError } from '../../domain/errors';
import type { Clock } from '../ports/clock';
import type { SettingsRepository } from '../ports/settings-repository';

const THEMES = new Set(['system', 'dark', 'light']);
const TIME_FORMATS = new Set(['system', '12h', '24h']);
const ALARM_MINUTES = new Set([0, 5, 10, 15, 30, 60]);

export function makeUpdateSettings(deps: { settings: SettingsRepository; clock: Clock }) {
  return async (patch: Partial<Omit<Settings, 'id' | 'updatedAt'>>): Promise<Settings> => {
    const current = (await deps.settings.get()) ?? defaultSettings(deps.clock.now().getTime());
    const next: Settings = { ...current, ...patch, id: 'app', updatedAt: deps.clock.now().getTime() };

    if (!THEMES.has(next.theme)) throw new DomainError('INVALID_INPUT', 'Choose a valid theme.');
    if (!TIME_FORMATS.has(next.timeFormat)) throw new DomainError('INVALID_INPUT', 'Choose a valid time format.');
    if (!ALARM_MINUTES.has(next.icsAlarmMinutes)) {
      throw new DomainError('INVALID_INPUT', 'Choose a valid reminder time.');
    }
    for (const key of ['reflowAutoApply', 'inAppReminders', 'installCardDismissed'] as const) {
      if (typeof next[key] !== 'boolean') throw new DomainError('INVALID_INPUT', 'That setting is invalid.');
    }

    await deps.settings.put(next);
    return next;
  };
}
