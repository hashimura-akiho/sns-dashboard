import { Dashboard } from "@/components/Dashboard";
import { readLatestAccount } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const account = await readLatestAccount();

  if (!account) {
    return (
      <main className="page">
        <h1>SNSインサイト</h1>
        <p className="muted">データがありません。`.env.local` にトークンを設定して更新してください。</p>
      </main>
    );
  }

  return <Dashboard account={account} canSync={Boolean(process.env.IG_ACCESS_TOKEN)} />;
}
