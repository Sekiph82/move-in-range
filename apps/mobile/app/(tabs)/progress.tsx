import { Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../src/api";
import { TabScreenScroll } from "../../src/features/shared/ui";
import { useTheme } from "../../src/theme";

export default function ProgressTab() {
  const theme = useTheme();
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => apiFetch<any>("/insights/summary") });
  const calendar = useQuery({ queryKey: ["calendar"], queryFn: () => apiFetch<any>("/calendar") });
  const data = insights.data;
  const events = calendar.data?.items ?? [];
  return (
    <TabScreenScroll testID="progress-tab-scroll">
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 30, fontWeight: "900" }}>Progress</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {[
          ["Sessions", data?.sessions_completed ?? 0],
          ["Minutes", data?.completed_minutes ?? 0],
          ["Consistency", `${Math.round((data?.weekly_completion_rate ?? 0) * 100)}%`],
          ["Pain reports", data?.pain_report_count ?? 0]
        ].map(([label, value]) => (
          <View key={label} style={{ minWidth: "46%", flexGrow: 1, backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 14 }}>
            <Text style={{ color: theme.muted }}>{label}</Text>
            <Text style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Activity calendar</Text>
        {events.slice(0, 8).map((item: any) => <Text key={item.id} style={{ color: theme.text }}>{item.event_date}: {item.event_type} - {item.status}</Text>)}
        {!events.length ? <Text style={{ color: theme.muted }}>No movement events yet.</Text> : null}
      </View>
      <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 8 }}>
        <Text style={{ color: theme.text, fontSize: 20, fontWeight: "900" }}>Diabetes context</Text>
        <Text style={{ color: theme.text }}>Status: {data?.glucose?.status ?? "INSUFFICIENT_DATA"}</Text>
        <Text style={{ color: theme.muted }}>{data?.glucose?.disclaimer ?? "This is not an insulin or treatment recommendation."}</Text>
      </View>
    </TabScreenScroll>
  );
}
