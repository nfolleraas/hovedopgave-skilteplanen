import axios, { type AxiosRequestConfig } from 'axios';

const axiosClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sends an API request and returns its response body.
 * @param path - The API path relative to the configured base URL
 * @param config - Optional Axios request settings
 * @returns The typed API response body
 */
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
  /**
   * Retrieves a resource from the API.
   * @param path - The resource path
   * @returns The typed response body
   */
  get: <T>(path: string) => request<T>(path),
  /**
   * Sends a JSON-compatible request body to the API.
   * @param path - The resource path
   * @param body - The request body
   * @returns The typed response body
   */
  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      data: body,
    }),
  /**
   * Sends multipart form data to the API.
   * @param path - The resource path
   * @param body - The multipart form data
   * @returns The typed response body
   */
  postForm: <T>(path: string, body: FormData) =>
    request<T>(path, {
      method: 'POST',
      data: body,
      headers: {
        'Content-Type': undefined,
      },
    }),
  /**
   * Deletes a resource through the API.
   * @param path - The resource path
   * @returns The typed response body
   */
  delete: <T>(path: string) =>
    request<T>(path, {
      method: 'DELETE',
    }),
};