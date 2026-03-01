"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { signIn } from "@/lib/auth-client";
import { FormField } from "@/components/shared/FormField";
import Link from "next/link";

const loginSchema = z.object({
  email: z.email({ error: "Please enter a valid email address" }),
  password: z.string().min(1, { error: "Password is required" }),
});

type LoginData = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: LoginData) => {
    setServerError("");
    const result = await signIn.email({
      email: data.email,
      password: data.password,
    });
    if (result.error) {
      setServerError(result.error.message || "Invalid email or password");
    } else {
      router.push("/");
      router.refresh();
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Email" error={errors.email?.message} required>
        <input
          type="email"
          {...register("email")}
          className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
          placeholder="you@example.com"
          autoComplete="email"
        />
      </FormField>

      <FormField label="Password" error={errors.password?.message} required>
        <input
          type="password"
          {...register("password")}
          className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
          placeholder="Enter your password"
          autoComplete="current-password"
        />
      </FormField>

      <div className="flex justify-end">
        <Link
          href="/forgot-password"
          className="text-xs text-[hsl(var(--primary))] hover:underline"
        >
          Forgot password?
        </Link>
      </div>

      {serverError && (
        <p className="text-sm text-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.1)] rounded px-3 py-2">
          {serverError}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-md bg-[hsl(var(--primary))] px-4 py-2 text-sm font-medium text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}
