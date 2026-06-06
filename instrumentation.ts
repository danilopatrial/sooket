export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (!process.env.ENCRYPTION_SECRET?.trim()) {
      throw new Error(
        "[Sooket] ENCRYPTION_SECRET is not set. " +
        "Add ENCRYPTION_SECRET=<random-secret> to your .env.local file before starting the server. " +
        "All provider keys and customer variables are encrypted with this secret — " +
        "running without it would leave sensitive data unprotected."
      );
    }

    // Sweep executions stuck in 'running' from a previous unclean shutdown
    try {
      const { getDb } = await import("./lib/db");
      const db = getDb();
      const { changes } = db.prepare(
        `UPDATE executions SET status = 'crashed', updated_at = datetime('now') WHERE status = 'running'`
      ).run();
      if (changes > 0) {
        console.warn(`[Sooket] Marked ${changes} orphaned execution(s) as crashed on startup.`);
      }
    } catch {
      // Non-critical — DB may not be initialised yet on first boot
    }

    const { warmEmbedder } = await import("./lib/complexity/embedder");
    warmEmbedder().catch(() => {/* non-critical — first request will warm on demand */});
  }
}
