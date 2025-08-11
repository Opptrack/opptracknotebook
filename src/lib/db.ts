import Dexie, { Table } from "dexie";

export type CellType = "request" | "markdown";

export interface NotebookCell {
  id?: number;
  notebookId?: number; // added in v3
  type: CellType;
  title?: string;
  orderIndex: number;
  // request specific
  method?: string;
  path?: string;
  headersJson?: string; // stringified JSON for editing convenience
  bodyText?: string; // raw string; may be JSON
  // markdown specific
  markdown?: string;
  createdAt: number;
  updatedAt: number;
}

export interface RunRecord {
  id?: number;
  cellId: number;
  status?: number;
  responseHeaders?: Record<string, string> | null;
  responseData?: unknown;
  createdAt: number;
  // request context (optional, not indexed)
  requestMethod?: string;
  requestPath?: string;
  requestUrl?: string;
  requestHeadersJson?: string;
  requestBodyText?: string;
}

export interface NotebookRecord {
  id?: number;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface PresetRecord {
  id?: number;
  name: string;
  method: string;
  path: string;
  queryValues?: Record<string, any>;
  headersJson?: string;
  bodyText?: string;
  createdAt: number;
}

export class AppDB extends Dexie {
  cells!: Table<NotebookCell, number>;
  runs!: Table<RunRecord, number>;
  notebooks!: Table<NotebookRecord, number>;
  presets!: Table<PresetRecord, number>;

  constructor() {
    super("opptrack_notebook_db");
    this.version(1).stores({
      cells: "++id, orderIndex, type, updatedAt",
      runs: "++id, cellId, createdAt",
    });
    this.version(2).stores({
      presets: "++id, method, path, name, createdAt",
    });
    this.version(3)
      .stores({
        notebooks: "++id, name, updatedAt",
        cells: "++id, notebookId, orderIndex, type, updatedAt",
        runs: "++id, cellId, createdAt",
        presets: "++id, method, path, name, createdAt",
      })
      .upgrade(async (tx) => {
        const notebooks = tx.table("notebooks");
        const cells = tx.table("cells");
        const count = await notebooks.count();
        let defaultId = 1;
        if (count === 0) {
          defaultId = await notebooks.add({
            name: "My Notebook",
            createdAt: Date.now(),
            updatedAt: Date.now(),
          });
        }
        await cells.toCollection().modify((c: any) => {
          if (!c.notebookId) c.notebookId = defaultId;
        });
      });
  }
}

export const db = new AppDB();

