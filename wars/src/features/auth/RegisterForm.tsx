"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { register, type AuthActionResult } from "@/features/auth/actions";

const initialState: AuthActionResult = { success: false };

export function RegisterForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(register, initialState);

  useEffect(() => {
    if (state.success) {
      router.push("/dashboard");
      router.refresh();
    }
  }, [state.success, router]);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <div
          role="alert"
          className="rounded-[10px] border border-[#704044] bg-[#332329] px-4 py-3 text-sm text-[#ffb2b2]"
        >
          {state.error}
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-xs font-semibold text-[#cbc9d0]"
        >
          Username
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          pattern="[a-zA-Z0-9_-]+"
          className="w-full rounded-[10px] border border-[#383841] bg-[#121217] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-[#777580] focus:border-[#8daa5a]"
          placeholder="Choose a username"
        />
        <p className="mt-1 text-[10px] text-muted">
          Letters, numbers, hyphens, and underscores only.
        </p>
      </div>

      <div>
        <label
          htmlFor="display-name"
          className="mb-1.5 block text-xs font-semibold text-[#cbc9d0]"
        >
          Display name{" "}
          <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="display-name"
          name="display_name"
          type="text"
          autoComplete="name"
          maxLength={50}
          className="w-full rounded-[10px] border border-[#383841] bg-[#121217] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-[#777580] focus:border-[#8daa5a]"
          placeholder="How you want to be shown"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold text-[#cbc9d0]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          maxLength={100}
          className="w-full rounded-[10px] border border-[#383841] bg-[#121217] px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-[#777580] focus:border-[#8daa5a]"
          placeholder="At least 6 characters"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-[10px] bg-accent py-3 text-sm font-bold text-[#171a11] transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}
