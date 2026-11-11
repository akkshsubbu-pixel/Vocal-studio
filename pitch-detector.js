/* Browser-local YIN fundamental-frequency detector used by the live monitor. */
(() => {
  function yin(samples, sampleRate, minHz = 32, maxHz = 3950) {
    const n = samples.length;
    const minLag = Math.max(2, Math.floor(sampleRate / maxHz));
    const maxLag = Math.min(Math.floor(sampleRate / minHz), Math.floor(n / 2) - 2);
    if (maxLag <= minLag) return null;

    let mean = 0;
    for (let i = 0; i < n; i++) mean += samples[i];
    mean /= n;

    let power = 0;
    for (let i = 0; i < n; i++) {
      const centered = samples[i] - mean;
      power += centered * centered;
    }
    if (Math.sqrt(power / n) < 0.002) return null;

    const difference = new Float32Array(maxLag + 1);
    const normalized = new Float32Array(maxLag + 1);
    let cumulative = 0;
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      for (let i = 0; i < n - lag; i++) {
        const delta = samples[i] - samples[i + lag];
        sum += delta * delta;
      }
      difference[lag] = sum;
      cumulative += sum;
      normalized[lag] = cumulative ? sum * lag / cumulative : 1;
    }

    let period = -1;
    for (let lag = minLag; lag < maxLag; lag++) {
      if (normalized[lag] < 0.14) {
        while (lag + 1 < maxLag && normalized[lag + 1] < normalized[lag]) lag++;
        period = lag;
        break;
      }
    }
    if (period < 0) {
      let best = 0.23;
      for (let lag = minLag; lag <= maxLag; lag++) {
        if (normalized[lag] < best) {
          best = normalized[lag];
          period = lag;
        }
      }
    }
    if (period < 0) return null;

    const before = normalized[period - 1] ?? normalized[period];
    const center = normalized[period];
    const after = normalized[period + 1] ?? center;
    const denominator = before - 2 * center + after;
    const offset = Math.abs(denominator) > 1e-8
      ? Math.max(-0.5, Math.min(0.5, 0.5 * (before - after) / denominator))
      : 0;
    const frequency = sampleRate / (period + offset);
    const confidence = 1 - center;
    if (confidence < 0.68 || frequency < minHz || frequency > maxHz) return null;
    return { frequency, confidence };
  }

  globalThis.VocalPitchDetector = Object.freeze({ yin });
})();
