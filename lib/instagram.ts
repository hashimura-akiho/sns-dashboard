import type { AccountData, DailyMetrics, Post } from "./types";

const DAY_SECONDS = 24 * 60 * 60;
const DAILY_METRICS = ["reach", "views", "likes", "comments", "saves", "shares"] as const;
const POST_METRICS = ["reach", "views", "saved", "shares"];
const REEL_METRICS = [...POST_METRICS, "ig_reels_avg_watch_time", "reels_skip_rate"];

type Insight = {
  name: string;
  total_value?: { value: number };
  values?: { value: number }[];
};

type MediaItem = {
  id: string;
  caption?: string;
  timestamp: string;
  media_type: string;
  media_product_type?: string;
  permalink: string;
  like_count?: number;
  comments_count?: number;
};

async function get<T>(path: string, params: Record<string, string>, token: string): Promise<T> {
  const base = process.env.IG_API_BASE || "https://graph.instagram.com";
  const url = new URL(`${base}/${path}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  url.searchParams.set("access_token", token);

  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const { message = `HTTP ${res.status}`, code } = body.error ?? {};
    throw new Error(code ? `${message} (code ${code})` : message);
  }
  return body as T;
}

function insightValues(data: Insight[]): Map<string, number> {
  return new Map(
    data.map((item) => [item.name, item.total_value?.value ?? item.values?.at(-1)?.value ?? 0]),
  );
}

async function fetchDay(
  accountId: string,
  dayStart: number,
  until: number,
  token: string,
): Promise<DailyMetrics> {
  const { data } = await get<{ data: Insight[] }>(
    `${accountId}/insights`,
    {
      metric: DAILY_METRICS.join(","),
      metric_type: "total_value",
      period: "day",
      since: String(dayStart),
      until: String(until),
    },
    token,
  );
  const values = insightValues(data);
  const pick = (metric: (typeof DAILY_METRICS)[number]) => values.get(metric) ?? null;

  return {
    date: new Date(dayStart * 1000).toISOString().slice(0, 10),
    reach: pick("reach"),
    views: pick("views"),
    likes: pick("likes"),
    comments: pick("comments"),
    saves: pick("saves"),
    shares: pick("shares"),
  };
}

async function fetchPost(item: MediaItem, token: string): Promise<{ post: Post; failed: boolean }> {
  const type = item.media_product_type ?? item.media_type;
  const metrics = type === "REELS" ? REEL_METRICS : POST_METRICS;
  let values = new Map<string, number>();
  let failed = false;

  try {
    const { data } = await get<{ data: Insight[] }>(
      `${item.id}/insights`,
      { metric: metrics.join(",") },
      token,
    );
    values = insightValues(data);
  } catch {
    failed = true;
  }

  const skipRate = values.get("reels_skip_rate") ?? null;
  return {
    failed,
    post: {
      id: item.id,
      publishedAt: item.timestamp,
      type,
      caption: item.caption ?? "",
      permalink: item.permalink,
      reach: values.get("reach") ?? null,
      views: values.get("views") ?? null,
      likes: item.like_count ?? null,
      comments: item.comments_count ?? null,
      saved: values.get("saved") ?? null,
      shares: values.get("shares") ?? null,
      avgWatchMs: values.get("ig_reels_avg_watch_time") ?? null,
      // 蓄積データは 0〜1 の割合で統一する。
      skipRate: skipRate !== null && skipRate > 1 ? skipRate / 100 : skipRate,
    },
  };
}

type Profile = {
  user_id: string;
  username: string;
  name?: string;
  followers_count?: number;
};

async function fetchProfile(token: string): Promise<Profile> {
  const userId = process.env.IG_USER_ID;
  if (!userId) {
    return get<Profile>("me", { fields: "user_id,username,name,followers_count" }, token);
  }

  // graph.facebook.com の IGユーザーには user_id フィールドがないため、指定されたIDを使う。
  const profile = await get<Omit<Profile, "user_id">>(
    userId,
    { fields: "username,name,followers_count" },
    token,
  );
  return { ...profile, user_id: userId };
}

export async function fetchInstagramAccount(token: string, days: number): Promise<AccountData> {
  const me = await fetchProfile(token);

  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % DAY_SECONDS);
  const warnings: string[] = [];
  const daily: DailyMetrics[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const dayStart = todayStart - offset * DAY_SECONDS;
    try {
      daily.push(await fetchDay(me.user_id, dayStart, Math.min(dayStart + DAY_SECONDS, now), token));
    } catch (error) {
      warnings.push(`日次データの取得に失敗しました: ${(error as Error).message}`);
      break;
    }
  }

  const { data: media } = await get<{ data: MediaItem[] }>(
    `${me.user_id}/media`,
    {
      fields: "id,caption,timestamp,media_type,media_product_type,permalink,like_count,comments_count",
      limit: "50",
    },
    token,
  );

  const posts: Post[] = [];
  let failedPosts = 0;
  for (const item of media) {
    const { post, failed } = await fetchPost(item, token);
    posts.push(post);
    if (failed) failedPosts += 1;
  }
  if (failedPosts > 0) warnings.push(`${failedPosts}件の投稿でインサイトを取得できませんでした。`);

  const followers = me.followers_count ?? null;
  const fetchedAt = new Date().toISOString();

  return {
    accountId: me.user_id,
    username: me.username,
    name: me.name ?? me.username,
    followers,
    source: "instagram-api",
    fetchedAt,
    warnings,
    daily,
    posts,
    followerHistory:
      followers === null ? [] : [{ date: fetchedAt.slice(0, 10), followers }],
  };
}
