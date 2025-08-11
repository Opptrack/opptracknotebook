import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NotebookCell as Cell, db, NotebookRecord } from "../lib/db";
import { NotebookCell } from "../components/NotebookCell";
import { useBackendBaseUrl } from "../hooks/useBackend";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import Label from "../components/ui/Label";
import { DragEvent, useRef } from "react";
import ThemeSwitcher from "../components/ThemeSwitcher";
import { PresetRecord, db as appDb } from "../lib/db";

export default function NotebookPage() {
  const { baseUrl, setBaseUrl, useProxy, setUseProxy } = useBackendBaseUrl();
  const [cells, setCells] = useState<Cell[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notebooks, setNotebooks] = useState<NotebookRecord[]>([]);
  const [activeNotebookId, setActiveNotebookId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const nbList = await db.notebooks.orderBy("updatedAt").reverse().toArray();
      if (nbList.length === 0) {
        const id = await db.notebooks.add({ name: "My Notebook", createdAt: Date.now(), updatedAt: Date.now() });
        setActiveNotebookId(id);
      } else {
        const savedId = typeof window !== "undefined" ? Number(window.localStorage.getItem("opptrack_active_notebook") || nbList[0].id) : nbList[0].id!;
        setActiveNotebookId(savedId);
      }
      setNotebooks(nbList);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeNotebookId == null) return;
    (async () => {
      const list = await db.cells.where("notebookId").equals(activeNotebookId).sortBy("orderIndex");
      setCells(list);
      setIsLoading(false);
      if (typeof window !== "undefined") window.localStorage.setItem("opptrack_active_notebook", String(activeNotebookId));
    })();
  }, [activeNotebookId]);

  const nextOrder = useMemo(
    () => (cells.length ? Math.max(...cells.map((c) => c.orderIndex)) + 1 : 1),
    [cells]
  );

  async function addRequestCell() {
    const cell: Cell = {
      type: "request",
      title: "",
      orderIndex: nextOrder,
      method: "GET",
      path: "/health",
      headersJson: "",
      bodyText: "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notebookId: activeNotebookId || undefined,
    };
    const id = await db.cells.add(cell);
    setCells((prev) => [...prev, { ...cell, id }]);
  }

  async function addMarkdownCell() {
    const cell: Cell = {
      type: "markdown",
      title: "",
      orderIndex: nextOrder,
      markdown: "## Notes",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notebookId: activeNotebookId || undefined,
    };
    const id = await db.cells.add(cell);
    setCells((prev) => [...prev, { ...cell, id }]);
  }

  async function updateCell(updated: Cell) {
    if (updated.id === undefined) return;
    await db.cells.update(updated.id, updated);
    setCells((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function deleteCell(id: number) {
    await db.cells.delete(id);
    setCells((prev) => prev.filter((c) => c.id !== id));
  }

  function onDragStart(e: DragEvent<HTMLDivElement>, id?: number) {
    if (!id) return;
    e.dataTransfer.setData("text/plain", String(id));
  }

  async function onDrop(e: DragEvent<HTMLDivElement>, targetId?: number) {
    const draggedId = Number(e.dataTransfer.getData("text/plain"));
    if (!draggedId || !targetId || draggedId === targetId) return;
    const dragged = cells.find((c) => c.id === draggedId);
    const target = cells.find((c) => c.id === targetId);
    if (!dragged || !target) return;
    // swap orderIndex
    await db.cells.update(dragged.id!, { orderIndex: target.orderIndex });
    await db.cells.update(target.id!, { orderIndex: dragged.orderIndex });
    const refreshed = await db.cells.orderBy("orderIndex").toArray();
    setCells(refreshed);
  }

  function onDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  const [activeTab, setActiveTab] = useState<"notebook" | "presets">("notebook");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const saved = window.localStorage.getItem("opptrack_sidebar_open");
    return saved == null ? true : saved === "true";
  });
  const [presets, setPresets] = useState<PresetRecord[]>([]);
  const [selectedForCompare, setSelectedForCompare] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const all = await appDb.presets.orderBy("createdAt").reverse().toArray();
      setPresets(all);
    })();
  }, [activeTab]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("opptrack_sidebar_open", String(sidebarOpen));
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen">
      {/* Slide-in Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full z-40 transition-transform duration-200 ease-in-out w-72 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-[260px]"
        }`}
      >
        <Card className="h-full flex flex-col">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="font-medium">Workspace</div>
              <div className="flex items-center gap-2">
                <ThemeSwitcher />
                <Button size="sm" variant="outline" onClick={() => setSidebarOpen(false)}>⟨</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium">Notebooks</div>
                <Button size="sm" onClick={async () => {
                  const name = prompt("Notebook name", "Untitled Notebook");
                  if (!name) return;
                  const id = await db.notebooks.add({ name, createdAt: Date.now(), updatedAt: Date.now() });
                  const list = await db.notebooks.orderBy("updatedAt").reverse().toArray();
                  setNotebooks(list);
                  setActiveNotebookId(id);
                }}>New</Button>
              </div>
              <div className="grid gap-2">
                {notebooks.map((n) => (
                  <div key={n.id} className={`flex items-center justify-between border rounded px-2 py-1 ${activeNotebookId === n.id ? "bg-[var(--color-secondary)]" : ""}`} style={{ borderColor: "var(--border-color)" }}>
                    <button className="text-left flex-1" onClick={() => setActiveNotebookId(n.id!)}>
                      <div className="text-sm font-medium">{n.name}</div>
                    </button>
                    <Button size="sm" variant="outline" onClick={async () => {
                      const name = prompt("Rename notebook", n.name);
                      if (!name || !n.id) return;
                      await db.notebooks.update(n.id, { name, updatedAt: Date.now() });
                      const list = await db.notebooks.orderBy("updatedAt").reverse().toArray();
                      setNotebooks(list);
                    }}>Rename</Button>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <Button variant={activeTab === "notebook" ? "default" : "outline"} onClick={() => setActiveTab("notebook")}>Notebook</Button>
              <Button variant={activeTab === "presets" ? "default" : "outline"} onClick={() => setActiveTab("presets")}>Presets</Button>
            </div>
            {activeTab === "presets" && (
              <div className="grid gap-2">
                {presets.map((p) => (
                  <div key={p.id} className="flex items-center justify-between border rounded px-2 py-1" style={{ borderColor: "var(--border-color)" }}>
                    <div className="text-sm">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.method} {p.path}</div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={async () => {
                        const orderIndex = nextOrder;
                        const cell: Cell = {
                          type: "request",
                          title: p.name,
                          orderIndex,
                          method: p.method,
                          path: p.path,
                          headersJson: p.headersJson || "",
                          bodyText: p.bodyText || "",
                          createdAt: Date.now(),
                          updatedAt: Date.now(),
                        };
                        const id = await db.cells.add(cell);
                        setCells((prev) => [...prev, { ...cell, id }]);
                        setActiveTab("notebook");
                      }}>Insert</Button>
                      <Button size="sm" variant="destructive" onClick={async () => {
                        if (!p.id) return;
                        await appDb.presets.delete(p.id);
                        setPresets((prev) => prev.filter((x) => x.id !== p.id));
                      }}>Delete</Button>
                    </div>
                  </div>
                ))}
                {presets.length === 0 && <div className="text-xs text-gray-500">No presets saved yet.</div>}
              </div>
            )}
          </CardContent>
        </Card>
      </aside>

      {/* Overlay for mobile */}
      {/* Always-visible toggle sliver */}
      <button
        className="fixed left-0 top-1/2 -translate-y-1/2 z-50 h-10 w-6 rounded-r border flex items-center justify-center bg-[var(--bg-surface)]"
        style={{ borderColor: "var(--border-color)" }}
        onClick={() => setSidebarOpen((v) => !v)}
        aria-label="Toggle sidebar"
      >
        {sidebarOpen ? "⟨" : "⟩"}
      </button>

      {/* Main content (shifted when sidebar open on md+) */}
      <div className={`min-h-screen px-6 py-6 space-y-4 transition-[padding] ${sidebarOpen ? "md:pl-[19rem]" : "md:pl-10"}`} onDragOver={(e) => e.preventDefault()}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button className="md:hidden" variant="outline" onClick={() => setSidebarOpen(true)}>Menu</Button>
              <h1 className="text-xl font-semibold">{notebooks.find(n => n.id === activeNotebookId)?.name || "Notebook"}</h1>
              <Link
                href="/endpoints"
                title="Open Endpoint Explorer"
                className="inline-flex items-center h-8 px-3 rounded-md border text-sm"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
              >
                Endpoints
              </Link>
              <Link
                href="/"
                title="Back to Home"
                className="inline-flex items-center h-8 px-3 rounded-md border text-sm"
                style={{ borderColor: "var(--border-color)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
              >
                Home
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Input
                placeholder="Backend base URL (e.g. https://api.example.com)"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                className="w-[380px]"
              />
              <div className="flex items-center gap-2">
                <span className="text-sm">Proxy</span>
                {/* Accessible switch */}
                <label className="inline-flex items-center gap-2 select-none cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} />
                  <span className="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border transition-colors" style={{ borderColor: "var(--border-color)", background: useProxy ? "var(--color-primary)" : "var(--color-secondary)" }}>
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${useProxy ? 'translate-x-5' : 'translate-x-0'}`} style={{ margin: 2 }} />
                  </span>
                </label>
              </div>
              <Button size="sm" className="whitespace-nowrap" variant="destructive" onClick={async () => {
                if (!activeNotebookId) return;
                if (!confirm('Delete this notebook? This will remove all its cells.')) return;
                await db.cells.where('notebookId').equals(activeNotebookId).delete();
                await db.notebooks.delete(activeNotebookId);
                const list = await db.notebooks.orderBy('updatedAt').reverse().toArray();
                setNotebooks(list);
                setActiveNotebookId(list[0]?.id ?? null);
              }}>Delete</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-center">
            <Button variant="outline" onClick={addRequestCell}>
              + Request Cell
            </Button>
            <Button variant="outline" onClick={addMarkdownCell}>
              + Markdown Cell
            </Button>
            <Button
              variant="secondary"
              disabled={selectedForCompare.length < 2}
              onClick={() => setCompareOpen(true)}
              title={selectedForCompare.length < 2 ? "Select at least 2 request cells" : "Open compare view"}
            >
              Compare selected ({selectedForCompare.length})
            </Button>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div>Loading…</div>
      ) : (
        <div className="space-y-4">
          {cells.map((cell) => (
            <div
              key={cell.id}
              draggable
              onDragStart={(e) => onDragStart(e, cell.id)}
              onDrop={(e) => onDrop(e, cell.id)}
              onDragOver={onDragOver}
            >
              <NotebookCell
                cell={cell}
                baseUrl={baseUrl}
                useProxy={useProxy}
                onChange={updateCell}
                onDelete={deleteCell}
                selected={selectedForCompare.includes(cell.id!)}
                onToggleSelect={(id, checked) => {
                  setSelectedForCompare((prev) => {
                    const set = new Set(prev);
                    if (checked) set.add(id); else set.delete(id);
                    return Array.from(set);
                  });
                }}
              />
            </div>
          ))}
          {cells.length === 0 && (
            <div className="text-sm text-gray-500">No cells yet. Add one above.</div>
          )}
        </div>
      )}
      </div>
      {compareOpen && (
        <CompareModal
          onClose={() => setCompareOpen(false)}
          cellIds={selectedForCompare}
        />
      )}
    </div>
  );
}

import Modal from "../components/ui/Modal";
import { useLiveQuery } from "dexie-react-hooks";
import React from "react";

function CompareModal({ cellIds, onClose }: { cellIds: number[]; onClose: () => void }) {
  const runs = useLiveQuery(async () => {
    const out: { cellId: number; title: string; run: any }[] = [];
    for (const id of cellIds) {
      const cell = await db.cells.get(id);
      if (!cell) continue;
      const run = await db.runs.where("cellId").equals(id).last();
      out.push({ cellId: id, title: cell.title || `${cell.method} ${cell.path}`, run });
    }
    return out;
  }, [cellIds]);

  // no diff baseline; show raw colorized JSON side by side

  return (
    <Modal open fullscreen onClose={onClose} title={`Compare (${cellIds.length})`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-120px)] overflow-auto">
        {(runs || []).map((r) => (
          <div key={r.cellId} className="rounded border p-2 flex flex-col" style={{ borderColor: "var(--border-color)" }}>
            <div className="text-sm font-medium mb-1">{r.title}</div>
            <div className="text-xs mb-2">Status: {r.run?.status ?? "-"}</div>
            <div className="mb-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const toCopy = typeof r.run?.responseData === 'string' ? r.run?.responseData : JSON.stringify(r.run?.responseData, null, 2);
                  navigator.clipboard?.writeText(toCopy || '');
                }}
              >
                Copy JSON
              </Button>
            </div>
            <div className="flex-1 overflow-auto" style={{ overflowX: 'auto' }}>
              <pre className="text-xs whitespace-pre" style={{ minWidth: 600 }} dangerouslySetInnerHTML={{ __html: syntaxColorize(formatJson(r.run?.responseData)) }} />
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

function formatJson(data: unknown): string {
  try { return JSON.stringify(data, null, 2); } catch { return String(data); }
}

function syntaxColorize(json: string): string {
  // escape HTML
  const esc = json.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
  return esc
    .replace(/("(\\.|[^"\\])*")\s*:/g, '<span class="json-key">$1</span>:') // keys
    .replace(/(:\s*)"(\\.|[^"\\])*"/g, '$1<span class="json-string">$&</span>') // string values
    .replace(/(:\s*)(-?\d+(?:\.\d+)?)/g, '$1<span class="json-number">$2</span>') // numbers
    .replace(/(:\s*)(true|false)/g, '$1<span class="json-boolean">$2</span>') // booleans
    .replace(/(:\s*)null/g, '$1<span class="json-null">null</span>'); // null
}

// no diff function; keeping only syntaxColorize

