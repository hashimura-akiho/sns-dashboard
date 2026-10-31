import { fetchInstagramAccount } from "./instagram";
import { mergeAccount } from "./metrics";
import { readAccount, readLatestAccount, writeAccount } from "./store";
import type { AccountData } from "./types";

const BACKFILL_DAYS = 30;
const RECENT_DAYS = 2;

export async function syncInstagram(): Promise<AccountData> {
  const token = process.env.IG_ACCESS_TOKEN;
  if (!token) throw new Error("IG_ACCESS_TOKEN が設定されていません。");

  // 公式APIで未取得の間は過去分もさかのぼり、以降は直近だけ更新して呼び出し回数を抑える。
  const latest = await readLatestAccount();
  const days = latest?.source === "instagram-api" ? RECENT_DAYS : BACKFILL_DAYS;

  const fetched = await fetchInstagramAccount(token, days);
  const merged = mergeAccount(await readAccount(fetched.accountId), fetched);
  await writeAccount(merged);
  return merged;
}
