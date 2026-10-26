export type ThemeSetting = 'system' | 'dark' | 'light';
export type TimeFormatSetting = 'system' | '12h' | '24h';

export interface Settings {
  id: 'app';
  theme: ThemeSetting;
  timeFormat: TimeFormatSetting;
  reflowAutoApply: boolean;
  inAppReminders: boolean;
  icsAlarmMinutes: number;
  installCardDismissed: boolean;
  updatedAt: number;
}

export function defaultSettings(now: number): Settings {
  return {
    id: 'app',
    theme: 'system',
    timeFormat: 'system',
    reflowAutoApply: false,
    inAppReminders: true,
    icsAlarmMinutes: 10,
    installCardDismissed: false,
    updatedAt: now,
  };
}
