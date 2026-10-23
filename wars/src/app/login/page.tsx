import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { LoginForm } from "@/features/auth/LoginForm";

export const metadata = { title: "Sign in — WARS" };

export default function LoginPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
        <span className="mb-2 text-center text-[11px] font-bold uppercase tracking-[2px] text-accent">
          Welcome back
        </span>
        <h1 className="text-center font-heading text-[28px] font-semibold tracking-tight">
          Sign in to WARS
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Continue your reading journey.
        </p>

        <div className="mt-8">
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="font-semibold text-accent hover:underline"
          >
            Register
          </Link>
        </p>
      </main>
    </>
  );
}
