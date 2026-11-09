export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  // Vite puts VITE_ variables in the browser bundle, so this is not secret.
  dataforsyningenToken: import.meta.env.VITE_DATAFORSYNINGEN_TOKEN as
    | string
    | undefined,
};
