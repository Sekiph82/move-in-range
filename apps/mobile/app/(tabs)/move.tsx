import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useState } from "react";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../src/api";
import { ExerciseMediaFrame } from "../../src/features/shared/ExerciseMediaFrame";
import type { PlanExerciseItem } from "../../src/features/shared/productTypes";
import { useTheme } from "../../src/theme";

export default function MoveScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const exercises = useQuery({ queryKey: ["exercises", query], queryFn: () => apiFetch<any>(`/exercises?q=${encodeURIComponent(query)}&language=tr&page_size=12`) });
  const items = exercises.data?.items ?? [];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <View style={{ gap: 6 }}>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "900" }}>Move</Text>
        <Text style={{ color: theme.muted, fontSize: 16 }}>Browse movement previews, details, and safer substitutions.</Text>
      </View>
      <TextInput accessibilityLabel="Search exercises" value={query} onChangeText={setQuery} placeholder="Search exercises" placeholderTextColor={theme.muted} style={{ minHeight: 48, borderColor: theme.border, borderWidth: 1, color: theme.text, padding: 12, borderRadius: 8 }} />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Exercise library", "/exercises"],
          ["Quick session", "/quick-session"],
          ["Readiness", "/readiness"]
        ].map(([label, href]) => (
          <Pressable key={href} accessibilityRole="link" onPress={() => router.push(href as never)} style={{ minHeight: 42, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
            <Text style={{ color: theme.primary, fontWeight: "800" }}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={{ gap: 12 }}>
        {exercises.isLoading ? <Text style={{ color: theme.muted }}>Loading exercises...</Text> : null}
        {items.map((exercise: PlanExerciseItem) => (
          <Pressable key={exercise.id ?? exercise.exercise_id} accessibilityLabel={`Open ${exercise.name}`} onPress={() => router.push(`/exercise/${exercise.id ?? exercise.exercise_id}` as never)} style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 12, gap: 10 }}>
            <ExerciseMediaFrame media={exercise.media} title={exercise.name} section={exercise.section} target={exercise.target ?? exercise.equipment} />
            <Text style={{ color: theme.text, fontWeight: "900", fontSize: 17 }}>{exercise.name}</Text>
            <Text style={{ color: theme.muted }}>{exercise.body_part ?? exercise.category} - {exercise.equipment} - {exercise.target}</Text>
            <Text style={{ color: exercise.media?.playable ? theme.primary : theme.muted, fontWeight: "800" }}>{exercise.media?.playable ? "Playable media" : "Guided fallback"}</Text>
          </Pressable>
        ))}
        {items.length === 0 && !exercises.isLoading ? <Text style={{ color: theme.muted }}>No exercises matched that search.</Text> : null}
      </View>
    </ScrollView>
  );
}
