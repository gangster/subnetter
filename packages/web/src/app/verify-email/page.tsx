"use client";

import { Mail } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-md py-12 text-center">
      <Mail className="h-16 w-16 mx-auto text-[hsl(var(--primary))] mb-6" />
      <h1 className="text-2xl font-bold">Check your email</h1>
      <p className="text-[hsl(var(--muted-foreground))] mt-2">
        We sent a verification link to your email address. Click the link to
        verify your account.
      </p>
      <div className="mt-8 space-y-3">
        <p className="text-sm text-[hsl(var(--muted-foreground))]">
          Didn&apos;t receive the email? Check your spam folder.
        </p>
        <Link
          href="/login"
          className="inline-block px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90"
        >
          Go to sign in
        </Link>
      </div>
    </div>
  );
}
