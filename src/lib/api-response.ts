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

    if (error.name === "ZodError") {
      return fail("Validation failed", 422);
    }

    if (
      error.message.includes("INSUFFICIENT_STOCK") ||
      error.message.includes("Adjustment reason is required") ||
      error.message.includes("Product not found") ||
      error.message.includes("not found")
    ) {
      return fail(error.message, 400);
    }

    console.error("[API Error]", error);
    return fail("An unexpected error occurred", 500);
  }
  console.error("[API Error]", error);
  return fail("An unexpected error occurred", 500);
}
