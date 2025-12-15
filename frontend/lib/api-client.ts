/**
 * Enhanced API client with retry logic, caching, and offline support.
 */
import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getApiBase } from "./config";

// IndexedDB cache for offline mode
const DB_NAME = "smart_presence_cache";
const DB_VERSION = 1;
const STORE_NAME = "api_cache";

let db: IDBDatabase | null = null;

async function openDB(): Promise<IDBDatabase> {
  if (db) return db;
  
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };
  });
}

async function getCached(key: string): Promise<any> {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result;
        if (result && Date.now() - result.timestamp < 5 * 60 * 1000) { // 5 min TTL
          resolve(result.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function setCache(key: string, data: any): Promise<void> {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put({ key, data, timestamp: Date.now() });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => resolve(); // Silent fail
    });
  } catch {
    // Silent fail
  }
}

export interface ApiClientOptions extends AxiosRequestConfig {
  useCache?: boolean;
  cacheKey?: string;
  dedupe?: boolean;
}

/**
 * Enhanced fetch with retry logic and offline support.
 */
export async function apiClient<T = any>(
  endpoint: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { useCache = false, cacheKey, dedupe = true, ...axiosConfig } = options;
  const url = `${getApiBase()}${endpoint}`;
  const finalCacheKey = cacheKey || `${axiosConfig.method || "GET"}:${endpoint}`;

  // In-flight deduplication for GET requests to avoid duplicate network calls
  const inflightMap = (apiClient as any)._inflight as Map<string, Promise<any>> | undefined;
  if (!inflightMap) {
    (apiClient as any)._inflight = new Map<string, Promise<any>>();
  }
  const inflight = (apiClient as any)._inflight as Map<string, Promise<any>>;

  // Try cache first if enabled
  if (useCache && axiosConfig.method === "GET") {
    const cached = await getCached(finalCacheKey);
    if (cached) return cached;
  }

  // Return in-flight request if exists
  if (dedupe && axiosConfig.method === "GET" && inflight.has(finalCacheKey)) {
    return inflight.get(finalCacheKey) as Promise<T>;
  }

  // Add auth headers
  const token = typeof window !== "undefined" ? localStorage.getItem("spa_access_token") : null;
  const headers = {
    ...axiosConfig.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const requestPromise = axios({
    ...axiosConfig,
    url,
    headers,
  });

  if (dedupe && axiosConfig.method === "GET") {
    inflight.set(finalCacheKey, requestPromise);
  }

  try {
    const response = await requestPromise;

    // Cache successful GET responses
    if (useCache && axiosConfig.method === "GET") {
      await setCache(finalCacheKey, response.data);
    }

    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // If offline and cache available, return cached data
    if (!navigator.onLine && useCache) {
      const cached = await getCached(finalCacheKey);
      if (cached) return cached;
    }

    throw error;
  } finally {
    if (dedupe && axiosConfig.method === "GET") {
      inflight.delete(finalCacheKey);
    }
  }
}

/**
 * React Query default options with retry logic.
 */
export const queryClientConfig = {
  defaultOptions: {
    queries: {
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime in v5)
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      retryOnMount: false,
    },
    mutations: {
      retry: 1,
      retryDelay: 1000,
    },
  },
};

/**
 * Custom hook for API calls with automatic retry and caching.
 */
export function useApiQuery<T = any>(
  key: string | string[],
  endpoint: string,
  options: ApiClientOptions & { enabled?: boolean } = {}
) {
  const { enabled = true, ...apiOptions } = options;
  
  return {
    queryKey: Array.isArray(key) ? key : [key],
    queryFn: () => apiClient<T>(endpoint, { ...apiOptions, useCache: true }),
    enabled,
  };
}
