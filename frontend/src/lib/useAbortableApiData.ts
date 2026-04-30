"use client";

import { DependencyList, useEffect, useState } from "react";

type UseAbortableApiDataOptions<T> = {
  initialData?: T | null;
  load: (signal: AbortSignal) => Promise<T>;
  onError?: (error: unknown) => void;
};

export function useAbortableApiData<T>(
  { initialData = null, load, onError }: UseAbortableApiDataOptions<T>,
  deps: DependencyList = [],
) {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try {
        const nextData = await load(controller.signal);
        if (!controller.signal.aborted) {
          setData(nextData);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          onError?.(error);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    void run();
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, isLoading, setData };
}
