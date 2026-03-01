"use client";

import { RegisterForm } from "@/components/auth/RegisterForm";
import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="mx-auto max-w-md py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Create a free account to save and share your configurations.
        </p>
      </div>
      <RegisterForm />
      <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-[hsl(var(--primary))] hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
