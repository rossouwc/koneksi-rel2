const ESP_BASE_URL = "https://developer.sepush.co.za/business/2.0";
const API_KEY = process.env.ESKOMSEPUSH_API_KEY || "";

interface CacheEntry<T> {
  data: T;
  expires: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T, ttlMs: number): void {
  cache.set(key, { data, expires: Date.now() + ttlMs });
}

const FIVE_MIN = 5 * 60 * 1000;
const THIRTY_MIN = 30 * 60 * 1000;

async function espFetch(endpoint: string, params?: Record<string, string>): Promise<any> {
  const url = new URL(`${ESP_BASE_URL}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const res = await fetch(url.toString(), {
      headers: { Token: API_KEY },
      signal: controller.signal,
    });

    if (res.status === 429) {
      throw new Error("ESP_RATE_LIMIT");
    }
    if (res.status === 403) {
      throw new Error("ESP_AUTH_FAILED");
    }
    if (!res.ok) {
      throw new Error(`ESP_ERROR_${res.status}`);
    }

    return res.json();
  } finally {
    clearTimeout(timeout);
  }
}

export interface EspAreaSearchResult {
  id: string;
  name: string;
  region: string;
}

export async function searchAreas(text: string): Promise<EspAreaSearchResult[]> {
  const cacheKey = `search:${text.toLowerCase()}`;
  const cached = getCached<EspAreaSearchResult[]>(cacheKey);
  if (cached) return cached;

  const data = await espFetch("/areas_search", { text });
  const results: EspAreaSearchResult[] = (data.areas || []).map((a: any) => ({
    id: a.id,
    name: a.name,
    region: a.region,
  }));

  setCache(cacheKey, results, THIRTY_MIN);
  return results;
}

export interface EspEvent {
  note: string;
  start: string;
  end: string;
}

export interface EspScheduleDay {
  date: string;
  name: string;
  stages: string[][];
}

export interface EspAreaInfo {
  events: EspEvent[];
  info: { name: string; region: string };
  schedule: { days: EspScheduleDay[] };
}

export async function getAreaInfo(areaId: string): Promise<EspAreaInfo> {
  const cacheKey = `area:${areaId}`;
  const cached = getCached<EspAreaInfo>(cacheKey);
  if (cached) return cached;

  const data = await espFetch("/area", { id: areaId });

  const result: EspAreaInfo = {
    events: (data.events || []).map((e: any) => ({
      note: e.note,
      start: e.start,
      end: e.end,
    })),
    info: {
      name: data.info?.name || areaId,
      region: data.info?.region || "",
    },
    schedule: {
      days: (data.schedule?.days || []).map((d: any) => ({
        date: d.date,
        name: d.name,
        stages: d.stages || [],
      })),
    },
  };

  setCache(cacheKey, result, THIRTY_MIN);
  return result;
}

export interface EspStatus {
  status: {
    eskom: { stage: string; stage_updated: string };
    capetown?: { stage: string; stage_updated: string };
  };
}

export async function getStatus(): Promise<EspStatus> {
  const cacheKey = "status";
  const cached = getCached<EspStatus>(cacheKey);
  if (cached) return cached;

  const data = await espFetch("/status");
  const result: EspStatus = {
    status: {
      eskom: {
        stage: data.status?.eskom?.stage || "0",
        stage_updated: data.status?.eskom?.stage_updated || "",
      },
      capetown: data.status?.capetown
        ? {
            stage: data.status.capetown.stage || "0",
            stage_updated: data.status.capetown.stage_updated || "",
          }
        : undefined,
    },
  };

  setCache(cacheKey, result, FIVE_MIN);
  return result;
}

export async function getAllowance(): Promise<any> {
  return espFetch("/api_allowance");
}
