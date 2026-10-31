// null は「データなし」、0 は実測値の 0 を表す。
export type DailyMetrics = {
  date: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saves: number | null;
  shares: number | null;
};

export type Post = {
  id: string;
  publishedAt: string;
  type: string;
  caption: string;
  permalink: string;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  saved: number | null;
  shares: number | null;
  avgWatchMs: number | null;
  skipRate: number | null;
};

export type FollowerRecord = { date: string; followers: number };

export type AccountData = {
  accountId: string;
  username: string;
  name: string;
  followers: number | null;
  source: "windsor-snapshot" | "instagram-api";
  fetchedAt: string;
  warnings: string[];
  daily: DailyMetrics[];
  posts: Post[];
  followerHistory: FollowerRecord[];
};
