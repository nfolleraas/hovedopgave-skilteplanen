import axios, { type AxiosRequestConfig } from 'axios';

const axiosClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

async function request<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const response = await axiosClient.request<T>({
    ...config,
    url: path,
  });

  return response.data;
}

export const apiClient = {
  delete: <T>(path: string): Promise<T> =>
    request<T>(path, {
      method: 'DELETE',
    }),
  get: <T>(path: string, signal?: AbortSignal): Promise<T> =>
    request<T>(path, {
      method: 'GET',
      signal,
    }),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      data: body,
    }),
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, {
      method: 'POST',
      data: body,
      headers: {
        'Content-Type': undefined,
      },
    }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      data: body,
    }),
};
