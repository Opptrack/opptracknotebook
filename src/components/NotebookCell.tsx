import { useEffect, useMemo, useState } from "react";
import { NotebookCell as Cell, db, RunRecord } from "../lib/db";
import { Card, CardContent, CardFooter, CardHeader } from "./ui/Card";
import Button from "./ui/Button";
import Input from "./ui/Input";
import Select from "./ui/Select";
import Textarea from "./ui/Textarea";
import Label from "./ui/Label";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Props = {
  cell: Cell;
  baseUrl: string;
  useProxy?: boolean;
  onChange: (updated: Cell) => void;
  onRunSaved?: (run: RunRecord) => void;
  onDelete?: (id: number) => void;
};

export function NotebookCell({ cell, baseUrl, useProxy = true, onChange, onRunSaved, onDelete }: Props) {
  const [isRunning, setIsRunning] = useState(false);
  const isRequest = cell.type === "request";
  const [lastRun, setLastRun] = useState<RunRecord | null>(null);
  const [notes, setNotes] = useState<string>(cell.markdown || "");
  const [isEditingNotes, setIsEditingNotes] = useState<boolean>(false);

  const headerPlaceholder = useMemo(
    () => `{"Authorization": "Bearer <token>"}`,
    []
  );

  async function runRequest() {
    if (!isRequest) return;
    setIsRunning(true);
    try {
      const isAbsolute = !!cell.path && /^(https?:)\/\//i.test(cell.path);
      if (!isAbsolute && !baseUrl) {
        const run: RunRecord = {
          cellId: cell.id!,
          status: 400,
          responseHeaders: null,
          responseData: {
            error:
              "Missing backend base URL. Set the Base URL at the top, or paste a full URL into the Path field.",
          },
          createdAt: Date.now(),
        };
        const id = await db.runs.add(run);
        const withId = { ...run, id } as RunRecord;
        setLastRun(withId);
        if (onRunSaved) onRunSaved(withId);
        return;
      }

      const proxyBody = {
        method: cell.method || "GET",
        headers: safeParseJsonRecord(cell.headersJson),
        body: parseBody(cell.bodyText),
        ...(isAbsolute
          ? { url: cell.path }
          : { baseUrl, path: cell.path || "/" }),
      } as any;

      const response = await (async () => {
        if (useProxy) {
          return fetch("/api/proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(proxyBody),
          });
        }
        const targetUrl = isAbsolute ? (cell.path as string) : `${baseUrl.replace(/\/$/, "")}${cell.path?.startsWith("/") ? cell.path : `/${cell.path}`}`;
        return fetch(targetUrl, {
          method: cell.method || "GET",
          headers: safeParseJsonRecord(cell.headersJson),
          body: cell.method?.toUpperCase() === "GET" ? undefined : (typeof proxyBody.body === "string" ? proxyBody.body : JSON.stringify(proxyBody.body)),
        } as RequestInit);
      })();
      const payload = await response.json().catch(() => ({}));
      const run: RunRecord = {
        cellId: cell.id!,
        status: response.status,
        responseHeaders: Object.fromEntries(response.headers.entries()),
        responseData: payload?.data ?? payload?.error ?? payload,
        createdAt: Date.now(),
      };
      const id = await db.runs.add(run);
      const withId = { ...run, id } as RunRecord;
      setLastRun(withId);
      if (onRunSaved) onRunSaved(withId);
    } catch (e) {
      const run: RunRecord = {
        cellId: cell.id!,
        status: 0,
        responseHeaders: null,
        responseData: { error: (e as Error)?.message || "Failed" },
        createdAt: Date.now(),
      };
      const id = await db.runs.add(run);
      const withId = { ...run, id } as RunRecord;
      setLastRun(withId);
      if (onRunSaved) onRunSaved(withId);
    } finally {
      setIsRunning(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!cell.id) return;
      const last = await db.runs.where("cellId").equals(cell.id).last();
      if (mounted) setLastRun(last || null);
    })();
    return () => {
      mounted = false;
    };
  }, [cell.id]);

  useEffect(() => {
    setNotes(cell.markdown || "");
  }, [cell.id, cell.markdown]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          {isRequest ? (
            <RequestTitleEditor title={cell.title || ""} onSave={(value) => onChange({ ...cell, title: value, updatedAt: Date.now() })} />
          ) : (
            <div className="w-full flex items-center justify-between">
              <div className="text-sm text-gray-600">Notes</div>
              <div className="flex gap-2">
                {isEditingNotes ? (
                  <>
                    <Button size="sm" onClick={() => { onChange({ ...cell, markdown: notes, updatedAt: Date.now() }); setIsEditingNotes(false); }}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => { setNotes(cell.markdown || ""); setIsEditingNotes(false); }}>
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => setIsEditingNotes(true)}>
                    Edit
                  </Button>
                )}
              </div>
            </div>
          )}
          {cell.id !== undefined && (
            <Button variant="destructive" size="sm" onClick={() => cell.id && onDelete?.(cell.id)}>
              Delete
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {isRequest ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <Label htmlFor={`method-${cell.id}`}>Method</Label>
              <Select
                id={`method-${cell.id}`}
                value={cell.method || "GET"}
                onChange={(e) => onChange({ ...cell, method: e.target.value, updatedAt: Date.now() })}
              >
                {["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"].map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-3">
              <Label htmlFor={`path-${cell.id}`}>Path</Label>
              <Input
                id={`path-${cell.id}`}
                placeholder="/health or https://api.example.com/health"
                value={cell.path || ""}
                onChange={(e) => onChange({ ...cell, path: e.target.value, updatedAt: Date.now() })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor={`headers-${cell.id}`}>Headers (JSON)</Label>
              <Textarea
                id={`headers-${cell.id}`}
                className="font-mono"
                placeholder={headerPlaceholder}
                value={cell.headersJson || ""}
                onChange={(e) => onChange({ ...cell, headersJson: e.target.value, updatedAt: Date.now() })}
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor={`body-${cell.id}`}>Body</Label>
              <Textarea
                id={`body-${cell.id}`}
                className="font-mono"
                placeholder="Body (raw or JSON)"
                value={cell.bodyText || ""}
                onChange={(e) => onChange({ ...cell, bodyText: e.target.value, updatedAt: Date.now() })}
              />
            </div>
          </div>
        ) : (
          <div>
            {isEditingNotes ? (
              <Textarea
                id={`markdown-${cell.id}`}
                placeholder="Write markdown..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="min-h-[100px]"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{cell.markdown || ""}</ReactMarkdown>
                {!(cell.markdown && cell.markdown.trim().length > 0) && (
                  <div className="text-xs text-gray-500">No notes yet. Click Edit to add notes.</div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {isRequest && (
        <CardFooter>
          <div className="flex gap-2">
            <Button onClick={runRequest} disabled={isRunning}>
              {isRunning ? "Running..." : "Run"}
            </Button>
            <Button variant="outline" onClick={() => onChange(resetRequestCell(cell))}>
              Reset
            </Button>
          </div>
        </CardFooter>
      )}

      {isRequest && (
        <CardContent>
          <div className="text-sm" style={{ color: "var(--text-primary)" }}>Last run</div>
          {lastRun ? (
            <div className="rounded p-2" style={{ background: "var(--bg-surface)", border: "1px solid var(--border-color)" }}>
              <div className="text-xs mb-1" style={{ color: "var(--text-primary)" }}>
                Status: {lastRun.status} • {new Date(lastRun.createdAt).toLocaleString()}
              </div>
              <pre className="text-xs overflow-auto max-h-64 whitespace-pre-wrap break-all" style={{ color: "var(--text-primary)" }}>
{formatResponse(lastRun.responseData)}
              </pre>
              <div className="mt-2 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const toCopy = typeof lastRun.responseData === "string" ? lastRun.responseData : JSON.stringify(lastRun.responseData, null, 2);
                    navigator.clipboard?.writeText(toCopy);
                  }}
                >
                  Copy JSON
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-xs" style={{ color: "var(--text-primary)" }}>No runs yet.</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function safeParseJsonRecord(input?: string): Record<string, string> | undefined {
  if (!input) return undefined;
  try {
    const obj = JSON.parse(input);
    if (obj && typeof obj === "object") return obj as Record<string, string>;
  } catch {}
  return undefined;
}

function parseBody(input?: string): unknown {
  if (!input) return undefined;
  // Try to parse JSON; fall back to raw string
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function resetRequestCell(cell: Cell): Cell {
  return {
    ...cell,
    headersJson: "",
    bodyText: "",
    updatedAt: Date.now(),
  };
}

function formatResponse(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function RequestTitleEditor({ title, onSave }: { title: string; onSave: (v: string) => void }) {
  const [isEditing, setIsEditing] = useState<boolean>(!title);
  const [value, setValue] = useState<string>(title);
  useEffect(() => {
    setValue(title);
    setIsEditing(!title);
  }, [title]);

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2 w-full">
        <div className="flex-1 truncate" title={value || "Untitled"}>{value || "Untitled"}</div>
        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>Edit</Button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 w-full">
      <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Notes / Title (optional)" />
      <Button size="sm" onClick={() => { onSave(value); setIsEditing(false); }}>Save</Button>
      <Button size="sm" variant="outline" onClick={() => { setValue(title); setIsEditing(false); }}>Cancel</Button>
    </div>
  );
}

