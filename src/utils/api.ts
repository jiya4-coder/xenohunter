/**
 * Safe fetch wrapper that handles non-JSON / HTML responses gracefully
 * and prevents "SyntaxError: Unexpected token '<'" errors.
 */
export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit,
  fallbackData?: T
): Promise<T> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    const contentType = res.headers.get('content-type') || '';

    // If the server returned HTML (e.g., Vite serving index.html on 404 or container routing error)
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      if (text.trim().startsWith('<') || text.includes('<!doctype') || text.includes('<html')) {
        console.warn(`[safeFetchJson] Server returned HTML from ${url} (status: ${res.status}). Using fallback.`);
        if (fallbackData !== undefined) return fallbackData;
        throw new Error(`Server returned HTML instead of JSON (${res.status})`);
      }
      try {
        return JSON.parse(text) as T;
      } catch {
        if (fallbackData !== undefined) return fallbackData;
        throw new Error(`Invalid JSON received from ${url}`);
      }
    }

    const data = await res.json();
    if (!res.ok) {
      if (fallbackData !== undefined) return fallbackData;
      throw new Error(data?.error || `Server error ${res.status}`);
    }

    return data as T;
  } catch (err: any) {
    console.warn(`[safeFetchJson] Error fetching ${url}:`, err.message);
    if (fallbackData !== undefined) return fallbackData;
    throw err;
  }
}
