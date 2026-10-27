import type { ShareGateway } from '../../application/ports/share-gateway';

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = file.name;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  // Safari can abort a download if the object URL is revoked in the same task.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export class BrowserShareGateway implements ShareGateway {
  canShareFile(file: File) {
    return (
      typeof navigator.share === 'function' &&
      typeof navigator.canShare === 'function' &&
      navigator.canShare({ files: [file] })
    );
  }

  async shareFile(file: File, title: string) {
    if (!this.canShareFile(file)) {
      download(file);
      return 'downloaded' as const;
    }
    await navigator.share({ files: [file], title });
    return 'shared' as const;
  }
}
