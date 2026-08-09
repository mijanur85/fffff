import React, { useMemo } from 'react';
import { ThemeId, AnimationIntensity } from '../types';

interface Props {
  themeId: ThemeId;
  performanceMode?: boolean;
  animationsEnabled?: boolean;
  animationIntensity?: AnimationIntensity;
  isMediaOpen?: boolean;
}

export const ThemeBackground: React.FC<Props> = ({
  themeId,
  performanceMode = false,
  animationsEnabled = true,
  animationIntensity = 'medium',
  isMediaOpen = false,
}) => {
  // Check user preference for reduced motion
  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const isLowPowerMode = performanceMode || prefersReducedMotion || !animationsEnabled;

  // Animation speed modifier based on intensity level
  const speedMultiplier = useMemo(() => {
    if (animationIntensity === 'low') return 1.8; // slower
    if (animationIntensity === 'high') return 0.7; // faster
    return 1.0; // medium (default)
  }, [animationIntensity]);

  const intensityOpacity = useMemo(() => {
    if (animationIntensity === 'low') return 0.55;
    if (animationIntensity === 'high') return 1.0;
    return 0.85; // medium
  }, [animationIntensity]);

  if (themeId === 'pure-black') {
    return <div className="fixed inset-0 bg-black -z-10 pointer-events-none" />;
  }

  if (themeId === 'pure-white') {
    return <div className="fixed inset-0 bg-white -z-10 pointer-events-none" />;
  }

  return (
    <div
      className={`fixed inset-0 overflow-hidden -z-10 pointer-events-none select-none bg-black transition-all duration-700 ${
        isMediaOpen ? 'opacity-30 scale-95 blur-[1px]' : 'opacity-100 scale-100'
      }`}
      style={{ opacity: isMediaOpen ? 0.35 : intensityOpacity }}
    >
      <style>{`
        /* ========================================== */
        /* THEME 3: AURORA FLOW ANIMATIONS            */
        /* ========================================== */
        @keyframes aurora-ribbon-1 {
          0%, 100% { transform: translate3d(-10%, -8%, 0) rotate(-4deg) scale(1); opacity: 0.65; }
          50% { transform: translate3d(12%, 10%, 0) rotate(5deg) scale(1.2); opacity: 0.85; }
        }
        @keyframes aurora-ribbon-2 {
          0%, 100% { transform: translate3d(15%, 8%, 0) rotate(6deg) scale(1.1); opacity: 0.55; }
          50% { transform: translate3d(-14%, -10%, 0) rotate(-5deg) scale(0.92); opacity: 0.80; }
        }
        @keyframes aurora-particle-float-1 {
          0% { transform: translate3d(0, 0, 0) scale(0.8); opacity: 0.3; }
          50% { transform: translate3d(20px, -40px, 0) scale(1.2); opacity: 0.8; }
          100% { transform: translate3d(-15px, -80px, 0) scale(0.8); opacity: 0.3; }
        }
        @keyframes aurora-particle-float-2 {
          0% { transform: translate3d(0, 0, 0) scale(1); opacity: 0.4; }
          50% { transform: translate3d(-30px, -50px, 0) scale(1.4); opacity: 0.9; }
          100% { transform: translate3d(25px, -100px, 0) scale(1); opacity: 0.4; }
        }

        /* ========================================== */
        /* THEME 4: SILK WAVE ANIMATIONS              */
        /* ========================================== */
        @keyframes dark-silk-wave-1 {
          0%, 100% { transform: rotate(-6deg) translate3d(-8%, -6%, 0) scaleY(1); }
          50% { transform: rotate(5deg) translate3d(8%, 8%, 0) scaleY(1.18); }
        }
        @keyframes dark-silk-wave-2 {
          0%, 100% { transform: rotate(10deg) translate3d(8%, 6%, 0) scaleY(1.12); }
          50% { transform: rotate(-8deg) translate3d(-10%, -6%, 0) scaleY(0.90); }
        }
        @keyframes dark-silk-reflection {
          0% { transform: translate3d(-120%, -50%, 0) rotate(25deg); opacity: 0.05; }
          50% { opacity: 0.25; }
          100% { transform: translate3d(220%, 150%, 0) rotate(25deg); opacity: 0.05; }
        }

        /* ========================================== */
        /* THEME 5: DIGITAL PARTICLE SPACE ANIMATIONS  */
        /* ========================================== */
        @keyframes space-particle-drift-bg {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-60px, -120px, 0); }
        }
        @keyframes space-particle-drift-fg {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(90px, -180px, 0); }
        }
        @keyframes space-nebula-pulse {
          0%, 100% { transform: scale(1) rotate(0deg); opacity: 0.45; }
          50% { transform: scale(1.18) rotate(180deg); opacity: 0.70; }
        }
        @keyframes space-light-trail {
          0% { transform: translate3d(-100vw, -50vh, 0) rotate(25deg); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.8; }
          100% { transform: translate3d(100vw, 100vh, 0) rotate(25deg); opacity: 0; }
        }

        /* ========================================== */
        /* THEME 6: ORGANIC MOTION ANIMATIONS         */
        /* ========================================== */
        @keyframes organic-shape-sway-1 {
          0%, 100% { transform: translate3d(-5%, -5%, 0) rotate(-8deg) scale(1); border-radius: 65% 35% 55% 45% / 45% 55% 45% 55%; }
          50% { transform: translate3d(8%, 10%, 0) rotate(12deg) scale(1.15); border-radius: 40% 60% 45% 55% / 60% 40% 55% 45%; }
        }
        @keyframes organic-shape-sway-2 {
          0%, 100% { transform: translate3d(10%, 8%, 0) rotate(10deg) scale(1.1); border-radius: 50% 50% 65% 35% / 55% 45% 35% 65%; }
          50% { transform: translate3d(-10%, -6%, 0) rotate(-10deg) scale(0.92); border-radius: 35% 65% 45% 55% / 45% 55% 65% 35%; }
        }
        @keyframes organic-light-ray {
          0%, 100% { transform: rotate(-30deg) translate3d(-20%, -10%, 0) scaleY(1); opacity: 0.15; }
          50% { transform: rotate(-25deg) translate3d(15%, 15%, 0) scaleY(1.3); opacity: 0.35; }
        }

        /* ========================================== */
        /* THEME 7: CYBER RAIN ANIMATIONS             */
        /* ========================================== */
        @keyframes cyber-rain-fall-fast {
          0% { transform: translate3d(0, -100vh, 0); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translate3d(0, 100vh, 0); opacity: 0; }
        }
        @keyframes cyber-rain-fall-slow {
          0% { transform: translate3d(0, -100vh, 0); opacity: 0; }
          15% { opacity: 0.5; }
          85% { opacity: 0.5; }
          100% { transform: translate3d(0, 100vh, 0); opacity: 0; }
        }
        @keyframes cyber-grid-scroll {
          0% { transform: perspective(800px) rotateX(60deg) translate3d(0, 0, 0); }
          100% { transform: perspective(800px) rotateX(60deg) translate3d(0, 60px, 0); }
        }
        @keyframes cyber-energy-pulse {
          0%, 100% { transform: scale(0.95); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.6; }
        }
        @keyframes cyber-scanline-sweep {
          0% { transform: translate3d(0, -100%, 0); }
          100% { transform: translate3d(0, 1000%, 0); }
        }
      `}</style>

      {/* ========================================================= */}
      {/* THEME 3: AURORA FLOW                                      */}
      {/* ========================================================= */}
      {themeId === 'aurora-motion' && (
        <div className="relative w-full h-full bg-[#020612] overflow-hidden">
          {/* Main Aurora Ribbon 1 - Emerald / Teal / Cyan */}
          <div
            className="absolute -top-[25%] -left-[20%] w-[150%] h-[110vh] blur-[90px] opacity-70 bg-gradient-to-r from-emerald-500/30 via-teal-400/40 via-cyan-400/35 to-indigo-600/30"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `aurora-ribbon-1 ${18 * speedMultiplier}s ease-in-out infinite`,
              willChange: 'transform, opacity',
            }}
          />

          {/* Main Aurora Ribbon 2 - Violet / Cyan / Blue */}
          <div
            className="absolute top-[15%] -right-[25%] w-[140%] h-[100vh] blur-[100px] opacity-65 bg-gradient-to-l from-violet-600/35 via-cyan-400/40 via-emerald-400/30 to-blue-600/35"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `aurora-ribbon-2 ${22 * speedMultiplier}s ease-in-out infinite`,
              willChange: 'transform, opacity',
            }}
          />

          {/* Atmospheric Horizon Glow */}
          <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-emerald-950/40 via-teal-950/20 to-transparent" />

          {/* Drifting Floating Particles & Dust */}
          {!isLowPowerMode && (
            <div className="absolute inset-0 pointer-events-none">
              <div
                className="absolute top-[20%] left-[15%] w-2 h-2 rounded-full bg-emerald-300/60 blur-[1px]"
                style={{ animation: `aurora-particle-float-1 8s ease-in-out infinite` }}
              />
              <div
                className="absolute top-[40%] left-[60%] w-2.5 h-2.5 rounded-full bg-cyan-300/70 blur-[1px]"
                style={{ animation: `aurora-particle-float-2 11s ease-in-out infinite 2s` }}
              />
              <div
                className="absolute top-[65%] left-[25%] w-1.5 h-1.5 rounded-full bg-teal-200/50"
                style={{ animation: `aurora-particle-float-1 9s ease-in-out infinite 4s` }}
              />
              <div
                className="absolute top-[75%] left-[80%] w-3 h-3 rounded-full bg-violet-300/60 blur-[1.5px]"
                style={{ animation: `aurora-particle-float-2 13s ease-in-out infinite 1s` }}
              />
              <div
                className="absolute top-[30%] left-[85%] w-1.5 h-1.5 rounded-full bg-blue-200/60"
                style={{ animation: `aurora-particle-float-1 10s ease-in-out infinite 3s` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* THEME 4: SILK WAVE                                        */}
      {/* ========================================================= */}
      {themeId === 'neon-flow' && (
        <div className="relative w-full h-full bg-[#020203] overflow-hidden">
          {/* Deep Dark Silver Silk Wave Fold 1 */}
          <div
            className="absolute -top-[25%] -left-[20%] w-[150%] h-[200px] rounded-[100%] blur-[30px] opacity-45 bg-gradient-to-r from-black via-zinc-700/35 via-stone-400/25 to-zinc-950 shadow-[0_20px_50px_rgba(255,255,255,0.03)]"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `dark-silk-wave-1 ${22 * speedMultiplier}s ease-in-out infinite`,
              willChange: 'transform',
            }}
          />

          {/* Deep Dark Silver Silk Wave Fold 2 */}
          <div
            className="absolute top-[35%] -right-[20%] w-[140%] h-[240px] rounded-[100%] blur-[35px] opacity-40 bg-gradient-to-l from-zinc-950 via-zinc-600/30 via-slate-400/20 to-black shadow-[0_25px_60px_rgba(255,255,255,0.02)]"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `dark-silk-wave-2 ${26 * speedMultiplier}s ease-in-out infinite`,
              willChange: 'transform',
            }}
          />

          {/* Deep Dark Silver Silk Wave Fold 3 */}
          <div
            className="absolute bottom-[8%] -left-[15%] w-[135%] h-[180px] rounded-[100%] blur-[32px] opacity-35 bg-gradient-to-r from-zinc-900 via-stone-500/20 to-black"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `dark-silk-wave-1 ${28 * speedMultiplier}s ease-in-out infinite reverse`,
              willChange: 'transform',
            }}
          />

          {/* Soft Travelling Silver Reflection */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-200/15 via-stone-100/10 to-transparent pointer-events-none"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `dark-silk-reflection ${15 * speedMultiplier}s ease-in-out infinite`,
            }}
          />

          {/* Low Opacity Floating Dust Particles */}
          {!isLowPowerMode && (
            <div className="absolute inset-0 pointer-events-none opacity-40">
              <div
                className="absolute top-[22%] left-[18%] w-1.5 h-1.5 rounded-full bg-zinc-300/40 blur-[0.5px]"
                style={{ animation: `aurora-particle-float-1 12s ease-in-out infinite` }}
              />
              <div
                className="absolute top-[52%] left-[70%] w-1 h-1 rounded-full bg-stone-200/50"
                style={{ animation: `aurora-particle-float-2 15s ease-in-out infinite 3s` }}
              />
              <div
                className="absolute top-[78%] left-[32%] w-1.5 h-1.5 rounded-full bg-zinc-400/35 blur-[0.5px]"
                style={{ animation: `aurora-particle-float-1 14s ease-in-out infinite 6s` }}
              />
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* THEME 5: DIGITAL PARTICLE SPACE                           */}
      {/* ========================================================= */}
      {themeId === 'cosmic-pulse' && (
        <div className="relative w-full h-full bg-[#020308] overflow-hidden">
          {/* Subtle Distant Nebula Cloud 1 */}
          <div
            className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] rounded-full blur-[140px] opacity-50 bg-gradient-to-br from-cyan-950/40 via-indigo-950/50 via-purple-950/40 to-transparent"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `space-nebula-pulse ${30 * speedMultiplier}s ease-in-out infinite`,
              willChange: 'transform, opacity',
            }}
          />

          {/* Background Micro Particles Layer */}
          <div
            className="absolute inset-0 opacity-60"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `space-particle-drift-bg ${25 * speedMultiplier}s linear infinite alternate`,
              willChange: 'transform',
            }}
          >
            <div className="absolute top-[12%] left-[18%] w-1 h-1 bg-cyan-200/80 rounded-full" />
            <div className="absolute top-[28%] left-[72%] w-1.5 h-1.5 bg-blue-300/70 rounded-full" />
            <div className="absolute top-[45%] left-[35%] w-1 h-1 bg-white/60 rounded-full" />
            <div className="absolute top-[68%] left-[82%] w-1.5 h-1.5 bg-indigo-200/80 rounded-full" />
            <div className="absolute top-[85%] left-[22%] w-1 h-1 bg-cyan-300/70 rounded-full" />
            <div className="absolute top-[52%] left-[12%] w-1 h-1 bg-purple-200/60 rounded-full" />
          </div>

          {/* Foreground Parallax Particles Layer (Faster Motion) */}
          <div
            className="absolute inset-0 opacity-80"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `space-particle-drift-fg ${16 * speedMultiplier}s linear infinite alternate`,
              willChange: 'transform',
            }}
          >
            <div className="absolute top-[18%] left-[62%] w-2.5 h-2.5 bg-cyan-400/80 rounded-full blur-[0.5px] shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
            <div className="absolute top-[38%] left-[22%] w-2 h-2 bg-blue-400/80 rounded-full blur-[0.5px] shadow-[0_0_8px_rgba(96,165,250,0.8)]" />
            <div className="absolute top-[72%] left-[55%] w-2.5 h-2.5 bg-indigo-300/80 rounded-full blur-[0.5px]" />
          </div>

          {/* Occasional Subtle Light Trail Pulse */}
          {!isLowPowerMode && (
            <div
              className="absolute w-[200px] h-[1.5px] bg-gradient-to-r from-transparent via-cyan-300/80 to-transparent blur-[0.5px] pointer-events-none"
              style={{
                animation: `space-light-trail ${12 * speedMultiplier}s ease-in-out infinite 2s`,
              }}
            />
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* THEME 6: ORGANIC MOTION                                   */}
      {/* ========================================================= */}
      {themeId === 'prism-wave' && (
        <div className="relative w-full h-full bg-[#02130e] overflow-hidden">
          {/* Abstract Organic Floating Shape 1 */}
          <div
            className="absolute -top-[15%] -left-[15%] w-[130%] h-[90vh] blur-[60px] opacity-60 bg-gradient-to-br from-emerald-600/30 via-teal-500/35 via-cyan-500/25 to-emerald-900/40"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `organic-shape-sway-1 ${22 * speedMultiplier}s ease-in-out infinite`,
              willChange: 'transform, border-radius',
            }}
          />

          {/* Abstract Organic Floating Shape 2 */}
          <div
            className="absolute top-[30%] -right-[20%] w-[120%] h-[80vh] blur-[70px] opacity-55 bg-gradient-to-tl from-teal-600/35 via-emerald-400/30 via-teal-300/20 to-emerald-950/50"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `organic-shape-sway-2 ${26 * speedMultiplier}s ease-in-out infinite`,
              willChange: 'transform, border-radius',
            }}
          />

          {/* Soft Moving Light Ray Pass */}
          <div
            className="absolute top-[-30%] left-[20%] w-[60vw] h-[160vh] bg-gradient-to-r from-transparent via-teal-300/10 to-transparent blur-[40px] pointer-events-none"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `organic-light-ray ${18 * speedMultiplier}s ease-in-out infinite`,
            }}
          />
        </div>
      )}

      {/* ========================================================= */}
      {/* THEME 7: CYBER RAIN                                       */}
      {/* ========================================================= */}
      {themeId === 'liquid-spectrum' && (
        <div className="relative w-full h-full bg-[#040508] overflow-hidden">
          {/* Subtle Grid Base in Background */}
          <div
            className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(to right, rgba(34,211,238,0.15) 1px, transparent 1px),
                                linear-gradient(to bottom, rgba(34,211,238,0.15) 1px, transparent 1px)`,
              backgroundSize: '40px 40px',
              animation: isLowPowerMode
                ? 'none'
                : `cyber-grid-scroll ${15 * speedMultiplier}s linear infinite`,
            }}
          />

          {/* Cyber Rain Lines Layer 1 (Fast Cyan Lines) */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div
              className="absolute left-[12%] w-[1.5px] h-[120px] bg-gradient-to-b from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#22d3ee]"
              style={{
                animation: isLowPowerMode
                  ? 'none'
                  : `cyber-rain-fall-fast ${4 * speedMultiplier}s linear infinite`,
              }}
            />
            <div
              className="absolute left-[38%] w-[1px] h-[90px] bg-gradient-to-b from-transparent via-blue-400 to-transparent"
              style={{
                animation: isLowPowerMode
                  ? 'none'
                  : `cyber-rain-fall-slow ${6 * speedMultiplier}s linear infinite 1.5s`,
              }}
            />
            <div
              className="absolute left-[65%] w-[1.5px] h-[140px] bg-gradient-to-b from-transparent via-violet-400 to-transparent shadow-[0_0_10px_#a78bfa]"
              style={{
                animation: isLowPowerMode
                  ? 'none'
                  : `cyber-rain-fall-fast ${4.5 * speedMultiplier}s linear infinite 0.8s`,
              }}
            />
            <div
              className="absolute left-[88%] w-[1px] h-[100px] bg-gradient-to-b from-transparent via-cyan-300 to-transparent"
              style={{
                animation: isLowPowerMode
                  ? 'none'
                  : `cyber-rain-fall-slow ${5.5 * speedMultiplier}s linear infinite 2.2s`,
              }}
            />
          </div>

          {/* Cyan/Violet Energy Pulses */}
          <div
            className="absolute top-[25%] left-[20%] w-[350px] h-[350px] rounded-full bg-cyan-500/15 blur-[90px]"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `cyber-energy-pulse ${12 * speedMultiplier}s ease-in-out infinite`,
            }}
          />
          <div
            className="absolute bottom-[20%] right-[25%] w-[400px] h-[400px] rounded-full bg-violet-600/15 blur-[100px]"
            style={{
              animation: isLowPowerMode
                ? 'none'
                : `cyber-energy-pulse ${15 * speedMultiplier}s ease-in-out infinite 3s`,
            }}
          />

          {/* Soft Scanline Line Sweep */}
          {!isLowPowerMode && (
            <div
              className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent pointer-events-none"
              style={{ animation: `cyber-scanline-sweep 10s linear infinite` }}
            />
          )}
        </div>
      )}
    </div>
  );
};
