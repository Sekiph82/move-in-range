import { useEffect, useState } from "react";
import { FlatList } from "react-native";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeCameraMock, apiFetch, favoriteExercise } from "../../api";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";
import { paramsFor } from "./filters";

const bodyParts = ["waist", "upper legs", "back", "chest", "shoulders"];
const equipmentOptions = ["body weight", "chair", "wall", "band", "dumbbell"];
const targets = ["abs", "quads", "glutes", "lats", "delts"];

export function ExerciseLibraryScreen() {
  const [search, setSearch] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [equipment, setEquipment] = useState("");
  const [target, setTarget] = useState("");
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
  const resetFilters = () => {
    setSearch("");
    setBodyPart("");
    setEquipment("");
    setTarget("");
    setPage(1);
  };
  return (
    <>
      <Panel title="Search and filters">
        <TextField label="Search exercises" value={search} onChangeText={setSearch} />
        <BodyText muted>Every visible filter changes the exercise API request.</BodyText>
        <ChipGroup labels={bodyParts} selected={bodyPart ? [bodyPart] : []} onToggle={(value) => { setBodyPart(bodyPart === value ? "" : value); setPage(1); }} />
        <ChipGroup labels={equipmentOptions} selected={equipment ? [equipment] : []} onToggle={(value) => { setEquipment(equipment === value ? "" : value); setPage(1); }} />
        <ChipGroup labels={targets} selected={target ? [target] : []} onToggle={(value) => { setTarget(target === value ? "" : value); setPage(1); }} />
        <ActionButton label="Reset filters" onPress={resetFilters} />
      </Panel>
      <Panel title="Library">
        {exercises.isLoading ? <LoadingState /> : null}
        <FlatList
          data={exercises.data?.items ?? []}
          keyExtractor={(item: any) => item.id}
          scrollEnabled={false}
          renderItem={({ item }: { item: any }) => <SecondaryLink href={`/exercise/${item.id}`} label={`${item.name} - ${item.body_part} - ${item.equipment}`} />}
        />
        {exercises.data?.items?.length === 0 ? <BodyText muted>No exercises match the current filters.</BodyText> : null}
        <BodyText muted>Page {exercises.data?.pagination?.page ?? page} of {Math.max(1, Math.ceil((exercises.data?.pagination?.total ?? 0) / 24))}</BodyText>
        <ActionButton label="Load more" disabled={(exercises.data?.pagination?.page ?? page) * 24 >= (exercises.data?.pagination?.total ?? 0)} onPress={() => setPage(page + 1)} />
      </Panel>
    </>
  );
}

export function ExerciseDetailScreen({ id }: { id?: string }) {
  const list = useQuery({ queryKey: ["workflow-exercises"], enabled: !id, queryFn: () => apiFetch<any>("/exercises?page_size=1&language=en") });
  const exerciseId = id ?? list.data?.items?.[0]?.id;
  const exercise = useQuery({ queryKey: ["workflow-exercise", exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}?language=en`) });
  const substitutions = useQuery({ queryKey: ["substitutions", exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}/substitutions`) });
  const media = useQuery({ queryKey: ["media", exerciseId], enabled: Boolean(exerciseId), queryFn: () => apiFetch<any>(`/exercises/${exerciseId}/media-resolution?language=en&reduced_motion=false&low_bandwidth=false`) });
  const cameraMutation = useMutation({ mutationFn: () => analyzeCameraMock({ exercise_id: exerciseId ?? "exercise", privacy_mode: "session_only", camera_consent: true }) });
  const favoriteMutation = useMutation({ mutationFn: () => favoriteExercise(exerciseId ?? "") });
  const mediaState = media.data?.media?.source_type === "internal_silhouette_animation" ? "Silhouette guidance available" : "Form guidance unavailable on this device";
  return (
    <>
      <Panel title={exercise.data?.name ?? "Exercise"}>
        {exercise.isLoading ? <LoadingState /> : null}
        <BodyText muted>{exercise.data?.instruction ?? "Loading localized instructions and safety metadata."}</BodyText>
        {(exercise.data?.instruction_steps ?? []).map((step: string, index: number) => <BodyText key={step}>{index + 1}. {step}</BodyText>)}
        <BodyText>Media: {mediaState}</BodyText>
        <BodyText>Target muscles: {exercise.data?.target ?? "Loading target muscles"}</BodyText>
        <BodyText>Secondary muscles: {(exercise.data?.secondary_muscles ?? []).join(", ") || "No secondary muscles listed"}</BodyText>
        <BodyText>Equipment: {exercise.data?.equipment ?? "Loading equipment"}</BodyText>
        <BodyText muted>Move with control, breathe steadily, and stop if pain changes sharply.</BodyText>
        <ActionButton label={cameraMutation.isPending ? "Checking form guidance..." : "Demo form guidance"} onPress={() => cameraMutation.mutate()} />
        <ActionButton label={favoriteMutation.isPending ? "Saving..." : "Save favorite"} disabled={!exerciseId} onPress={() => favoriteMutation.mutate()} />
        <ErrorText error={cameraMutation.error ?? favoriteMutation.error} />
      </Panel>
      <Panel title="Approved substitutions">
        {(substitutions.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.name}</BodyText>)}
        {substitutions.data?.items?.length === 0 ? <BodyText muted>No substitution is currently approved.</BodyText> : null}
      </Panel>
    </>
  );
}
