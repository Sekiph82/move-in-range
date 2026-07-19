import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, logDiabetesContext, logGlucose } from "../../api";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, TextField } from "../shared/ui";

export function DiabetesScreen() {
  const [timing, setTiming] = useState("pre");
  const [unit, setUnit] = useState("mg/dL");
  const [value, setValue] = useState("112");
  const queryClient = useQueryClient();
  const diabetes = useQuery({ queryKey: ["diabetes"], queryFn: () => apiFetch<any>("/diabetes/insights") });
  const contextMutation = useMutation({
    mutationFn: () => logDiabetesContext({ timing, value: Number(value), unit, delayed_check_minutes: timing === "post" ? 120 : undefined, context: "movement session" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["diabetes"] })
  });
  const glucoseMutation = useMutation({ mutationFn: () => logGlucose() });
  return (
    <>
      <Panel title="Glucose context">
        <ChipGroup labels={["pre", "post", "delayed"]} selected={[timing]} onToggle={setTiming} />
        <ChipGroup labels={["mg/dL", "mmol/L"]} selected={[unit]} onToggle={setUnit} />
        <TextField label="Glucose value" keyboardType="number-pad" value={value} onChangeText={setValue} />
        <BodyText muted>MoveInRange records context, trends, symptoms, and timestamps. It never calculates insulin or treatment.</BodyText>
        <ActionButton label={contextMutation.isPending ? "Saving..." : "Save diabetes context"} onPress={() => contextMutation.mutate()} />
        <ActionButton label={glucoseMutation.isPending ? "Saving..." : "Save glucose sample"} onPress={() => glucoseMutation.mutate()} />
        <ErrorText error={contextMutation.error ?? glucoseMutation.error} />
      </Panel>
      <Panel title="Insights">
        {diabetes.isLoading ? <LoadingState /> : null}
        <BodyText>Status: {diabetes.data?.insights?.status ?? "insufficient data"}</BodyText>
        <BodyText muted>{diabetes.data?.insights?.explanation ?? "Comparable-session insights appear after enough saved context."}</BodyText>
      </Panel>
    </>
  );
}
