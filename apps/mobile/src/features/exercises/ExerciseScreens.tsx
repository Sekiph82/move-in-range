import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { analyzeCameraMock, apiFetch } from "../../api";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, SecondaryLink, TextField } from "../shared/ui";

export function ExerciseLibraryScreen() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<string[]>([]);
  const exercises = useQuery({ queryKey: ["workflow-exercises", search, filters], queryFn: () => apiFetch<any>(`/exercises?page_size=24&language=en&q=${encodeURIComponent(search)}`) });
  return (
    <>
      <Panel title="Search and filters">
        <TextField label="Search exercises" value={search} onChangeText={setSearch} />
        <ChipGroup labels={["core", "back", "legs", "chair", "wall", "no floor", "favorites", "recent"]} selected={filters} onToggle={(value) => setFilters(filters.includes(value) ? filters.filter((item) => item !== value) : [...filters, value])} />
      </Panel>
      <Panel title="Library">
        {exercises.isLoading ? <LoadingState /> : null}
        {(exercises.data?.items ?? []).map((item: any) => <SecondaryLink key={item.id} href={`/exercise/${item.id}`} label={`${item.name} - ${item.body_part} - ${item.equipment}`} />)}
        {exercises.data?.items?.length === 0 ? <BodyText muted>No exercises match the current filters.</BodyText> : null}
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
  return (
    <>
      <Panel title={exercise.data?.name ?? "Exercise"}>
        {exercise.isLoading ? <LoadingState /> : null}
        <BodyText muted>{exercise.data?.instruction ?? "Loading localized instructions and safety metadata."}</BodyText>
        {(exercise.data?.instruction_steps ?? []).map((step: string, index: number) => <BodyText key={step}>{index + 1}. {step}</BodyText>)}
        <BodyText>Media status: {media.data?.media?.source_type ?? "internal fallback pending"}</BodyText>
        <BodyText>Target: {exercise.data?.target ?? "not loaded"}</BodyText>
        <ActionButton label={cameraMutation.isPending ? "Analyzing..." : "Mock privacy-first form check"} onPress={() => cameraMutation.mutate()} />
        <ErrorText error={cameraMutation.error} />
      </Panel>
      <Panel title="Approved substitutions">
        {(substitutions.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.name}</BodyText>)}
        {substitutions.data?.items?.length === 0 ? <BodyText muted>No substitution is currently approved.</BodyText> : null}
      </Panel>
    </>
  );
}
