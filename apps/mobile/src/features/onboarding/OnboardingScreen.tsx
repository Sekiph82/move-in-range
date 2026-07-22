import { useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, generateDailyPlan, saveOnboardingStep } from "../../api";
import { useAppLanguage } from "../../i18n/LanguageProvider";
import { useTheme } from "../../theme";
import { ActionButton, BodyText, ChoiceChip, ErrorText, LoadingState, Panel } from "../shared/ui";
import { BODY_AREAS, DAY_OPTIONS, MINUTE_OPTIONS, ONBOARDING_LOCAL_DRAFT_KEY, ONBOARDING_STEPS, copyText, initialOnboardingDraft, onboardingNeedsBodyAreas, onboardingPayload, toggleMulti, type OnboardingDraft, type OnboardingOption, validateOnboardingStepPayload } from "./model";

type StoredDraft = {
  marker: string;
  draft: OnboardingDraft;
};

function progressMarker(progress: any) {
  return `${progress?.status ?? "not_started"}:${progress?.updated_at ?? "none"}:${progress?.current_step ?? "welcome"}`;
}

function OptionCard({ option, selected, onPress, language }: { option: OnboardingOption; selected: boolean; onPress: () => void; language: "en" | "tr" }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={`${copyText(option.label, language)}. ${copyText(option.detail, language)}`}
      onPress={onPress}
      style={{
        flexBasis: "48%",
        flexGrow: 1,
        minWidth: 132,
        minHeight: 112,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? `${theme.primary}22` : theme.surface,
        padding: 12,
        gap: 8
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 8 }}>
        <Feather name={option.icon as keyof typeof Feather.glyphMap} color={selected ? theme.primary : theme.muted} size={24} />
        {selected ? <Feather name="check-circle" color={theme.primary} size={20} /> : null}
      </View>
      <Text style={{ color: theme.text, fontSize: 17, fontWeight: "900" }}>{copyText(option.label, language)}</Text>
      <Text style={{ color: theme.muted }}>{copyText(option.detail, language)}</Text>
    </Pressable>
  );
}

function OptionGrid({ options, selected, multi, onSelect, language }: { options: OnboardingOption[]; selected: string[]; multi?: boolean; onSelect: (value: string) => void; language: "en" | "tr" }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
      {options.map((option) => <OptionCard key={option.value} option={option} selected={selected.includes(option.value)} onPress={() => onSelect(option.value)} language={language} />)}
    </View>
  );
}

function reviewRows(draft: OnboardingDraft) {
  return [
    ["Goal", draft.primaryGoal],
    ["Activity", draft.activityLevel],
    ["Limitations", draft.limitations.join(", ")],
    ["Areas", draft.limitationBodyAreas.join(", ") || "none"],
    ["Equipment", draft.equipment.join(", ")],
    ["Pattern", `${draft.preferredDays} days, ${draft.preferredMinutes} minutes`]
  ];
}

export function OnboardingScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { language } = useAppLanguage();
  const [draft, setDraft] = useState<OnboardingDraft>({ ...initialOnboardingDraft, language });
  const [restored, setRestored] = useState(false);
  const onboarding = useQuery({ queryKey: ["onboarding"], queryFn: () => apiFetch<any>("/onboarding") });
  const progress = onboarding.data?.progress;
  const marker = progressMarker(progress);
  const stepIndex = Math.min(Math.max(draft.currentStep, 0), ONBOARDING_STEPS.length - 1);
  const current = ONBOARDING_STEPS[stepIndex];
  const errors = useMemo(() => validateOnboardingStepPayload(current.key, draft), [current.key, draft]);
  const showLimitationAreas = current.key === "limitations" && onboardingNeedsBodyAreas(draft);

  useEffect(() => {
    setDraft((currentDraft) => ({ ...currentDraft, language }));
  }, [language]);

  useEffect(() => {
    if (!onboarding.isSuccess || restored) return;
    let active = true;
    AsyncStorage.getItem(ONBOARDING_LOCAL_DRAFT_KEY)
      .then((raw) => {
        if (!active) return;
        if (!raw || progress?.status === "complete") {
          setRestored(true);
          return;
        }
        const parsed = JSON.parse(raw) as StoredDraft;
        if (parsed.marker === marker && parsed.draft && !parsed.draft.submitted) {
          setDraft({ ...initialOnboardingDraft, ...parsed.draft, language });
        }
        setRestored(true);
      })
      .catch(() => setRestored(true));
    return () => {
      active = false;
    };
  }, [language, marker, onboarding.isSuccess, progress?.status, restored]);

  useEffect(() => {
    if (!restored || progress?.status === "complete") return;
    const payload: StoredDraft = { marker, draft };
    AsyncStorage.setItem(ONBOARDING_LOCAL_DRAFT_KEY, JSON.stringify(payload)).catch(() => undefined);
  }, [draft, marker, progress?.status, restored]);

  const patch = (partial: Partial<OnboardingDraft>) => setDraft((currentDraft) => ({ ...currentDraft, ...partial }));
  const choose = (value: string) => {
    if (current.key === "goal") patch({ primaryGoal: value });
    if (current.key === "activity") patch({ activityLevel: value });
    if (current.key === "limitations") {
      const limitations = toggleMulti(draft.limitations, value);
      patch({ limitations, limitationBodyAreas: limitations.includes("joint") || limitations.includes("injury") ? draft.limitationBodyAreas : [] });
    }
    if (current.key === "equipment") patch({ equipment: toggleMulti(draft.equipment, value) });
  };
  const next = () => patch({ currentStep: Math.min(stepIndex + 1, ONBOARDING_STEPS.length - 1) });
  const back = () => patch({ currentStep: Math.max(stepIndex - 1, 0) });

  const submit = useMutation({
    mutationFn: async () => {
      const payload = onboardingPayload(draft);
      const response = await saveOnboardingStep("review_complete", { ...payload, step_number: ONBOARDING_STEPS.length, labels: { en: current.title.en, tr: current.title.tr } }, true, draft.language);
      await AsyncStorage.removeItem(ONBOARDING_LOCAL_DRAFT_KEY);
      await generateDailyPlan(Number(draft.preferredMinutes) || 15).catch(() => undefined);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["today-plan"] });
      patch({ submitted: true });
      router.replace("/(tabs)");
    }
  });

  if (onboarding.isLoading || !restored) return <LoadingState label="Loading onboarding draft" />;

  return (
    <View style={{ gap: 14 }}>
      <Panel title={`${stepIndex + 1} of ${ONBOARDING_STEPS.length}`}>
        <View style={{ height: 8, borderRadius: 999, backgroundColor: theme.border, overflow: "hidden" }}>
          <View style={{ height: 8, width: `${((stepIndex + 1) / ONBOARDING_STEPS.length) * 100}%`, backgroundColor: theme.primary }} />
        </View>
        <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 24, fontWeight: "900" }}>{copyText(current.title, language)}</Text>
        <BodyText muted>{copyText(current.subtitle, language)}</BodyText>

        {current.key === "welcome" ? (
          <View style={{ gap: 10 }}>
            <Feather name="heart" color={theme.primary} size={32} />
            <BodyText>MoveInRange creates a conservative first plan from your goal, activity, limitations, equipment, and preferred time.</BodyText>
          </View>
        ) : null}

        {current.options ? (
          <OptionGrid
            options={current.options}
            multi={current.multi}
            selected={current.key === "goal" ? [draft.primaryGoal] : current.key === "activity" ? [draft.activityLevel] : current.key === "limitations" ? draft.limitations : draft.equipment}
            onSelect={choose}
            language={language}
          />
        ) : null}

        {showLimitationAreas ? (
          <View style={{ gap: 10 }}>
            <BodyText>Where should we be careful?</BodyText>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {BODY_AREAS.map((area) => <ChoiceChip key={area} label={area} selected={draft.limitationBodyAreas.includes(area)} onPress={() => patch({ limitationBodyAreas: toggleMulti(draft.limitationBodyAreas, area) })} />)}
            </View>
          </View>
        ) : null}

        {current.key === "pattern" ? (
          <View style={{ gap: 14 }}>
            <BodyText>Days per week</BodyText>
            <OptionGrid options={DAY_OPTIONS} selected={[draft.preferredDays]} onSelect={(preferredDays) => patch({ preferredDays })} language={language} />
            <BodyText>Usual session length</BodyText>
            <OptionGrid options={MINUTE_OPTIONS} selected={[draft.preferredMinutes]} onSelect={(preferredMinutes) => patch({ preferredMinutes })} language={language} />
          </View>
        ) : null}

        {current.key === "review_complete" ? (
          <View style={{ gap: 8 }}>
            {reviewRows(draft).map(([label, value]) => <BodyText key={label}>{label}: {value}</BodyText>)}
            <BodyText muted>Daily energy, sleep, pain, stress, and available time are checked later in readiness before each workout.</BodyText>
          </View>
        ) : null}

        {errors.map((error) => <BodyText key={error} muted>{error.replaceAll("_", " ")}</BodyText>)}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 1 }}><ActionButton label="Back" disabled={stepIndex === 0 || submit.isPending} onPress={back} /></View>
          <View style={{ flex: 1 }}>
            {stepIndex < ONBOARDING_STEPS.length - 1 ? (
              <ActionButton label="Continue" disabled={errors.length > 0} onPress={next} />
            ) : (
              <ActionButton label={submit.isPending ? "Creating plan..." : "Create my plan"} disabled={errors.length > 0 || submit.isPending} onPress={() => submit.mutate()} />
            )}
          </View>
        </View>
        <ErrorText error={onboarding.error ?? submit.error} />
      </Panel>
    </View>
  );
}
