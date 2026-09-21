export function getSessionId(): string {
  const SESSION_KEY = "citeline_session_id";
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      let sessionId = window.localStorage.getItem(SESSION_KEY);
      if (sessionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) {
        return sessionId;
      }
      sessionId = crypto.randomUUID();
      window.localStorage.setItem(SESSION_KEY, sessionId);
      return sessionId;
    }
  } catch {
    // Fall back to in-memory below
  }
  
  if (!globalThis.__citelineInMemorySession) {
    globalThis.__citelineInMemorySession = crypto.randomUUID();
  }
  return globalThis.__citelineInMemorySession;
}

declare global {
  var __citelineInMemorySession: string | undefined;
}
