export interface ShareGateway {
  canShareFile(file: File): boolean;
  shareFile(file: File, title: string): Promise<'shared' | 'downloaded'>;
}
