import { MapPin } from 'lucide-react';
import { useLenis } from 'lenis/react';

interface HeaderProps {
  onOpenContact?: () => void;
  onScrollToWork: () => void;
  onScrollToAbout?: () => void;
  onScrollToContact?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({
  onScrollToWork,
  onScrollToAbout,
  onScrollToContact,
  theme,
  onToggleTheme,
}: HeaderProps) {
  const lenis = useLenis();

  const handleScrollTop = (e: React.MouseEvent) => {
    e.preventDefault();
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.25 });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAboutClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onScrollToAbout) {
      onScrollToAbout();
    } else if (lenis) {
      lenis.scrollTo('#stats', { duration: 1.25 });
    } else {
      document.querySelector('#stats')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleContactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onScrollToContact) {
      onScrollToContact();
    } else if (lenis) {
      lenis.scrollTo('#contact', { duration: 1.25 });
    } else {
      document.querySelector('#contact')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-[46px] flex items-center bg-transparent pointer-events-none">
      <div className="w-full px-[2.5%] sm:px-[3.5%] grid grid-cols-12 items-center">
        {/* Left Zone: Brand Wordmark */}
        <div className="col-span-4 lg:col-span-3 flex items-center justify-start pointer-events-auto">
          <a
            href="#"
            onClick={handleScrollTop}
            className="font-editorial font-medium text-2xl sm:text-[26px] tracking-tight leading-none hover:opacity-75 transition-opacity whitespace-nowrap shrink-0"
          >
            Moamen.
          </a>
        </div>

        {/* Center Metadata Zone: Taking on new projects + Lives in Cairo, Egypt Together */}
        <div className="hidden lg:flex lg:col-span-5 items-center justify-center gap-6 text-[11px] tracking-tight pointer-events-auto">
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--text-color)' }}
              aria-hidden="true"
            />
            <span className="opacity-70">Taking on new projects</span>
            <span className="opacity-35">/</span>
            <span className="font-medium">2 Spots</span>
          </div>

          <span className="opacity-20" aria-hidden="true">|</span>

          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <MapPin className="w-3.5 h-3.5 opacity-75 shrink-0" aria-hidden="true" />
            <span className="opacity-65">Lives in</span>
            <span className="opacity-35">/</span>
            <span className="font-medium opacity-95">Cairo, Egypt</span>
          </div>
        </div>

        {/* Right Zone: Horizontal Row (About · Works · Contact · Theme) */}
        <nav
          aria-label="Primary Navigation"
          className="col-span-8 lg:col-span-4 flex flex-row items-center justify-end gap-3.5 sm:gap-5 font-sans text-[11px] sm:text-xs font-medium tracking-tight leading-none pointer-events-auto"
        >
          <a
            href="#stats"
            onClick={handleAboutClick}
            className="hover:opacity-60 transition-opacity whitespace-nowrap"
          >
            About
          </a>

          <a
            href="#work"
            onClick={(e) => {
              e.preventDefault();
              onScrollToWork();
            }}
            className="hover:opacity-60 transition-opacity whitespace-nowrap"
          >
            Works
          </a>

          <a
            href="#contact"
            onClick={handleContactClick}
            className="hover:opacity-60 transition-opacity whitespace-nowrap"
          >
            Contact
          </a>

          <button
            type="button"
            onClick={onToggleTheme}
            className="hover:opacity-60 transition-opacity whitespace-nowrap cursor-pointer opacity-80"
            title="Switch Light / Cobalt Dark Theme"
          >
            {theme === 'dark' ? 'Theme [D]' : 'Theme [L]'}
          </button>
        </nav>
      </div>
    </header>
  );
}
