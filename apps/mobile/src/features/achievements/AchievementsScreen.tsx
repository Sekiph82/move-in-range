import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../api";
import { BodyText, LoadingState, Panel } from "../shared/ui";

const achievementCopy: Record<string, { title: string; explanation: string; category: string }> = {
  weekly_three_sessions: { title: "Three movement sessions this week", explanation: "You found a steady rhythm without rushing recovery.", category: "Consistency" },
  returned_after_break: { title: "Returned after a break", explanation: "Coming back gently counts.", category: "Recovery" },
  recovery_session_complete: { title: "Completed a recovery session", explanation: "You chose a lower-intensity option when your body needed it.", category: "Safety" },
  four_week_progression: { title: "Four weeks of safe progression", explanation: "Your plan progressed while respecting hold rules.", category: "Progress" },
  readiness_consistency: { title: "Completed readiness consistently", explanation: "You checked in before movement and used safety signals.", category: "Readiness" }
};

function copyFor(key: string) {
  return achievementCopy[key] ?? { title: "Movement milestone", explanation: "A saved achievement from your MoveInRange journey.", category: "Progress" };
}

export function AchievementsScreen() {
  const achievements = useQuery({ queryKey: ["achievements"], queryFn: () => apiFetch<any>("/achievements") });
  const insights = useQuery({ queryKey: ["insights"], queryFn: () => apiFetch<any>("/insights/summary") });
  return (
    <>
      <Panel title="Earned">
        {achievements.isLoading ? <LoadingState /> : null}
        {(achievements.data?.items ?? []).map((item: any) => {
          const copy = copyFor(item.achievement_key);
          return (
            <Panel key={item.id} title={copy.title}>
              <BodyText>{copy.explanation}</BodyText>
              <BodyText muted>{copy.category} - {item.status === "earned" ? "Earned" : "Locked"}</BodyText>
              {item.created_at ? <BodyText muted>Earned on {String(item.created_at).slice(0, 10)}</BodyText> : null}
            </Panel>
          );
        })}
        {achievements.data?.items?.length === 0 ? <BodyText muted>No achievements yet.</BodyText> : null}
      </Panel>
      <Panel title="Progress">
        <BodyText>Sessions completed: {insights.data?.sessions_completed ?? 0}</BodyText>
        <BodyText>Weekly completion: {Math.round((insights.data?.weekly_completion_rate ?? 0) * 100)}%</BodyText>
      </Panel>
    </>
  );
}
