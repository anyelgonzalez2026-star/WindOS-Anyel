/** Tiny Web Audio sound engine — all tones are generated, no asset files. */

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  frequency: number,
  start: number,
  duration: number,
  gain: number,
  type: OscillatorType = "sine",
) {
  const audioCtx = audio();
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime + start);
  amp.gain.setValueAtTime(0, audioCtx.currentTime + start);
  amp.gain.linearRampToValueAtTime(gain, audioCtx.currentTime + start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + start + duration);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(audioCtx.currentTime + start);
  osc.stop(audioCtx.currentTime + start + duration + 0.05);
}

export type SoundKind = "startup" | "notify" | "error" | "alarm" | "click" | "lock" | "shutdown" | "install";

export function playSound(kind: SoundKind, enabled = true) {
  if (!enabled) return;
  switch (kind) {
    case "startup":
      tone(392, 0, 0.9, 0.05, "sine");
      tone(523.25, 0.12, 1.1, 0.04, "sine");
      tone(659.25, 0.26, 1.3, 0.035, "sine");
      break;
    case "notify":
      tone(880, 0, 0.18, 0.045);
      tone(1174.66, 0.09, 0.24, 0.035);
      break;
    case "install":
      tone(523.25, 0, 0.14, 0.04);
      tone(659.25, 0.1, 0.18, 0.04);
      tone(783.99, 0.2, 0.28, 0.04);
      break;
    case "error":
      tone(220, 0, 0.22, 0.05, "triangle");
      tone(174.61, 0.14, 0.35, 0.04, "triangle");
      break;
    case "alarm":
      for (let i = 0; i < 4; i += 1) {
        tone(880, i * 0.24, 0.15, 0.06, "square");
        tone(660, i * 0.24 + 0.12, 0.12, 0.045, "square");
      }
      break;
    case "lock":
      tone(523.25, 0, 0.2, 0.035);
      tone(392, 0.12, 0.3, 0.03);
      break;
    case "shutdown":
      tone(523.25, 0, 0.4, 0.04);
      tone(392, 0.18, 0.5, 0.035);
      tone(261.63, 0.38, 0.8, 0.03);
      break;
    case "click":
      tone(1400, 0, 0.04, 0.015, "triangle");
      break;
  }
}

export function speak(text: string, rate = 1) {
  try {
    if (typeof speechSynthesis === "undefined") return false;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = Math.min(2, Math.max(0.5, rate));
    speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}
