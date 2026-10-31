const HOUR_MS = 60 * 60 * 1000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || !process.env.IG_ACCESS_TOKEN) return;

  const { syncInstagram } = await import("./lib/sync");
  setInterval(() => {
    syncInstagram().catch((error) => console.error("定期取得に失敗しました:", error.message));
  }, HOUR_MS);
}
