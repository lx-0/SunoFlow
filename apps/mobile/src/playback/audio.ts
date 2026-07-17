import {
	advanceSettled,
	clampSeek,
	createQueueState,
	cycleRepeat,
	detectEnded,
	type QueueState,
	jumpTo as queueJumpTo,
	playQueue as queuePlayQueue,
	removeFromQueue as queueRemoveFromQueue,
	reorderQueue as queueReorderQueue,
	skipToNext as queueSkipToNext,
	skipToPrevious as queueSkipToPrevious,
	toggleShuffle as queueToggleShuffle,
	type RepeatMode,
} from "@sunoflow/core";
import {
	type AudioPlayer,
	createAudioPlayer,
	setAudioModeAsync,
} from "expo-audio";
import * as SecureStore from "expo-secure-store";
import { recordPlay } from "@/api/history";
import { fetchSongVersions } from "@/api/song-versions";
import type { Song } from "@/types";
import {
	enableRemoteControls,
	onRemoteNext,
	onRemotePrevious,
} from "../../modules/remote-controls";

export type { RepeatMode };

// Persist the user's shuffle/repeat/shuffle-versions preference across launches.
const SHUFFLE_KEY = "sunoflow.playback.shuffle";
const REPEAT_KEY = "sunoflow.playback.repeat";
const SHUFFLE_VERSIONS_KEY = "sunoflow.playback.shuffleVersions";

// Queue controller around expo-audio. ONE long-lived AudioPlayer (it owns the
// lock-screen / Control Center widget — AudioPlaylist has no lock-screen support).
// Tracks are swapped with replace(). Auto-advance is driven by POLLING the
// player's currentTime/duration/playing every 700ms: the didJustFinish event was
// unreliable on device (sometimes it never fired / the player went silent without
// a final status event), so we don't depend on it. Polling reads native state
// directly and advances when the current track reaches/stops at its end.
//
// Queue/shuffle/repeat transitions live in the shared @sunoflow/core machine;
// this module holds the machine state and interprets each transition's effect:
// "load" = load queue[index] into the player, "stop" = pause + clear, "none" =
// list-only change (patch the snapshot, leave the player alone).

export interface PlaybackSnapshot {
	current: Song | null;
	playing: boolean;
	positionSeconds: number;
	durationSeconds: number;
	index: number;
	queueLength: number;
	queue: Song[];
	shuffle: boolean;
	repeat: RepeatMode;
	shuffleVersions: boolean;
	/** True when the playing track is a shuffle-versions alternate (not the original). */
	currentIsAlternate: boolean;
}

let player: AudioPlayer | null = null;
let qs: QueueState<Song> = createQueueState();
let shuffleVersions = false;
let alternateSongId: string | null = null; // the shuffle-versions-swapped track id
// Guard: a track load is in flight (auto-advance OR manual skip/start). While
// set, the poll suppresses UI patches and end-detection: on a slow network the
// native player keeps reporting the OLD track's near-end position after
// replace(), which end-detection would read as "ended" again and double-skip.
// Cleared by the poll once the new track reports a fresh position (or after a
// timeout so a failed load can't suppress auto-advance forever).
let advancing = false;
let advanceStartedAt = 0;
// A seek issued while `advancing` moves the fresh track PAST the settle
// threshold; remember the target so the poll can settle on evidence the seek
// landed instead of freezing progress until the timeout.
let pendingSeekTarget: number | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastPlaying = false;
let lastPos = 0;

let snapshot: PlaybackSnapshot = {
	current: null,
	playing: false,
	positionSeconds: 0,
	durationSeconds: 0,
	index: 0,
	queueLength: 0,
	queue: [],
	shuffle: false,
	repeat: "off",
	shuffleVersions: false,
	currentIsAlternate: false,
};
const listeners = new Set<() => void>();

function emit() {
	for (const l of listeners) l();
}
function patch(next: Partial<PlaybackSnapshot>) {
	snapshot = { ...snapshot, ...next };
	emit();
}

export function subscribe(cb: () => void): () => void {
	listeners.add(cb);
	return () => listeners.delete(cb);
}
export function getSnapshot(): PlaybackSnapshot {
	return snapshot;
}

// Restore the persisted shuffle/repeat preference at startup. playQueue() reads
// the machine's `shuffle` when it builds a queue, so hydrating the flag is enough
// — no track is playing yet. Fire-and-forget; defaults stand if storage is
// empty/unavailable.
void (async () => {
	try {
		const [s, r, sv] = await Promise.all([
			SecureStore.getItemAsync(SHUFFLE_KEY),
			SecureStore.getItemAsync(REPEAT_KEY),
			SecureStore.getItemAsync(SHUFFLE_VERSIONS_KEY),
		]);
		if (s === "1") qs = { ...qs, shuffle: true };
		if (r === "all" || r === "one") qs = { ...qs, repeat: r };
		if (sv === "1") shuffleVersions = true;
		if (qs.shuffle || qs.repeat !== "off" || shuffleVersions) {
			patch({ shuffle: qs.shuffle, repeat: qs.repeat, shuffleVersions });
		}
	} catch {
		// ignore — defaults stand
	}
})();

function startPolling() {
	if (pollTimer) return;
	pollTimer = setInterval(() => {
		const p = player;
		if (!p) return;
		// Re-assert next/prev (+ seek off) every tick: expo-audio keeps reconfiguring
		// MPRemoteCommandCenter (showing ±seek), so a one-shot enable() loses to it.
		enableRemoteControls();
		const dur = typeof p.duration === "number" ? p.duration : 0;
		const pos = typeof p.currentTime === "number" ? p.currentTime : 0;
		const playing = Boolean(p.playing);

		// Load in flight: ignore stale old-track readings (see `advancing` above).
		// Settle once the new track reports a fresh position; the timeout keeps a
		// failed load from suppressing auto-advance forever. Suppressing the UI
		// patch here also kills the "progress flashes to the end then resets"
		// artifact during track changes.
		if (advancing) {
			if (
				advanceSettled({
					pos,
					pendingSeekTarget,
					advanceStartedAt,
					now: Date.now(),
				})
			) {
				advancing = false;
				pendingSeekTarget = null;
				lastPlaying = playing;
				lastPos = pos;
				patch({ playing, positionSeconds: pos, durationSeconds: dur });
			}
			return;
		}
		pendingSeekTarget = null;

		// Emit only when something actually changed: while paused every tick used
		// to publish an identical-but-new snapshot, re-rendering every subscriber
		// (mini-player, player, lyrics) at 700ms for nothing. The end-detection
		// below intentionally keeps running off local vars either way.
		if (
			snapshot.playing !== playing ||
			snapshot.positionSeconds !== pos ||
			snapshot.durationSeconds !== dur
		) {
			patch({ playing, positionSeconds: pos, durationSeconds: dur });
		}

		const justStopped = lastPlaying && !playing;
		const ended = detectEnded({ dur, pos, justStopped, lastPos });
		lastPlaying = playing;
		lastPos = pos;

		if (ended && !advancing) {
			advancing = true;
			// Arm the timestamp here too: at end-of-queue (repeat off) skipToNext
			// falls through without loadCurrent, and a stale timestamp would make
			// the timeout clause settle instantly and re-fire ended every tick.
			advanceStartedAt = Date.now();
			void skipToNext(true); // auto-advance: honors repeat mode
		}
	}, 700);
}

async function ensurePlayer(): Promise<AudioPlayer> {
	if (player) return player;

	// This call (shouldPlayInBackground) is what keeps audio alive on lock — the
	// milestone's whole point. If it fails, log it and still create the player so
	// foreground playback works, rather than throwing and killing playback entirely.
	try {
		await setAudioModeAsync({
			playsInSilentMode: true,
			shouldPlayInBackground: true,
			interruptionMode: "doNotMix",
		});
	} catch (e) {
		console.error(
			"[audio] setAudioModeAsync failed — background/lock playback may not work",
			e,
		);
	}

	// keepAudioSessionActive: by default expo-audio DEACTIVATES the iOS audio
	// session when a track finishes. In the background that kills the session right
	// when auto-advance does replace()+play() for the next track, so the next track
	// is selected but never starts (lock screen shows Play, not Pause). Keeping the
	// session active across track-end lets background auto-advance actually play.
	const p = createAudioPlayer(null, { keepAudioSessionActive: true });
	// showSeek* off → iOS shows next/prev track buttons instead of ±seconds, which
	// our native RemoteControls module enables + forwards to the queue below.
	p.setActiveForLockScreen(
		true,
		{},
		{ showSeekForward: false, showSeekBackward: false },
	);
	player = p;

	// Native lock-screen next/prev → our queue (expo-audio has no next/prev).
	enableRemoteControls();
	onRemoteNext(() => void skipToNext());
	onRemotePrevious(() => void skipToPrevious());

	startPolling();
	return p;
}

async function loadCurrent(): Promise<void> {
	const song = qs.queue[qs.index];
	if (!song) return;
	const p = await ensurePlayer();
	// Keep the guard SET until the poll sees the new track's fresh position —
	// clearing it here (the old behavior) re-armed end-detection while the
	// native player could still report the previous track's tail, causing an
	// occasional double-skip on slow networks.
	advancing = true;
	advanceStartedAt = Date.now();
	lastPlaying = false;
	lastPos = 0;

	p.replace({ uri: song.streamUrl });
	p.updateLockScreenMetadata({
		title: song.title,
		artist: song.artist ?? "SunoFlow",
		artworkUrl: song.artworkUrl,
	});
	// Re-assert next/prev: expo-audio reconfigures the command center per track and
	// may disable them, so enable again after updateLockScreenMetadata.
	enableRemoteControls();
	patch({
		current: song,
		playing: true,
		positionSeconds: 0,
		durationSeconds: song.durationSeconds ?? 0,
		index: qs.index,
		queueLength: qs.queue.length,
		queue: qs.queue,
		currentIsAlternate: song.id === alternateSongId,
	});
	p.play();

	// Record the play (server-side history + active-user metric). Fire-and-forget:
	// dedupe + ownership are handled by the backend; a failure never breaks playback.
	void recordPlay(song.id).catch(() => {});
}

/** If shuffle-versions is on, swap a song for a random alternate playable version. */
async function maybeRandomVersion(
	song: Song | undefined,
): Promise<Song | undefined> {
	if (!shuffleVersions || !song) return song;
	try {
		const versions = (await fetchSongVersions(song.id)).filter(
			(v) => v.streamUrl,
		);
		if (versions.length <= 1) return song;
		return versions[Math.floor(Math.random() * versions.length)];
	} catch {
		return song; // never block playback on a versions lookup
	}
}

/** Replace the queue with `songs` and start playing at `startIndex`. */
export async function playQueue(songs: Song[], startIndex = 0): Promise<void> {
	const start = Math.max(0, Math.min(startIndex, songs.length - 1));
	// Shuffle-versions: swap the track the user starts on for a random version.
	// Applied only here (user-initiated), never in the background auto-advance path.
	const startReplacement = await maybeRandomVersion(songs[start]);
	if (startReplacement && startReplacement.id !== songs[start]?.id) {
		songs = songs.map((s, i) => (i === start ? startReplacement : s));
		alternateSongId = startReplacement.id;
	} else {
		alternateSongId = null;
	}
	const { state, effect } = queuePlayQueue(qs, songs, startIndex);
	qs = state;
	if (effect === "load") await loadCurrent();
}

/** Toggle shuffle. Keeps the current track playing; reorders what comes next. */
export function toggleShuffle(): void {
	qs = queueToggleShuffle(qs).state;
	patch({
		index: qs.index,
		queueLength: qs.queue.length,
		queue: qs.queue,
		shuffle: qs.shuffle,
	});
	SecureStore.setItemAsync(SHUFFLE_KEY, qs.shuffle ? "1" : "0").catch(() => {});
}

export function togglePlay(): void {
	if (!player) return;
	if (player.playing) {
		player.pause();
		patch({ playing: false });
	} else {
		player.play();
		patch({ playing: true });
	}
}

/**
 * Advance to the next track. `auto` = triggered by a track ending (vs. the user
 * tapping next), which is what makes repeat-one repeat instead of skip.
 */
export async function skipToNext(auto = false): Promise<void> {
	const { state, effect } = queueSkipToNext(qs, auto);
	qs = state;
	if (effect === "load") await loadCurrent();
}

export async function skipToPrevious(): Promise<void> {
	const { state, effect } = queueSkipToPrevious(qs);
	qs = state;
	if (effect === "load") await loadCurrent();
}

/** Jump to an explicit queue position (Up-Next list tap). */
export async function jumpTo(target: number): Promise<void> {
	const { state, effect } = queueJumpTo(qs, target);
	qs = state;
	if (effect === "load") await loadCurrent();
}

/**
 * Move a queued track from one position to another (Up-Next reorder). Pure list
 * change — it never touches the player, so the current track keeps playing
 * uninterrupted; `index` is re-pointed at wherever the playing track lands.
 */
export function reorderQueue(from: number, to: number): void {
	const { state } = queueReorderQueue(qs, from, to);
	if (state === qs) return; // no-op (same position or out of range)
	qs = state;
	patch({ index: qs.index, queueLength: qs.queue.length, queue: qs.queue });
}

/**
 * Remove a track from the queue. Removing the currently-playing track advances to
 * whatever shifts into its slot (or stops if the queue empties); removing a track
 * before the current one keeps `index` pointed at the same playing track.
 */
export async function removeFromQueue(target: number): Promise<void> {
	const { state, effect } = queueRemoveFromQueue(qs, target);
	if (state === qs) return; // out of range
	qs = state;

	if (effect === "stop") {
		player?.pause();
		// Reset the load guard: nothing is loading anymore, and a lingering flag
		// would suppress-then-settle stale player values over this cleared state.
		advancing = false;
		lastPlaying = false;
		lastPos = 0;
		patch({
			current: null,
			playing: false,
			index: 0,
			queueLength: 0,
			queue: qs.queue,
			positionSeconds: 0,
			durationSeconds: 0,
		});
		return;
	}
	if (effect === "load") {
		await loadCurrent(); // play whatever shifted into this slot
		return;
	}
	patch({ index: qs.index, queueLength: qs.queue.length, queue: qs.queue });
}

/** Cycle repeat mode: off → all → one → off. */
export function toggleRepeat(): void {
	qs = cycleRepeat(qs).state;
	patch({ repeat: qs.repeat });
	SecureStore.setItemAsync(REPEAT_KEY, qs.repeat).catch(() => {});
}

/** Toggle "shuffle versions" — play a random alternate version when a song starts. */
export function toggleShuffleVersions(): void {
	shuffleVersions = !shuffleVersions;
	patch({ shuffleVersions });
	SecureStore.setItemAsync(
		SHUFFLE_VERSIONS_KEY,
		shuffleVersions ? "1" : "0",
	).catch(() => {});
}

export function seekTo(seconds: number): void {
	// Clamp: waveform onSeek can yield NaN (duration 0 → divide-by-zero) or a value
	// past the end / negative. seekTo returns a Promise — catch it (unhandled
	// rejection otherwise).
	const t = clampSeek(seconds, snapshot.durationSeconds);
	if (advancing) pendingSeekTarget = t;
	player?.seekTo(t).catch((e) => console.error("[audio] seek failed", e));
	patch({ positionSeconds: t });
}
