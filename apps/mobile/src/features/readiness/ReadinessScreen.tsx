import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, startSession, submitReadiness } from "../../api";
import { useTheme } from "../../theme";
import { useAppLanguage } from "../../i18n/LanguageProvider";
import { ActionButton, BodyText, ChoiceChip, ErrorText, LoadingState, Panel } from "../shared/ui";
import { readinessAllowsStart, readinessDelaysStart, readinessRequiresAcknowledgement } from "./readinessGate";
import { workoutHref } from "./startContext";

type Choice = { value: string; label: string; detail: string; icon: keyof typeof Feather.glyphMap; score?: number | boolean };
type Question = { key: "energy" | "sleep_quality" | "pain" | "new_injury" | "stress" | "available_minutes"; title: string; subtitle: string; choices: Choice[] };

const bodyAreas = ["Neck", "Shoulder", "Back", "Hip", "Knee", "Ankle", "Wrist"];

const questions: Question[] = [
  {
    key: "energy",
    title: "How is your energy?",
    subtitle: "Choose the closest match for right now.",
    choices: [
      { value: "drained", label: "Drained", detail: "very low", icon: "battery", score: 1 },
      { value: "low", label: "Low", detail: "take it easy", icon: "battery-charging", score: 2 },
      { value: "good", label: "Good", detail: "steady", icon: "sun", score: 3 },
      { value: "strong", label: "Strong", detail: "ready", icon: "zap", score: 4 }
    ]
  },
  {
    key: "sleep_quality",
    title: "How did you sleep?",
    subtitle: "Sleep affects balance, effort, and recovery.",
    choices: [
      { value: "poor", label: "Poor", detail: "rough night", icon: "moon", score: 1 },
      { value: "light", label: "Light", detail: "not enough", icon: "cloud", score: 2 },
      { value: "good", label: "Good", detail: "okay", icon: "check-circle", score: 3 },
      { value: "rested", label: "Rested", detail: "refreshed", icon: "star", score: 4 }
    ]
  },
  {
    key: "pain",
    title: "Any pain today?",
    subtitle: "Use the strongest pain you notice before moving.",
    choices: [
      { value: "none", label: "None", detail: "clear", icon: "smile", score: 0 },
      { value: "mild", label: "Mild", detail: "watch it", icon: "activity", score: 2 },
      { value: "moderate", label: "Moderate", detail: "adjust", icon: "alert-circle", score: 5 },
      { value: "strong", label: "Strong", detail: "slow down", icon: "alert-triangle", score: 7 }
    ]
  },
  {
    key: "new_injury",
    title: "Any injury or symptom change?",
    subtitle: "New or worsening symptoms should change the plan.",
    choices: [
      { value: "none", label: "None", detail: "no change", icon: "shield", score: false },
      { value: "stable", label: "Old/stable", detail: "known", icon: "clock", score: false },
      { value: "recent", label: "Recent", detail: "be careful", icon: "flag", score: true },
      { value: "worse", label: "New/worse", detail: "stop first", icon: "alert-octagon", score: true }
    ]
  },
  {
    key: "stress",
    title: "Stress level?",
    subtitle: "Stress can change intensity and rest needs.",
    choices: [
      { value: "calm", label: "Calm", detail: "easy focus", icon: "coffee", score: 1 },
      { value: "mild", label: "Mild", detail: "manageable", icon: "wind", score: 2 },
      { value: "high", label: "High", detail: "lighter", icon: "cloud-rain", score: 4 },
      { value: "overwhelmed", label: "Overwhelmed", detail: "recheck", icon: "cloud-lightning", score: 5 }
    ]
  },
  {
    key: "available_minutes",
    title: "How much time do you have?",
    subtitle: "The plan can shorten safely.",
    choices: [
      { value: "5", label: "5 min", detail: "reset", icon: "clock", score: 5 },
      { value: "15", label: "15 min", detail: "short", icon: "clock", score: 15 },
      { value: "30", label: "30 min", detail: "steady", icon: "clock", score: 30 },
      { value: "45", label: "45+ min", detail: "full", icon: "clock", score: 45 }
    ]
  }
];

const initialAnswers = {
  energy: "good",
  sleep_quality: "good",
  pain: "none",
  new_injury: "none",
  stress: "mild",
  available_minutes: "15"
};

function resultTitle(item: any) {
  const action = item?.decision?.action;
  if (action === "READY" || action === "READY_WITH_MODIFICATIONS" || action === "MODIFY") return action === "READY" ? "Ready" : "Ready with adjustments";
  if (action === "DELAY_AND_RECHECK") return "Delay and recheck";
  if (action === "BLOCK_AND_SHOW_SAFETY_MESSAGE" || action === "BLOCK") return "Do not start workout";
  return "Readiness saved";
}

function answerPayload(answers: typeof initialAnswers) {
  const valueFor = (key: Question["key"]) => questions.find((question) => question.key === key)?.choices.find((choice) => choice.value === answers[key])?.score;
  return {
    energy: Number(valueFor("energy") ?? 3),
    sleep_quality: Number(valueFor("sleep_quality") ?? 3),
    pain: Number(valueFor("pain") ?? 0),
    new_injury: Boolean(valueFor("new_injury")),
    stress: Number(valueFor("stress") ?? 2),
    available_minutes: Number(valueFor("available_minutes") ?? 15),
    desired_session_type: "mixed",
    dizziness: false,
    chest_discomfort: false,
    unusual_shortness_of_breath: false,
    illness: false,
    recent_fall: false
  };
}

export function ReadinessScreen() {
  const theme = useTheme();
  const { t } = useAppLanguage();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ intent?: string; planId?: string; source?: string; sessionDate?: string; selectedDay?: string; sessionType?: string; returnTo?: string }>();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [painAreas, setPainAreas] = useState<string[]>([]);
  const [movementWorse, setMovementWorse] = useState(false);
  const isStartIntent = params.intent === "start";
  const readiness = useQuery({ queryKey: ["readiness"], queryFn: () => apiFetch<any>("/readiness-checks/latest"), enabled: !isStartIntent });
  const start = useMutation({
    mutationFn: () => startSession(params.planId),
    onSuccess: (data) => router.replace(workoutHref(data.session.id, { source: params.source, planId: params.planId, sessionDate: params.sessionDate, selectedDay: params.selectedDay, sessionType: params.sessionType, returnTo: params.returnTo }) as never)
  });
  const readinessMutation = useMutation({
    mutationFn: () => submitReadiness({ ...answerPayload(answers), pain_locations: painAreas, movement_makes_pain_worse: movementWorse } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["readiness"] });
      queryClient.invalidateQueries({ queryKey: ["today-plan"] });
      queryClient.invalidateQueries({ queryKey: ["weekly"] });
      queryClient.invalidateQueries({ queryKey: ["monthly"] });
    }
  });
  const currentQuestion = questions[step];
  const result = readinessMutation.data ?? (isStartIntent ? undefined : readiness.data?.item);
  const hasSubmitted = Boolean(readinessMutation.data);
  const selectedChoice = useMemo(() => currentQuestion.choices.find((choice) => choice.value === answers[currentQuestion.key]), [answers, currentQuestion]);

  if (readiness.isLoading && !hasSubmitted && !isStartIntent) return <LoadingState label="Loading readiness result" />;

  if (hasSubmitted) {
    const delayed = readinessDelaysStart(result);
    const needsAck = readinessRequiresAcknowledgement(result);
    const allowed = readinessAllowsStart(result);
    return (
      <View style={{ gap: 14 }}>
        <Panel title={resultTitle(result)}>
          <BodyText>{result?.decision?.explanation ?? "Your readiness result has been saved for today."}</BodyText>
          <BodyText muted>Completed just now. Today's plan and Home card will refresh with this result.</BodyText>
          {painAreas.length ? <BodyText muted>Areas noted: {painAreas.join(", ")}</BodyText> : null}
          {movementWorse ? <BodyText muted>Movement-worsening pain was recorded, so intensity should stay conservative.</BodyText> : null}
          {isStartIntent && allowed && !delayed ? (
            <ActionButton label={needsAck ? "Acknowledge adjustments and start" : start.isPending ? "Opening player..." : "Continue to workout"} disabled={start.isPending} onPress={() => start.mutate()} />
          ) : null}
          <ActionButton label="Return Home" onPress={() => router.replace((params.returnTo ?? "/(tabs)") as never)} />
          <ErrorText error={start.error} />
        </Panel>
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      <Panel title={t("readiness.title")}>
        <BodyText muted>{t("readiness.subtitle")} Step {step + 1} of {questions.length}</BodyText>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>{currentQuestion.title}</Text>
        <BodyText muted>{currentQuestion.subtitle}</BodyText>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {currentQuestion.choices.map((choice) => {
            const selected = selectedChoice?.value === choice.value;
            return (
              <Pressable
                key={choice.value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${choice.label}. ${choice.detail}`}
                onPress={() => setAnswers((current) => ({ ...current, [currentQuestion.key]: choice.value }))}
                style={{ width: "48%", minHeight: 116, borderRadius: 8, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? `${theme.primary}22` : theme.surface, padding: 12, gap: 8 }}
              >
                <Feather name={choice.icon} color={selected ? theme.primary : theme.muted} size={24} />
                <Text style={{ color: theme.text, fontSize: 17, fontWeight: "900" }}>{choice.label}</Text>
                <Text style={{ color: theme.muted }}>{choice.detail}</Text>
              </Pressable>
            );
          })}
        </View>
        {(answers.pain !== "none" || answers.new_injury === "recent" || answers.new_injury === "worse") && step >= 2 ? (
          <View style={{ gap: 10 }}>
            <BodyText>Body areas</BodyText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {bodyAreas.map((area) => <ChoiceChip key={area} label={area} selected={painAreas.includes(area)} onPress={() => setPainAreas((current) => current.includes(area) ? current.filter((item) => item !== area) : [...current, area])} />)}
            </View>
            <ChoiceChip label="Movement makes it worse" selected={movementWorse} onPress={() => setMovementWorse((current) => !current)} />
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}>
            <ActionButton label="Back" disabled={step === 0} onPress={() => setStep(Math.max(0, step - 1))} />
          </View>
          <View style={{ flex: 1 }}>
            {step < questions.length - 1 ? (
              <ActionButton label="Next" onPress={() => setStep(Math.min(questions.length - 1, step + 1))} />
            ) : (
              <ActionButton label={readinessMutation.isPending ? "Checking..." : "See result"} disabled={readinessMutation.isPending} onPress={() => readinessMutation.mutate()} />
            )}
          </View>
        </View>
        <ErrorText error={readinessMutation.error} />
      </Panel>
    </View>
  );
}
