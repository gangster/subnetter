"use client";

import { LoginForm } from "@/components/auth/LoginForm";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Sign in to save configs, export data, and share with others.
        </p>
      </div>
      <LoginForm />
      <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="text-[hsl(var(--primary))] hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
