export interface SelectionState {
  selectedIds: Set<string>;
  lastSelectedIndex: number | null;
}

interface ToggleSelectionParams {
  songId: string;
  songIds: string[];
  shiftKey: boolean;
  state: SelectionState;
}

export function toggleSelection({
  songId,
  songIds,
  shiftKey,
  state,
}: ToggleSelectionParams): SelectionState {
  const songIndex = songIds.findIndex((id) => id === songId);
  if (songIndex === -1) {
    return state;
  }

  const nextSelectedIds = new Set(state.selectedIds);

  if (shiftKey && state.lastSelectedIndex !== null) {
    const start = Math.min(state.lastSelectedIndex, songIndex);
    const end = Math.max(state.lastSelectedIndex, songIndex);
    for (let i = start; i <= end; i++) {
      nextSelectedIds.add(songIds[i]);
    }
  } else if (nextSelectedIds.has(songId)) {
    nextSelectedIds.delete(songId);
  } else {
    nextSelectedIds.add(songId);
  }

  return {
    selectedIds: nextSelectedIds,
    lastSelectedIndex: songIndex,
  };
}

export function toggleSelectAll(songIds: string[], selectedIds: Set<string>): SelectionState {
  if (selectedIds.size === songIds.length) {
    return { selectedIds: new Set(), lastSelectedIndex: null };
  }
  return { selectedIds: new Set(songIds), lastSelectedIndex: null };
}
