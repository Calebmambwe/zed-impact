"use client";

import { AlertTriangle } from "lucide-react";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
          <div className="mb-6 flex size-16 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="size-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
            Something went wrong
          </h1>
          <p className="mx-auto mt-3 max-w-md text-base text-muted-foreground">
            We encountered an unexpected error. Our team has been notified.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted-foreground">
              Error ID: <code className="font-mono">{error.digest}</code>
            </p>
          )}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={reset}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-background px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Return home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
