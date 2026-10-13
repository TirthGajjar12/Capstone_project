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
  async postForm<T>(url: string, data: FormData) {
    const response = await apiClient.post<T>(url, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },
};

/**
 * WebSocket helper.  Uses the VITE_WS_URL env var when available,
 * otherwise falls back to a sensible default.
 */
export const wsService = {
  connect(onMessage: (data: unknown) => void, onError?: (error: unknown) => void) {
    const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';
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