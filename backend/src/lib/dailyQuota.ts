import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { env } from "../config/env.js";

/**
 * Hard-caps the hosted AI path's worst-case spend to $0 regardless of traffic: a simple
 * rolling-UTC-day counter in SQLite (fine for a single-instance deployment; no need for
 * Redis/Postgres here). Independent of @fastify/rate-limit's per-IP window — this is a
 * global ceiling across all callers, not a per-caller throttle.
 */
export class DailyQuota {
  private readonly db: Database.Database;

  constructor(sqlitePath: string = env.SQLITE_PATH) {
    if (sqlitePath !== ":memory:") {
      mkdirSync(dirname(sqlitePath), { recursive: true });
    }
    this.db = new Database(sqlitePath);
    this.db.pragma("journal_mode = WAL");
    this.db.exec(
      "CREATE TABLE IF NOT EXISTS daily_quota (day TEXT PRIMARY KEY, count INTEGER NOT NULL)",
    );
  }

  private today(): string {
    return new Date().toISOString().slice(0, 10); // UTC calendar day, e.g. "2026-09-08"
  }

  /** Atomically checks and increments; returns whether this call is allowed under today's cap. */
  tryConsume(max: number = env.DAILY_QUOTA_MAX): { allowed: boolean; count: number; max: number } {
    const day = this.today();
    const result = this.db.transaction(() => {
      const row = this.db.prepare("SELECT count FROM daily_quota WHERE day = ?").get(day) as
        | { count: number }
        | undefined;
      const current = row?.count ?? 0;
      if (current >= max) {
        return { allowed: false, count: current };
      }
      this.db
        .prepare(
          "INSERT INTO daily_quota (day, count) VALUES (?, 1) ON CONFLICT(day) DO UPDATE SET count = count + 1",
        )
        .run(day);
      return { allowed: true, count: current + 1 };
    })();
    return { ...result, max };
  }

  close(): void {
    this.db.close();
  }
}
