import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, FlatList, ActivityIndicator, TextInput, ActionSheetIOS, StyleSheet } from "react-native";
import { router } from "expo-router";
import { ArrowUpDown, LayoutGrid, List, SlidersHorizontal } from "lucide-react-native";
import { HttpError } from "@/api/client";
import {
  fetchSongsPage,
  type FetchSongsOptions,
  type SongSmartFilter,
  type SongSortBy,
  type SongStatus,
} from "@/api/songs";
import { playQueue } from "@/playback/controls";
import { SongRow } from "@/components/SongRow";
import { MINIPLAYER_CLEARANCE } from "@/components/MiniPlayer";
import { useTheme } from "@/theme/ThemeContext";
import type { ThemeColors } from "@/theme/theme";
import type { Song } from "@/types";

// Library: search + sort + grid/list view, with cursor-based infinite scroll.
const SORTS: { key: SongSortBy; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "highest_rated", label: "Highest Rated" },
  { key: "most_played", label: "Most Played" },
  { key: "recently_modified", label: "Recently Updated" },
  { key: "title_az", label: "Title A–Z" },
];

// Active filters threaded into fetchSongsPage. Only fields the server's
// songsQuerySchema actually supports: status, smartFilter (favorites), archived.
interface LibraryFilters {
  status?: SongStatus;
  favoritesOnly: boolean;
  archived: boolean;
}

const NO_FILTERS: LibraryFilters = { status: undefined, favoritesOnly: false, archived: false };

const STATUS_OPTIONS: { key?: SongStatus; label: string }[] = [
  { key: undefined, label: "All statuses" },
  { key: "ready", label: "Ready" },
  { key: "pending", label: "Processing" },
  { key: "failed", label: "Failed" },
];

function filtersActive(f: LibraryFilters): boolean {
  return f.status !== undefined || f.favoritesOnly || f.archived;
}

function smartFilterFor(f: LibraryFilters): SongSmartFilter | undefined {
  return f.favoritesOnly ? "favorites" : undefined;
}

export default function LibraryScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SongSortBy>("newest");
  const [filters, setFilters] = useState<LibraryFilters>(NO_FILTERS);
  const [view, setView] = useState<"list" | "grid">("list");
  const [loadingMore, setLoadingMore] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const hasMoreRef = useRef(true);
  const reqRef = useRef(0); // guards against stale pages after a new query/sort/filter

  const load = useCallback((q: string, sort: SongSortBy, filt: LibraryFilters) => {
    const req = ++reqRef.current;
    cursorRef.current = null;
    hasMoreRef.current = true;
    setSongs(null);
    setError(null);
    fetchSongsPage({
      query: q || undefined,
      sortBy: sort,
      status: filt.status,
      smartFilter: smartFilterFor(filt),
      archived: filt.archived,
    })
      .then((page) => {
        if (reqRef.current !== req) return;
        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.nextCursor !== null;
        setSongs(page.songs);
      })
      .catch((e: unknown) => {
        if (reqRef.current !== req) return;
        setError(e instanceof HttpError ? `Failed to load library (HTTP ${e.status})` : "Network error");
        console.error("[library] load failed", e);
      });
  }, []);

  useEffect(() => {
    load(query.trim(), sortBy, filters);
    // re-run when sort or filters change (search is submit-driven)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, filters]);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMoreRef.current || !cursorRef.current) return;
    const req = reqRef.current;
    setLoadingMore(true);
    const opts: FetchSongsOptions = {
      query: query.trim() || undefined,
      sortBy,
      cursor: cursorRef.current,
      status: filters.status,
      smartFilter: smartFilterFor(filters),
      archived: filters.archived,
    };
    fetchSongsPage(opts)
      .then((page) => {
        if (reqRef.current !== req) return;
        cursorRef.current = page.nextCursor;
        hasMoreRef.current = page.nextCursor !== null;
        setSongs((prev) => [...(prev ?? []), ...page.songs]);
      })
      .catch((e: unknown) => {
        console.error("[library] load more failed", e);
        hasMoreRef.current = false;
      })
      .finally(() => setLoadingMore(false));
  }, [loadingMore, query, sortBy, filters]);

  function openSort() {
    const labels = SORTS.map((s) => s.label);
    ActionSheetIOS.showActionSheetWithOptions(
      { options: [...labels, "Cancel"], cancelButtonIndex: labels.length, userInterfaceStyle: "dark" },
      (i) => {
        if (i < SORTS.length) setSortBy(SORTS[i].key);
      },
    );
  }

  function openFilters() {
    // Build a flat option list: status choices, then toggles, then reset/cancel.
    const statusLabels = STATUS_OPTIONS.map((o) =>
      o.key === filters.status ? `${o.label} ✓` : o.label,
    );
    const favLabel = filters.favoritesOnly ? "Favorites only ✓" : "Favorites only";
    const archivedLabel = filters.archived ? "Archived ✓" : "Archived";
    const options = [...statusLabels, favLabel, archivedLabel, "Reset filters", "Cancel"];
    const favIndex = STATUS_OPTIONS.length;
    const archivedIndex = favIndex + 1;
    const resetIndex = archivedIndex + 1;
    const cancelIndex = resetIndex + 1;
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: cancelIndex, userInterfaceStyle: "dark" },
      (i) => {
        if (i < STATUS_OPTIONS.length) {
          setFilters((f) => ({ ...f, status: STATUS_OPTIONS[i].key }));
        } else if (i === favIndex) {
          setFilters((f) => ({ ...f, favoritesOnly: !f.favoritesOnly }));
        } else if (i === archivedIndex) {
          setFilters((f) => ({ ...f, archived: !f.archived }));
        } else if (i === resetIndex) {
          setFilters(NO_FILTERS);
        }
      },
    );
  }

  const sortLabel = SORTS.find((s) => s.key === sortBy)?.label ?? "Newest";
  const hasFilters = filtersActive(filters);
  const filterCount =
    (filters.status !== undefined ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.archived ? 1 : 0);

  function play(list: Song[], index: number) {
    playQueue(list, index)
      .then(() => router.push("/player"))
      .catch((e) => console.error("[library] play failed", e));
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search library"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        returnKeyType="search"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => load(query.trim(), sortBy, filters)}
      />

      <View style={styles.controls}>
        <View style={styles.controlsLeft}>
          <Pressable style={styles.sortBtn} onPress={openSort}>
            <ArrowUpDown color={colors.textDim} size={16} />
            <Text style={styles.sortText}>{sortLabel}</Text>
          </Pressable>
          <Pressable
            style={[styles.sortBtn, hasFilters && styles.filterBtnActive]}
            onPress={openFilters}
          >
            <SlidersHorizontal color={hasFilters ? colors.accent : colors.textDim} size={16} />
            <Text style={[styles.sortText, hasFilters && styles.filterTextActive]}>
              {hasFilters ? `Filters · ${filterCount}` : "Filter"}
            </Text>
          </Pressable>
        </View>
        <Pressable style={styles.viewBtn} onPress={() => setView((v) => (v === "list" ? "grid" : "list"))}>
          {view === "list" ? <LayoutGrid color={colors.textDim} size={18} /> : <List color={colors.textDim} size={18} />}
        </Pressable>
      </View>

      {error ? (
        <Centered><Text style={styles.dim}>{error}</Text></Centered>
      ) : !songs ? (
        <Centered><ActivityIndicator color={colors.text} /></Centered>
      ) : songs.length === 0 ? (
        <Centered><Text style={styles.dim}>{query || hasFilters ? "No matches." : "No songs yet. Generate some on the web."}</Text></Centered>
      ) : (
        <FlatList
          key={view} // numColumns change requires a fresh list
          data={songs}
          numColumns={view === "grid" ? 2 : 1}
          columnWrapperStyle={view === "grid" ? styles.gridRow : undefined}
          keyExtractor={(s, i) => `${s.id}:${i}`}
          onEndReached={loadMore}
          onEndReachedThreshold={0.6}
          contentContainerStyle={{ paddingBottom: MINIPLAYER_CLEARANCE }}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={colors.textFaint} style={styles.footer} /> : null}
          renderItem={({ item, index }) =>
            view === "grid" ? (
              <Pressable style={styles.gridItem} onPress={() => play(songs, index)}>
                {item.artworkUrl ? (
                  <Image source={{ uri: item.artworkUrl }} style={styles.gridArt} />
                ) : (
                  <View style={[styles.gridArt, styles.gridPlaceholder]} />
                )}
                <Text style={styles.gridTitle} numberOfLines={1}>{item.title}</Text>
              </Pressable>
            ) : (
              <SongRow song={item} onPress={() => play(songs, index)} />
            )
          }
        />
      )}
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  return <View style={styles.centered}>{children}</View>;
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.bg },
    search: { backgroundColor: c.surface, color: c.text, margin: 12, marginBottom: 8, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15 },
    controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 8 },
    controlsLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
    sortBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6, paddingHorizontal: 10, backgroundColor: c.surface, borderRadius: 8 },
    sortText: { color: c.textDim, fontSize: 13 },
    filterBtnActive: { backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.accent },
    filterTextActive: { color: c.accent },
    viewBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: c.surface, borderRadius: 8 },
    centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
    dim: { color: c.textDim, fontSize: 13, marginTop: 2 },
    footer: { paddingVertical: 18 },
    gridRow: { paddingHorizontal: 12, gap: 12 },
    gridItem: { flex: 1, marginBottom: 16, maxWidth: "50%" },
    gridArt: { width: "100%", aspectRatio: 1, borderRadius: 10, backgroundColor: c.surfaceAlt },
    gridPlaceholder: { backgroundColor: c.surfaceAlt },
    gridTitle: { color: c.text, fontSize: 14, marginTop: 6 },
  });
}
