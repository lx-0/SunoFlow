// Thin delegates around the shared @sunoflow/core queue machine. The web
// queue state lives in React state/refs (QueueContext) rather than a held
// machine state, so each helper builds a transient QueueState, runs the core
// transition, and maps the result back to the web's { queue, currentIndex }
// shape. Web-only edges the core machine does not model (empty queue →
// playIndex -1, "nothing playing" currentIndex -1) are guarded here.
import {
	createQueueState,
	fisherYatesShuffle,
	playQueue,
	removeFromQueue,
	reorderQueue,
	toggleShuffle,
} from "@sunoflow/core";
import type { QueueSong } from "@/components/queue/playback-state";
import { getCurrentQueueSong } from "@/components/queue/queue-selectors";

export { fisherYatesShuffle };

export function buildPlayQueue(
	songs: QueueSong[],
	startIndex: number,
	shuffle: boolean,
): { playOrder: QueueSong[]; playIndex: number } {
	if (songs.length === 0) {
		return { playOrder: [], playIndex: -1 };
	}
	const { state } = playQueue(
		createQueueState<QueueSong>({ shuffle }),
		songs,
		startIndex,
	);
	return { playOrder: state.queue, playIndex: state.index };
}

export function toggleShuffleQueue(
	queue: QueueSong[],
	currentIndex: number,
	nextShuffle: boolean,
	originalQueue: QueueSong[],
): { queue: QueueSong[]; currentIndex: number } {
	if (queue.length <= 1) {
		return { queue, currentIndex };
	}

	const currentSong = getCurrentQueueSong(queue, currentIndex);

	// Nothing playing: the core machine would re-anchor to index 0; the web keeps
	// its currentIndex (usually -1) and simply shuffles / leaves the list as-is.
	if (!currentSong) {
		return nextShuffle
			? { queue: fisherYatesShuffle(queue), currentIndex }
			: { queue, currentIndex };
	}
	if (!nextShuffle && originalQueue.length === 0) {
		return { queue, currentIndex };
	}

	// Shuffle ON stays local with an INDEX filter: the core machine filters the
	// rest by the current song's id, which would silently drop duplicate queue
	// entries of the playing song (reachable via "Add to queue"/"Play next").
	if (nextShuffle) {
		const rest = fisherYatesShuffle(queue.filter((_, i) => i !== currentIndex));
		return { queue: [currentSong, ...rest], currentIndex: 0 };
	}

	const { state } = toggleShuffle(
		createQueueState<QueueSong>({
			queue,
			originalQueue,
			index: currentIndex,
			shuffle: true,
		}),
	);
	return { queue: state.queue, currentIndex: state.index };
}

export function insertAfterCurrent(
	queue: QueueSong[],
	currentIndex: number,
	song: QueueSong,
): QueueSong[] {
	const next = [...queue];
	next.splice(currentIndex + 1, 0, song);
	return next;
}

export function removeFromQueueState(
	queue: QueueSong[],
	currentIndex: number,
	removeIndex: number,
): { queue: QueueSong[]; currentIndex: number; removedCurrent: boolean } {
	const { state } = removeFromQueue(
		createQueueState<QueueSong>({ queue, index: currentIndex }),
		removeIndex,
	);
	if (state.queue === queue) {
		return { queue, currentIndex, removedCurrent: false }; // out of range
	}
	const removedCurrent = removeIndex === currentIndex;
	// The web signals "current removed" via currentIndex -1, not a clamped index
	// like the core machine (the caller stops playback itself). A queue emptied
	// WITHOUT removing the current track (nothing was playing) keeps currentIndex.
	const nextIndex = removedCurrent
		? -1
		: state.queue.length === 0
			? currentIndex
			: state.index;
	return { queue: state.queue, currentIndex: nextIndex, removedCurrent };
}

export function reorderQueueState(
	queue: QueueSong[],
	currentIndex: number,
	fromIndex: number,
	toIndex: number,
): { queue: QueueSong[]; currentIndex: number } {
	const { state } = reorderQueue(
		createQueueState<QueueSong>({ queue, index: currentIndex }),
		fromIndex,
		toIndex,
	);
	return { queue: state.queue, currentIndex: state.index };
}
