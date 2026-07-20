import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeCameraMock, apiFetch, favoriteExercise } from "../../api";
import { useTheme } from "../../theme";
import { ExerciseMediaFrame } from "../shared/ExerciseMediaFrame";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";
import { paramsFor } from "./filters";
import type { PlanExerciseItem } from "../shared/productTypes";

const bodyParts = ["waist", "upper legs", "back", "chest", "shoulders"];
const equipmentOptions = ["body weight", "chair", "wall", "band", "dumbbell"];
const targets = ["abs", "quads", "glutes", "lats", "delts"];
const positions = ["standing", "seated", "floor", "supported"];
const suitability = ["low impact", "no equipment", "joint friendly", "recovery"];

function ExerciseCard({ item }: { item: PlanExerciseItem }) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 10 }}>
      <ExerciseMediaFrame media={item.media} title={item.name} section={item.section} target={item.target ?? item.targets?.[0]} />
      <View style={{ gap: 4 }}>
        <Text style={{ color: theme.text, fontSize: 17, fontWeight: "800" }}>{item.name}</Text>
        <Text style={{ color: theme.muted }}>{item.body_part ?? item.category} - {item.equipment} - {item.target ?? item.targets?.[0]}</Text>
        <Text style={{ color: theme.muted }}>{item.position ?? "standing"} - {item.difficulty ?? "gentle"} - {item.impact ?? "low"} impact</Text>
      </View>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <SecondaryLink href={`/exercise/${item.id ?? item.exercise_id}`} label="Open detail" />
        <Text style={{ color: item.media?.playable ? theme.primary : theme.muted, fontWeight: "700" }}>{item.media?.playable ? "Playable" : "Fallback"}</Text>
      </View>
    </View>
  );
}
export function ExerciseLibraryScreen() {
  const [search, setSearch] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [target, setTarget] = useState("");
  const [selectedPosition, setSelectedPosition] = useState("");
  const [page, setPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);
  const queryString = paramsFor(debouncedSearch, bodyPart, equipment, target, page);
  const exercises = useQuery({ queryKey: ["workflow-exercises", queryString], queryFn: () => apiFetch<any>(`/exercises?${queryString}`) });
  const items = (exercises.data?.items ?? []).filter((item: PlanExerciseItem) => !selectedPosition || item.position === selectedPosition);
  const resetFilters = () => {
    setSearch("");
    setBodyPart("");
    setEquipment("");
    setTarget("");
    setSelectedPosition("");
    setPage(1);
  };
  return (
    <>
      <Panel title="Visual exercise library">
        <TextField label="Search exercises" value={search} onChangeText={setSearch} />
        <ChipGroup labels={bodyParts} selected={bodyPart ? [bodyPart] : []} onToggle={(value) => { setBodyPart(bodyPart === value ? "" : value); setPage(1); }} />
        <ChipGroup labels={equipmentOptions} selected={equipment ? [equipment] : []} onToggle={(value) => { setEquipment(equipment === value ? "" : value); setPage(1); }} />
        <ChipGroup labels={targets} selected={target ? [target] : []} onToggle={(value) => { setTarget(target === value ? "" : value); setPage(1); }} />
        <ChipGroup labels={positions} selected={selectedPosition ? [selectedPosition] : []} onToggle={(value) => setSelectedPosition(selectedPosition === value ? "" : value)} />
        <ChipGroup labels={suitability} selected={[]} onToggle={() => undefined} />
        <ActionButton label="Reset filters" onPress={resetFilters} />
      </Panel>
      <Panel title="Movement results">
        {exercises.isLoading ? <LoadingState /> : null}
        <FlatList
          data={items}
          keyExtractor={(item: any) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          renderItem={({ item }: { item: any }) => <ExerciseCard item={item} />}
        />
        {items.length === 0 && !exercises.isLoading ? <BodyText muted>No exercises match the current filters.</BodyText> : null}
        <BodyText muted>Page {exercises.data?.pagination?.page ?? page} of {Math.max(1, Math.ceil((exercises.data?.pagination?.total ?? 0) / 24))}</BodyText>
        <ActionButton label="Load more" disabled={(exercises.data?.pagination?.page ?? page) * 24 >= (exercises.data?.pagination?.total ?? 0)} onPress={() => setPage(page + 1)} />
      </Panel>
    </>
  );
}

export function ExerciseDetailScreen({ id }: { id?: string }) {
  const theme = useTheme();
  const list = useQuery({ queryKey: ["workflow-exercises"], enabled: !id, queryFn: () => apiFetch<any>("/exercises?page_size=1&language=en") });
  const exerciseId = id ?? list.data?.items?.[0]?.id;
  const exercise = useQuery({ queryKey: ["workflow-exercise", exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}?language=en`) });
  const substitutions = useQuery({ queryKey: ["substitutions", exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}/substitutions`) });
  const media = useQuery({ queryKey: ["media", exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}/media-resolution?language=en&reduced_motion=false&low_bandwidth=false`) });
  const cameraMutation = useMutation({ mutationFn: () => analyzeCameraMock({ exercise_id: exerciseId ?? "exercise", privacy_mode: "session_only", camera_consent: true }) });
  const favoriteMutation = useMutation({ mutationFn: () => favoriteExercise(exerciseId ?? "") });
  const mediaPayload = media.data?.media ?? exercise.data?.media;
  return (
    <>
      <Panel title={exercise.data?.name ?? "Exercise detail"}>
        {exercise.isLoading ? <LoadingState /> : null}
        <ExerciseMediaFrame media={mediaPayload} title={exercise.data?.name ?? "Exercise"} section={exercise.data?.body_part} target={exercise.data?.target} size="hero" />
        <BodyText muted>{exercise.data?.instruction ?? "Loading localized instructions and safety metadata."}</BodyText>
        <View style={{ gap: 6 }}>
          {(exercise.data?.instruction_steps ?? []).map((step: string, index: number) => <BodyText key={`${index}-${step}`}>{index + 1}. {step}</BodyText>)}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {[exercise.data?.body_part, exercise.data?.target, exercise.data?.equipment, mediaPayload?.playable ? "playable media" : "guided fallback"].filter(Boolean).map((label: string) => (
            <View key={label} style={{ borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text style={{ color: theme.text, fontWeight: "700" }}>{label}</Text>
            </View>
          ))}
        </View>
        <BodyText>Breathing: Breathe steadily and avoid holding your breath.</BodyText>
        <BodyText>Mistakes to avoid: moving too quickly, forcing range, ignoring increasing pain.</BodyText>
        <BodyText muted>Stop if symptoms appear or pain changes sharply. This is movement guidance, not diagnosis or treatment advice.</BodyText>
        <ActionButton label={cameraMutation.isPending ? "Checking form guidance..." : "Demo form guidance"} onPress={() => cameraMutation.mutate()} />
        <ActionButton label={favoriteMutation.isPending ? "Saving..." : "Save favorite"} disabled={!exerciseId} onPress={() => favoriteMutation.mutate()} />
        <ErrorText error={cameraMutation.error ?? favoriteMutation.error} />
      </Panel>
      <Panel title="Substitutions">
        <View style={{ gap: 10 }}>
          {(substitutions.data?.items ?? []).map((item: any) => <ExerciseCard key={item.id} item={item} />)}
          {substitutions.data?.items?.length === 0 ? <BodyText muted>No substitution is currently approved.</BodyText> : null}
        </View>
      </Panel>
    </>
  );
}
