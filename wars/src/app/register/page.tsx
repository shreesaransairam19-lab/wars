import Link from "next/link";
import { TopBar } from "@/components/layout/TopBar";
import { RegisterForm } from "@/features/auth/RegisterForm";

export const metadata = { title: "Register — WARS" };

export default function RegisterPage() {
  return (
    <>
      <TopBar />
      <main className="mx-auto flex w-full max-w-md flex-col px-4 py-16">
        <span className="mb-2 text-center text-[11px] font-bold uppercase tracking-[2px] text-accent">
          Join WARS
        </span>
        <h1 className="text-center font-heading text-[28px] font-semibold tracking-tight">
          Create your account
        </h1>
        <p className="mt-2 text-center text-sm text-muted">
          Start reading, reviewing, and chatting.
        </p>

        <div className="mt-8">
          <RegisterForm />
        </div>

        <p className="mt-6 text-center text-xs text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-accent hover:underline"
          >
            Sign in
          </Link>
        </p>
      </main>
    </>
  );
}
