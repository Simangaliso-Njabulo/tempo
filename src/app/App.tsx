import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Block } from '../domain/entities/block';
import type { Routine } from '../domain/entities/routine';
import type { Task } from '../domain/entities/task';
import type { PlacementResult } from '../domain/services/placement';
import type { BlockShift } from '../domain/services/reflow';
import { toLocalDate, type LocalDate } from '../domain/values/local-date';
import type { DaySnapshot } from '../application/use-cases/restore-day';
import { useServices } from '../presentation/providers/services';
import { AddSheet, type AddBreakSheetInput, type AddFocusSheetInput, type AddTaskSheetInput } from '../presentation/components/AddSheet';
import { AppShell } from '../presentation/components/AppShell';
import { CloseDay } from '../presentation/components/CloseDay';
import { DaySummary } from '../presentation/components/DaySummary';
import { Header } from '../presentation/components/Header';
import { ImportExport } from '../presentation/components/ImportExport';
import { InstallCard } from '../presentation/components/InstallCard';
import { ReflowPreview } from '../presentation/components/ReflowPreview';
import { RoutineEditor } from '../presentation/components/RoutineEditor';
import { Settings } from '../presentation/components/Settings';
import { TaskDetail } from '../presentation/components/TaskDetail';
import { TaskSheet } from '../presentation/components/TaskSheet';
import { ToastProvider, useToast } from '../presentation/components/Toast';
import { Timeline } from '../presentation/components/Timeline';
import { Tray } from '../presentation/components/Tray';
import { UpdateToast } from '../presentation/components/UpdateToast';
import { useDayPlan } from '../presentation/hooks/use-day-plan';
import { useDrag } from '../presentation/hooks/use-drag';
import { useInstall } from '../presentation/hooks/use-install';
import { useMidnight } from '../presentation/hooks/use-midnight';
import { useNow } from '../presentation/hooks/use-now';
import { useOverrun } from '../presentation/hooks/use-overrun';
import { useReminder } from '../presentation/hooks/use-reminder';
import { useTheme } from '../presentation/hooks/use-theme';
import { useTrayDrag } from '../presentation/hooks/use-tray-drag';
import { useUndo } from '../presentation/hooks/use-undo';
import { useVisualViewport } from '../presentation/hooks/use-visual-viewport';
import { formatTime } from '../presentation/utils/format-time';
import type { StorageSummary } from '../presentation/utils/format-storage';
import { createContainer } from './container';
import { Providers } from './providers';
import styles from './App.module.css';

const HOUR_HEIGHT = 88;
const DAY_CLOSE_HOUR = 18;
const APP_VERSION = '0.1.0';

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function Screen() {
  const services = useServices();
  const [date, setDate] = useState<LocalDate>(() => toLocalDate(new Date()));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<'add' | 'routine' | 'close' | 'settings' | 'data' | null>(null);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [reflowChanges, setReflowChanges] = useState<BlockShift[] | null>(null);
  const [storage, setStorage] = useState<StorageSummary>();
  const timelineRef = useRef<HTMLDivElement>(null);
  const plan = useDayPlan(date);
  const now = useNow();
  const toast = useToast();
  const undo = useUndo();
  const { push: pushUndo } = undo;

  const undoLastRef = useRef(undo.undo);
  useEffect(() => {
    undoLastRef.current = undo.undo;
  });

  const runUndo = useCallback(() => {
    void undoLastRef.current();
  }, []);

  const showUndo = useCallback(
    (message: string, label: string, restore: () => Promise<void>) => {
      pushUndo({ label, undo: restore });
      toast.show(message, { label: 'Undo', onAction: runUndo });
    },
    [pushUndo, runUndo, toast],
  );

  useTheme(plan?.settings);
  useVisualViewport();

  const today = toLocalDate(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const timeFormat = plan?.settings.timeFormat ?? 'system';
  const minStartMin = date === today ? nowMin : 0;
  const canCloseDay = date === today && nowMin >= DAY_CLOSE_HOUR * 60;
  const blocks = plan?.blocks ?? [];
  const selectedBlock = blocks.find((block) => block.id === selectedBlockId) ?? null;
  const blockTask = selectedBlock?.taskId
    ? (plan?.tasks.find((task) => task.id === selectedBlock.taskId) ?? null)
    : null;
  const trayTask = selectedTaskId
    ? (plan?.tasks.find((task) => task.id === selectedTaskId) ?? null)
    : null;
  const install = useInstall({
    settingsDismissed: plan?.settings.installCardDismissed ?? false,
    standalone: services.isStandalone(),
  });
  const lastBackupAt = useMemo(() => {
    const record = plan?.meta.find((item) => item.key === 'lastBackupAt');
    return typeof record?.value === 'number' ? record.value : undefined;
  }, [plan?.meta]);

  const snapshot = useCallback(
    (): DaySnapshot => ({ date, blocks: plan?.blocks ?? [], tasks: plan?.tasks ?? [] }),
    [date, plan?.blocks, plan?.tasks],
  );

  const snapshotFor = useCallback(
    async (target: LocalDate): Promise<DaySnapshot> => {
      if (target === date) return snapshot();
      const other = await services.dayPlan.read(target);
      return { date: target, blocks: other.blocks, tasks: other.tasks };
    },
    [date, services, snapshot],
  );

  const applyCarryOver = useCallback(
    async (next?: LocalDate) => {
      const result = await services.carryOver(next);
      if (result.carriedTaskIds.length === 0) return;
      const count = result.carriedTaskIds.length;
      showUndo(
        `${count} task${count === 1 ? '' : 's'} carried over.`,
        'Carry over',
        () => services.restoreCarryOver(result.undo),
      );
    },
    [services, showUndo],
  );

  useEffect(() => {
    void services.storage.requestPersistence().catch(() => undefined);
    void applyCarryOver().catch(() => undefined);
  }, [applyCarryOver, services]);

  useEffect(() => {
    let active = true;
    void Promise.all([services.storage.persisted(), services.storage.estimate()])
      .then(([persisted, estimate]) => {
        if (!active || !estimate) return;
        setStorage({ persisted, usage: estimate.usage, quota: estimate.quota });
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [services]);

  useMidnight({
    today,
    viewingDate: date,
    blocked: sheet !== null || selectedBlockId !== null || selectedTaskId !== null || reflowChanges !== null,
    onRollover: (next) => {
      void applyCarryOver(next).catch(() => undefined);
    },
    onAdvance: setDate,
  });

  const commitMove = useCallback(
    (blockId: string, result: PlacementResult) => {
      if (!result.ok) {
        toast.show('No room for that move.');
        return;
      }
      const before = snapshot();
      void (async () => {
        try {
          await services.moveBlock({
            blockId,
            targetStartMin: result.movingStartMin,
            minStartMin,
          });
          showUndo(`Moved to ${formatTime(result.movingStartMin, timeFormat)}.`, 'Move', () =>
            services.restoreDay(before),
          );
        } catch (error) {
          toast.show(messageFor(error, 'Could not move that block.'));
        }
      })();
    },
    [minStartMin, services, showUndo, snapshot, timeFormat, toast],
  );

  const commitPlace = useCallback(
    (taskId: string, startMin: number) => {
      const before = snapshot();
      void (async () => {
        try {
          await services.placeTask({ taskId, date, startMin, minStartMin });
          showUndo('Placed.', 'Place', () => services.restoreDay(before));
        } catch (error) {
          toast.show(messageFor(error, 'Could not place that task.'));
        }
      })();
    },
    [date, minStartMin, services, showUndo, snapshot, toast],
  );

  const drag = useDrag({
    blocks,
    hourHeight: HOUR_HEIGHT,
    minStartMin,
    onCommit: (blockId, result) => {
      commitMove(blockId, result);
    },
  });

  const trayDrag = useTrayDrag({
    yToMinute: (clientY) => {
      const viewport = timelineRef.current;
      if (!viewport) return 0;
      const rect = viewport.getBoundingClientRect();
      return ((clientY - rect.top + viewport.scrollTop) / HOUR_HEIGHT) * 60;
    },
    onCommit: (taskId, startMin) => {
      commitPlace(taskId, startMin);
    },
  });

  useReminder({
    blocks,
    nowMin,
    enabled: plan?.settings.inAppReminders ?? false,
    onRemind: (block) => toast.show(`${block.title} starts now.`),
  });

  useOverrun({
    blocks,
    nowMin,
    enabled: date === today && Boolean(plan),
    onOverrun: (blockId) => {
      void (async () => {
        try {
          const result = await services.previewReflow({ date, overrunBlockId: blockId, nowMin });
          if (result.kind !== 'preview' || result.changes.length === 0) return;
          if (plan?.settings.reflowAutoApply) {
            const before = snapshot();
            await services.applyReflow({ date, changes: result.changes });
            showUndo('Day adjusted.', 'Reflow', () => services.restoreDay(before));
            return;
          }
          setReflowChanges(result.changes);
        } catch (error) {
          toast.show(messageFor(error, 'Could not preview the rest of the day.'));
        }
      })();
    },
  });

  const openBlock = (block: Block) => setSelectedBlockId(block.id);
  const openTask = (task: Task) => setSelectedTaskId(task.id);
  const openSettings = () => setSheet('settings');
  const openClose = () => {
    if (canCloseDay) setSheet('close');
  };
  const openAdd = () => {
    setSelectedTaskId(null);
    setSheet('add');
  };

  const complete = async (done: boolean) => {
    if (!selectedBlock) return;
    const before = snapshot();
    try {
      await services.completeBlock({ blockId: selectedBlock.id, done });
      showUndo(done ? 'Done.' : 'Reopened.', done ? 'Complete' : 'Reopen', () =>
        services.restoreDay(before),
      );
      setSelectedBlockId(null);
    } catch (error) {
      toast.show(messageFor(error, 'That block could not be changed.'));
    }
  };

  const resize = async (durationMin: number) => {
    if (!selectedBlock) return;
    const before = snapshot();
    try {
      await services.resizeBlock({ blockId: selectedBlock.id, durationMin });
      showUndo('Length changed.', 'Resize', () => services.restoreDay(before));
    } catch (error) {
      toast.show(messageFor(error, 'Could not resize that block.'));
    }
  };

  const moveTo = async (startMin: number) => {
    if (!selectedBlock) return;
    const before = snapshot();
    try {
      await services.moveBlock({ blockId: selectedBlock.id, targetStartMin: startMin, minStartMin });
      showUndo('Moved.', 'Move', () => services.restoreDay(before));
      setSelectedBlockId(null);
    } catch (error) {
      toast.show(messageFor(error, 'Could not move that block.'));
    }
  };

  const remove = async () => {
    if (!selectedBlock) return;
    const before = snapshot();
    try {
      await services.deleteBlock(selectedBlock.id);
      showUndo('Block deleted.', 'Delete', () => services.restoreDay(before));
      setSelectedBlockId(null);
    } catch (error) {
      toast.show(messageFor(error, 'That block could not be deleted.'));
    }
  };

  const archiveBlockTask = async () => {
    if (!blockTask) return;
    try {
      await services.updateTask({ id: blockTask.id, archive: true });
      setSelectedBlockId(null);
      toast.show('Task archived.');
    } catch (error) {
      toast.show(messageFor(error, 'That task could not be archived.'));
    }
  };

  const archiveTrayTask = async (task: Task) => {
    try {
      await services.updateTask({ id: task.id, archive: true });
      setSelectedTaskId(null);
      toast.show('Task archived.');
    } catch (error) {
      toast.show(messageFor(error, 'That task could not be archived.'));
    }
  };

  const applyReflow = async () => {
    if (!reflowChanges) return;
    const before = snapshot();
    try {
      await services.applyReflow({ date, changes: reflowChanges });
      setReflowChanges(null);
      showUndo('Day adjusted.', 'Reflow', () => services.restoreDay(before));
    } catch (error) {
      toast.show(messageFor(error, 'Could not apply that reflow.'));
    }
  };

  const placeRoutine = async (routine: Routine) => {
    try {
      const result = await services.placeRoutine({ routineId: routine.id, date, minStartMin });
      toast.show(`Placed at ${formatTime(result.startMin, timeFormat)}.`);
    } catch (error) {
      toast.show(messageFor(error, 'No open slot today.'));
    }
  };

  const skipRoutine = async (routine: Routine) => {
    try {
      await services.skipRoutine({ routineId: routine.id, date });
      toast.show('Skipped for today.');
    } catch (error) {
      toast.show(messageFor(error, 'That routine could not be skipped.'));
    }
  };

  const dismissInstall = async () => {
    try {
      await services.updateSettings({ installCardDismissed: true });
    } catch (error) {
      toast.show(messageFor(error, 'That could not be saved.'));
    }
  };

  const addTaskFromSheet = async (input: AddTaskSheetInput) => {
    const target = input.date;
    const before = await snapshotFor(target);
    const task = trayTask ?? (await services.addTask({ title: input.title }));
    await services.placeTask({
      taskId: task.id,
      date: target,
      startMin: input.startMin,
      durationMin: input.durationMin,
      minStartMin: target === today ? nowMin : 0,
    });
    showUndo('Placed.', 'Place', () => services.restoreDay(before));
    if (target !== date) setDate(target);
  };

  const addFocusFromSheet = async (input: AddFocusSheetInput) => {
    const before = await snapshotFor(input.date);
    await services.addFocus(input);
    showUndo('Focus added.', 'Add focus', () => services.restoreDay(before));
    if (input.date !== date) setDate(input.date);
  };

  const addBreakFromSheet = async (input: AddBreakSheetInput) => {
    const before = await snapshotFor(input.date);
    await services.addBreak(input);
    showUndo('Break added.', 'Add break', () => services.restoreDay(before));
    if (input.date !== date) setDate(input.date);
  };

  const plannedCount = blocks.filter((block) => block.status === 'planned').length;
  const doneCount = blocks.filter((block) => block.status === 'done').length;
  const totalMinutes = blocks.reduce((total, block) => total + block.durationMin, 0);

  return (
    <AppShell
      header={
        <Header
          date={date}
          today={today}
          canCloseDay={canCloseDay}
          onDate={setDate}
          onSettings={openSettings}
          onCloseDay={openClose}
        />
      }
      tray={
        <Tray
          date={date}
          tasks={plan?.tasks ?? []}
          blocks={blocks}
          routines={plan?.routines ?? []}
          exceptions={plan?.routineExceptions ?? []}
          timeFormat={timeFormat}
          onAddTask={async (title) => {
            await services.addTask({ title });
          }}
          onOpenTask={openTask}
          onPlaceTask={(task) => {
            setSelectedTaskId(task.id);
            setSheet('add');
          }}
          onPlaceRoutine={(routine) => {
            void placeRoutine(routine);
          }}
          onSkipRoutine={(routine) => {
            void skipRoutine(routine);
          }}
          onOpenRoutine={(routine) => {
            setEditingRoutine(routine);
            setSheet('routine');
          }}
          onStartDrag={(event, task) => trayDrag.start(event, task.id)}
          onOpenPlan={openAdd}
        />
      }
    >
      <div className={styles.dayHead}>
        <DaySummary planned={plannedCount} done={doneCount} minutes={totalMinutes} />
        {install.show ? (
          <InstallCard
            onDismiss={() => {
              void dismissInstall();
            }}
          />
        ) : null}
      </div>
      <div className={styles.dayBody}>
        <Timeline
          viewportRef={timelineRef}
          blocks={blocks}
          nowMin={date === today ? nowMin : 0}
          timeFormat={timeFormat}
          dragBlockId={drag.drag?.blockId}
          onOpen={openBlock}
          onPointerDown={drag.start}
          onPointerMove={drag.move}
          onPointerUp={drag.end}
        />
        {reflowChanges ? (
          <ReflowPreview
            count={reflowChanges.length}
            onApply={() => {
              void applyReflow();
            }}
            onDismiss={() => setReflowChanges(null)}
          />
        ) : null}
      </div>
      <TaskDetail
        open={Boolean(selectedBlock)}
        block={selectedBlock}
        task={blockTask}
        timeFormat={timeFormat}
        onClose={() => setSelectedBlockId(null)}
        onComplete={() => {
          void complete(true);
        }}
        onReopen={() => {
          void complete(false);
        }}
        onResize={(duration) => {
          void resize(duration);
        }}
        onMove={(startMin) => {
          void moveTo(startMin);
        }}
        onDelete={() => {
          void remove();
        }}
        onArchive={() => {
          void archiveBlockTask();
        }}
      />
      <TaskSheet
        open={Boolean(trayTask) && sheet !== 'add'}
        task={trayTask}
        onClose={() => setSelectedTaskId(null)}
        onPlace={(task) => {
          setSelectedTaskId(task.id);
          setSheet('add');
        }}
        onArchive={(task) => {
          void archiveTrayTask(task);
        }}
      />
      <AddSheet
        open={sheet === 'add'}
        date={date}
        task={trayTask}
        onClose={() => {
          setSheet(null);
          setSelectedTaskId(null);
        }}
        onAddTask={addTaskFromSheet}
        onAddFocus={addFocusFromSheet}
        onAddBreak={addBreakFromSheet}
      />
      <RoutineEditor
        open={sheet === 'routine'}
        routine={editingRoutine}
        onClose={() => setSheet(null)}
        onSave={async (input) => {
          if (editingRoutine) {
            await services.updateRoutine({ id: editingRoutine.id, patch: input });
          } else {
            await services.addRoutine(input);
          }
          setSheet(null);
        }}
        onDelete={async (routineId) => {
          await services.deleteRoutine(routineId);
          setSheet(null);
        }}
      />
      <CloseDay
        open={sheet === 'close'}
        date={date}
        blocks={blocks}
        tasks={plan?.tasks ?? []}
        timeFormat={timeFormat}
        onClose={() => setSheet(null)}
        onKeep={async (taskId) => {
          const result = await services.closeDay({ date, taskId, action: 'keep' });
          const message = result.returnedToInbox ? 'Kept for tomorrow.' : 'Future block stays.';
          const undoClose = result.undo;
          if (undoClose) {
            showUndo(message, 'Keep for tomorrow', () => services.restoreCloseDay(undoClose));
          } else {
            toast.show(message);
          }
        }}
        onLetGo={async (taskId) => {
          const result = await services.closeDay({ date, taskId, action: 'let-go' });
          const undoClose = result.undo;
          if (undoClose) {
            showUndo('Task archived.', 'Let go', () => services.restoreCloseDay(undoClose));
          } else {
            toast.show('Nothing left to archive.');
          }
        }}
      />
      {plan ? (
        <Settings
          open={sheet === 'settings'}
          settings={plan.settings}
          routines={plan.routines}
          storage={storage}
          lastBackupAt={lastBackupAt}
          standalone={services.isStandalone()}
          version={APP_VERSION}
          onClose={() => setSheet(null)}
          onUpdate={(patch) => services.updateSettings(patch)}
          onOpenData={() => setSheet('data')}
          onAddRoutine={() => {
            setEditingRoutine(null);
            setSheet('routine');
          }}
          onEditRoutine={(routine) => {
            setEditingRoutine(routine);
            setSheet('routine');
          }}
          onToggleRoutine={(routine) =>
            services.updateRoutine({ id: routine.id, patch: { active: !routine.active } })
          }
          onExportIcs={() => services.exportIcs(date)}
        />
      ) : null}
      <ImportExport
        open={sheet === 'data'}
        storage={storage}
        lastBackupAt={lastBackupAt}
        onClose={() => setSheet(null)}
        onExportBackup={services.exportBackup}
        onImportBackup={services.importBackup}
        onExportIcs={() => services.exportIcs(date)}
        onReset={services.resetAll}
      />
    </AppShell>
  );
}

export function App() {
  const services = useMemo(() => createContainer(), []);
  return (
    <Providers services={services}>
      <ToastProvider>
        <Screen />
        <UpdateToast />
      </ToastProvider>
    </Providers>
  );
}
