import type { NextApiRequest, NextApiResponse } from "next";

type ProxyRequestBody = {
  baseUrl?: string;
  url?: string; // full URL alternative to baseUrl + path
  path?: string;
  method?: string;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const { baseUrl, url, path, method = "GET", headers = {}, query, body } = (req.body || {}) as ProxyRequestBody;

  try {
    if (!url && (!baseUrl || !path)) {
      return res.status(400).json({ error: "Provide either 'url' or both 'baseUrl' and 'path'" });
    }

    if (baseUrl && !/^https?:\/\//i.test(baseUrl)) {
      return res.status(400).json({ error: "baseUrl must start with http:// or https://" });
    }

    const composed = url || `${(baseUrl || "").replace(/\/$/, "")}${path?.startsWith("/") ? path : `/${path || ""}`}`;

    let targetUrl: URL;
    try {
      targetUrl = new URL(composed);
    } catch (e: any) {
      return res.status(400).json({ error: `Invalid URL: ${e?.message || "Unknown"}`, composed });
    }

    if (query && typeof query === "object") {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        targetUrl.searchParams.set(key, String(value));
      });
    }

    // Filter out hop-by-hop or unsafe headers
    const { host, connection, "content-length": _contentLength, ...safeHeaders } = Object.fromEntries(
      Object.entries(headers || {}).map(([k, v]) => [k.toLowerCase(), v])
    );

    const init: RequestInit = {
      method,
      headers: safeHeaders,
    };

    if (body !== undefined && body !== null && method.toUpperCase() !== "GET") {
      if (typeof body === "string") {
        init.body = body;
        if (!safeHeaders["content-type"]) {
          (init.headers as Record<string, string>)["content-type"] = "text/plain";
        }
      } else {
        init.body = JSON.stringify(body);
        if (!safeHeaders["content-type"]) {
          (init.headers as Record<string, string>)["content-type"] = "application/json";
        }
      }
    }

    const response = await fetch(targetUrl.toString(), init);

    const contentType = response.headers.get("content-type") || "";
    const status = response.status;

    // Stream or parse based on content type
    if (contentType.includes("application/json")) {
      const data = await response.json().catch(async () => ({ raw: await response.text() }));
      return res.status(status).json({ status, headers: Object.fromEntries(response.headers.entries()), data });
    }

    const text = await response.text();
    return res
      .status(status)
      .json({ status, headers: Object.fromEntries(response.headers.entries()), data: text });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || "Proxy error" });
  }
}

