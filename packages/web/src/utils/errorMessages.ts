import type { z } from "zod/v4";

type ZodIssue = z.core.$ZodIssue;

const friendlyMessages: Partial<Record<string, string>> = {
  invalid_type: "Invalid value type",
  too_small: "This field is required",
  too_big: "Value is too large",
  invalid_value: "Please enter a valid value",
};

export function formatZodError(issue: ZodIssue): string {
  if (issue.message && issue.message !== "Required") {
    return issue.message;
  }

  const code = issue.code;
  const base = friendlyMessages[code];
  if (base) return base;

  return issue.message;
}

export function formatZodErrors(issues: ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const path = issue.path.map(String).join(".");
    if (!errors[path]) {
      errors[path] = formatZodError(issue);
    }
  }
  return errors;
}
