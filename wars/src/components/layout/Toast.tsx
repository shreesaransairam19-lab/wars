import { cn } from "@/lib/utils";

interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "fixed bottom-6 left-1/2 z-50 -translate-x-1/2 translate-y-5 rounded-xl bg-[#f4f3ef] px-5 py-3 text-sm text-[#19191d] shadow-[0_10px_35px_rgba(0,0,0,0.5)] transition-all duration-250",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none opacity-0"
      )}
    >
      {message}
    </div>
  );
}
