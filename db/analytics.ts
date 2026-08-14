import { env } from "cloudflare:workers";

export type AnalyticsRow = Record<string, string | number | null>;

export type AnalyticsStatement = {
  bind: (...values: unknown[]) => AnalyticsStatement;
  run: () => Promise<unknown>;
  all: <T extends AnalyticsRow>() => Promise<{ results: T[] }>;
};

export type AnalyticsDatabase = {
  prepare: (query: string) => AnalyticsStatement;
  batch: (statements: AnalyticsStatement[]) => Promise<unknown>;
};

export function getAnalyticsDb() {
  if (!env.DB) {
    throw new Error("Analytics database is unavailable");
  }

  return env.DB as unknown as AnalyticsDatabase;
}

