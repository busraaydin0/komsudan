import { db } from "./client";

export function bumpExpiredCount(providerId: string) {
  db()
    .prepare(
      `INSERT INTO provider_stats (provider_id, expired_count)
       VALUES (?, 1)
       ON CONFLICT(provider_id) DO UPDATE SET expired_count = expired_count + 1`,
    )
    .run(providerId);
}

export function getExpiredCount(providerId: string): number {
  const row = db()
    .prepare(`SELECT expired_count FROM provider_stats WHERE provider_id = ?`)
    .get(providerId) as { expired_count: number } | undefined;
  return row?.expired_count ?? 0;
}
