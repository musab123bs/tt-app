"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/lib/validators";

export default function LoginPage() {
  const router = useRouter();
  const [values, setValues] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const parsed = loginSchema.safeParse(values);
    if (!parsed.success) {
      const nextErrors: Record<string, string> = {};
      parsed.error.issues.forEach((issue) => {
        const key = issue.path[0]?.toString() ?? "form";
        nextErrors[key] = issue.message;
      });
      setErrors(nextErrors);
      return;
    }

    setPending(true);
    setErrors({});

    try {
      const response = await authClient.signIn.email({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (response.error) {
        const msg = response.error.message;
        setMessage(
          msg === "Invalid email or password"
            ? "Invalid email or password. Please check your credentials and try again."
            : (msg ?? "Unable to sign in. Please try again.")
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_20px_45px_rgba(15,23,42,0.08)]">
        <div className="mb-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Player access</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Sign in</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Email address</span>
            <input
              type="email"
              value={values.email}
              onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
              placeholder="player@example.com"
            />
            {errors.email && <span className="text-xs text-red-600">{errors.email}</span>}
          </label>

          <label className="block space-y-2">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <input
              type="password"
              value={values.password}
              onChange={(event) => setValues((current) => ({ ...current, password: event.target.value }))}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#0B82FF]"
              placeholder="••••••••"
            />
            {errors.password && <span className="text-xs text-red-600">{errors.password}</span>}
          </label>

          {message && <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{message}</div>}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#0B82FF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#096fe3] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {pending ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between text-sm text-slate-600">
          <Link href="/register" className="font-medium text-blue-700 hover:text-blue-800">
            Create account
          </Link>
          <Link href="/forgot-password" className="font-medium text-slate-600 hover:text-slate-900">
            Forgot password?
          </Link>
        </div>
      </div>
    </main>
  );
}
