/**
 * In-memory circuit breaker for Suno API calls.
 *
 * States:
 *  - closed:    Normal operation. Failures increment counter; at threshold → open.
 *  - open:      Suno calls are blocked. After probe interval → half-open.
 *  - half-open: One probe request is allowed. Success → closed; failure → open.
 */

export type CircuitState = "closed" | "open" | "half-open";

/** Thrown when the circuit is open and the request is blocked. */
export class CircuitOpenError extends Error {
  constructor() {
    super(
      "Music generation is temporarily unavailable. Your request has been queued."
    );
    this.name = "CircuitOpenError";
    Object.setPrototypeOf(this, CircuitOpenError.prototype);
  }
}

// ─── Configuration ────────────────────────────────────────────────────────────

/** Consecutive failures needed to open the circuit. */
const FAILURE_THRESHOLD = 5;
/** Milliseconds to wait in open state before allowing a probe. */
const PROBE_INTERVAL_MS = 60_000;

// ─── State ────────────────────────────────────────────────────────────────────

interface State {
  state: CircuitState;
  failureCount: number;
  lastFailureAt: number | null;
  openedAt: number | null;
  probeInFlight: boolean;
}

const _state: State = {
  state: "closed",
  failureCount: 0,
  lastFailureAt: null,
  openedAt: null,
  probeInFlight: false,
};

// Callback invoked when the circuit transitions from half-open → closed.
// Register via onCircuitClose().
let _onCloseCallback: (() => void) | null = null;

// ─── Public API ───────────────────────────────────────────────────────────────

export interface CircuitStatus {
  state: CircuitState;
  failureCount: number;
  openedAt: string | null;
  nextProbeAt: string | null;
}

/** Return a snapshot of the current circuit state (safe to serialise). */
export function getCircuitStatus(): CircuitStatus {
  const { state, failureCount, openedAt } = _state;
  return {
    state,
    failureCount,
    openedAt: openedAt ? new Date(openedAt).toISOString() : null,
    nextProbeAt:
      openedAt && state === "open"
        ? new Date(openedAt + PROBE_INTERVAL_MS).toISOString()
        : null,
  };
}

/** Register a callback to run when the circuit closes after a successful probe. */
export function onCircuitClose(fn: () => void): void {
  _onCloseCallback = fn;
}

/**
 * Request permission to make a Suno API call.
 * Returns:
 *  - "allowed"  – proceed normally (circuit closed)
 *  - "probe"    – proceed as a probe request (circuit half-open, first probe)
 *  - "blocked"  – circuit open; throw CircuitOpenError instead
 */
export function requestPermission(): "allowed" | "probe" | "blocked" {
  const now = Date.now();

  if (_state.state === "closed") return "allowed";

  if (_state.state === "open") {
    if (_state.openedAt !== null && now - _state.openedAt >= PROBE_INTERVAL_MS) {
      // Transition to half-open to allow one probe.
      _state.state = "half-open";
      _state.probeInFlight = false;
    } else {
      return "blocked";
    }
  }

  // state === "half-open"
  if (!_state.probeInFlight) {
    _state.probeInFlight = true;
    return "probe";
  }
  return "blocked";
}

/** Record a successful Suno API call. Closes the circuit from half-open. */
export function recordSuccess(): void {
  if (_state.state === "half-open") {
    _state.state = "closed";
    _state.failureCount = 0;
    _state.openedAt = null;
    _state.probeInFlight = false;
    // Fire the close callback (non-blocking — caller must not throw).
    try {
      _onCloseCallback?.();
    } catch {
      // Swallow — circuit state already updated.
    }
  } else if (_state.state === "closed") {
    _state.failureCount = 0;
  }
}

/** Record a failed Suno API call. Opens the circuit when threshold is reached. */
export function recordFailure(): void {
  const now = Date.now();
  _state.lastFailureAt = now;

  if (_state.state === "half-open") {
    // Probe failed — return to open.
    _state.state = "open";
    _state.openedAt = now;
    _state.probeInFlight = false;
    return;
  }

  if (_state.state === "closed") {
    _state.failureCount += 1;
    if (_state.failureCount >= FAILURE_THRESHOLD) {
      _state.state = "open";
      _state.openedAt = now;
    }
  }
}

/** Force-reset the circuit to closed (admin/testing use only). */
export function resetCircuit(): void {
  _state.state = "closed";
  _state.failureCount = 0;
  _state.lastFailureAt = null;
  _state.openedAt = null;
  _state.probeInFlight = false;
}
