import { useEffect, useState } from "react";

const LOCAL_STORAGE_KEY = "opptrack_backend_base_url";
const LOCAL_STORAGE_PROXY_KEY = "opptrack_use_proxy";

export function useBackendBaseUrl() {
  const [baseUrl, setBaseUrlState] = useState<string>("");
  const [useProxy, setUseProxyState] = useState<boolean>(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      setBaseUrlState(saved);
    } else {
      // default to local backend
      setBaseUrlState("http://localhost:8080");
    }
    const savedProxy = window.localStorage.getItem(LOCAL_STORAGE_PROXY_KEY);
    if (savedProxy != null) setUseProxyState(savedProxy === "true");
  }, []);

  function setBaseUrl(value: string) {
    setBaseUrlState(value);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, value);
    }
  }

  function setUseProxy(next: boolean) {
    setUseProxyState(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCAL_STORAGE_PROXY_KEY, String(next));
    }
  }

  return { baseUrl, setBaseUrl, useProxy, setUseProxy };
}

