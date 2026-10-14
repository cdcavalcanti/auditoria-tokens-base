export function MeterLogo({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2.5">
        <img src="/marca/simbolo-cromado.svg" alt="" className="h-7 w-auto" />
        <div>
          <img src="/marca/wordmark.svg" alt="Vortex" className="h-3.5 w-auto" />
          <p className="mt-1 text-[10px] tracking-[0.22em] text-[#8C8C99] uppercase">Meter</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-1">
      <img src="/marca/simbolo-cromado.svg" alt="" className="h-10 w-auto" />
      <img src="/marca/wordmark.svg" alt="Vortex" className="mt-5 h-[18px] w-auto" />
      <p className="mt-2 text-[10px] tracking-[0.22em] text-[#8C8C99] uppercase">Meter</p>
    </div>
  );
}
