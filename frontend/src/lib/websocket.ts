/**
 * Constructs a WebSocket URL based on the API base URL.
 * Handles absolute URLs, relative proxy paths, and secures protocols appropriately.
 * 
 * @param path The path of the WebSocket endpoint (e.g., "/chat/ws/Science" or "/dms/ws/user_id")
 * @returns The fully qualified WebSocket URL string.
 */
export function getWebSocketUrl(path: string): string {
  const rawUrl = import.meta.env.VITE_API_BASE_URL || '';
  const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

  // Ensure path starts with a leading slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
    // VITE_API_BASE_URL is absolute (e.g. http://127.0.0.1:8000)
    const host = rawUrl.replace(/^https?:\/\//, '');
    const absoluteProtocol = rawUrl.startsWith('https://') ? 'wss:' : 'ws:';
    // Remove any trailing slash from host
    const cleanHost = host.endsWith('/') ? host.slice(0, -1) : host;
    return `${absoluteProtocol}//${cleanHost}${cleanPath}`;
  } else {
    // VITE_API_BASE_URL is relative (e.g. /api or empty)
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return `${wsProtocol}//127.0.0.1:8000${cleanPath}`;
    }
    const host = window.location.host;
    // Remove any trailing slash from rawUrl
    const cleanBaseUrl = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;
    return `${wsProtocol}//${host}${cleanBaseUrl}${cleanPath}`;
  }
}
