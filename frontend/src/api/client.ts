import axios, { type AxiosRequestConfig, type Method } from "axios";

// Usamos ruta relativa para que Render use el Proxy y evite el error CORS
export const API_BASE_URL = "/api";

const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        "Content-Type": "application/json",
    },
    withCredentials: true,
});

type RequestOptions<TBody> = {
    method?: Method;
    body?: TBody;
    config?: AxiosRequestConfig;
};

export async function apiFetch<TResponse, TBody = unknown>(
    endpoint: string,
    options: RequestOptions<TBody> = {}
): Promise<TResponse> {
    const { method = "GET", body, config } = options;
    const response = await client.request<TResponse>({
        url: endpoint,
        method,
        data: body,
        ...config,
    });
    return response.data;
}
