"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { requestPasswordReset } from "@/lib/auth-client";
import { FormField } from "@/components/shared/FormField";
import Link from "next/link";

const schema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    mode: "onChange",
  });

  const onSubmit = async (data: FormData) => {
    setServerError("");
    try {
      await requestPasswordReset({
        email: data.email,
        redirectTo: "/login",
      });
      setSent(true);
    } catch {
      setServerError("Something went wrong. Please try again.");
    }
  };

  if (sent) {
    return (
      <div className="mx-auto max-w-md py-12 text-center">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          If an account exists with that email, we sent a password reset link.
        </p>
        <Link
          href="/login"
          className="inline-block mt-6 px-4 py-2 rounded-md bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] text-sm font-medium hover:opacity-90"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md py-12">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold">Reset password</h1>
        <p className="text-[hsl(var(--muted-foreground))] mt-2">
          Enter your email and we&apos;ll send you a reset link.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormField label="Email" error={errors.email?.message} required>
          <input
            type="email"
            {...register("email")}
            className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
            placeholder="you@example.com"
          />
        </FormField>

        {serverError && (
          <p className="text-sm text-[hsl(var(--destructive))]">
            {serverError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="text-center text-sm text-[hsl(var(--muted-foreground))] mt-6">
        <Link
          href="/login"
          className="text-[hsl(var(--primary))] hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
