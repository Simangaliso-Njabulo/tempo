import { useEffect, useRef } from 'react';
import type { LocalDate } from '../../domain/values/local-date';

/**
 * Detects a calendar-day rollover and asks the app to advance the view.
 *
 * The pending advance lives in a ref: sheet open/close state is checked in an
 * effect, and storing it in React state would start a render loop. The rollover
 * fires once per day, and the advance waits until every sheet, detail view, and
 * reflow preview is closed.
 */
export function useMidnight(input: {
  today: LocalDate;
  viewingDate: LocalDate;
  blocked: boolean;
  onRollover: (next: LocalDate) => void;
  onAdvance: (next: LocalDate) => void;
}) {
  const { today, viewingDate, blocked, onRollover, onAdvance } = input;
  const previousToday = useRef(today);
  const pending = useRef<{ from: LocalDate; to: LocalDate } | null>(null);

  useEffect(() => {
    if (today === previousToday.current) return;
    const from = previousToday.current;
    previousToday.current = today;
    pending.current = viewingDate === from ? { from, to: today } : null;
    onRollover(today);
  }, [today, viewingDate, onRollover]);

  useEffect(() => {
    const current = pending.current;
    if (!current) return;
    if (viewingDate !== current.from) {
      pending.current = null;
      return;
    }
    if (blocked) return;
    pending.current = null;
    onAdvance(current.to);
  }, [blocked, today, viewingDate, onAdvance]);
}
