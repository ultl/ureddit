import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-[calc(100vh-3rem)] flex-col items-center justify-center gap-4 text-center">
      <p className="text-6xl font-bold text-orange-500">404</p>
      <h1 className="text-2xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground max-w-sm">
        Sorry, we couldn&apos;t find what you were looking for.
      </p>
      <Link href="/">
        <Button>Go home</Button>
      </Link>
    </main>
  );
}
