export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string' && err.trim().length > 0) return err;
  return fallback;
}
