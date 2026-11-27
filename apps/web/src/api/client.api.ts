import axios, { type AxiosRequestConfig, isAxiosError } from 'axios';

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
   * Updates a resource with a JSON-compatible request body.
   * @param path - The resource path
   * @param body - The request body
   * @returns The typed response body
   */
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', data: body }),
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

/**
 * Reads the HTTP status of a failed API request.
 * @param error - The value thrown by `apiClient`
 * @returns The status code, or `undefined` when the API did not answer
 */
export function getApiErrorStatus(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/**
 * Reads the error code that the API sends in its error body, such as
 * `LAST_AREA`.
 * @param error - The value thrown by `apiClient`
 * @returns The error code, or `undefined` when the body has none
 */
export function getApiErrorCode(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined;
  const body: unknown = error.response?.data;
  if (typeof body === 'object' && body && 'code' in body) {
    return String(body.code);
  }
  return undefined;
}
