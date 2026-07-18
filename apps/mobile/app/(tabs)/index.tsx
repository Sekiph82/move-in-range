import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeSession, generateDailyPlan, logGlucose, reportPain, startSession, submitReadiness, apiFetch } from "../../src/api";
import { useTheme } from "../../src/theme";

export default function TodayScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | undefined>();
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest") });
  const plan = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<any>("/plans/daily/today") });
  const createReadiness = useMutation({ mutationFn: submitReadiness, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["readiness"] }) });
  const createPlan = useMutation({ mutationFn: () => generateDailyPlan(15), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const workout = useMutation({
    mutationFn: async () => {
      const started = await startSession(plan.data?.plan?.id);
      const id = started.session.id as string;
      setSessionId(id);
      await reportPain(id);
      await logGlucose(id);
      return completeSession(id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insights"] })
  });
  const safety = readiness.data?.item?.decision;
  const blocked = safety?.action === "BLOCK_AND_SHOW_SAFETY_MESSAGE";

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Today</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>Move safely. Learn your range.</Text>
      {readiness.isLoading ? <ActivityIndicator accessibilityLabel="Loading readiness" /> : (
        <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
          <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Readiness</Text>
          <Text style={{ color: theme.primary }}>{safety?.action ?? "Not checked today"}</Text>
          <Text style={{ color: theme.muted }}>{safety?.explanation ?? "Complete a readiness check before generating a workout."}</Text>
          <Pressable accessibilityLabel="Complete readiness check" onPress={() => createReadiness.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
            <Text style={{ color: theme.primary, fontWeight: "700" }}>{createReadiness.isPending ? "Saving..." : "Complete readiness check"}</Text>
          </Pressable>
        </View>
      )}
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Daily plan</Text>
        {plan.data?.plan ? plan.data.plan.items.map((item: any) => (
          <Text key={`${item.block}-${item.exercise_id}`} style={{ color: theme.text }}>{item.block}: {item.name} - {Math.round(item.duration_seconds / 60)} min</Text>
        )) : <Text style={{ color: theme.muted }}>No plan yet. Generate one after readiness.</Text>}
        <Pressable accessibilityLabel="Generate daily plan" disabled={blocked} onPress={() => createPlan.mutate()} style={{ minHeight: 48, justifyContent: "center", opacity: blocked ? 0.5 : 1 }}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>{blocked ? "Plan blocked by safety result" : createPlan.isPending ? "Generating..." : "Generate daily plan"}</Text>
        </Pressable>
      </View>
      <Pressable accessibilityLabel="Start guided workout" disabled={!plan.data?.plan || blocked} onPress={() => workout.mutate()} style={{ minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary, opacity: !plan.data?.plan || blocked ? 0.5 : 1 }}>
        <Text style={{ color: theme.surface, fontWeight: "700" }}>{workout.isPending ? "Recording workout..." : sessionId ? "Complete another guided workout" : "Start guided workout"}</Text>
      </Pressable>
      {workout.error ? <Text style={{ color: theme.safety }}>{String(workout.error.message)}</Text> : null}
    </ScrollView>
  );
}
