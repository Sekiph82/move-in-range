import { useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../src/api";
import { useTheme } from "../../src/theme";

export default function MoveScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | undefined>();
  const exercises = useQuery({ queryKey: ["exercises", query], queryFn: () => apiFetch<any>(`/exercises?q=${encodeURIComponent(query)}&language=tr&page_size=15`) });
  const detail = useQuery({ queryKey: ["exercise", selected], enabled: Boolean(selected), queryFn: () => apiFetch<any>(`/exercises/${selected}?language=tr`) });
  const media = useQuery({ queryKey: ["exercise-media", selected], enabled: Boolean(selected), queryFn: () => apiFetch<any>(`/exercises/${selected}/media-resolution?language=tr&reduced_motion=false&low_bandwidth=false`) });
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Move</Text>
      <TextInput accessibilityLabel="Search exercises" value={query} onChangeText={setQuery} placeholder="Search exercises" placeholderTextColor={theme.muted} style={{ minHeight: 48, borderColor: theme.border, borderWidth: 1, color: theme.text, padding: 12, borderRadius: 8 }} />
      <View style={{ gap: 8 }}>
        {exercises.isLoading ? <Text style={{ color: theme.muted }}>Loading exercises...</Text> : null}
        {exercises.data?.items?.map((exercise: any) => (
          <Pressable key={exercise.id} accessibilityLabel={`Open ${exercise.name}`} onPress={() => setSelected(exercise.id)} style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 14 }}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>{exercise.name}</Text>
            <Text style={{ color: theme.muted }}>{exercise.body_part} - {exercise.equipment} - {exercise.target}</Text>
          </Pressable>
        ))}
        {exercises.data?.items?.length === 0 ? <Text style={{ color: theme.muted }}>No exercises matched that search.</Text> : null}
      </View>
      {detail.data ? (
        <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>{detail.data.name}</Text>
          <Text style={{ color: theme.muted }}>{detail.data.instruction}</Text>
          {detail.data.instruction_steps.map((step: string, index: number) => <Text key={step} style={{ color: theme.text }}>{index + 1}. {step}</Text>)}
          <Text style={{ color: theme.muted }}>Attribution: {detail.data.media?.attribution || "No committed media; external license required."}</Text>
          <Text style={{ color: theme.muted }}>Media: {media.data?.media?.source_type ?? "Resolving fallback"} - {media.data?.media?.prefetch_policy ?? "current and next only"}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
