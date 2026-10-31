import assert from "node:assert/strict";
import { test } from "node:test";
import {
  captionTitle,
  changeRate,
  mergeAccount,
  sortPosts,
  splitPeriod,
  summarize,
} from "./metrics.ts";
import type { AccountData, DailyMetrics, Post } from "./types";

function day(date: string, reach: number | null): DailyMetrics {
  return { date, reach, views: reach, likes: 0, comments: 0, saves: null, shares: 0 };
}

function post(id: string, publishedAt: string, skipRate: number | null): Post {
  return {
    id,
    publishedAt,
    type: "REELS",
    caption: "",
    permalink: "",
    reach: 1,
    views: 1,
    likes: 0,
    comments: 0,
    saved: 0,
    shares: 0,
    avgWatchMs: null,
    skipRate,
  };
}

function account(overrides: Partial<AccountData>): AccountData {
  return {
    accountId: "1",
    username: "a",
    name: "a",
    followers: 0,
    source: "instagram-api",
    fetchedAt: "2026-10-30T00:00:00Z",
    warnings: [],
    daily: [],
    posts: [],
    followerHistory: [],
    ...overrides,
  };
}

const fourDays = [
  day("2026-10-04", 40),
  day("2026-10-01", 10),
  day("2026-10-03", 30),
  day("2026-10-02", 20),
];

test("splitPeriod は最新日を基準に直近と直前へ分ける", () => {
  const { current, previous } = splitPeriod(fourDays, 2);
  assert.deepEqual(current.map((row) => row.date), ["2026-10-03", "2026-10-04"]);
  assert.deepEqual(previous.map((row) => row.date), ["2026-10-01", "2026-10-02"]);
});

test("splitPeriod は直前の期間に欠けがあれば比較しない", () => {
  assert.deepEqual(splitPeriod(fourDays, 3).previous, []);
});

test("splitPeriod は全期間を昇順で返す", () => {
  const { current, previous } = splitPeriod(fourDays, null);
  assert.equal(current[0].date, "2026-10-01");
  assert.deepEqual(previous, []);
});

test("summarize は実測値の 0 とデータなしを区別する", () => {
  const summary = summarize([day("2026-10-01", 0), day("2026-10-02", 5)]);
  assert.equal(summary.reach, 5);
  assert.equal(summary.shares, 0);
  assert.equal(summary.saves, null);
});

test("changeRate は比較できないとき null を返す", () => {
  assert.equal(changeRate(150, 100), 0.5);
  assert.equal(changeRate(10, 0), null);
  assert.equal(changeRate(null, 10), null);
});

test("sortPosts は null を常に末尾へ置く", () => {
  const posts = [post("a", "2026-10-01", null), post("b", "2026-10-02", 0.2), post("c", "2026-10-03", 0.7)];
  assert.deepEqual(sortPosts(posts, "skipRate", true).map((item) => item.id), ["c", "b", "a"]);
  assert.deepEqual(sortPosts(posts, "skipRate", false).map((item) => item.id), ["b", "c", "a"]);
});

test("captionTitle は最初の空でない行を返す", () => {
  assert.equal(captionTitle("\n  \n一行目\n二行目"), "一行目");
  assert.equal(captionTitle(""), "（キャプションなし）");
});

test("mergeAccount は履歴を残し、取得失敗の null で値を消さない", () => {
  const previous = account({
    daily: [day("2026-10-01", 10), day("2026-10-02", 20)],
    posts: [post("a", "2026-10-01", 0.5)],
  });
  const next = account({
    daily: [day("2026-10-02", 25), day("2026-10-03", 30)],
    posts: [post("a", "2026-10-01", null), post("b", "2026-10-02", 0.4)],
  });
  const merged = mergeAccount(previous, next);
  assert.deepEqual(merged.daily.map((row) => row.reach), [10, 25, 30]);
  assert.deepEqual(merged.posts.map((item) => item.id), ["b", "a"]);
  assert.equal(merged.posts[1].skipRate, 0.5);
});
