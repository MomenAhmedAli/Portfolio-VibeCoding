/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type Lenis from 'lenis';
import { useLenis } from 'lenis/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { addFrameEffect, getLenisScrollSnapshot } from './lib/lenisScrollBus';
import { ArchitecturalGrid } from './components/ArchitecturalGrid';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { BioStatsSection } from './components/BioStatsSection';
import { SelectedWorkSection } from './components/SelectedWorkSection';
import { ShipVoyageSection } from './components/ShipVoyageSection';
import { CallToActionSection } from './components/CallToActionSection';
import { ProjectModal } from './components/ProjectModal';
import { ContactDrawer } from './components/ContactDrawer';
import { LiveStatusBar } from './components/LiveStatusBar';
import { DualCompassScrollRail } from './components/DualCompassScrollRail';
import { DotMatrixTransition } from './components/DotMatrixTransition';
import { Project } from './types';

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [scrollVelocity, setScrollVelocity] = useState(0);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [transitionId, setTransitionId] = useState(0);

  // Sync theme attribute on root element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    setTransitionId((n) => n + 1);
  };

  const shiftElsRef = useRef<HTMLElement[]>([]);
  const smoothedVelRef = useRef(0);

  // Subscribe to Lenis scroll event emitted inside unified ScrollRoot frame
  const handleLenisScroll = useCallback((instance: Lenis) => {
    setScrollVelocity(instance.velocity);
    document.documentElement.style.setProperty('--scroll-velocity', String(instance.velocity));
  }, []);

  const lenis = useLenis(handleLenisScroll);

  useEffect(() => {
    shiftElsRef.current = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-shift]'));

    let prevScrollY: number | null = null;

    const removeEffect = addFrameEffect(10, (_time, deltaSec) => {
      const dt = Math.min(Math.max(deltaSec, 1 / 240), 0.1);
      const currY = getLenisScrollSnapshot().scrollTop;
      const rawVel = prevScrollY == null ? 0 : (currY - prevScrollY) / dt;
      prevScrollY = currY;

      // Ultra-calm normalization and slow easing so page shift glides smoothly with shader
      const target = Math.max(-1, Math.min(1, rawVel / 2000));
      const tau = Math.abs(target) > Math.abs(smoothedVelRef.current) ? 0.18 : 0.46;
      const alpha = 1 - Math.exp(-dt / tau);
      smoothedVelRef.current += (target - smoothedVelRef.current) * alpha;

      const dragY = (-smoothedVelRef.current * 3.2).toFixed(2);
      const skewDeg = (smoothedVelRef.current * 0.1).toFixed(3);

      for (let i = 0; i < shiftElsRef.current.length; i++) {
        shiftElsRef.current[i].style.transform = `translate3d(0, ${dragY}px, 0) skewY(${skewDeg}deg)`;
      }
    });

    const refreshId = window.requestAnimationFrame(() => {
      ScrollTrigger.refresh();
    });

    return () => {
      removeEffect();
      window.cancelAnimationFrame(refreshId);
    };
  }, []);

  // Pause Lenis background scroll while a modal or drawer is open
  useEffect(() => {
    if (!lenis) return;
    if (selectedProject || isContactOpen) {
      lenis.stop();
    } else {
      lenis.start();
    }
  }, [lenis, selectedProject, isContactOpen]);

  const scrollToTarget = (target: string | number) => {
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.25 });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: 'smooth' });
    } else {
      const el = document.querySelector(target);
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const scrollToProgress = (progress: number, immediate = false) => {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const targetY = Math.max(0, progress * maxScroll);
    if (lenis) {
      lenis.scrollTo(targetY, immediate ? { immediate: true } : { duration: 0.7 });
    } else {
      window.scrollTo({ top: targetY, behavior: immediate ? 'auto' : 'smooth' });
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative selection:bg-neutral-900 selection:text-white transition-colors duration-300"
      style={{ backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}
    >
      {/* Radial Dot-Matrix Cell Transition fitted to Light/Dark Color Theme */}
      <DotMatrixTransition theme={theme} transitionId={transitionId} />

      {/* Bilateral Left & Right Center-Vertical Shaded Compass Scroll Rails */}
      <DualCompassScrollRail onScrollToProgress={scrollToProgress} theme={theme} />

      {/* Architectural Grid with Starlight & Mouse-Tracking Light Behind */}
      <ArchitecturalGrid rowHeight={320} theme={theme} />

      {/* Top Nav Bar */}
      <Header
        onOpenContact={() => setIsContactOpen(true)}
        onScrollToWork={() => scrollToTarget('#work')}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Content Flow */}
      <main className="flex-1 flex flex-col relative z-10 pt-[48px]">
        {/* 1. Hero Section: 3D Rolling Greetings in 8 Languages + GREETINGS. */}
        <HeroSection scrollVelocity={scrollVelocity} theme={theme} />

        {/* 2. Bio & Experience Row + About Me (//01) */}
        <BioStatsSection />

        {/* 3. Selected Work (//02) */}
        <SelectedWorkSection
          onSelectProject={(project) => setSelectedProject(project)}
          theme={theme}
        />

        {/* 4. Scroll-Driven 3D Sky Ship -> Telescope -> Rapid Dive -> Full-Body Helmsman */}
        <ShipVoyageSection theme={theme} />

        {/* 5. Final Frame: Get ready for beyond (//03) + Behance/LinkedIn + Name & Date */}
        <CallToActionSection />
      </main>

      {/* Interactive Case Study Modal */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />

      {/* Interactive Contact Drawer */}
      <ContactDrawer
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />

      {/* Fixed Transparent Bottom Telemetry Bar */}
      <LiveStatusBar onScrollToTop={() => scrollToTarget(0)} />
    </div>
  );
}
