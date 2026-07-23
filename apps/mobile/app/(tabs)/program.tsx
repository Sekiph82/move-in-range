import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../src/api";
import { ExerciseMediaFrame } from "../../src/features/shared/ExerciseMediaFrame";
import type { MonthlyPlan, MovementPlan, ProgramDay, WeeklyPlan } from "../../src/features/shared/productTypes";
import { useTheme } from "../../src/theme";
import { TabScreenScroll } from "../../src/features/shared/ui";

export default function ProgramTab() {
  const theme = useTheme();
  const daily = useQuery({ queryKey: ["today-plan"], queryFn: () => apiFetch<{ plan: MovementPlan | null }>("/plans/daily/today") });
  const weekly = useQuery({ queryKey: ["weekly"], queryFn: () => apiFetch<{ plan: WeeklyPlan | null }>("/plans/weekly/current") });
  const monthly = useQuery({ queryKey: ["monthly"], queryFn: () => apiFetch<{ plan: MonthlyPlan | null }>("/plans/monthly/current") });
  const first = daily.data?.plan?.items?.[0];
  const plannedWeekDays = weekly.data?.plan?.days?.filter((day) => day.status === "planned") ?? [];
  const plannedMonthDays = monthly.data?.plan?.weeks?.flatMap((week) => week.days ?? []).filter((day) => day.status === "planned") ?? [];
  return (
    <TabScreenScroll testID="program-tab-scroll">
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "900" }}>Program</Text>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Today program</Text>
        {first ? <ExerciseMediaFrame media={first.media} title={first.name} section={first.section} target={first.equipment} /> : null}
        <Text style={{ color: theme.muted }}>{daily.data?.plan ? `${daily.data.plan.total_minutes ?? 0} minutes, ${daily.data.plan.items?.length ?? 0} movements` : "No daily session saved."}</Text>
        <Pressable accessibilityRole="button" onPress={() => daily.data?.plan ? router.push("/daily-plan" as never) : router.push("/generate-plan?scope=daily&source=program&returnTo=/program" as never)} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{daily.data?.plan ? "Open today" : "Generate today"}</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Seven-day plan</Text>
        {plannedWeekDays.slice(0, 3).map((day) => (
          <View key={day.session_id ?? `${day.day}-${day.date}`} style={{ gap: 6 }}>
            {day.items?.[0] ? <ExerciseMediaFrame media={day.items[0].media} title={day.items[0].name} section={day.focus} target={day.items[0].equipment} animated={false} /> : null}
            <Text style={{ color: theme.text }}>{day.day}: {day.focus} - {day.duration_minutes ?? 0} min - {day.items?.length ?? 0} movements</Text>
          </View>
        ))}
        {!weekly.data?.plan ? <Text style={{ color: theme.muted }}>No week saved yet.</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => weekly.data?.plan ? router.push("/weekly-plan" as never) : router.push("/generate-plan?scope=weekly&source=program&returnTo=/program" as never)} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{weekly.data?.plan ? "Open week" : "Generate week"}</Text>
        </Pressable>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Four-week progression</Text>
        {(monthly.data?.plan?.weeks ?? []).map((week) => <Text key={week.week} style={{ color: theme.text }}>Week {week.week}: {week.phase} - {week.planned_sessions ?? 0} sessions</Text>)}
        {plannedMonthDays[0]?.items?.[0] ? <ExerciseMediaFrame media={plannedMonthDays[0].items[0].media} title={plannedMonthDays[0].items[0].name} section={plannedMonthDays[0].focus} target={plannedMonthDays[0].items[0].equipment} animated={false} /> : null}
        {!monthly.data?.plan ? <Text style={{ color: theme.muted }}>No four-week program saved yet.</Text> : null}
        <Pressable accessibilityRole="button" onPress={() => monthly.data?.plan ? router.push("/monthly-plan" as never) : router.push("/generate-plan?scope=monthly&source=program&returnTo=/program" as never)} style={{ minHeight: 48, justifyContent: "center" }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>{monthly.data?.plan ? "Open month" : "Generate month"}</Text>
        </Pressable>
      </View>
    </TabScreenScroll>
  );
}
