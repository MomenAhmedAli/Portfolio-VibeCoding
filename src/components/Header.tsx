import { useLenis } from 'lenis/react';

interface HeaderProps {
  onOpenContact: () => void;
  onScrollToWork: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({
  onOpenContact,
  onScrollToWork,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const lenis = useLenis();

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[60px] flex items-center text-[11px] sm:text-xs bg-transparent pointer-events-none">
      {/* 3-Column Alignment matching reference & ArchitecturalGrid */}
      <div className="w-full px-[2.5%] grid grid-cols-12 items-center">
        {/* Left Zone (Cols 1-4): Brand Wordmark */}
        <div className="col-span-5 md:col-span-4 px-2 sm:px-3 flex items-center pointer-events-auto">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (lenis) {
                lenis.scrollTo(0, { duration: 1.25 });
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="font-bold text-xs sm:text-[13px] tracking-wider uppercase hover:opacity-70 transition-opacity font-sans whitespace-nowrap shrink-0"
          >
            MOAMEN.DESIGN
          </a>
        </div>

        {/* Middle Zone (Cols 5-8): Clean Spacer aligned to grid */}
        <div className="hidden md:block md:col-span-4 px-3" />

        {/* Right Zone (Cols 9-12): Navigation */}
        <nav className="col-span-7 md:col-span-4 px-2 sm:px-3 flex items-center justify-end gap-5 sm:gap-7 font-pixel text-[10px] sm:text-[11px] uppercase pointer-events-auto">
          <a
            href="#work"
            onClick={(e) => {
              e.preventDefault();
              onScrollToWork();
            }}
            className="hover:opacity-65 transition-opacity whitespace-nowrap shrink-0"
          >
            WORK
          </a>

          <button
            onClick={onOpenContact}
            className="hover:opacity-65 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
          >
            CONTACT
          </button>

          <button
            onClick={onToggleTheme}
            className="hover:opacity-65 transition-opacity whitespace-nowrap shrink-0 cursor-pointer"
            title="Switch Light / Cobalt Dark Theme"
          >
            {theme === 'dark' ? 'THEME[D]' : 'THEME[L]'}
          </button>
        </nav>
      </div>
    </header>
  );
}
