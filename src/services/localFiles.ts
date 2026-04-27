export interface LocalFile {
  name: string;
  kind: 'file' | 'directory';
  handle: FileSystemHandle;
  path: string;
}

export class LocalFileService {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private files: LocalFile[] = [];

  async requestAccess(): Promise<{ success: boolean; error?: string }> {
    if (!('showDirectoryPicker' in window)) {
      console.error("Your browser doesn't support the File System Access API. Please use a modern browser like Chrome or Edge.");
      return { success: false, error: 'NOT_SUPPORTED' };
    }

    // Check if running in an iframe
    if (window.self !== window.top) {
      console.warn("File System Access API is restricted in iframes. Please open the app in a new tab.");
      return { success: false, error: 'IFRAME_RESTRICTION' };
    }

    try {
      this.rootHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite'
      });
      await this.scan();
      return { success: true };
    } catch (err: any) {
      console.error("Access denied:", err);
      if (err.name === 'SecurityError' || err.message?.includes('Cross origin sub frames')) {
        return { success: false, error: 'IFRAME_RESTRICTION' };
      }
      return { success: false, error: err.message || 'UNKNOWN' };
    }
  }

  async scan() {
    if (!this.rootHandle) return;
    this.files = [];
    await this.scanDirectory(this.rootHandle, "");
  }

  private async scanDirectory(handle: FileSystemDirectoryHandle, path: string) {
    for await (const entry of (handle as any).values()) {
      const entryPath = path ? `${path}/${entry.name}` : entry.name;
      this.files.push({
        name: entry.name,
        kind: entry.kind,
        handle: entry,
        path: entryPath
      });
      if (entry.kind === 'directory') {
        await this.scanDirectory(entry, entryPath);
      }
    }
  }

  getFiles() {
    return this.files;
  }

  async readFile(path: string): Promise<string | null> {
    const file = this.files.find(f => f.path === path && f.kind === 'file');
    if (!file) return null;

    try {
      const fileHandle = file.handle as FileSystemFileHandle;
      const fileData = await fileHandle.getFile();
      return await fileData.text();
    } catch (err) {
      console.error("Read error:", err);
      return null;
    }
  }

  async writeFile(path: string, content: string): Promise<boolean> {
    const file = this.files.find(f => f.path === path && f.kind === 'file');
    if (!file) return false;

    try {
      const fileHandle = file.handle as FileSystemFileHandle;
      const writable = await (fileHandle as any).createWritable();
      await writable.write(content);
      await writable.close();
      return true;
    } catch (err) {
      console.error("Write error:", err);
      return false;
    }
  }
}

export const localFileService = new LocalFileService();
