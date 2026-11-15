import { useEffect } from 'react';
import { Project } from '../types';
import { X, CheckCircle2, ExternalLink, Calendar, User, Layers, Sparkles, Smartphone, Globe, Gamepad2 } from 'lucide-react';

interface ProjectModalProps {
  project: Project | null;
  onClose: () => void;
}

export function ProjectModal({ project, onClose }: ProjectModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!project) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        data-lenis-prevent
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-[#E7E5DF] text-[#111111] rounded-3xl border border-black/15 shadow-2xl p-6 sm:p-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 w-9 h-9 rounded-full bg-black/10 hover:bg-black hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code text-neutral-600 mb-3">
          <span className="font-bold text-neutral-900">{project.category}</span>
          <span>·</span>
          <span>{project.years}</span>
          <span>·</span>
          <span>{project.role}</span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#111111] uppercase font-sans mb-3">
          {project.title}
        </h2>
        <p className="text-base sm:text-lg text-neutral-700 font-medium mb-6">
          {project.tagline}
        </p>

        {/* Project Visual Showcase Banner */}
        <div className="w-full rounded-2xl overflow-hidden mb-8 border border-black/10 p-6 sm:p-8 bg-gradient-to-br from-neutral-900 to-neutral-800 text-white shadow-inner">
          <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
            <span className="font-mono-code text-xs text-zinc-400">INTERFACE SPECIFICATION &amp; UX ARTIFACTS</span>
            <div className="flex gap-2">
              {project.tags.map((tag, idx) => (
                <span key={idx} className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-white/10 text-zinc-300">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {project.previewType === 'arabic-edtech' && (
            <div className="space-y-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-sky-300 font-sans dir-rtl">
                منصتك المفضلة للحصول على دروس خصوصية عالية الجودة
              </div>
              <p className="text-xs sm:text-sm text-sky-100/80 max-w-lg mx-auto font-light leading-relaxed">
                Dual-script Arabic &amp; Latin system with RTL grid layout, tailored for students and private instructors across Egypt, Saudi Arabia, and UAE.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Typography</span>
                  <span className="text-xs font-bold text-sky-200">Arabic Sans &amp; Plus Jakarta</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Calendar UX</span>
                  <span className="text-xs font-bold text-sky-200">Instant Timezone Sync</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Video Classroom</span>
                  <span className="text-xs font-bold text-sky-200">Interactive Whiteboard</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Tutor Dashboard</span>
                  <span className="text-xs font-bold text-sky-200">Automated Payouts</span>
                </div>
              </div>
            </div>
          )}

          {project.previewType === 'desert-app' && (
            <div className="space-y-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-amber-200 font-sans">
                Rivka Wilderness Camps
              </div>
              <p className="text-xs sm:text-sm text-amber-100/80 max-w-lg mx-auto font-light leading-relaxed">
                Designed for low-connectivity wilderness environments in Sinai &amp; Western Desert. Offline topo vector maps with Bedouin family host profiles.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Navigation</span>
                  <span className="text-xs font-bold text-amber-200">Offline Vector GPS</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Platform</span>
                  <span className="text-xs font-bold text-amber-200">iOS &amp; Android Native</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Camp Host Engine</span>
                  <span className="text-xs font-bold text-amber-200">Direct Bedouin Payout</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Emergency SOS</span>
                  <span className="text-xs font-bold text-amber-200">Satellite Coordinates</span>
                </div>
              </div>
            </div>
          )}

          {project.previewType === 'game-hud' && (
            <div className="space-y-4 text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-purple-200 font-sans">
                Supportal In-Game Virtual Economy
              </div>
              <p className="text-xs sm:text-sm text-purple-100/80 max-w-lg mx-auto font-light leading-relaxed">
                Balancing tactile delight with ethical purchase hierarchy. Clear currency denomination to eliminate consumer cognitive load.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 text-left">
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Shop Screen</span>
                  <span className="text-xs font-bold text-purple-200">Tiered Gacha &amp; Bundles</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Framerate</span>
                  <span className="text-xs font-bold text-purple-200">Solid 60fps HUD Canvas</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Haptics</span>
                  <span className="text-xs font-bold text-purple-200">Custom Spring Feedback</span>
                </div>
                <div className="bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="text-[10px] text-zinc-400 font-mono-code block">Adoption</span>
                  <span className="text-xs font-bold text-purple-200">+42% Starter Bundles</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Case Study Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4 border-t border-black/8">
          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider font-mono-code mb-3">
              Design Deliverables
            </h3>
            <ul className="space-y-2 text-xs sm:text-sm text-neutral-700">
              {project.deliverables.map((item, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neutral-900 shrink-0" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-bold text-neutral-900 uppercase tracking-wider font-mono-code mb-3">
              Business &amp; UX Impact
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {project.metrics.map((metric, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-black/[0.03] rounded-xl border border-black/5 font-mono-code text-xs sm:text-sm font-bold text-neutral-900 flex items-center justify-between"
                >
                  <span>{metric}</span>
                  <span className="text-emerald-700 text-xs font-semibold">VERIFIED</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 pt-6 border-t border-black/8 flex items-center justify-between">
          <span className="text-xs font-mono-code text-neutral-500">
            CASE STUDY ARCHIVE // MOAMEN PORTFOLIO
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 text-white text-xs font-bold rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}
