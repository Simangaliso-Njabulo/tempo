import { useMemo, useState } from 'react';
import type { Block } from '../../domain/entities/block';
import type { Task } from '../../domain/entities/task';
import type { LocalDate } from '../../domain/values/local-date';
import { formatDuration, formatTime, type TimeFormat } from '../utils/format-time';
import { Sheet } from './Sheet';
import styles from './Sheet.module.css';

interface UnfinishedGroup {
  key: string;
  taskId?: string;
  title: string;
  task?: Task;
  blocks: Block[];
}

function dayLabel(value: LocalDate): string {
  const [yearText, monthText, dayText] = value.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function groupUnfinished(blocks: Block[], tasks: Task[], date: LocalDate): UnfinishedGroup[] {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const groups = new Map<string, UnfinishedGroup>();
  for (const block of blocks) {
    if (block.date !== date || block.status !== 'planned') continue;
    if (block.kind !== 'task' && block.kind !== 'focus') continue;
    const key = block.taskId ?? `block:${block.id}`;
    const task = block.taskId ? byId.get(block.taskId) : undefined;
    const current = groups.get(key);
    if (current) {
      current.blocks.push(block);
    } else {
      groups.set(key, { key, taskId: block.taskId, title: task?.title ?? block.title, task, blocks: [block] });
    }
  }
  return [...groups.values()]
    .map((group) => ({ ...group, blocks: [...group.blocks].sort((a, b) => a.startMin - b.startMin) }))
    .sort((a, b) => (a.blocks[0]?.startMin ?? 0) - (b.blocks[0]?.startMin ?? 0));
}

export function CloseDay({
  open,
  date,
  blocks,
  tasks,
  timeFormat,
  onClose,
  onKeep,
  onLetGo,
}: {
  open: boolean;
  date: LocalDate;
  blocks: Block[];
  tasks: Task[];
  timeFormat: TimeFormat;
  onClose: () => void;
  onKeep: (taskId: string) => Promise<unknown>;
  onLetGo: (taskId: string) => Promise<unknown>;
}) {
  const [moved, setMoved] = useState(0);
  const [movedTasks, setMovedTasks] = useState<string[]>([]);
  const [busyTask, setBusyTask] = useState<string | null>(null);
  const [lettingGo, setLettingGo] = useState<UnfinishedGroup | null>(null);
  const [error, setError] = useState('');

  const groups = useMemo(() => groupUnfinished(blocks, tasks, date), [blocks, tasks, date]);
  const dayBlocks = blocks.filter((block) => block.date === date);
  const planned = dayBlocks.filter((block) => block.status === 'planned').length;
  const done = dayBlocks.filter((block) => block.status === 'done').length;
  const focusMin = dayBlocks
    .filter((block) => block.status === 'done' && block.kind === 'focus')
    .reduce((total, block) => total + block.durationMin, 0);
  const carried = groups.filter((group) => group.task?.carriedFrom).length;

  const keep = async (taskId: string) => {
    if (busyTask || movedTasks.includes(taskId)) return;
    setBusyTask(taskId);
    setError('');
    try {
      await onKeep(taskId);
      setMoved((value) => value + 1);
      setMovedTasks((current) => [...current, taskId]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That task could not be kept.');
    } finally {
      setBusyTask(null);
    }
  };

  const letGo = async () => {
    if (!lettingGo?.taskId || busyTask) return;
    setBusyTask(lettingGo.taskId);
    setError('');
    try {
      await onLetGo(lettingGo.taskId);
      setLettingGo(null);
    } catch (caught) {
      setLettingGo(null);
      setError(caught instanceof Error ? caught.message : 'That task could not be archived.');
    } finally {
      setBusyTask(null);
    }
  };

  return (
    <>
      <Sheet
        open={open}
        title="Close the day"
        onClose={onClose}
        footer={
          <>
            <button type="button" className={styles.primary} onClick={onClose}>
              Done
            </button>
            <span className={styles.hint}>Nothing moves until midnight.</span>
          </>
        }
      >
        <section className={styles.section}>
          <p className={styles.summary}>{dayLabel(date)}</p>
          <p className={styles.summary}>
            {done} done · {moved} moved · {formatDuration(focusMin)} focus
          </p>
          <p className={styles.stats}>
            <span>{planned} planned</span>
            <span>{carried} carried over</span>
          </p>
        </section>

        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        {groups.length === 0 ? (
          <p className={styles.hint}>Everything is settled. Close the day.</p>
        ) : (
          <div className={styles.list}>
            {groups.map((group) => {
              const taskId = group.taskId;
              const isMoved = taskId ? movedTasks.includes(taskId) : false;
              const times = group.blocks
                .map((block) => `${formatTime(block.startMin, timeFormat)} · ${formatDuration(block.durationMin)}`)
                .join(' · ');
              return (
                <article key={group.key} className={styles.listItem}>
                  <div className={styles.listItemRow}>
                    <strong>{group.title}</strong>
                    {group.task?.carriedFrom ? <span className={styles.badge}>Carried over</span> : null}
                  </div>
                  <span className={styles.hint}>{times}</span>
                  {taskId ? (
                    isMoved ? (
                      <span className={styles.hint}>Moved to tomorrow.</span>
                    ) : (
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.button}
                          disabled={busyTask === taskId}
                          onClick={() => void keep(taskId)}
                        >
                          Keep for tomorrow
                        </button>
                        <button
                          type="button"
                          className={styles.danger}
                          disabled={busyTask === taskId}
                          onClick={() => setLettingGo(group)}
                        >
                          Let go
                        </button>
                      </div>
                    )
                  ) : (
                    <span className={styles.hint}>Standalone focus time stays in the day.</span>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </Sheet>

      <Sheet
        open={Boolean(lettingGo)}
        title="Let go?"
        onClose={() => setLettingGo(null)}
        footer={
          <>
            <button type="button" className={styles.danger} onClick={() => void letGo()}>
              Archive task
            </button>
            <button type="button" className={styles.quiet} onClick={() => setLettingGo(null)}>
              Cancel
            </button>
          </>
        }
      >
        <p className={styles.hint}>
          Archive {lettingGo?.title ?? 'this task'}? Today’s unfinished blocks and any future planned blocks for
          this task will be deleted. Past done blocks stay.
        </p>
      </Sheet>
    </>
  );
}
