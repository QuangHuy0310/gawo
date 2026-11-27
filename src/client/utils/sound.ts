// Web Audio API Synthesizer for Turn Notifications
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioCtx) {
    audioCtx = new AudioContextClass();
  }

  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }

  return audioCtx;
}

export function unlockGameAudio(): void {
  try { getAudioContext(); } catch { /* Audio is optional. */ }
}

export function playWaitingTick(): void {
  try {
    // Never queue recurring ticks while autoplay is blocked or the tab is suspended.
    if (!audioCtx || audioCtx.state !== 'running') return;
    const start = audioCtx.currentTime;
    const tone = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(1050, start);
    tone.frequency.exponentialRampToValueAtTime(650, start + 0.035);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(0.035, start + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.001, start + 0.035);
    tone.connect(gain);
    gain.connect(audioCtx.destination);
    tone.start(start);
    tone.stop(start + 0.035);
  } catch { /* Audio is optional. */ }
}

export function playPieceSound(enabled: boolean, captured: boolean): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const start = ctx.currentTime;
    const end = start + (captured ? 0.13 : 0.08);
    const tone = ctx.createOscillator();
    const gain = ctx.createGain();
    tone.type = 'triangle';
    tone.frequency.setValueAtTime(captured ? 245 : 510, start);
    tone.frequency.exponentialRampToValueAtTime(captured ? 95 : 280, end);
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(captured ? 0.23 : 0.11, start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, end);
    tone.connect(gain);
    gain.connect(ctx.destination);
    tone.start(start);
    tone.stop(end);
  } catch { /* Audio is optional. */ }
}

export function playCheckChime(enabled: boolean, delay = 0): void {
  if (!enabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    [440, 330].forEach((frequency, index) => {
      const start = now + index * 0.13;
      const tone = ctx.createOscillator();
      const gain = ctx.createGain();
      tone.type = 'triangle';
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(0.16, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.2);
      tone.connect(gain);
      gain.connect(ctx.destination);
      tone.start(start);
      tone.stop(start + 0.2);
    });
  } catch { /* Audio is optional. */ }
}

/**
 * Plays a pleasant two-tone chime (D5 -> A5) using the Web Audio API.
 * 100% local synthesis, 0ms latency, zero external asset dependencies.
 */
export function playTurnChime(enabled: boolean, delay = 0): void {
  if (!enabled) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;

    // Master volume gain node
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.18, now);
    masterGain.connect(ctx.destination);

    // Note 1: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(1, now + 0.03);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(masterGain);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Note 2: A5 (880.00 Hz) - slightly delayed for a sparkling chime
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(1, now + 0.13);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(masterGain);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.38);
  } catch (err) {
    // Graceful fallback if audio is not permitted by browser environment
  }
}

// Tab Title Flasher when player tab is in background
let titleFlashTimer: NodeJS.Timeout | null = null;
const ORIGINAL_TITLE = 'Caro 30×30 (3-4P)';

export function flashTabTitle(message: string): void {
  if (typeof document === 'undefined') return;

  if (titleFlashTimer) {
    clearInterval(titleFlashTimer);
    titleFlashTimer = null;
  }

  if (!document.hidden) {
    document.title = ORIGINAL_TITLE;
    return;
  }

  let isAlert = true;
  document.title = message;

  titleFlashTimer = setInterval(() => {
    if (!document.hidden) {
      if (titleFlashTimer) clearInterval(titleFlashTimer);
      titleFlashTimer = null;
      document.title = ORIGINAL_TITLE;
      return;
    }

    document.title = isAlert ? message : ORIGINAL_TITLE;
    isAlert = !isAlert;
  }, 1200);

  // Auto clean up when document becomes visible
  const onVisibilityChange = () => {
    if (!document.hidden) {
      if (titleFlashTimer) clearInterval(titleFlashTimer);
      titleFlashTimer = null;
      document.title = ORIGINAL_TITLE;
      document.removeEventListener('visibilitychange', onVisibilityChange);
    }
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
}
