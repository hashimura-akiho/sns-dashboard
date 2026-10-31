import type { AccountData, DailyMetrics, Post } from "./types";

export type SummaryKey = "reach" | "views" | "saves" | "shares";
export type Summary = Record<SummaryKey, number | null>;
export type SortKey =
  | "publishedAt"
  | "reach"
  | "views"
  | "skipRate"
  | "avgWatchMs"
  | "saved"
  | "shares";

const DAY_MS = 24 * 60 * 60 * 1000;
const SUMMARY_KEYS: SummaryKey[] = ["reach", "views", "saves", "shares"];

function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

// 記録のある最新日を基準に、直近の期間とその直前の期間に分ける。
export function splitPeriod(daily: DailyMetrics[], days: number | null) {
  const sorted = [...daily].sort((a, b) => a.date.localeCompare(b.date));
  if (days === null || sorted.length === 0) return { current: sorted, previous: [] };

  const latest = sorted[sorted.length - 1].date;
  const currentStart = addDays(latest, 1 - days);
  const previousStart = addDays(latest, 1 - days * 2);
  const previous = sorted.filter((row) => row.date >= previousStart && row.date < currentStart);

  return {
    current: sorted.filter((row) => row.date >= currentStart),
    // 期間がそろわない比較は誤解を招くため、欠けがあれば比較しない。
    previous: previous.length === days ? previous : [],
  };
}

export function summarize(rows: DailyMetrics[]): Summary {
  const entries = SUMMARY_KEYS.map((key) => {
    const values = rows.map((row) => row[key]).filter((value) => value !== null);
    return [key, values.length ? values.reduce((total, value) => total + value, 0) : null];
  });
  return Object.fromEntries(entries) as Summary;
}

export function changeRate(current: number | null, previous: number | null): number | null {
  if (current === null || previous === null || previous === 0) return null;
  return (current - previous) / previous;
}

export function sortPosts(posts: Post[], key: SortKey, descending: boolean): Post[] {
  return [...posts].sort((a, b) => {
    const left = a[key];
    const right = b[key];
    if (left === null) return right === null ? 0 : 1;
    if (right === null) return -1;
    const order = typeof left === "string" ? left.localeCompare(String(right)) : left - Number(right);
    return descending ? -order : order;
  });
}

export function captionTitle(caption: string): string {
  const line = caption.split("\n").find((text) => text.trim()) ?? "";
  return line.trim() || "（キャプションなし）";
}

function withoutNulls<T extends object>(item: T): Partial<T> {
  return Object.fromEntries(Object.entries(item).filter(([, value]) => value !== null)) as Partial<T>;
}

function mergeRows<T extends object>(previous: T[], next: T[], key: keyof T): T[] {
  const merged = new Map(previous.map((row) => [row[key], row]));
  for (const row of next) {
    const existing = merged.get(row[key]);
    // 取得に失敗した項目で過去の値を消さない。
    merged.set(row[key], existing ? { ...existing, ...withoutNulls(row) } : row);
  }
  return [...merged.values()];
}

export function mergeAccount(previous: AccountData | null, next: AccountData): AccountData {
  if (!previous) return next;
  return {
    ...next,
    daily: mergeRows(previous.daily, next.daily, "date").sort((a, b) => a.date.localeCompare(b.date)),
    posts: mergeRows(previous.posts, next.posts, "id").sort((a, b) =>
      b.publishedAt.localeCompare(a.publishedAt),
    ),
    followerHistory: mergeRows(previous.followerHistory, next.followerHistory, "date").sort((a, b) =>
      a.date.localeCompare(b.date),
    ),
  };
}
