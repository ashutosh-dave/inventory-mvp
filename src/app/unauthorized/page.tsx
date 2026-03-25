import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldX } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
        <ShieldX className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-semibold">Access Denied</h1>
      <p className="max-w-xs text-center text-sm text-muted-foreground">
        You don&apos;t have permission to view this page. Contact your
        administrator for access.
      </p>
      <Button asChild variant="outline">
        <Link href="/login">Back to login</Link>
      </Button>
    </div>
  );
}
