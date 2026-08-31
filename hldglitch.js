/**
 * HLDGlitch - Cybernetic Distortion & Signal Glitch Plugin
 * Standalone, zero-dependency drop-in script for any HTML page.
 *
 * Usage:
 *   <script src="hldglitch.js"></script>
 *
 * Optional Configuration via script attributes:
 *   <script src="hldglitch.js" data-start="3000" data-min="50000" data-max="95000" data-banner-top="▓▒░ SIGNAL CORRUPTION // FRAME DESYNC ░▒▓" data-banner-bottom="ERR::PACKET_LOSS ███ SYSTEM UNSTABLE ███ RETRY"></script>
 *
 * Optional Configuration via global object (before or after loading):
 *   window.HLD_GLITCH_CONFIG = {
 *     startInterval: 3000,
 *     minInterval: 50000,
 *     maxInterval: 95000,
 *     minDuration: 650,
 *     maxDuration: 1050,
 *     bannerA: '▓▒░ SIGNAL CORRUPTION // FRAME DESYNC // 0x7F ░▒▓',
 *     bannerB: 'ERR::PACKET_LOSS ███ MAGNUS BUS UNSTABLE ███ RETRY'
 *   };
 *
 * Manual trigger:
 *   window.HLDGlitch.burst(800); // Trigger custom duration burst in ms
 */
(function (global) {
  'use strict';

  // Prevent duplicate initialization
  if (global.HLDGlitch && global.HLDGlitch.__initialized) {
    return;
  }

  // Find script element to read data attributes
  const currentScript = document.currentScript || document.querySelector('script[src*="hldglitch"]');
  const scriptConfig = currentScript ? currentScript.dataset : {};

  // Default configuration
  const defaults = {
    startInterval: 3000,    // Initial wait before first burst (ms)
    minInterval: 50000,     // Minimum random interval (ms)
    maxInterval: 95000,     // Maximum random interval (ms)
    minDuration: 650,       // Minimum burst duration (ms)
    maxDuration: 1050,      // Maximum burst duration (ms)
    bannerA: '▓▒░ SIGNAL CORRUPTION // FRAME DESYNC // 0x7F ░▒▓  ▓▒░ SIGNAL CORRUPTION // FRAME DESYNC // 0x7F ░▒▓  ▓▒░ SIGNAL CORRUPTION // FRAME DESYNC // 0x7F ░▒▓  ▓▒░ SIGNAL CORRUPTION // FRAME DESYNC // 0x7F ░▒▓',
    bannerB: 'ERR::PACKET_LOSS ███ MAGNUS BUS UNSTABLE ███ RETRY  ERR::PACKET_LOSS ███ MAGNUS BUS UNSTABLE ███ RETRY  ERR::PACKET_LOSS ███ MAGNUS BUS UNSTABLE ███ RETRY  ERR::PACKET_LOSS ███ MAGNUS BUS UNSTABLE ███ RETRY'
  };

  const parseNumber = (val, fallback) => {
    const num = Number(val);
    return !isNaN(num) && num >= 0 ? num : fallback;
  };

  const userConfig = global.HLD_GLITCH_CONFIG || {};

  const config = {
    startInterval: parseNumber(userConfig.startInterval ?? scriptConfig.start, defaults.startInterval),
    minInterval: parseNumber(userConfig.minInterval ?? scriptConfig.min, defaults.minInterval),
    maxInterval: parseNumber(userConfig.maxInterval ?? scriptConfig.max, defaults.maxInterval),
    minDuration: parseNumber(userConfig.minDuration ?? scriptConfig.minDuration, defaults.minDuration),
    maxDuration: parseNumber(userConfig.maxDuration ?? scriptConfig.maxDuration, defaults.maxDuration),
    bannerA: userConfig.bannerA || scriptConfig.bannerTop || defaults.bannerA,
    bannerB: userConfig.bannerB || scriptConfig.bannerBottom || defaults.bannerB
  };

  let chaosScheduleTimer = null;
  let chaosReleaseTimer = null;
  let overlayEl = null;

  const randomBetween = (min, max) => min + Math.random() * (max - min);

  // CSS injection
  const injectStyles = () => {
    if (document.getElementById('hld-glitch-styles')) return;

    const style = document.createElement('style');
    style.id = 'hld-glitch-styles';
    style.textContent = `
      :root {
        --hld-chaos-x: 12px;
        --hld-chaos-x-neg: -12px;
        --hld-chaos-y: 2px;
        --hld-chaos-skew: 1.8deg;
        --hld-chaos-skew-neg: -1.8deg;
        --hld-chaos-hue: 40deg;
        --hld-chaos-top-a: 24vh;
        --hld-chaos-top-b: 68vh;
        --hld-chaos-duration: 750ms;
        --hld-terminal-cyan: #00FFFF;
        --hld-terminal-pink: #ff2868;
      }

      .hld-glitch-overlay,
      .glitch-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        pointer-events: none;
        overflow: hidden;
        opacity: 0;
        mix-blend-mode: screen;
        background:
          linear-gradient(90deg, transparent 0 6%, rgba(0, 255, 255, .65) 8% 44%, transparent 47% 54%, rgba(255, 40, 104, .58) 58% 91%, transparent 94%),
          repeating-linear-gradient(0deg, transparent 0 9px, rgba(255, 255, 255, .13) 10px, transparent 12px);
      }

      .hld-glitch-overlay::before,
      .hld-glitch-overlay::after,
      .glitch-overlay::before,
      .glitch-overlay::after {
        position: absolute;
        left: -2vw;
        width: 104vw;
        padding: 3px 4vw;
        overflow: hidden;
        color: #f5f3f1;
        font: 700 12px/1 'Space Mono', Monaco, Consolas, 'Courier New', monospace;
        letter-spacing: .18em;
        white-space: nowrap;
        text-shadow: -5px 0 var(--hld-terminal-cyan), 5px 0 var(--hld-terminal-pink);
        opacity: 0;
      }

      .hld-glitch-overlay::before,
      .glitch-overlay::before {
        content: attr(data-banner-a);
        top: var(--hld-chaos-top-a);
        background: rgba(0, 255, 255, .24);
      }

      .hld-glitch-overlay::after,
      .glitch-overlay::after {
        content: attr(data-banner-b);
        top: var(--hld-chaos-top-b);
        color: #ffcedd;
        background: rgba(255, 40, 104, .28);
      }

      /* Slice indicators */
      .hld-glitch-slice-a,
      .hld-glitch-slice-b {
        position: fixed;
        left: 0;
        right: 0;
        z-index: 1000000;
        pointer-events: none;
        opacity: 0;
        mix-blend-mode: screen;
      }

      .hld-glitch-slice-a {
        height: 8px;
        background: linear-gradient(90deg, transparent 0 2%, rgba(0, 255, 255, .95) 8% 62%, rgba(255, 255, 255, .65) 62% 68%, transparent 86%);
        box-shadow: 0 0 16px rgba(0, 255, 255, .9), 12px 4px 0 rgba(255, 40, 104, .72);
      }

      .hld-glitch-slice-b {
        height: 14px;
        background: linear-gradient(90deg, transparent 0 8%, rgba(255, 40, 104, .82) 15% 64%, rgba(104, 255, 153, .68) 64% 79%, transparent 91%);
        box-shadow: -13px -4px 0 rgba(0, 255, 255, .62);
      }

      /* Burst state active styles */
      body.chaos-burst,
      body.hld-chaos-burst {
        /* General document-level chromatic shift during burst */
      }

      body.chaos-burst main,
      body.chaos-burst #terminal,
      body.chaos-burst .hld-glitch-target,
      body.hld-chaos-burst main,
      body.hld-chaos-burst #terminal,
      body.hld-chaos-burst .hld-glitch-target,
      body.hld-chaos-burst > :not(.hld-glitch-overlay):not(.glitch-overlay):not(.hld-glitch-slice-a):not(.hld-glitch-slice-b):not(script):not(style) {
        animation: hldChaosTerminal var(--hld-chaos-duration) steps(1, end) both !important;
        filter: drop-shadow(-9px 0 rgba(0, 255, 255, .88)) drop-shadow(9px 0 rgba(255, 40, 104, .82)) brightness(1.22) contrast(1.24) !important;
      }

      body.chaos-burst .glitch-overlay,
      body.chaos-burst .hld-glitch-overlay,
      body.hld-chaos-burst .glitch-overlay,
      body.hld-chaos-burst .hld-glitch-overlay {
        animation: hldChaosOverlay var(--hld-chaos-duration) steps(1, end) both !important;
        opacity: .82 !important;
        clip-path: inset(0) !important;
      }

      body.chaos-burst .glitch-overlay::before,
      body.chaos-burst .hld-glitch-overlay::before,
      body.hld-chaos-burst .glitch-overlay::before,
      body.hld-chaos-burst .hld-glitch-overlay::before {
        animation: hldChaosBannerA var(--hld-chaos-duration) steps(1, end) both !important;
        opacity: 1 !important;
      }

      body.chaos-burst .glitch-overlay::after,
      body.chaos-burst .hld-glitch-overlay::after,
      body.hld-chaos-burst .glitch-overlay::after,
      body.hld-chaos-burst .hld-glitch-overlay::after {
        animation: hldChaosBannerB var(--hld-chaos-duration) steps(1, end) both !important;
        opacity: 1 !important;
      }

      body.chaos-burst .hld-glitch-slice-a,
      body.hld-chaos-burst .hld-glitch-slice-a,
      body.chaos-burst #terminal::before {
        animation: hldChaosSliceA var(--hld-chaos-duration) steps(1, end) both !important;
        opacity: 1 !important;
      }

      body.chaos-burst .hld-glitch-slice-b,
      body.hld-chaos-burst .hld-glitch-slice-b,
      body.chaos-burst #terminal::after {
        animation: hldChaosSliceB var(--hld-chaos-duration) steps(1, end) both !important;
        opacity: .92 !important;
      }

      body.chaos-burst .ascii-logo,
      body.hld-chaos-burst .ascii-logo {
        animation: hldLogoPulse var(--hld-chaos-duration) steps(1, end) both !important;
      }

      @keyframes hldChaosTerminal {
        0%, 100% { opacity: 1; transform: none; filter: none; clip-path: inset(0); }
        8% { transform: translate(var(--hld-chaos-x), var(--hld-chaos-y)) skewX(var(--hld-chaos-skew)); filter: drop-shadow(var(--hld-chaos-x-neg) 0 var(--hld-terminal-cyan)) drop-shadow(var(--hld-chaos-x) 0 var(--hld-terminal-pink)) brightness(1.5); }
        17% { opacity: .48; transform: translate(var(--hld-chaos-x-neg), -2px) skewX(var(--hld-chaos-skew-neg)); filter: contrast(2.5) hue-rotate(var(--hld-chaos-hue)); clip-path: inset(0 0 64% 0); }
        27% { opacity: 1; transform: translate(var(--hld-chaos-x), 3px); filter: drop-shadow(12px 0 var(--hld-terminal-cyan)) drop-shadow(-12px 0 var(--hld-terminal-pink)); clip-path: inset(43% 0 0); }
        38% { opacity: .62; transform: translate(var(--hld-chaos-x-neg), -3px) skewX(3deg); filter: saturate(3) contrast(2); clip-path: inset(26% 0 31% 0); }
        49% { opacity: 1; transform: translate(15px, 1px) skewX(-2deg); filter: brightness(1.8) hue-rotate(105deg); clip-path: inset(0); }
        61% { opacity: .4; transform: translate(-16px, 2px); filter: contrast(2.8); clip-path: inset(58% 0 13% 0); }
        72% { opacity: 1; transform: translate(var(--hld-chaos-x), -2px) skewX(var(--hld-chaos-skew)); filter: drop-shadow(-14px 0 var(--hld-terminal-cyan)) drop-shadow(14px 0 var(--hld-terminal-pink)); clip-path: inset(0 0 39% 0); }
        84% { opacity: .7; transform: translate(var(--hld-chaos-x-neg), 1px); filter: brightness(1.6) contrast(1.8); clip-path: inset(18% 0 0); }
        93% { opacity: 1; transform: translate(5px, 0); filter: drop-shadow(6px 0 var(--hld-terminal-cyan)); clip-path: inset(0); }
      }

      @keyframes hldChaosOverlay {
        0%, 100% { opacity: 0; transform: none; clip-path: inset(0); }
        7% { opacity: 1; transform: translateX(var(--hld-chaos-x)); clip-path: inset(4% 0 80% 0); }
        19% { opacity: .72; transform: translateX(var(--hld-chaos-x-neg)); clip-path: inset(35% 0 43% 0); }
        33% { opacity: 1; transform: translateX(28px); clip-path: inset(67% 0 8% 0); }
        47% { opacity: .55; transform: translateX(-32px); clip-path: inset(18% 0 55% 0); }
        61% { opacity: .96; transform: translateX(18px); clip-path: inset(48% 0 27% 0); }
        76% { opacity: .68; transform: translateX(-24px); clip-path: inset(77% 0 5% 0); }
        90% { opacity: .9; transform: translateX(11px); clip-path: inset(28% 0 51% 0); }
      }

      @keyframes hldChaosBannerA {
        0%, 100% { opacity: 0; transform: translateX(-28px); }
        9% { opacity: 1; transform: translateX(var(--hld-chaos-x)); }
        26% { opacity: .42; transform: translateX(var(--hld-chaos-x-neg)) skewX(-4deg); }
        42% { opacity: 1; transform: translateX(21px); }
        59% { opacity: .3; transform: translateX(-17px); }
        74% { opacity: .94; transform: translateX(9px) skewX(3deg); }
        91% { opacity: .55; transform: translateX(-12px); }
      }

      @keyframes hldChaosBannerB {
        0%, 100% { opacity: 0; transform: translateX(31px); }
        14% { opacity: .85; transform: translateX(var(--hld-chaos-x-neg)); }
        31% { opacity: .38; transform: translateX(19px) skewX(4deg); }
        49% { opacity: 1; transform: translateX(-23px); }
        67% { opacity: .46; transform: translateX(14px); }
        83% { opacity: .9; transform: translateX(-8px) skewX(-3deg); }
      }

      @keyframes hldChaosSliceA {
        0%, 100% { opacity: 0; top: 8%; transform: translateX(0) scaleX(1); }
        12% { opacity: 1; top: 16%; transform: translateX(-34px) scaleX(1.18); }
        29% { opacity: .7; top: 72%; transform: translateX(38px) scaleX(.84); }
        45% { opacity: 1; top: 39%; transform: translateX(-27px) scaleX(1.25); }
        63% { opacity: .82; top: 87%; transform: translateX(31px) scaleX(.9); }
        81% { opacity: 1; top: 52%; transform: translateX(-36px) scaleX(1.14); }
      }

      @keyframes hldChaosSliceB {
        0%, 100% { opacity: 0; top: 82%; transform: translateX(0) scaleX(1); }
        8% { opacity: .9; top: 68%; transform: translateX(39px) scaleX(.82); }
        24% { opacity: 1; top: 22%; transform: translateX(-35px) scaleX(1.22); }
        41% { opacity: .65; top: 56%; transform: translateX(28px) scaleX(.88); }
        58% { opacity: 1; top: 11%; transform: translateX(-41px) scaleX(1.17); }
        76% { opacity: .8; top: 77%; transform: translateX(33px) scaleX(.91); }
        92% { opacity: 1; top: 43%; transform: translateX(-26px) scaleX(1.26); }
      }

      @keyframes hldLogoPulse {
        0%, 36%, 49%, 69%, 83%, 100% { opacity: 1; transform: translateX(0) skewX(0); filter: none; text-shadow: 0 0 2px rgba(238, 183, 235, .4); }
        38% { opacity: .58; transform: translateX(-8px) skewX(4deg); filter: brightness(1.55) contrast(1.6); text-shadow: 10px 0 var(--hld-terminal-cyan), -10px 0 var(--hld-terminal-pink); }
        41% { opacity: 1; transform: translateX(7px) skewX(-3deg); text-shadow: -9px 0 var(--hld-terminal-cyan), 9px 0 var(--hld-terminal-pink); }
        44% { opacity: .42; transform: translateX(-5px); filter: hue-rotate(75deg) contrast(2.1); }
        47% { opacity: 1; transform: translateX(3px); text-shadow: 7px 0 var(--hld-terminal-cyan), -7px 0 var(--hld-terminal-pink); }
        71% { opacity: .65; transform: translateX(9px) skewX(-2deg); filter: brightness(1.45); text-shadow: -11px 0 var(--hld-terminal-cyan), 11px 0 var(--hld-terminal-pink); }
        75% { opacity: 1; transform: translateX(-7px) skewX(3deg); text-shadow: 8px 0 var(--hld-terminal-cyan), -8px 0 var(--hld-terminal-pink); }
        79% { opacity: .48; transform: translateX(4px); filter: contrast(2); }
        81% { opacity: 1; transform: translateX(-2px); }
      }
    `;
    document.head.appendChild(style);
  };

  // Ensure DOM overlay elements exist
  const ensureOverlay = () => {
    overlayEl = document.querySelector('.hld-glitch-overlay, .glitch-overlay');
    if (!overlayEl) {
      overlayEl = document.createElement('div');
      overlayEl.className = 'hld-glitch-overlay';
      overlayEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(overlayEl);
    }
    overlayEl.setAttribute('data-banner-a', config.bannerA);
    overlayEl.setAttribute('data-banner-b', config.bannerB);

    if (!document.querySelector('.hld-glitch-slice-a')) {
      const sliceA = document.createElement('div');
      sliceA.className = 'hld-glitch-slice-a';
      sliceA.setAttribute('aria-hidden', 'true');
      document.body.appendChild(sliceA);
    }

    if (!document.querySelector('.hld-glitch-slice-b')) {
      const sliceB = document.createElement('div');
      sliceB.className = 'hld-glitch-slice-b';
      sliceB.setAttribute('aria-hidden', 'true');
      document.body.appendChild(sliceB);
    }
  };

  const getDelay = () => Math.round(randomBetween(config.minInterval, config.maxInterval));

  // Run a single burst
  const runChaosBurst = (customDuration) => {
    const duration = customDuration ?? Math.round(randomBetween(config.minDuration, config.maxDuration));
    const direction = Math.random() < 0.5 ? -1 : 1;
    const distance = Math.round(randomBetween(11, 24)) * direction;
    const skew = (randomBetween(1.4, 4) * direction).toFixed(2);
    const root = document.documentElement;

    // Set both prefixed and legacy CSS variables for compatibility
    root.style.setProperty('--hld-chaos-x', `${distance}px`);
    root.style.setProperty('--hld-chaos-x-neg', `${distance * -1}px`);
    root.style.setProperty('--hld-chaos-y', `${Math.round(randomBetween(-4, 4))}px`);
    root.style.setProperty('--hld-chaos-skew', `${skew}deg`);
    root.style.setProperty('--hld-chaos-skew-neg', `${skew * -1}deg`);
    root.style.setProperty('--hld-chaos-hue', `${Math.round(randomBetween(30, 150))}deg`);
    root.style.setProperty('--hld-chaos-top-a', `${Math.round(randomBetween(12, 42))}vh`);
    root.style.setProperty('--hld-chaos-top-b', `${Math.round(randomBetween(56, 88))}vh`);
    root.style.setProperty('--hld-chaos-duration', `${duration}ms`);

    // Legacy variables support
    root.style.setProperty('--chaos-x', `${distance}px`);
    root.style.setProperty('--chaos-x-neg', `${distance * -1}px`);
    root.style.setProperty('--chaos-y', `${Math.round(randomBetween(-4, 4))}px`);
    root.style.setProperty('--chaos-skew', `${skew}deg`);
    root.style.setProperty('--chaos-skew-neg', `${skew * -1}deg`);
    root.style.setProperty('--chaos-hue', `${Math.round(randomBetween(30, 150))}deg`);
    root.style.setProperty('--chaos-top-a', `${Math.round(randomBetween(12, 42))}vh`);
    root.style.setProperty('--chaos-top-b', `${Math.round(randomBetween(56, 88))}vh`);
    root.style.setProperty('--chaos-duration', `${duration}ms`);

    clearTimeout(chaosReleaseTimer);
    document.body.classList.remove('chaos-burst', 'hld-chaos-burst');
    void document.body.offsetWidth; // force reflow
    document.body.classList.add('chaos-burst', 'hld-chaos-burst');

    chaosReleaseTimer = window.setTimeout(() => {
      document.body.classList.remove('chaos-burst', 'hld-chaos-burst');
    }, duration);
  };

  // Schedule the next chaos burst
  const scheduleChaos = (delayOverride) => {
    clearTimeout(chaosScheduleTimer);
    const delay = delayOverride ?? getDelay();
    chaosScheduleTimer = window.setTimeout(() => {
      const duration = Math.round(randomBetween(config.minDuration, config.maxDuration));
      runChaosBurst(duration);
      chaosScheduleTimer = window.setTimeout(() => scheduleChaos(), duration + 120);
    }, delay);
  };

  // Initialize
  const init = () => {
    injectStyles();
    ensureOverlay();
    scheduleChaos(config.startInterval);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public API
  const HLDGlitch = {
    __initialized: true,
    config,
    burst: (duration) => {
      runChaosBurst(duration);
      scheduleChaos(); // reset next random burst
    },
    trigger: (duration) => {
      runChaosBurst(duration);
      scheduleChaos();
    },
    schedule: (delayOverride) => scheduleChaos(delayOverride),
    stop: () => {
      clearTimeout(chaosScheduleTimer);
      clearTimeout(chaosReleaseTimer);
      document.body.classList.remove('chaos-burst', 'hld-chaos-burst');
    },
    start: () => scheduleChaos(config.startInterval),
    configure: (newOptions = {}) => {
      Object.assign(config, newOptions);
      if (overlayEl) {
        if (newOptions.bannerA) overlayEl.setAttribute('data-banner-a', config.bannerA);
        if (newOptions.bannerB) overlayEl.setAttribute('data-banner-b', config.bannerB);
      }
    }
  };

  global.HLDGlitch = HLDGlitch;
  global.hldGlitch = HLDGlitch;

})(typeof window !== 'undefined' ? window : this);
