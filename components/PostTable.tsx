"use client";

import { useState } from "react";
import { captionTitle, sortPosts, type SortKey } from "@/lib/metrics";
import type { Post } from "@/lib/types";

const COLUMNS: { key: SortKey; label: string; format: (post: Post) => string }[] = [
  { key: "reach", label: "リーチ", format: (post) => post.reach?.toLocaleString("ja-JP") ?? "—" },
  { key: "views", label: "閲覧数", format: (post) => post.views?.toLocaleString("ja-JP") ?? "—" },
  {
    key: "skipRate",
    label: "3秒離脱率",
    format: (post) => (post.skipRate === null ? "—" : `${(post.skipRate * 100).toFixed(1)}%`),
  },
  {
    key: "avgWatchMs",
    label: "平均視聴",
    format: (post) => (post.avgWatchMs === null ? "—" : `${(post.avgWatchMs / 1000).toFixed(1)}秒`),
  },
  { key: "saved", label: "保存", format: (post) => post.saved?.toLocaleString("ja-JP") ?? "—" },
  { key: "shares", label: "シェア", format: (post) => post.shares?.toLocaleString("ja-JP") ?? "—" },
];

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ja-JP", {
    timeZone: "Asia/Tokyo",
    month: "numeric",
    day: "numeric",
  });

export function PostTable({ posts }: { posts: Post[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("publishedAt");
  const [descending, setDescending] = useState(true);

  if (posts.length === 0) return <p className="muted">この期間の投稿はありません。</p>;

  function sortBy(key: SortKey) {
    if (key === sortKey) {
      setDescending(!descending);
    } else {
      setSortKey(key);
      setDescending(true);
    }
  }

  const header = (key: SortKey, label: string) => (
    <th
      key={key}
      aria-sort={sortKey === key ? (descending ? "descending" : "ascending") : "none"}
    >
      <button type="button" onClick={() => sortBy(key)}>
        {label}
        {sortKey === key ? (descending ? " ↓" : " ↑") : ""}
      </button>
    </th>
  );

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {header("publishedAt", "投稿日")}
            <th className="title-cell">投稿</th>
            {COLUMNS.map((column) => header(column.key, column.label))}
          </tr>
        </thead>
        <tbody>
          {sortPosts(posts, sortKey, descending).map((post) => (
            <tr key={post.id}>
              <td>{formatDate(post.publishedAt)}</td>
              <td className="title-cell">
                <a href={post.permalink} target="_blank" rel="noreferrer">
                  {captionTitle(post.caption)}
                </a>
              </td>
              {COLUMNS.map((column) => (
                <td key={column.key}>{column.format(post)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
