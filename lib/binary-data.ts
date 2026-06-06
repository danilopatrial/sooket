import path from "path";
import fs from "fs";

export interface IBinaryRef {
  id: string;
  mimeType: string;
  fileName: string;
  size: number;
  backend: "memory" | "fs";
}

type MemoryEntry = { buf: Buffer; ref: IBinaryRef; expiresAt: number };
type FsEntry = { path: string; ref: IBinaryRef };

export class BinaryDataService {
  private readonly backend: "memory" | "fs";
  private readonly dataDir: string;
  private readonly memStore = new Map<string, MemoryEntry>();
  private readonly fsStore = new Map<string, FsEntry>();

  constructor() {
    this.backend =
      (process.env.BINARY_DATA_BACKEND ?? "memory") === "fs" ? "fs" : "memory";
    this.dataDir =
      process.env.SOOKET_DATA_DIR ?? path.join(process.cwd(), "data");
  }

  async write(
    data: Buffer,
    mimeType: string,
    fileName: string,
    executionId: string
  ): Promise<IBinaryRef> {
    const id = crypto.randomUUID();
    const ref: IBinaryRef = {
      id,
      mimeType,
      fileName,
      size: data.byteLength,
      backend: this.backend,
    };

    if (this.backend === "fs") {
      const dir = path.join(this.dataDir, "binary", executionId);
      fs.mkdirSync(dir, { recursive: true });
      const filePath = path.join(dir, id);
      fs.writeFileSync(filePath, data);
      this.fsStore.set(id, { path: filePath, ref });
    } else {
      this.memStore.set(id, { buf: data, ref, expiresAt: Date.now() + 3_600_000 });
    }

    return ref;
  }

  async read(id: string): Promise<Buffer> {
    if (this.backend === "fs") {
      const entry = this.fsStore.get(id);
      if (!entry) throw new Error("binary data not found or expired");
      return fs.readFileSync(entry.path);
    }

    const entry = this.memStore.get(id);
    if (!entry || entry.expiresAt < Date.now()) {
      throw new Error("binary data not found or expired");
    }
    return entry.buf;
  }

  getRef(id: string): IBinaryRef | null {
    if (this.backend === "fs") {
      return this.fsStore.get(id)?.ref ?? null;
    }
    return this.memStore.get(id)?.ref ?? null;
  }

  cleanup(): void {
    if (this.backend === "fs") {
      const binaryDir = path.join(this.dataDir, "binary");
      fs.rmSync(binaryDir, { recursive: true, force: true });
      this.fsStore.clear();
    } else {
      const now = Date.now();
      for (const [id, entry] of this.memStore) {
        if (entry.expiresAt < now) this.memStore.delete(id);
      }
    }
  }
}

export const binaryDataService = new BinaryDataService();
