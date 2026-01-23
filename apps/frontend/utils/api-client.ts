import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// Standard API Response wrapper
export interface ApiResponse<T> {
    data: T;
    error?: string;
    description?: string;
    details?: string[];
}

const isServer = typeof window === 'undefined';
// Client: use relative path /api/v1 (proxied by Next.js)
// Server: use full Docker URL from env
const API_BASE_URL = isServer
    ? (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1')
    : '/api/v1';

// Create Axios Instance with strict defaults
export const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10s timeout to prevent hanging requests
});

// Response Interceptor for standardized error handling
apiClient.interceptors.response.use(
    (response: AxiosResponse) => response,
    (error: AxiosError) => {
        // Standardize error log
        console.error(`API Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
        });

        // Simply rethrow for services to handle specific cases if needed,
        // or we could normalize the error object here.
        return Promise.reject(error);
    }
);

/**
 * Generic fetcher for creating strictly typed service helpers
 */
export async function get<T>(url: string, params?: any): Promise<T> {
    const response = await apiClient.get<T>(url, { params });
    return response.data;
}

export async function post<T>(url: string, body: any): Promise<T> {
    const response = await apiClient.post<T>(url, body);
    return response.data;
}

export async function put<T>(url: string, body: any): Promise<T> {
    const response = await apiClient.put<T>(url, body);
    return response.data;
}

export async function del<T>(url: string): Promise<T> {
    const response = await apiClient.delete<T>(url);
    return response.data;
}

export default apiClient;
