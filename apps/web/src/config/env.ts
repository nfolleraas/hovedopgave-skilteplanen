export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? '/api',
  // Vite puts VITE_ variables in the browser bundle, and the browser sends
  // this token to Dataforsyningen, so it is public by design: hence the
  // PUBLISHABLE name. Never put a real secret in a VITE_ variable.
  dataforsyningenToken: import.meta.env
    .VITE_DATAFORSYNINGEN_PUBLISHABLE_TOKEN as string | undefined,
};
