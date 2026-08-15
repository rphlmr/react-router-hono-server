export async function eventually(
  assertion: () => Promise<void>,
  options: {
    timeout?: number;
    interval?: number;
    logs?: () => string;
  } = {}
) {
  const timeout = options.timeout ?? 10_000;
  const interval = options.interval ?? 100;
  const deadline = Date.now() + timeout;
  let lastError: unknown;

  while (Date.now() < deadline) {
    try {
      await assertion();
      return;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }

  const logs = options.logs?.();
  if (lastError instanceof Error && logs) {
    lastError.message = `${lastError.message}\n\n${logs}`;
    throw lastError;
  }

  throw lastError ?? new Error("eventually() timed out");
}
