import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../api";
import { BodyText, LoadingState, Panel } from "../shared/ui";

export function CalendarScreen() {
  const calendar = useQuery({ queryKey: ["calendar"], queryFn: () => apiFetch<any>("/calendar") });
  return (
    <Panel title="Timeline">
      {calendar.isLoading ? <LoadingState /> : null}
      {(calendar.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.event_date}: {item.event_type} - {item.status}</BodyText>)}
      {calendar.data?.items?.length === 0 ? <BodyText muted>No events yet. Generate a plan or quick session first.</BodyText> : null}
    </Panel>
  );
}
