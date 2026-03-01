"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { signUp } from "@/lib/auth-client";
import { FormField } from "@/components/shared/FormField";

const registerSchema = z
  .object({
    name: z.string().min(2, { error: "Name must be at least 2 characters" }),
    email: z.email({ error: "Please enter a valid email address" }),
    password: z
      .string()
      .min(8, { error: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, { error: "Password must contain at least one uppercase letter" })
      .regex(/[0-9]/, { error: "Password must contain at least one number" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match",
    path: ["confirmPassword"],
  });

type RegisterData = z.infer<typeof registerSchema>;

export function RegisterForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const onSubmit = async (data: RegisterData) => {
    setServerError("");
    const result = await signUp.email({
      name: data.name,
      email: data.email,
      password: data.password,
    });
    if (result.error) {
      setServerError(
        result.error.message || "Registration failed. Please try again."
      );
    } else {
      router.push("/verify-email");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FormField label="Name" error={errors.name?.message} required>
        <input
          type="text"
          {...register("name")}
          className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
          placeholder="Your name"
          autoComplete="name"
        />
      </FormField>

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
          placeholder="Min 8 chars, 1 uppercase, 1 number"
          autoComplete="new-password"
        />
      </FormField>

      <FormField
        label="Confirm Password"
        error={errors.confirmPassword?.message}
        required
      >
        <input
          type="password"
          {...register("confirmPassword")}
          className="w-full rounded-md border border-[hsl(var(--input))] bg-transparent px-3 py-2 text-sm"
          placeholder="Confirm your password"
          autoComplete="new-password"
        />
      </FormField>

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
        {isSubmitting ? "Creating account..." : "Create account"}
      </button>
    </form>
  );
}
