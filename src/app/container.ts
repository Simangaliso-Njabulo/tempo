import type { Services } from '../presentation/providers/services';

export function createContainer(): Services {
  return { appName: 'TEMPO' };
}
