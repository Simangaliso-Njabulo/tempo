import { useLiveQuery } from 'dexie-react-hooks';
import type { LocalDate } from '../../domain/values/local-date';
import { useServices } from '../providers/services';

export function useDayPlan(date: LocalDate) {
  const { dayPlan } = useServices();
  return useLiveQuery(() => dayPlan.read(date), [dayPlan, date]);
}
