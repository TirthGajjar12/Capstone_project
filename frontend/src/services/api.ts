import axios, { AxiosInstance } from 'axios';

/**
 * Axios client pointed at the Vite proxy path `/api`.
 * The Vite dev-server proxy rewrites `/api/*` → `http://localhost:8000/*`.
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Central response interceptor: clears expired sessions and redirects to login
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      // Don't redirect if it's the login attempt itself failing with invalid credentials
      if (!url.includes('/auth/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete apiClient.defaults.headers.common['Authorization'];
        authToken = null;
        if (
          !window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/signup') &&
          !window.location.pathname.startsWith('/register')
        ) {
          window.location.href = '/login?expired=1';
        }
      }
    }
    return Promise.reject(error);
  }
);

let authToken: string | null = null;

export const api = {
  /** Store the JWT and attach it to every future request. */
  setToken(token: string) {
    authToken = token;
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  /** Remove the stored JWT. */
  clearToken() {
    authToken = null;
    delete apiClient.defaults.headers.common['Authorization'];
  },

  getToken() {
    return authToken;
  },

  /**
   * Wrappers return the full AxiosResponse so callers can inspect
   * `response.data`, `response.status`, etc.
   */
  get: apiClient.get.bind(apiClient),
  post: apiClient.post.bind(apiClient),
  put: apiClient.put.bind(apiClient),
  delete: apiClient.delete.bind(apiClient),
  patch: apiClient.patch.bind(apiClient),

  /** Upload a file via multipart/form-data. */

};

/**
 * WebSocket helper.  Uses the VITE_WS_URL env var when set,
 * otherwise derives the URL from the current page's host so it works
 * on any deployment — and uses wss:// automatically on HTTPS pages
 * to avoid mixed-content blocks.
 */
export const wsService = {
  connect(token: string, onMessage: (data: unknown) => void, onError?: (error: unknown) => void) {
    const baseUrl =
      import.meta.env.VITE_WS_URL ||
      (() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${protocol}//${window.location.host}/ws/notifications`;
      })();

    // Append JWT as query param — required by the authenticated WS endpoint
    const wsUrl = `${baseUrl}?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (error) {
        onError?.(error);
      }
    };

    ws.onerror = (error) => {
      onError?.(error);
    };

    return ws;
  },
};