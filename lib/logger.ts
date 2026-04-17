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

// Fire-and-forget — never blocks the API response
export function logEvent(event: LogEvent): void {
  const url = process.env.ACTIVITY_LOG_URL;
  if (!url) return;

  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...event,
      timestamp: new Date().toISOString(),
      _secret: process.env.LOG_SECRET ?? "",
    }),
  }).catch(() => {});
}
