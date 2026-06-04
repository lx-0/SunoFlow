/// <reference lib="webworker" />

// Web Worker: receives a Float32Array of decoded audio samples and the requested
// bar count; returns normalised peak amplitudes. The downsampling algorithm is
// shared with the mobile player via @sunoflow/core (downsamplePeaks) so both
// platforms draw the waveform the same way. Runs off the main thread so cover-
// swiping doesn't jank on mobile.

import { downsamplePeaks } from "@sunoflow/core";

interface RequestMessage {
  id: number;
  samples: Float32Array;
  numBars: number;
}

interface ResponseMessage {
  id: number;
  peaks: Float32Array;
}

self.addEventListener("message", (e: MessageEvent<RequestMessage>) => {
  const { id, samples, numBars } = e.data;

  const peaks = Float32Array.from(downsamplePeaks(samples, numBars));

  const response: ResponseMessage = { id, peaks };
  (self as DedicatedWorkerGlobalScope).postMessage(response, [peaks.buffer]);
});

export {};
