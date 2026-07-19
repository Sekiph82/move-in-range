import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../api";
import { BodyText, LoadingState, Panel } from "../shared/ui";

export function AchievementsScreen() {
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: () => apiFetch<any>("/achievements") });
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => apiFetch<any>("/insights/summary") });
  return (
    <>
      <Panel title="Earned">
        {achievements.isLoading ? <LoadingState /> : null}
        {(achievements.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{item.achievement_key}: {item.status}</BodyText>)}
        {achievements.data?.items?.length === 0 ? <BodyText muted>No achievements yet.</BodyText> : null}
      </Panel>
      <Panel title="Progress">
        <BodyText>Sessions completed: {insights.data?.sessions_completed ?? 0}</BodyText>
        <BodyText>Weekly completion: {Math.round((insights.data?.weekly_completion_rate ?? 0) * 100)}%</BodyText>
      </Panel>
    </>
  );
}
