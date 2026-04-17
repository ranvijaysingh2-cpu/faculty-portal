export interface LogEvent {
  email: string;
  role: string;
  scope_value: string;
  event_type: "portal_open" | "pdf_open";
  pdf_name?: string;
  batch?: string;
  center?: string;
  region?: string;
  test_date?: string;
}

export async function logEvent(event: LogEvent): Promise<void> {
  const url = process.env.ACTIVITY_LOG_URL;
  if (!url) return;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...event,
        timestamp: new Date().toISOString(),
        _secret: process.env.LOG_SECRET ?? "",
      }),
    });
  } catch {
    // ignore — don't break the API if logging fails
  }
}
