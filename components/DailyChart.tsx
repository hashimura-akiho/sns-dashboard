"use client";

import { useState } from "react";
import { captionTitle } from "@/lib/metrics";
import type { DailyMetrics, Post } from "@/lib/types";

export type ChartMetric = "reach" | "views";

const WIDTH = 760;
const HEIGHT = 260;
const MARGIN = { top: 16, right: 8, bottom: 44, left: 40 };
const GRID_STEPS = 4;

function niceMax(value: number): number {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = [1, 2, 5, 10].find((candidate) => candidate * magnitude >= value) ?? 10;
  return step * magnitude;
}

const shortDate = (date: string) => `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}`;

export function DailyChart({
  rows,
  posts,
  metric,
}: {
  rows: DailyMetrics[];
  posts: Post[];
  metric: ChartMetric;
}) {
  const [hovered, setHovered] = useState<number | null>(null);

  if (rows.length === 0) return <p className="muted">この期間のデータはありません。</p>;

  const plotWidth = WIDTH - MARGIN.left - MARGIN.right;
  const plotHeight = HEIGHT - MARGIN.top - MARGIN.bottom;
  const baseline = MARGIN.top + plotHeight;
  const slot = plotWidth / rows.length;
  const barWidth = Math.min(slot * 0.62, 28);
  const max = niceMax(Math.max(...rows.map((row) => row[metric] ?? 0)));
  const labelEvery = Math.max(1, Math.ceil(rows.length / 7));
  const metricLabel = metric === "reach" ? "リーチ" : "閲覧数";

  const postsByDate = new Map<string, Post[]>();
  for (const post of posts) {
    const date = post.publishedAt.slice(0, 10);
    postsByDate.set(date, [...(postsByDate.get(date) ?? []), post]);
  }

  const active = hovered === null ? null : rows[hovered];
  const activePosts = active ? (postsByDate.get(active.date) ?? []) : [];

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`日別の${metricLabel}`}
        onMouseLeave={() => setHovered(null)}
      >
        {Array.from({ length: GRID_STEPS + 1 }, (_, index) => {
          const value = (max / GRID_STEPS) * index;
          const y = baseline - (value / max) * plotHeight;
          return (
            <g key={index}>
              <line className="grid" x1={MARGIN.left} x2={WIDTH - MARGIN.right} y1={y} y2={y} />
              <text className="axis" x={MARGIN.left - 8} y={y + 4} textAnchor="end">
                {Number.isInteger(value) ? value : value.toFixed(1)}
              </text>
            </g>
          );
        })}

        {rows.map((row, index) => {
          const x = MARGIN.left + slot * index;
          const value = row[metric];
          const height = value ? Math.max((value / max) * plotHeight, 2) : 0;
          const radius = Math.min(4, height, barWidth / 2);
          const left = x + (slot - barWidth) / 2;
          const top = baseline - height;
          return (
            <g key={row.date}>
              {height > 0 && (
                <path
                  className={hovered === null || hovered === index ? "bar" : "bar bar-dim"}
                  d={`M${left} ${baseline}V${top + radius}Q${left} ${top} ${left + radius} ${top}H${
                    left + barWidth - radius
                  }Q${left + barWidth} ${top} ${left + barWidth} ${top + radius}V${baseline}Z`}
                />
              )}
              {postsByDate.has(row.date) && (
                <circle className="post-dot" cx={x + slot / 2} cy={baseline + 11} r={4.5} />
              )}
              {index % labelEvery === 0 && (
                <text className="axis" x={x + slot / 2} y={baseline + 34} textAnchor="middle">
                  {shortDate(row.date)}
                </text>
              )}
              <rect
                className="hit"
                x={x}
                y={MARGIN.top}
                width={slot}
                height={HEIGHT - MARGIN.top}
                onMouseEnter={() => setHovered(index)}
              />
            </g>
          );
        })}
      </svg>

      {active && hovered !== null && (
        <div
          className="tooltip"
          style={{
            left: `${((MARGIN.left + slot * (hovered + 0.5)) / WIDTH) * 100}%`,
            transform: `translateX(${hovered > rows.length / 2 ? "-100%" : "0"})`,
          }}
        >
          <strong>{active.date}</strong>
          <span>
            {metricLabel} {active[metric]?.toLocaleString("ja-JP") ?? "データなし"}
          </span>
          {activePosts.length > 0 ? (
            activePosts.map((post) => <span key={post.id}>投稿: {captionTitle(post.caption)}</span>)
          ) : (
            <span className="muted">投稿なし</span>
          )}
        </div>
      )}

      <details className="data-table">
        <summary>数値を表で見る</summary>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>日付</th>
                <th>リーチ</th>
                <th>閲覧数</th>
                <th>いいね</th>
                <th>コメント</th>
                <th>保存</th>
                <th>シェア</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.date}>
                  <td>{row.date}</td>
                  {[row.reach, row.views, row.likes, row.comments, row.saves, row.shares].map(
                    (value, index) => (
                      <td key={index}>{value ?? "—"}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
