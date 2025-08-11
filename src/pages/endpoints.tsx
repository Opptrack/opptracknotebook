import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useBackendBaseUrl } from "../hooks/useBackend";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { Card, CardContent, CardHeader } from "../components/ui/Card";
import { createApiClient } from "../lib/apiClient";
import Select from "../components/ui/Select";
import Textarea from "../components/ui/Textarea";
import { db } from "../lib/db";
import { useRouter } from "next/router";
import Chip from "../components/ui/Chip";

type OpenAPISchema = any;

export default function EndpointsPage() {
  const { baseUrl, setBaseUrl, useProxy, setUseProxy } = useBackendBaseUrl();
  const [specUrl, setSpecUrl] = useState<string>("/openapi.json");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [spec, setSpec] = useState<OpenAPISchema | null>(null);
  const router = useRouter();

  const [selectedPath, setSelectedPath] = useState<string>("");
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [queryValues, setQueryValues] = useState<Record<string, any>>({});
  const [pathValues, setPathValues] = useState<Record<string, any>>({});
  const [headersJson, setHeadersJson] = useState<string>("");
  const [bodyText, setBodyText] = useState<string>("");
  const [result, setResult] = useState<{ status: number; data: any } | null>(null);
  const [pastedUrl, setPastedUrl] = useState<string>("");
  const [presetName, setPresetName] = useState<string>("");

  async function loadSpec() {
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const url = specUrl.startsWith("http") ? specUrl : `${baseUrl.replace(/\/$/, "")}${specUrl}`;
      // try direct first
      let ok = false;
      try {
        const r = await fetch(url);
        if (r.ok) {
          setSpec(await r.json());
          ok = true;
        }
      } catch {}
      if (!ok) {
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const json = await res.json();
        setSpec(json.data);
      }
    } catch (e) {
      setError((e as Error)?.message || "Failed to load spec");
    } finally {
      setLoading(false);
    }
  }

  const operations = useMemo(() => {
    if (!spec) return [] as Array<{ method: string; path: string; summary?: string }>;
    const out: Array<{ method: string; path: string; summary?: string }> = [];
    const paths = spec.paths || {};
    Object.entries(paths).forEach(([path, methods]) => {
      Object.entries(methods as Record<string, any>).forEach(([method, op]) => {
        out.push({ method: method.toUpperCase(), path, summary: op.summary });
      });
    });
    return out.sort((a, b) => a.path.localeCompare(b.path));
  }, [spec]);

  const currentOp = useMemo(() => {
    if (!spec || !selectedPath || !selectedMethod) return null as any;
    const m = (spec.paths?.[selectedPath] || {})[selectedMethod.toLowerCase()];
    return m || null;
  }, [spec, selectedPath, selectedMethod]);

  // Build parameter metadata for query and path inputs
  const queryParams = useMemo(() => {
    if (!currentOp) return [] as Array<any>;
    const all = currentOp.parameters || [];
    return (all as Array<any>).filter((p) => p.in === "query");
  }, [currentOp]);

  const pathParams = useMemo(() => {
    if (!currentOp) return [] as Array<any>;
    const all = currentOp.parameters || [];
    return (all as Array<any>).filter((p) => p.in === "path");
  }, [currentOp]);

  function applyPresets(preset: "basic" | "last24h" | "last7d" | "last30d") {
    const now = new Date();
    const toISO = (d: Date) => d.toISOString();
    const updates: Record<string, any> = { ...queryValues };
    // Common presets
    if (hasParam("limit")) updates["limit"] = updates["limit"] ?? 25;
    if (hasParam("offset")) updates["offset"] = updates["offset"] ?? 0;
    if (hasParam("sort")) updates["sort"] = updates["sort"] ?? "createdAt:desc";
    const dateKeys = ["startDate", "endDate", "from", "to"];
    const hasAnyDate = dateKeys.some((k) => hasParam(k));
    if (hasAnyDate) {
      const end = new Date(now);
      const start = new Date(now);
      if (preset === "last24h") start.setDate(start.getDate() - 1);
      if (preset === "last7d") start.setDate(start.getDate() - 7);
      if (preset === "last30d") start.setDate(start.getDate() - 30);
      if (hasParam("startDate")) updates["startDate"] = toISO(start);
      if (hasParam("from")) updates["from"] = toISO(start);
      if (hasParam("endDate")) updates["endDate"] = toISO(end);
      if (hasParam("to")) updates["to"] = toISO(end);
    }
    setQueryValues(updates);
  }

  function hasParam(name: string) {
    return queryParams.some((p) => p.name === name);
  }

  function resetForm() {
    setQueryValues({});
    setPathValues({});
    setHeadersJson("");
    setBodyText("");
    setResult(null);
  }

  async function runOperation() {
    if (!selectedPath || !selectedMethod) return;
    const method = selectedMethod.toUpperCase();
    const builtPath = selectedPath.replace(/\{(.*?)\}/g, (_, name) => encodeURIComponent(String(pathValues[name] ?? "")));
    const url = `${baseUrl.replace(/\/$/, "")}${builtPath}`;

    // Build query string
    const qs = new URLSearchParams();
    Object.entries(queryValues).forEach(([k, v]) => {
      if (v === undefined || v === null || v === "") return;
      qs.set(k, String(v));
    });
    const fullUrl = qs.toString() ? `${url}?${qs.toString()}` : url;

    const headers = safeParseJsonRecord(headersJson) || {};
    const init: RequestInit = {
      method,
      headers: { ...(Object.keys(headers).length ? headers : {}), ...(bodyText ? { "Content-Type": "application/json" } : {}) },
      body: method === "GET" || method === "HEAD" ? undefined : bodyText || undefined,
    };

    try {
      let r: Response;
      if (useProxy) {
        r = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: fullUrl, method, headers, body: bodyText ? safeParseBody(bodyText) : undefined }),
        });
        const j = await r.json();
        setResult({ status: j.status ?? r.status, data: j.data ?? j });
      } else {
        r = await fetch(fullUrl, init);
        const contentType = r.headers.get("content-type") || "";
        const data = contentType.includes("application/json") ? await r.json() : await r.text();
        setResult({ status: r.status, data });
      }
    } catch (e: any) {
      setResult({ status: 0, data: { error: e?.message || "Request failed" } });
    }
  }

  async function sendToNotebook() {
    if (!selectedPath || !selectedMethod) return;
    // compute order
    const cells = await db.cells.toArray();
    const nextOrder = cells.length ? Math.max(...cells.map((c) => c.orderIndex)) + 1 : 1;
    const builtPath = selectedPath.replace(/\{(.*?)\}/g, (_, name) => encodeURIComponent(String(pathValues[name] ?? "")));
    const headers = safeParseJsonRecord(headersJson);
    const cell = {
      type: "request" as const,
      title: `${selectedMethod.toUpperCase()} ${builtPath}`,
      orderIndex: nextOrder,
      method: selectedMethod.toUpperCase(),
      path: builtPath,
      headersJson: headers ? JSON.stringify(headers, null, 2) : "",
      bodyText: bodyText || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.cells.add(cell as any);
    router.push("/notebook");
  }

  useEffect(() => {
    // when selecting op, seed defaults
    if (!currentOp) return;
    const qDefaults: Record<string, any> = {};
    (currentOp.parameters || []).forEach((p: any) => {
      if (p.in === "query" && p.schema && p.schema.default !== undefined) {
        qDefaults[p.name] = p.schema.default;
      }
    });
    setQueryValues(qDefaults);
  }, [currentOp]);

  return (
    <div className="min-h-screen p-6 space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold">Endpoint Explorer</h1>
              <Link className="text-blue-600 underline" href="/notebook">
                Notebook
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
                <input type="checkbox" checked={useProxy} onChange={(e) => setUseProxy(e.target.checked)} />
                Use proxy
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              placeholder="/openapi.json or full URL"
              value={specUrl}
              onChange={(e) => setSpecUrl(e.target.value)}
              className="w-[380px]"
            />
            <Button onClick={loadSpec} disabled={(!baseUrl && !specUrl.startsWith("http")) || loading}>
              {loading ? "Loading…" : "Load"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {/* Paste URL helper */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="md:col-span-2">
              <label className="text-sm text-gray-700">Paste a URL (e.g., curl URL)</label>
              <Input
                placeholder="http://localhost:8080/insights/industry?account_industry=Insurance&limit=500"
                value={pastedUrl}
                onChange={(e) => setPastedUrl(e.target.value)}
              />
            </div>
            <div>
              <Button
                variant="outline"
                onClick={() => {
                  try {
                    const u = new URL(pastedUrl);
                    // infer method if set, else keep selected
                    setSelectedMethod((m) => m || "GET");
                    const path = u.pathname;
                    setSelectedPath(path);
                    const parsed: Record<string, string> = {};
                    u.searchParams.forEach((v, k) => (parsed[k] = v));
                    setQueryValues((prev) => ({ ...prev, ...parsed }));
                  } catch {}
                }}
              >
                Parse URL
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {spec && (
        <Card>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm text-gray-700">Method</label>
                <Select
                  value={selectedMethod}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                >
                  <option value="">Select method</option>
                  {[...new Set(operations.map((o) => o.method))].map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm text-gray-700">Path</label>
                <Select value={selectedPath} onChange={(e) => setSelectedPath(e.target.value)}>
                  <option value="">Select path</option>
                  {operations
                    .filter((o) => !selectedMethod || o.method === selectedMethod)
                    .map((o) => (
                      <option key={`${o.method}-${o.path}`} value={o.path}>
                        {o.path}
                      </option>
                    ))}
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {currentOp && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Configure request</div>
              <div className="flex items-center gap-2">
                <Input placeholder="Preset name" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
                <Button
                  variant="secondary"
                  onClick={async () => {
                    if (!presetName) return;
                    await db.presets.add({
                      name: presetName,
                      method: selectedMethod.toUpperCase(),
                      path: selectedPath,
                      queryValues,
                      headersJson,
                      bodyText,
                      createdAt: Date.now(),
                    } as any);
                    setPresetName("");
                  }}
                >
                  Save preset
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Path params */}
            {pathParams.length > 0 && (
              <div className="grid gap-2 mb-4">
                <div className="font-medium">Path parameters</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {pathParams.map((p) => (
                    <div key={p.name}>
                      <label className="text-sm text-gray-700">{p.name}{p.required ? " *" : ""}</label>
                      <Input
                        value={pathValues[p.name] ?? ""}
                        onChange={(e) => setPathValues({ ...pathValues, [p.name]: e.target.value })}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Query params */}
            <div className="grid gap-2 mb-4">
              <div className="flex items-center justify-between">
                <div className="font-medium">Query parameters</div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => applyPresets("basic")}>Defaults</Button>
                  <Button variant="outline" onClick={() => applyPresets("last24h")}>Last 24h</Button>
                  <Button variant="outline" onClick={() => applyPresets("last7d")}>Last 7d</Button>
                  <Button variant="outline" onClick={() => applyPresets("last30d")}>Last 30d</Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {queryParams.length === 0 && <div className="text-sm text-gray-500">No query parameters</div>}
                {queryParams.map((p) => (
                  <div key={p.name}>
                    <label className="text-sm text-gray-700">{p.name}{p.required ? " *" : ""}</label>
                    {p.schema?.enum ? (
                      <div className="flex flex-wrap gap-2">
                        {p.schema.enum.map((v: any) => (
                          <Chip
                            key={String(v)}
                            label={String(v)}
                            selected={String(queryValues[p.name]) === String(v)}
                            onClick={() => setQueryValues({ ...queryValues, [p.name]: v })}
                          />
                        ))}
                      </div>
                    ) : p.schema?.format === "date-time" || p.schema?.format === "date" ? (
                      <Input
                        type="datetime-local"
                        value={queryValues[p.name] ?? ""}
                        onChange={(e) => setQueryValues({ ...queryValues, [p.name]: e.target.value })}
                      />
                    ) : (
                      <Input
                        value={queryValues[p.name] ?? (p.schema?.default ?? "")}
                        onChange={(e) => setQueryValues({ ...queryValues, [p.name]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Headers */}
            <div className="grid gap-2 mb-4">
              <div className="font-medium">Headers (JSON)</div>
              <Textarea className="font-mono" placeholder='{"Authorization": "Bearer ..."}' value={headersJson} onChange={(e) => setHeadersJson(e.target.value)} />
            </div>

            {/* Body */}
            {currentOp.requestBody && (
              <div className="grid gap-2 mb-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">Body (JSON)</div>
                  <div className="text-xs text-gray-500">content: application/json</div>
                </div>
                <Textarea className="font-mono min-h-[120px]" placeholder="{}" value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button onClick={runOperation}>Run</Button>
              <Button variant="outline" onClick={resetForm}>Reset</Button>
              <Button variant="secondary" onClick={sendToNotebook}>Send to Notebook</Button>
              <Button
                variant="outline"
                onClick={() => {
                  const qs = new URLSearchParams();
                  Object.entries(queryValues).forEach(([k, v]) => {
                    if (v === undefined || v === null || v === "") return;
                    qs.set(k, String(v));
                  });
                  const builtPath = selectedPath.replace(/\{(.*?)\}/g, (_, name) => encodeURIComponent(String(pathValues[name] ?? "")));
                  const url = `${baseUrl.replace(/\/$/, "")}${builtPath}${qs.toString() ? `?${qs.toString()}` : ""}`;
                  const curl = `curl -X ${selectedMethod.toUpperCase()} ${JSON.stringify(url)}${
                    headersJson ? ` -H ${JSON.stringify(`Content-Type: application/json`)}` : ""
                  }${headersJson ? Object.entries(JSON.parse(headersJson)).map(([k, v]) => ` -H ${JSON.stringify(`${k}: ${v}`)}`).join("") : ""}${
                    bodyText && selectedMethod.toUpperCase() !== "GET" ? ` -d ${JSON.stringify(bodyText)}` : ""
                  }`;
                  navigator.clipboard?.writeText(curl);
                }}
              >
                Copy as curl
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <div className="text-sm">Result • Status {result.status}</div>
          </CardHeader>
          <CardContent>
            <pre className="text-xs overflow-auto max-h-96 whitespace-pre-wrap break-all">{formatResponse(result.data)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
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

function safeParseBody(input?: string): any {
  if (!input) return undefined;
  try {
    return JSON.parse(input);
  } catch {
    return input;
  }
}

function formatResponse(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

