import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <h1 className="text-2xl font-semibold">Unauthorized</h1>
      <p className="text-muted-foreground">You do not have access to this resource.</p>
      <Link href="/login" className="rounded border px-4 py-2">
        Go to login
      </Link>
    </main>
  );
}
