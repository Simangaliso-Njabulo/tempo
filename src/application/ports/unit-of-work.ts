export type StoreName = 'tasks' | 'blocks' | 'routines' | 'routineExceptions' | 'settings' | 'meta';

export interface UnitOfWork {
  run<T>(stores: StoreName[], fn: () => Promise<T>): Promise<T>;
}
