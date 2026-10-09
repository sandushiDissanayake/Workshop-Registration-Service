/** Logo mark: a block of four seats, one taken. */
export function BrandMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="#1f2e5a" />
      <rect x="7" y="7" width="8" height="8" rx="2" fill="#fff" />
      <rect x="17" y="7" width="8" height="8" rx="2" fill="#fff" fillOpacity=".45" />
      <rect x="7" y="17" width="8" height="8" rx="2" fill="#fff" fillOpacity=".45" />
      <rect x="17" y="17" width="8" height="8" rx="2" fill="#f0b429" />
    </svg>
  );
}
