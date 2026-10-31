import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { AccountData } from "./types";

// プロトタイプの保存先。データの読み書きはこのファイルに集約し、DBへの移行時はここを差し替える。
const ACCOUNTS_DIR = path.join(process.cwd(), "data", "accounts");

export async function readAccount(accountId: string): Promise<AccountData | null> {
  try {
    const raw = await readFile(path.join(ACCOUNTS_DIR, `${accountId}.json`), "utf8");
    return JSON.parse(raw) as AccountData;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}

export async function writeAccount(account: AccountData): Promise<void> {
  await mkdir(ACCOUNTS_DIR, { recursive: true });
  await writeFile(
    path.join(ACCOUNTS_DIR, `${account.accountId}.json`),
    `${JSON.stringify(account, null, 2)}\n`,
  );
}

export async function readLatestAccount(): Promise<AccountData | null> {
  const files = await readdir(ACCOUNTS_DIR).catch(() => []);
  const accounts = await Promise.all(
    files
      .filter((file) => file.endsWith(".json"))
      .map((file) => readAccount(path.basename(file, ".json"))),
  );
  const found = accounts.filter((account) => account !== null);
  found.sort((a, b) => b.fetchedAt.localeCompare(a.fetchedAt));
  return found[0] ?? null;
}
