export type DomainErrorCode =
  | 'EMPTY_TITLE'
  | 'TITLE_TOO_LONG'
  | 'TASK_NOT_FOUND'
  | 'TASK_ARCHIVED'
  | 'BLOCK_NOT_FOUND'
  | 'BLOCK_DONE'
  | 'BLOCK_OVERLAP'
  | 'NO_SLOT'
  | 'PAST_DATE'
  | 'ROUTINE_NOT_FOUND'
  | 'ROUTINE_NOT_DUE'
  | 'ROUTINE_ALREADY_PLACED'
  | 'INVALID_INPUT';

export class DomainError extends Error {
  constructor(public readonly code: DomainErrorCode, message: string) {
    super(message);
    this.name = 'DomainError';
  }
}
