import { NextResponse } from "next/server";
import { syncInstagram } from "@/lib/sync";

export async function POST() {
  try {
    const account = await syncInstagram();
    return NextResponse.json({ fetchedAt: account.fetchedAt, warnings: account.warnings });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 502 });
  }
}
