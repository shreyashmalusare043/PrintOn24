import { registerPlugin } from '@capacitor/core';

export interface SharedFile {
  name: string;
  mimeType: string;
  uri: string;
  size: number;
}

export interface SharedFilesResult {
  files: SharedFile[];
  errors: string[];
}

interface SharedFilesPlugin {
  getPendingFiles(): Promise<SharedFilesResult>;
  clearPendingShare(): Promise<void>;
  releaseFiles(options: { uris: string[] }): Promise<void>;
  addListener(
    eventName: 'sharedFiles',
    listenerFunc: (result: SharedFilesResult) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

export const SharedFiles = registerPlugin<SharedFilesPlugin>('SharedFiles');