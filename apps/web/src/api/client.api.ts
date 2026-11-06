import axios, { type AxiosRequestConfig } from 'axios';

const axiosClient = axios.create({
  baseURL: '/api',
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
  get: <T>(path: string) => request<T>(path),
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
};
