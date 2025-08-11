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
      <div className={`min-h-screen p-6 space-y-4 transition-all md:pl-80 ${sidebarOpen ? "md:pl-80" : "md:pl-6"}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
                <Button className="md:hidden" variant="outline" onClick={() => setSidebarOpen(true)}>Menu</Button>
              <h1 className="text-xl font-semibold">Notebook</h1>
              <Link className="text-blue-600 underline" href="/endpoints">
                Endpoint Explorer
              </Link>
              <Link className="text-blue-600 underline" href="/">
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
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                />
                Use proxy
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={addRequestCell}>
              + Request Cell
            </Button>
            <Button variant="outline" onClick={addMarkdownCell}>
              + Markdown Cell
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
              />
            </div>
          ))}
          {cells.length === 0 && (
            <div className="text-sm text-gray-500">No cells yet. Add one above.</div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

