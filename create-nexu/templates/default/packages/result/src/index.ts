// Result type - Either success with data or failure with error
export type Result<T, E = Error> = { ok: true; data: T } | { ok: false; error: E };

// Create success result
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data };
}

// Create failure result
export function err<E = Error>(error: E): Result<never, E> {
  return { ok: false, error };
}

// Try/catch wrapper for sync functions
export function tryCatch<T, E = Error>(fn: () => T, onError?: (e: unknown) => E): Result<T, E> {
  try {
    return ok(fn());
  } catch (e) {
    const error = onError ? onError(e) : e instanceof Error ? e : new Error(String(e));
    return err(error as E);
  }
}

// Try/catch wrapper for async functions
export async function tryCatchAsync<T, E = Error>(
  fn: () => Promise<T>,
  onError?: (e: unknown) => E
): Promise<Result<T, E>> {
  try {
    const data = await fn();
    return ok(data);
  } catch (e) {
    const error = onError ? onError(e) : e instanceof Error ? e : new Error(String(e));
    return err(error as E);
  }
}

// Wrap a function to return Result
export function wrap<T, Args extends unknown[], E = Error>(
  fn: (...args: Args) => T,
  onError?: (e: unknown) => E
): (...args: Args) => Result<T, E> {
  return (...args: Args) => tryCatch(() => fn(...args), onError);
}

// Wrap an async function to return Result
export function wrapAsync<T, Args extends unknown[], E = Error>(
  fn: (...args: Args) => Promise<T>,
  onError?: (e: unknown) => E
): (...args: Args) => Promise<Result<T, E>> {
  return (...args: Args) => tryCatchAsync(() => fn(...args), onError);
}

// Type guards
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; data: T } {
  return result.ok === true;
}

export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

// Unwrap - get data or throw
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) return result.data;
  throw result.error;
}

// Unwrap with default value
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.ok ? result.data : defaultValue;
}

// Unwrap error or throw
export function unwrapErr<T, E>(result: Result<T, E>): E {
  if (!result.ok) return result.error;
  throw new Error('Called unwrapErr on Ok result');
}

// Map data if ok
export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  return result.ok ? ok(fn(result.data)) : result;
}

// Map error if err
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  return result.ok ? result : err(fn(result.error));
}

// FlatMap / chain
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>
): Result<U, E> {
  return result.ok ? fn(result.data) : result;
}

// Async flatMap
export async function flatMapAsync<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Promise<Result<U, E>>
): Promise<Result<U, E>> {
  return result.ok ? fn(result.data) : result;
}

// Match pattern
export function match<T, E, U>(
  result: Result<T, E>,
  handlers: { ok: (data: T) => U; err: (error: E) => U }
): U {
  return result.ok ? handlers.ok(result.data) : handlers.err(result.error);
}

// Combine multiple results
export function all<T extends Result<unknown, unknown>[]>(
  results: [...T]
): Result<
  { [K in keyof T]: T[K] extends Result<infer U, unknown> ? U : never },
  T[number] extends Result<unknown, infer E> ? E : never
> {
  const data: unknown[] = [];

  for (const result of results) {
    if (!result.ok) return result as Result<never, unknown> as never;
    data.push(result.data);
  }

  return ok(data) as never;
}

// fromPromise - convert Promise to Result
export async function fromPromise<T, E = Error>(
  promise: Promise<T>,
  onError?: (e: unknown) => E
): Promise<Result<T, E>> {
  return tryCatchAsync(() => promise, onError);
}

// toPromise - convert Result to Promise
export function toPromise<T, E>(result: Result<T, E>): Promise<T> {
  return result.ok ? Promise.resolve(result.data) : Promise.reject(result.error);
}
