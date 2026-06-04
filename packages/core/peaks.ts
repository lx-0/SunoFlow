// Waveform peak downsampling shared by the web worker (browser-decoded PCM) and
// the mobile player (natively-extracted samples). Same algorithm both places:
// max-amplitude per block, then normalize to 0..1 against the loudest block.

export function downsamplePeaks(samples: ArrayLike<number>, numBars: number): number[] {
  const blockSize = Math.max(1, Math.floor(samples.length / numBars));
  const peaks: number[] = new Array(numBars).fill(0);

  for (let i = 0; i < numBars; i++) {
    const start = i * blockSize;
    const end = Math.min(start + blockSize, samples.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const v = Math.abs(samples[j]);
      if (v > max) max = v;
    }
    peaks[i] = max;
  }

  let maxVal = 0.01;
  for (let i = 0; i < numBars; i++) if (peaks[i] > maxVal) maxVal = peaks[i];
  for (let i = 0; i < numBars; i++) peaks[i] /= maxVal;

  return peaks;
}
