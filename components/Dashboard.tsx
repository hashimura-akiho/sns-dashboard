"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeRate, splitPeriod, summarize, type SummaryKey } from "@/lib/metrics";
import type { AccountData } from "@/lib/types";
import { DailyChart, type ChartMetric } from "./DailyChart";
import { PostTable } from "./PostTable";

const PERIODS = [
  { label: "7日", days: 7 },
  { label: "30日", days: 30 },
  { label: "全期間", days: null },
];

const CHART_METRICS: { key: ChartMetric; label: string }[] = [
  { key: "reach", label: "リーチ" },
  { key: "views", label: "閲覧数" },
];

const TILES: { key: SummaryKey; label: string; hint: string }[] = [
  { key: "reach", label: "リーチ", hint: "日次の合計。重複を除いた人数ではありません" },
  { key: "views", label: "閲覧数", hint: "コンテンツが表示された回数" },
  { key: "saves", label: "保存", hint: "投稿が保存された回数" },
  { key: "shares", label: "シェア", hint: "投稿がシェアされた回数" },
];

const formatNumber = (value: number | null) => (value === null ? "—" : value.toLocaleString("ja-JP"));

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ja-JP", {
    timeZone: "Asia/Tokyo",
    dateStyle: "medium",
    timeStyle: "short",
  });

function changeLabel(current: number | null, previous: number | null, hasPrevious: boolean) {
  if (!hasPrevious) return "比較データなし";
  const rate = changeRate(current, previous);
  if (rate === null) return `前期間 ${formatNumber(previous)}`;
  return `前期間比 ${rate >= 0 ? "+" : ""}${Math.round(rate * 100)}%`;
}

export function Dashboard({ account, canSync }: { account: AccountData; canSync: boolean }) {
  const router = useRouter();
  const [days, setDays] = useState<number | null>(30);
  const [metric, setMetric] = useState<ChartMetric>("reach");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const { current, previous } = splitPeriod(account.daily, days);
  const summary = summarize(current);
  const previousSummary = summarize(previous);
  const firstDate = current[0]?.date ?? "";
  const posts =
    days === null
      ? account.posts
      : account.posts.filter((post) => post.publishedAt.slice(0, 10) >= firstDate);

  async function sync() {
    setSyncing(true);
    setSyncError(null);
    try {
      const res = await fetch("/api/sync", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error);
      router.refresh();
    } catch (error) {
      setSyncError((error as Error).message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="page">
      <header className="header">
        <div>
          <p className="eyebrow">Instagram</p>
          <h1>{account.name}</h1>
          <p className="muted">@{account.username}</p>
        </div>
        <div className="sync">
          <button type="button" onClick={sync} disabled={!canSync || syncing}>
            {syncing ? "更新中…" : "今すぐ更新"}
          </button>
          <p className="muted small">最終更新 {formatDateTime(account.fetchedAt)}</p>
        </div>
      </header>

      {account.source === "windsor-snapshot" && (
        <p className="notice">
          Windsor.aiで取得した実データの保存版を表示しています。トークンを設定すると、公式APIから1時間ごとに自動更新します。
        </p>
      )}
      {syncError && <p className="notice notice-error">更新に失敗しました: {syncError}</p>}
      {account.warnings.map((warning) => (
        <p className="notice" key={warning}>
          {warning}
        </p>
      ))}

      <div className="filters" role="group" aria-label="表示期間">
        {PERIODS.map((period) => (
          <button
            type="button"
            key={period.label}
            className="chip"
            aria-pressed={days === period.days}
            onClick={() => setDays(period.days)}
          >
            {period.label}
          </button>
        ))}
      </div>

      <section className="tiles" aria-label="期間サマリー">
        {TILES.map((tile) => (
          <div className="tile" key={tile.key} title={tile.hint}>
            <p className="tile-label">{tile.label}</p>
            <p className="tile-value">{formatNumber(summary[tile.key])}</p>
            <p className="muted small">
              {changeLabel(summary[tile.key], previousSummary[tile.key], previous.length > 0)}
            </p>
          </div>
        ))}
        <div className="tile" title="現在のフォロワー数">
          <p className="tile-label">フォロワー</p>
          <p className="tile-value">{formatNumber(account.followers)}</p>
          <p className="muted small">現在の値</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>日次推移</h2>
            <p className="muted small">●は投稿日。日付の境界はAPIの集計に従います</p>
          </div>
          <div className="filters" role="group" aria-label="表示する指標">
            {CHART_METRICS.map((item) => (
              <button
                type="button"
                key={item.key}
                className="chip"
                aria-pressed={metric === item.key}
                onClick={() => setMetric(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <DailyChart rows={current} posts={account.posts} metric={metric} />
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>投稿別の比較</h2>
            <p className="muted small">列名を押すと並べ替えできます。3秒離脱率は低いほど良い指標です</p>
          </div>
        </div>
        <PostTable posts={posts} />
      </section>
    </main>
  );
}
