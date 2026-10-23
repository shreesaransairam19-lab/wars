export function HeroSection() {
  return (
    <section className="flex flex-col items-start justify-between gap-6 py-10 md:flex-row md:items-end md:py-14">
      <div>
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[2px] text-accent">
          Your story space
        </p>
        <h1 className="max-w-[640px] font-heading text-[42px] font-semibold leading-[1.04] tracking-[-2.5px] md:text-[clamp(38px,5vw,58px)]">
          Read it. Rate it.
          <br />
          <span className="text-accent">Talk about it.</span>
        </h1>
        <p className="mt-4 max-w-[475px] text-[15px] leading-relaxed text-muted">
          A cozy corner for manga readers. Find your next favorite, share the
          moments that stuck, and meet people who get it.
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-3 rounded-[14px] border border-[#354128] bg-[#1e2418] px-4 py-3 whitespace-nowrap">
        <span className="text-xl" aria-hidden>
          ✦
        </span>
        <div>
          <b className="font-heading text-[17px]">Welcome to WARS</b>
          <small className="mt-0.5 block text-[11px] text-muted">
            Your reading journey starts here
          </small>
        </div>
      </div>
    </section>
  );
}
