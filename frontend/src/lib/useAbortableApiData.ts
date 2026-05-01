"use client";

import { useEffect, useState } from "react";
import type { AxiosRequestConfig } from "axios";
import type { DependencyList, Dispatch, SetStateAction } from "react";
import api from "./axios";

type LoaderOptions<T> = {
  initialData?: T | null;
  load: (signal: AbortSignal) => Promise<T>;
  onError?: (error: unknown) => void;
};

type UrlOptions<T> = {
  enabled?: boolean;
  initialData?: T | null;
  onError?: (error: unknown) => void;
  requestConfig?: Omit<AxiosRequestConfig, "signal">;
};

type UseAbortableApiDataOptions<T> = LoaderOptions<T> | UrlOptions<T>;

function hasCustomLoader<T>(options: UseAbortableApiDataOptions<T>): options is LoaderOptions<T> {
  return "load" in options;
}

export function useAbortableApiData<T>(
  url: string | null | undefined,
  options?: UrlOptions<T>,
  deps?: DependencyList,
): {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  setData: Dispatch<SetStateAction<T | null>>;
};
export function useAbortableApiData<T>(
  options: LoaderOptions<T>,
  deps?: DependencyList,
): {
  data: T | null;
  error: unknown;
  isLoading: boolean;
  setData: Dispatch<SetStateAction<T | null>>;
};
export function useAbortableApiData<T>(
  source: string | null | undefined | LoaderOptions<T>,
  optionsOrDeps: UrlOptions<T> | DependencyList = {},
  urlDeps?: DependencyList,
) {
  const isUrlSource = typeof source === "string" || source == null;
  const urlOptions = (isUrlSource ? optionsOrDeps : {}) as UrlOptions<T>;
  const loaderOptions = (isUrlSource ? urlOptions : source) as UseAbortableApiDataOptions<T>;
  let effectDeps: DependencyList = [];
  if (isUrlSource) {
    effectDeps = urlDeps ?? [source];
  } else if (Array.isArray(optionsOrDeps)) {
    effectDeps = optionsOrDeps;
  }
  const initialData = loaderOptions.initialData ?? null;
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const controller = new AbortController();
    const enabled = isUrlSource ? urlOptions.enabled ?? Boolean(source) : true;
    if (!enabled) {
      setIsLoading(false);
      return () => controller.abort();
    }

    const run = async () => {
      try {
        setError(null);
        const nextData = hasCustomLoader(loaderOptions)
          ? await loaderOptions.load(controller.signal)
          : await api.get<T>(source as string, { ...urlOptions.requestConfig, signal: controller.signal }).then((res) => res.data);
        if (!controller.signal.aborted) {
          setData(nextData);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setError(error);
          loaderOptions.onError?.(error);
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
  }, effectDeps);

  return { data, error, isLoading, setData };
}
