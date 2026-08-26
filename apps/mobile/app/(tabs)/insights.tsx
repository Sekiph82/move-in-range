import { Pressable, ScrollView, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Link } from "expo-router";
import { apiFetch } from "../../src/api";
import { useTheme } from "../../src/theme";

export default function InsightsScreen() {
  const theme = useTheme();
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => apiFetch<any>("/insights/summary") });
  const data = insights.data;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>Insights</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>Stored movement and glucose context, without treatment advice.</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["/achievements", "Achievements"],
          ["/diabetes", "Diabetes"],
          ["/calendar", "Calendar"]
        ].map(([href, label]) => (
          <Link key={href} href={href as never} asChild>
            <Pressable accessibilityRole="link" style={{ minHeight: 40, borderRadius: 8, borderColor: theme.border, borderWidth: 1, paddingHorizontal: 12, justifyContent: "center", backgroundColor: theme.surface }}>
              <Text style={{ color: theme.primary, fontWeight: "700" }}>{label}</Text>
            </Pressable>
          </Link>
        ))}
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Movement</Text>
        <Text style={{ color: theme.text }}>Sessions completed: {data?.sessions_completed ?? 0}</Text>
        <Text style={{ color: theme.text }}>Planned minutes: {data?.planned_minutes ?? 0}</Text>
        <Text style={{ color: theme.text }}>Completed minutes: {data?.completed_minutes ?? 0}</Text>
        <Text style={{ color: theme.text }}>Weekly completion: {Math.round((data?.weekly_completion_rate ?? 0) * 100)}%</Text>
        <Text style={{ color: theme.text }}>Pain reports: {data?.pain_report_count ?? 0}</Text>
        <Text style={{ color: theme.text }}>Substitutions: {data?.substitution_count ?? 0}</Text>
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>Glucose context</Text>
        <Text style={{ color: theme.text }}>Status: {data?.glucose?.status ?? "INSUFFICIENT_DATA"}</Text>
        <Text style={{ color: theme.text }}>Samples: {data?.glucose?.sample_count ?? 0}</Text>
        <Text style={{ color: theme.muted }}>{data?.glucose?.disclaimer ?? "This is not an insulin or treatment recommendation."}</Text>
      </View>
      <Pressable accessibilityLabel="Refresh insights" onPress={() => insights.refetch()} style={{ minHeight: 52, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: theme.primary }}>
        <Text style={{ color: theme.surface, fontWeight: "700" }}>{insights.isFetching ? "Refreshing..." : "Refresh insights"}</Text>
      </Pressable>
    </ScrollView>
  );
}
