export function ok<T>(data: T, status = 200) {
  return Response.json(data, { status });
}

export function fail(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function fromError(error: unknown) {
  if (error instanceof Error) {
    if (error.message === "UNAUTHORIZED") return fail("Unauthorized", 401);
    if (error.message === "FORBIDDEN") return fail("Forbidden", 403);
    return fail(error.message, 400);
  }
  return fail("Unexpected error", 500);
}
