import { Pressable, ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, generateDailyPlan, generateMonthlyPlan, generateWeeklyPlan } from "../../src/api";
import { ExerciseMediaFrame } from "../../src/features/shared/ExerciseMediaFrame";
import type { MonthWeek, MovementPlan, ProgramDay } from "../../src/features/shared/productTypes";
import { useTheme } from "../../src/theme";

export default function ProgramTab() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => apiFetch<{ plan: { days?: ProgramDay[] } | null }>("/plans/weekly/current") });
  const monthly = useQuery({ queryKey: ["monthly"], queryFn: () => apiFetch<{ plan: { weeks?: MonthWeek[] } | null }>("/plans/monthly/current") });
  const makeDaily = useMutation({ mutationFn: () => generateDailyPlan(15), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["today-plan"] }) });
  const makeWeekly = useMutation({ mutationFn: generateWeeklyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["weekly"] }) });
  const makeMonthly = useMutation({ mutationFn: generateMonthlyPlan, onSuccess: () => queryClient.invalidateQueries({ queryKey: ["monthly"] }) });
  const first = daily.data?.plan?.items?.[0];
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "900" }}>Program</Text>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Today program</Text>
        {first ? <ExerciseMediaFrame media={first.media} title={first.name} section={first.section} target={first.equipment} /> : null}
        <Text style={{ color: theme.muted }}>{daily.data?.plan ? `${daily.data.plan.total_minutes ?? 0} minutes, ${daily.data.plan.items?.length ?? 0} movements` : "No daily session saved."}</Text>
        <Pressable accessibilityRole="button" onPress={() => daily.data?.plan ? router.push("/daily-plan" as never) : makeDaily.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{daily.data?.plan ? "Open today" : makeDaily.isPending ? "Generating..." : "Generate today"}</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Seven-day plan</Text>
        {(weekly.data?.plan?.days ?? []).map((day) => <Text key={`${day.day}-${day.date}`} style={{ color: theme.text }}>{day.day}: {day.status} - {day.focus} - {day.duration_minutes ?? 0} min</Text>)}
        {!weekly.data?.plan ? <Text style={{ color: theme.muted }}>No week saved yet.</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => weekly.data?.plan ? router.push("/weekly-plan" as never) : makeWeekly.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{weekly.data?.plan ? "Open week" : makeWeekly.isPending ? "Generating..." : "Generate week"}</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Four-week progression</Text>
        {(monthly.data?.plan?.weeks ?? []).map((week) => <Text key={week.week} style={{ color: theme.text }}>Week {week.week}: {week.phase} - {week.status ?? "planned"}</Text>)}
        {!monthly.data?.plan ? <Text style={{ color: theme.muted }}>No four-week program saved yet.</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => monthly.data?.plan ? router.push("/monthly-plan" as never) : makeMonthly.mutate()} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{monthly.data?.plan ? "Open month" : makeMonthly.isPending ? "Generating..." : "Generate month"}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
