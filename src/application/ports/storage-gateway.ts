export interface StorageGateway {
  requestPersistence(): Promise<boolean>;
  persisted(): Promise<boolean>;
  estimate(): Promise<{ usage: number; quota: number } | undefined>;
}
