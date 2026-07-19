import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { View } from "react-native";
import { apiFetch } from "../../api";
import { ActionButton, BodyText, ChoiceChip, LoadingState, Panel } from "../shared/ui";

const statusLabels: Record<string, string> = {
  planned: "Planned",
  completed: "Completed",
  skipped: "Skipped",
  partial: "Partially completed",
  pain_stop: "Stopped for pain",
  symptom_stop: "Stopped for symptoms",
  recovery: "Recovery",
  rescheduled: "Rescheduled",
  blocked: "Blocked"
};

const eventLabels: Record<string, string> = {
  daily_plan: "Daily movement plan",
  session: "Workout session",
  reminder: "Reminder",
  recovery: "Recovery day"
};

function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthDays(anchor: Date) {
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const last = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  return Array.from({ length: last.getDate() }, (_, index) => new Date(anchor.getFullYear(), anchor.getMonth(), index + 1));
}

export function CalendarScreen() {
  const [anchor, setAnchor] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(isoDate(new Date()));
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const calendar = useQuery({ queryKey: ["calendar"], queryFn: () => apiFetch<any>("/calendar") });
  const days = useMemo(() => {
    const all = monthDays(anchor);
    if (viewMode === "month") return all;
    const selected = new Date(selectedDate);
    const start = new Date(selected);
    start.setDate(selected.getDate() - selected.getDay());
    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [anchor, selectedDate, viewMode]);
  const events = calendar.data?.items ?? [];
  const selectedEvents = events.filter((item: any) => item.event_date === selectedDate);
  return (
    <>
      <Panel title="Calendar">
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <ChoiceChip label="Month" selected={viewMode === "month"} onPress={() => setViewMode("month")} />
          <ChoiceChip label="Week" selected={viewMode === "week"} onPress={() => setViewMode("week")} />
        </View>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <ActionButton label="Previous" onPress={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1))} />
          <ActionButton label="Today" onPress={() => { const today = new Date(); setAnchor(today); setSelectedDate(isoDate(today)); }} />
          <ActionButton label="Next" onPress={() => setAnchor(new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1))} />
        </View>
        <BodyText>{anchor.toLocaleString(undefined, { month: "long", year: "numeric" })}</BodyText>
        {calendar.isLoading ? <LoadingState /> : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {days.map((day) => {
            const key = isoDate(day);
            const hasEvents = events.some((item: any) => item.event_date === key);
            return <ChoiceChip key={key} label={`${day.getDate()}${hasEvents ? " •" : ""}`} selected={selectedDate === key} onPress={() => setSelectedDate(key)} />;
          })}
        </View>
      </Panel>
      <Panel title={`Selected date ${selectedDate}`}>
        {selectedEvents.map((item: any) => (
          <Panel key={item.id} title={eventLabels[item.event_type] ?? "Movement event"}>
            <BodyText>{statusLabels[item.status] ?? "Scheduled"}</BodyText>
            <BodyText muted>{item.payload?.focus ?? item.payload?.plan_id ?? "Open the related plan or session for details."}</BodyText>
          </Panel>
        ))}
        {selectedEvents.length === 0 ? <BodyText muted>No plans or sessions on this date.</BodyText> : null}
      </Panel>
    </>
  );
}
