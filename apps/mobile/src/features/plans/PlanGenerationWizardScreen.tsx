import { useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createGenerationRequestId, generateDailyPlan, generateMonthlyPlan, generateWeeklyPlan, type GenerationScope, type PlanGenerationRequest } from "../../api";
import { useAppLanguage } from "../../i18n/LanguageProvider";
import { useTheme } from "../../theme";
import { ActionButton, BodyText, ErrorText, Panel } from "../shared/ui";

type Option = { value: string; label: { en: string; tr: string }; detail: { en: string; tr: string }; icon: keyof typeof Feather.glyphMap };
type StepKey = "feeling" | "focus" | "duration" | "style" | "confirm";

const feelingOptions: Option[] = [
  { value: "excellent", label: { en: "Excellent", tr: "Cok iyi" }, detail: { en: "full energy", tr: "enerji yuksek" }, icon: "sun" },
  { value: "good", label: { en: "Good", tr: "Iyi" }, detail: { en: "steady", tr: "dengeli" }, icon: "check-circle" },
  { value: "okay", label: { en: "Okay", tr: "Orta" }, detail: { en: "keep it measured", tr: "olculu" }, icon: "activity" },
  { value: "low_energy", label: { en: "Low energy", tr: "Dusuk enerji" }, detail: { en: "lighter", tr: "daha hafif" }, icon: "battery-charging" },
  { value: "exhausted", label: { en: "Exhausted", tr: "Tukenmis" }, detail: { en: "recovery first", tr: "once toparlanma" }, icon: "battery" }
];

const focusOptions: Option[] = ["full_body", "upper_body", "lower_body", "core", "back", "neck", "shoulders", "arms", "hips", "knees", "balance", "mobility", "cardio"].map((value) => ({
  value,
  label: { en: value.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()), tr: value.replaceAll("_", " ") },
  detail: { en: "planned focus", tr: "plan odagi" },
  icon: value === "balance" ? "shield" : value === "cardio" ? "heart" : "target"
}));

const durationOptions: Option[] = [5, 10, 15, 20, 30, 45, 60].map((value) => ({
  value: String(value),
  label: { en: `${value} minutes`, tr: `${value} dakika` },
  detail: { en: value <= 10 ? "quick" : value <= 20 ? "standard" : "longer", tr: value <= 10 ? "kisa" : value <= 20 ? "standart" : "uzun" },
  icon: "clock"
}));

const styleOptions: Option[] = [
  { value: "mixed", label: { en: "Mixed", tr: "Karma" }, detail: { en: "balanced plan", tr: "dengeli plan" }, icon: "shuffle" },
  { value: "mobility", label: { en: "Mobility", tr: "Mobilite" }, detail: { en: "range and control", tr: "aralik ve kontrol" }, icon: "move" },
  { value: "strength", label: { en: "Strength", tr: "Guc" }, detail: { en: "controlled effort", tr: "kontrollu efor" }, icon: "trending-up" },
  { value: "balance", label: { en: "Balance", tr: "Denge" }, detail: { en: "supported control", tr: "destekli kontrol" }, icon: "shield" },
  { value: "cardio", label: { en: "Low-impact cardio", tr: "Dusuk etkili kardiyo" }, detail: { en: "steady pace", tr: "sabit tempo" }, icon: "heart" },
  { value: "recovery", label: { en: "Recovery", tr: "Toparlanma" }, detail: { en: "lighter day", tr: "daha hafif" }, icon: "coffee" }
];

function copy(value: { en: string; tr: string }, language: "en" | "tr") {
  return value[language] ?? value.en;
}

function SelectionCard({ option, selected, onPress }: { option: Option; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  const { language } = useAppLanguage();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${copy(option.label, language)}. ${copy(option.detail, language)}`}
      onPress={onPress}
      style={{ flexBasis: "48%", flexGrow: 1, minWidth: 132, minHeight: 108, borderRadius: 8, borderWidth: 1, borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? `${theme.primary}22` : theme.surface, padding: 12, gap: 8 }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Feather name={option.icon} color={selected ? theme.primary : theme.muted} size={24} />
        {selected ? <Feather name="check-circle" color={theme.primary} size={20} /> : null}
      </View>
      <Text style={{ color: theme.text, fontWeight: "900", fontSize: 16 }}>{copy(option.label, language)}</Text>
      <Text style={{ color: theme.muted }}>{copy(option.detail, language)}</Text>
    </Pressable>
  );
}

function OptionGrid({ options, selected, onSelect }: { options: Option[]; selected: string; onSelect: (value: string) => void }) {
  return <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{options.map((option) => <SelectionCard key={option.value} option={option} selected={selected === option.value} onPress={() => onSelect(option.value)} />)}</View>;
}

function previewHref(planId: string, source: string, returnTo?: string | null) {
  const params = new URLSearchParams({ planId, source });
  if (returnTo) params.set("returnTo", returnTo);
  return `/workout-preview?${params.toString()}`;
}

export function PlanGenerationWizardScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ scope?: GenerationScope; selectedDate?: string; existingPlanId?: string; returnTo?: string; source?: string }>();
  const scope = (params.scope ?? "daily") as GenerationScope;
  const requestIdRef = useRef(createGenerationRequestId(scope));
  const [step, setStep] = useState(0);
  const [feeling, setFeeling] = useState("good");
  const [focus, setFocus] = useState("full_body");
  const [duration, setDuration] = useState("15");
  const [style, setStyle] = useState("mixed");
  const steps: StepKey[] = ["feeling", "focus", "duration", "style", "confirm"];
  const current = steps[step];
  const payload = useMemo<PlanGenerationRequest>(() => ({
    scope,
    feeling,
    focus,
    available_minutes: Number(duration),
    desired_session_type: style,
    selected_date: params.selectedDate,
    existing_plan_id: params.existingPlanId,
    idempotency_key: requestIdRef.current
  }), [duration, feeling, focus, params.existingPlanId, params.selectedDate, scope, style]);

  const generate = useMutation({
    mutationFn: async () => {
      if (scope === "weekly") return generateWeeklyPlan(requestIdRef.current, payload);
      if (scope === "monthly") return generateMonthlyPlan(requestIdRef.current, payload);
      return generateDailyPlan(Number(duration), requestIdRef.current, payload);
    },
    onSuccess: async (response: any) => {
      const plan = response?.plan;
      const previewPlanId = plan?.items?.length
        ? plan.id
        : plan?.days?.find((day: any) => day.daily_plan_id)?.daily_plan_id
          ?? plan?.weeks?.flatMap((week: any) => week.days ?? []).find((day: any) => day.daily_plan_id)?.daily_plan_id
          ?? plan?.id;
      if (plan?.id && previewPlanId) {
        queryClient.setQueryData(["plan", plan.id], { plan });
        if (scope === "weekly") await queryClient.invalidateQueries({ queryKey: ["weekly"] });
        if (scope === "monthly") await queryClient.invalidateQueries({ queryKey: ["monthly"] });
        await queryClient.invalidateQueries({ queryKey: ["today-plan"] });
        await queryClient.refetchQueries({ queryKey: ["today-plan"], type: "active" });
        router.replace(previewHref(previewPlanId, scope === "replace-day" ? "replace-day" : "generated", params.returnTo) as never);
      }
    }
  });

  return (
    <View style={{ gap: 14 }}>
      <Panel title={`Generate ${scope === "replace-day" ? "this day" : scope} - ${step + 1} of ${steps.length}`}>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.border, overflow: "hidden" }}>
          <View style={{ height: 8, width: `${((step + 1) / steps.length) * 100}%`, backgroundColor: theme.primary }} />
        </View>
        {current === "feeling" ? <><Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>How are you feeling today?</Text><OptionGrid options={feelingOptions} selected={feeling} onSelect={setFeeling} /></> : null}
        {current === "focus" ? <><Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>What would you like to work on?</Text><OptionGrid options={focusOptions} selected={focus} onSelect={setFocus} /></> : null}
        {current === "duration" ? <><Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>How much time do you have?</Text><OptionGrid options={durationOptions} selected={duration} onSelect={setDuration} /></> : null}
        {current === "style" ? <><Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>What style fits today?</Text><OptionGrid options={styleOptions} selected={style} onSelect={setStyle} /></> : null}
        {current === "confirm" ? (
          <View style={{ gap: 8 }}>
            <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 22, fontWeight: "900" }}>Ready to build</Text>
            <BodyText>Scope: {scope}</BodyText>
            <BodyText>Feeling: {feeling.replaceAll("_", " ")}</BodyText>
            <BodyText>Focus: {focus.replaceAll("_", " ")}</BodyText>
            <BodyText>Duration: {duration} minutes</BodyText>
            <BodyText>Style: {style.replaceAll("_", " ")}</BodyText>
            <BodyText muted>Safety filtering still uses your saved Movement Profile and the readiness policy before workouts.</BodyText>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><ActionButton label="Back" disabled={step === 0 || generate.isPending} onPress={() => setStep(Math.max(0, step - 1))} /></View>
          <View style={{ flex: 1 }}>
            {step < steps.length - 1 ? <ActionButton label="Continue" onPress={() => setStep(Math.min(steps.length - 1, step + 1))} /> : <ActionButton label={generate.isPending ? "Generating..." : scope === "weekly" ? "Generate week" : scope === "monthly" ? "Generate month" : scope === "replace-day" ? "Replace this day" : "Generate today"} disabled={generate.isPending} onPress={() => generate.mutate()} />}
          </View>
        </View>
        <ErrorText error={generate.error} />
      </Panel>
    </View>
  );
}
