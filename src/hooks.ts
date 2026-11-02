import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";

/**
 * Loads `path` from the API. With `pollMs`, refreshes in the background so
 * order statuses update live (kitchen, cashier and customer screens).
 */
export function useApi<T>(path: string | null, pollMs?: number) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!path);
  const pathRef = useRef(path);
  pathRef.current = path;

  const reload = useCallback(async () => {
    const p = pathRef.current;
    if (!p) return;
    try {
      const d = await api.get<T>(p);
      if (pathRef.current === p) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (pathRef.current === p) setError((e as Error).message);
    } finally {
      if (pathRef.current === p) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!path) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    reload();
    if (!pollMs) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") reload();
    }, pollMs);
    return () => clearInterval(id);
  }, [path, pollMs, reload]);

  return { data, error, loading, reload, setData };
}

/** Re-render every `ms` so "5 min ago" labels stay fresh. */
export function useTick(ms = 30000) {
  const [, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((t) => t + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}
