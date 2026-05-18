let audioContext;

function getCtx() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playTone({ frequency = 420, duration = 0.08, type = "sine", gain = 0.04 }) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const vol = ctx.createGain();

  osc.type = type;
  osc.frequency.value = frequency;
  vol.gain.value = gain;

  osc.connect(vol);
  vol.connect(ctx.destination);

  const now = ctx.currentTime;
  vol.gain.setValueAtTime(gain, now);
  vol.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.start(now);
  osc.stop(now + duration);
}

export const sounds = {
  success() {
    playTone({ frequency: 620, duration: 0.08, type: "triangle" });
    setTimeout(() => playTone({ frequency: 780, duration: 0.09, type: "triangle" }), 70);
  },
  error() {
    playTone({ frequency: 180, duration: 0.12, type: "sawtooth", gain: 0.05 });
  },
  click() {
    playTone({ frequency: 360, duration: 0.04, type: "square", gain: 0.025 });
  }
};
