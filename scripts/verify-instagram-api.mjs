// Instagram公式APIで必要な指標を取得できるかを確認する検証スクリプト。
// 実行: node --env-file=.env.local scripts/verify-instagram-api.mjs

const BASE = process.env.IG_API_BASE ?? "https://graph.instagram.com";
const TOKEN = process.env.IG_ACCESS_TOKEN;

const ACCOUNT_METRICS = [
  "reach",
  "views",
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "saves",
  "shares",
  "follower_count",
];

const MEDIA_METRICS = [
  "reach",
  "views",
  "likes",
  "comments",
  "saved",
  "shares",
  "total_interactions",
  "ig_reels_avg_watch_time",
  "reels_skip_rate",
];

async function get(path, params = {}) {
  const url = new URL(`${BASE}/${path}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("access_token", TOKEN);

  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const { message = `HTTP ${res.status}`, code } = body.error ?? {};
    throw new Error(code ? `${message} (code ${code})` : message);
  }
  return body;
}

function readValue(metric) {
  return metric?.total_value?.value ?? metric?.values?.at(-1)?.value ?? "値なし";
}

async function checkMetric(label, path, metric, params) {
  try {
    const { data } = await get(path, { metric, ...params });
    console.log(`OK  ${label} ${metric}: ${JSON.stringify(readValue(data?.[0]))}`);
    return true;
  } catch (error) {
    console.log(`NG  ${label} ${metric}: ${error.message}`);
    return false;
  }
}

async function main() {
  if (!TOKEN) {
    console.error("IG_ACCESS_TOKEN が未設定です。.env.local に設定してください。");
    process.exitCode = 1;
    return;
  }

  const me = await get("me", {
    fields: "user_id,username,account_type,followers_count,media_count",
  });
  console.log(
    `アカウント: @${me.username} (${me.account_type}) ` +
      `フォロワー ${me.followers_count} / 投稿 ${me.media_count}`,
  );

  const until = Math.floor(Date.now() / 1000);
  const since = until - 24 * 60 * 60;
  const accountParams = { period: "day", metric_type: "total_value", since, until };

  const results = [];
  console.log("\n--- アカウント指標 ---");
  for (const metric of ACCOUNT_METRICS) {
    results.push(await checkMetric("account", `${me.user_id}/insights`, metric, accountParams));
  }

  const { data: media = [] } = await get(`${me.user_id}/media`, {
    fields: "id,timestamp,media_type,media_product_type,permalink",
    limit: "1",
  });

  console.log("\n--- 投稿指標 ---");
  if (media.length === 0) {
    console.log("投稿がないため確認できません。");
  } else {
    const [latest] = media;
    console.log(`対象: ${latest.permalink} (${latest.media_product_type ?? latest.media_type})`);
    for (const metric of MEDIA_METRICS) {
      results.push(await checkMetric("media", `${latest.id}/insights`, metric));
    }
  }

  const passed = results.filter(Boolean).length;
  console.log(`\n結果: ${passed}/${results.length} 件取得できました。`);
}

main().catch((error) => {
  console.error(`確認に失敗しました: ${error.message}`);
  process.exitCode = 1;
});
