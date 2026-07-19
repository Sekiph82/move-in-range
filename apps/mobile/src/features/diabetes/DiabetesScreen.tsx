import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, logDiabetesContext, logGlucose } from "../../api";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, TextField } from "../shared/ui";
import { glucoseSchema } from "../validation/schemas";

export function DiabetesScreen() {
  const [timing, setTiming] = useState("pre");
  const [unit, setUnit] = useState("mg/dL");
  const [value, setValue] = useState("");
  const [trend, setTrend] = useState("unknown");
  const [source, setSource] = useState("manual");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [mealMinutes, setMealMinutes] = useState("");
  const [activeInsulin, setActiveInsulin] = useState("");
  const [delayedCheckMinutes, setDelayedCheckMinutes] = useState("120");
  const [insightFilters, setInsightFilters] = useState<string[]>([]);
  const validation = glucoseSchema.safeParse({ timing, value, unit, trend, source, delayedCheckMinutes: timing === "delayed" ? delayedCheckMinutes : undefined });
  const queryClient = useQueryClient();
  const diabetes = useQuery({ queryKey: ["diabetes"], queryFn: () => apiFetch<any>("/diabetes/insights") });
  const contextMutation = useMutation({
    mutationFn: () => logDiabetesContext({
      timing,
      value: Number(value),
      unit,
      trend,
      source,
      symptoms,
      time_since_meal_minutes: mealMinutes ? Number(mealMinutes) : undefined,
      active_insulin_note: activeInsulin || undefined,
      delayed_check_minutes: timing === "delayed" ? Number(delayedCheckMinutes) : undefined,
      context: "movement session",
      timestamp: new Date().toISOString()
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diabetes"] })
  });
  const glucoseMutation = useMutation({ mutationFn: () => logGlucose({ value: Number(value), unit: unit as "mg/dL" | "mmol/L", timing: timing as "pre" | "post" | "delayed" }) });
  const errors = validation.success ? [] : validation.error.issues.map((issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`);
  return (
    <>
      <Panel title="Glucose context">
        <ChipGroup labels={["pre", "post", "delayed"]} selected={[timing]} onToggle={setTiming} />
        <ChipGroup labels={["mg/dL", "mmol/L"]} selected={[unit]} onToggle={setUnit} />
        <ChipGroup labels={["steady", "rising", "falling", "unknown"]} selected={[trend]} onToggle={setTrend} />
        <TextField label="Glucose value" keyboardType="number-pad" value={value} onChangeText={setValue} />
        <TextField label="Source" value={source} onChangeText={setSource} />
        <TextField label="Minutes since meal" keyboardType="number-pad" value={mealMinutes} onChangeText={setMealMinutes} />
        <TextField label="Optional active insulin note" value={activeInsulin} onChangeText={setActiveInsulin} />
        {timing === "delayed" ? <TextField label="Delayed check interval minutes" keyboardType="number-pad" value={delayedCheckMinutes} onChangeText={setDelayedCheckMinutes} /> : null}
        <ChipGroup labels={["shaky", "dizzy", "unusually tired", "none"]} selected={symptoms} onToggle={(label) => setSymptoms(symptoms.includes(label) ? symptoms.filter((item) => item !== label) : [...symptoms, label])} />
        {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
        <BodyText muted>This is not an insulin or treatment recommendation.</BodyText>
        <ActionButton label={contextMutation.isPending ? "Saving..." : "Save diabetes context"} disabled={!validation.success} onPress={() => contextMutation.mutate()} />
        <ActionButton label={glucoseMutation.isPending ? "Saving..." : "Save glucose sample"} disabled={!validation.success} onPress={() => glucoseMutation.mutate()} />
        <ErrorText error={contextMutation.error ?? glucoseMutation.error} />
      </Panel>
      <Panel title="History">
        {(diabetes.data?.items ?? []).map((item: any) => <BodyText key={item.id}>{String(item.created_at).slice(0, 10)} - {item.payload?.timing ?? "context"} - {item.payload?.value ?? "saved"} {item.payload?.unit ?? ""}</BodyText>)}
        {diabetes.data?.items?.length === 0 ? <BodyText muted>No glucose context has been saved yet.</BodyText> : null}
      </Panel>
      <Panel title="Insights">
        {diabetes.isLoading ? <LoadingState /> : null}
        <BodyText>Status: {diabetes.data?.insights?.status ?? "insufficient data"}</BodyText>
        <BodyText muted>{diabetes.data?.insights?.explanation ?? "Comparable-session insights appear after enough saved context."}</BodyText>
        <ChipGroup labels={["walking", "strength", "cardio", "morning", "similar duration"]} selected={insightFilters} onToggle={(label) => setInsightFilters(insightFilters.includes(label) ? insightFilters.filter((item) => item !== label) : [...insightFilters, label])} />
      </Panel>
    </>
  );
}
