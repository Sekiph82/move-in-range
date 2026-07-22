import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, useWindowDimensions, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { analyzeCameraMock, apiFetch, favoriteExercise, unfavoriteExercise } from "../../api";
import { useTheme } from "../../theme";
import { ExerciseMediaFrame } from "../shared/ExerciseMediaFrame";
import { ActionButton, BodyText, ChoiceChip, ErrorText, LoadingState, Panel } from "../shared/ui";
import { paramsFor } from "./filters";
import { addRecentExercise, emptyExerciseFilters, loadCachedExercisePage, loadExerciseFilters, loadRecentExercises, saveCachedExercisePage, saveExerciseFilters, type ExerciseFilters } from "./exerciseCache";
import type { PlanExerciseItem } from "../shared/productTypes";

type ExerciseListResponse = {
  items: PlanExerciseItem[];
  pagination: { page: number; page_size: number; total: number };
  filter_options?: Record<string, string[]>;
  cached_at?: string;
};

function optionLabels(options: string[] | undefined, fallback: string[]) {
  return (options?.length ? options : fallback).slice(0, 18);
}

function chipLabel(value: string) {
  return value.replaceAll("_", " ");
}

function activeFilterCount(filters: ExerciseFilters) {
  return Object.entries(filters).filter(([key, value]) => key !== "q" && Boolean(value)).length;
}

function ExerciseCard({ item, onToggleFavorite }: { item: PlanExerciseItem; onToggleFavorite: (item: PlanExerciseItem) => void }) {
  const theme = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const id = item.id ?? item.exercise_id;
  const twoColumn = width >= 360 && fontScale < 1.25;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.name}. ${item.target ?? item.targets?.[0] ?? "Movement"} using ${item.equipment ?? "available equipment"}.`}
      onPress={() => {
        void addRecentExercise({ id, name: item.name, media: item.media, target: item.target ?? item.targets?.[0], equipment: item.equipment });
        router.push(`/exercise/${id}` as never);
      }}
      style={{ width: twoColumn ? "48%" : "100%", minHeight: 246, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 10, gap: 8 }}
    >
      <ExerciseMediaFrame media={item.media} title={item.name} section={item.body_part ?? item.category} target={item.target ?? item.targets?.[0]} animated={false} />
      <View style={{ gap: 4, flex: 1 }}>
        <Text numberOfLines={2} style={{ color: theme.text, fontSize: 15, fontWeight: "900" }}>{item.name}</Text>
        <Text numberOfLines={1} style={{ color: theme.muted }}>{item.target ?? item.targets?.[0] ?? item.body_part}</Text>
        <Text numberOfLines={1} style={{ color: theme.muted }}>{item.equipment ?? "equipment varies"}</Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.favorited ? `Remove ${item.name} from favorites` : `Add ${item.name} to favorites`}
        onPress={(event) => {
          event.stopPropagation();
          onToggleFavorite(item);
        }}
        style={{ position: "absolute", right: 16, top: 16, width: 40, height: 40, alignItems: "center", justifyContent: "center", borderRadius: 20, backgroundColor: item.favorited ? `${theme.primary}ee` : `${theme.surface}ee`, borderColor: theme.border, borderWidth: 1 }}
      >
        <Feather name="heart" color={item.favorited ? theme.surface : theme.text} size={18} />
      </Pressable>
    </Pressable>
  );
}

function FilterGroup({ title, values, selected, onSelect }: { title: string; values: string[]; selected: string; onSelect: (value: string) => void }) {
  return (
    <View style={{ gap: 8 }}>
      <BodyText>{title}</BodyText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {values.map((value) => <ChoiceChip key={value} label={chipLabel(value)} selected={selected === value} onPress={() => onSelect(selected === value ? "" : value)} />)}
      </View>
    </View>
  );
}

function FilterSheet({ visible, options, filters, onApply, onClose }: { visible: boolean; options: Record<string, string[]>; filters: ExerciseFilters; onApply: (filters: ExerciseFilters) => void; onClose: () => void }) {
  const theme = useTheme();
  const [draft, setDraft] = useState(filters);
  useEffect(() => setDraft(filters), [filters, visible]);
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "#0008" }}>
        <View style={{ maxHeight: "88%", backgroundColor: theme.background, borderTopLeftRadius: 8, borderTopRightRadius: 8, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Filters</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ color: theme.primary, fontWeight: "800" }}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={{ gap: 16 }}>
            <FilterGroup title="Body area" values={optionLabels(options.body_part, ["waist", "upper legs", "back", "chest", "shoulders"])} selected={draft.body_part} onSelect={(body_part) => setDraft({ ...draft, body_part })} />
            <FilterGroup title="Equipment" values={optionLabels(options.equipment, ["body weight", "chair", "wall", "band", "dumbbell"])} selected={draft.equipment} onSelect={(equipment) => setDraft({ ...draft, equipment })} />
            <FilterGroup title="Target muscle" values={optionLabels(options.target, ["abs", "quads", "glutes", "lats", "delts"])} selected={draft.target} onSelect={(target) => setDraft({ ...draft, target })} />
            <FilterGroup title="Position" values={optionLabels(options.position, ["standing", "seated", "floor", "supported"])} selected={draft.position} onSelect={(position) => setDraft({ ...draft, position })} />
            <FilterGroup title="Difficulty" values={optionLabels(options.difficulty, ["gentle", "moderate", "advanced"])} selected={draft.difficulty} onSelect={(difficulty) => setDraft({ ...draft, difficulty })} />
            <FilterGroup title="Impact" values={optionLabels(options.impact, ["low", "moderate", "high"])} selected={draft.impact} onSelect={(impact) => setDraft({ ...draft, impact })} />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              <ChoiceChip label="Bodyweight" selected={draft.bodyweight} onPress={() => setDraft({ ...draft, bodyweight: !draft.bodyweight })} />
              <ChoiceChip label="Favorites" selected={draft.favorites} onPress={() => setDraft({ ...draft, favorites: !draft.favorites })} />
            </View>
          </ScrollView>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <ActionButton label="Reset" onPress={() => setDraft(emptyExerciseFilters)} />
            </View>
            <View style={{ flex: 1 }}>
              <ActionButton label={`Apply (${activeFilterCount(draft)})`} onPress={() => onApply(draft)} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function ExerciseLibraryScreen() {
  const theme = useTheme();
  const { fontScale, width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ExerciseFilters>(emptyExerciseFilters);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [filterVisible, setFilterVisible] = useState(false);
  const [cachedPayload, setCachedPayload] = useState<ExerciseListResponse | null>(null);
  const [recents, setRecents] = useState<PlanExerciseItem[]>([]);
  const params = useMemo(() => paramsFor({ ...filters, q: filters.q }, page, 24, "en"), [filters, page]);
  const exercises = useQuery({ queryKey: ["workflow-exercises", params], queryFn: () => apiFetch<ExerciseListResponse>(`/exercises?${params}`) });
  const payload = exercises.data ?? cachedPayload;
  const items = payload?.items ?? [];
  const total = payload?.pagination?.total ?? 0;
  const twoColumn = width >= 360 && fontScale < 1.25;

  useEffect(() => {
    void loadExerciseFilters().then((saved) => {
      setFilters(saved);
      setSearchText(saved.q);
    });
    void loadRecentExercises().then((saved) => setRecents(saved as PlanExerciseItem[]));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((current) => ({ ...current, q: searchText }));
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchText]);

  useEffect(() => {
    void saveExerciseFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (exercises.data) {
      void saveCachedExercisePage(params, exercises.data as unknown as Record<string, unknown>);
      setCachedPayload(exercises.data);
    }
  }, [exercises.data, params]);

  useEffect(() => {
    if (exercises.error) {
      void loadCachedExercisePage(params).then((cached) => setCachedPayload(cached as ExerciseListResponse | null));
    }
  }, [exercises.error, params]);

  const favoriteMutation = useMutation({
    mutationFn: (item: PlanExerciseItem) => item.favorited ? unfavoriteExercise(item.id ?? item.exercise_id) : favoriteExercise(item.id ?? item.exercise_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-exercises"] })
  });

  return (
    <View style={{ gap: 14 }}>
      <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "900" }}>Exercise Library</Text>
        <Text style={{ color: theme.muted, fontSize: 15 }}>Search the full movement catalog with media-aware cards and accessible instruction fallbacks.</Text>
      </View>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <TextInput
          accessibilityLabel="Search exercises"
          value={searchText}
          onChangeText={setSearchText}
          placeholder="Search name, target, equipment"
          placeholderTextColor={theme.muted}
          style={{ flex: 1, minHeight: 48, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, color: theme.text, backgroundColor: theme.surface }}
        />
        {searchText ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearchText("")} style={{ minWidth: 48, minHeight: 48, borderRadius: 8, borderColor: theme.border, borderWidth: 1, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: theme.primary, fontWeight: "900" }}>X</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <Text accessibilityLiveRegion="polite" style={{ color: theme.muted }}>{total} results{cachedPayload?.cached_at && exercises.error ? " - cached" : ""}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`Open filters. ${activeFilterCount(filters)} active.`} onPress={() => setFilterVisible(true)} style={{ minHeight: 44, borderRadius: 8, borderColor: theme.border, borderWidth: 1, justifyContent: "center", paddingHorizontal: 12, backgroundColor: theme.surface }}>
          <Text style={{ color: theme.primary, fontWeight: "900" }}>Filters ({activeFilterCount(filters)})</Text>
        </Pressable>
      </View>
      {recents.length ? (
        <Panel title="Recently viewed">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {recents.slice(0, 8).map((item) => (
              <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`Open recently viewed ${item.name}`} onPress={() => router.push(`/exercise/${item.id}` as never)} style={{ width: 160, gap: 8 }}>
                <ExerciseMediaFrame media={item.media as any} title={item.name} target={item.target} animated={false} />
                <Text numberOfLines={2} style={{ color: theme.text, fontWeight: "800" }}>{item.name}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </Panel>
      ) : null}
      {exercises.isLoading && !cachedPayload ? <LoadingState label="Loading exercise library" /> : null}
      {exercises.error && !cachedPayload ? <ErrorText error={exercises.error} /> : null}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id ?? item.exercise_id}
        key={twoColumn ? "exercise-grid" : "exercise-list"}
        numColumns={twoColumn ? 2 : 1}
        columnWrapperStyle={twoColumn ? { justifyContent: "space-between", gap: 10 } : undefined}
        contentContainerStyle={{ gap: 10, paddingBottom: 88 }}
        scrollEnabled={false}
        refreshControl={<RefreshControl refreshing={exercises.isRefetching} onRefresh={() => exercises.refetch()} />}
        renderItem={({ item }) => <ExerciseCard item={item} onToggleFavorite={(exercise) => favoriteMutation.mutate(exercise)} />}
        ListEmptyComponent={!exercises.isLoading ? <BodyText muted>No exercises match the current search and filters.</BodyText> : null}
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <ActionButton label="Previous" disabled={page <= 1} onPress={() => setPage(Math.max(1, page - 1))} />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton label="Next" disabled={page * 24 >= total} onPress={() => setPage(page + 1)} />
        </View>
      </View>
      <FilterSheet
        visible={filterVisible}
        options={payload?.filter_options ?? {}}
        filters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={(next) => {
          setFilters(next);
          setSearchText(next.q);
          setPage(1);
          setFilterVisible(false);
        }}
      />
    </View>
  );
}

export function ExerciseDetailScreen({ id }: { id?: string }) {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const list = useQuery({ queryKey: ["workflow-exercises", "detail-fallback"], enabled: !id, queryFn: () => apiFetch<ExerciseListResponse>("/exercises?page_size=1&language=en") });
  const exerciseId = id ?? list.data?.items?.[0]?.id;
  const exercise = useQuery({ queryKey: ["workflow-exercise", exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}?language=en`) });
  const cameraMutation = useMutation({ mutationFn: () => analyzeCameraMock({ exercise_id: exerciseId ?? "exercise", privacy_mode: "session_only", camera_consent: true }) });
  const favoriteMutation = useMutation({
    mutationFn: () => exercise.data?.favorited ? unfavoriteExercise(exerciseId ?? "") : favoriteExercise(exerciseId ?? ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-exercise", exerciseId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-exercises"] });
    }
  });
  const relatedFavoriteMutation = useMutation({
    mutationFn: (item: PlanExerciseItem) => item.favorited ? unfavoriteExercise(item.id ?? item.exercise_id) : favoriteExercise(item.id ?? item.exercise_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflow-exercise", exerciseId] });
      queryClient.invalidateQueries({ queryKey: ["workflow-exercises"] });
    }
  });
  useEffect(() => {
    if (exercise.data?.id) {
      void addRecentExercise({ id: exercise.data.id, name: exercise.data.name, media: exercise.data.media, target: exercise.data.target, equipment: exercise.data.equipment });
    }
  }, [exercise.data]);
  return (
    <View style={{ gap: 14 }}>
      <Panel title={exercise.data?.name ?? "Exercise detail"}>
        {exercise.isLoading ? <LoadingState /> : null}
        <ExerciseMediaFrame media={exercise.data?.media} title={exercise.data?.name ?? "Exercise"} section={exercise.data?.body_part} target={exercise.data?.target} size="hero" animated />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[exercise.data?.body_part, exercise.data?.target, exercise.data?.equipment, exercise.data?.media?.playable ? "Motion preview" : "Instruction fallback"].filter(Boolean).map((label: string) => (
            <View key={label} style={{ borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{chipLabel(label)}</Text>
            </View>
          ))}
        </View>
        <BodyText muted>{exercise.data?.instruction ?? "Loading localized instructions and safety metadata."}</BodyText>
        <View style={{ gap: 8 }}>
          {(exercise.data?.instruction_steps ?? []).map((step: string, index: number) => <BodyText key={`${index}-${step}`}>{index + 1}. {step}</BodyText>)}
        </View>
        <BodyText>Breathing: Breathe steadily and avoid holding your breath.</BodyText>
        <BodyText muted>Stop if symptoms appear or pain changes sharply. This is movement guidance, not diagnosis or treatment advice.</BodyText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <ActionButton label={exercise.data?.favorited ? "Remove favorite" : "Save favorite"} disabled={!exerciseId || favoriteMutation.isPending} onPress={() => favoriteMutation.mutate()} />
          </View>
          <View style={{ flex: 1 }}>
            <ActionButton label="Form guidance" disabled={cameraMutation.isPending} onPress={() => cameraMutation.mutate()} />
          </View>
        </View>
        <ErrorText error={cameraMutation.error ?? favoriteMutation.error ?? exercise.error} />
      </Panel>
      <Panel title={exercise.data?.safe_alternatives_label ?? "Related movements"}>
        <FlatList
          data={exercise.data?.related_exercises ?? []}
          keyExtractor={(item: PlanExerciseItem) => item.id ?? item.exercise_id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", gap: 10 }}
          contentContainerStyle={{ gap: 10 }}
          scrollEnabled={false}
          renderItem={({ item }) => <ExerciseCard item={item} onToggleFavorite={(exerciseItem) => relatedFavoriteMutation.mutate(exerciseItem)} />}
          ListEmptyComponent={<BodyText muted>No related movement is currently available.</BodyText>}
        />
      </Panel>
    </View>
  );
}
