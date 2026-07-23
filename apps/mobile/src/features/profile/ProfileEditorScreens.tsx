import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api";
import { useTheme } from "../../theme";
import { ActionButton, BodyText, ChipGroup, ErrorText, LoadingState, Panel, TextField } from "../shared/ui";
import { OnboardingScreen } from "../onboarding/OnboardingScreen";

const genderOptions = ["Male", "Female", "Non-binary", "Prefer not to say"];
const medicalConditionOptions = ["Type 1 Diabetes", "Type 2 Diabetes", "Hypertension", "Joint discomfort", "Limited mobility"];

function ageFromDate(date?: string) {
  if (!date) return "Not saved";
  const born = new Date(date);
  if (Number.isNaN(born.getTime())) return "Not saved";
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const monthDelta = now.getMonth() - born.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < born.getDate())) age -= 1;
  return String(age);
}

function asList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function GeneralInformationScreen() {
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiFetch<any>("/profile") });
  const [editing, setEditing] = useState(false);
  const item = profile.data?.profile ?? {};
  const [name, setName] = useState("");
  const [gender, setGender] = useState("Prefer not to say");
  const [birthDate, setBirthDate] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [conditions, setConditions] = useState<string[]>([]);

  useEffect(() => {
    if (!profile.isSuccess || editing) return;
    setName(item.preferred_name ?? "");
    setGender(item.gender ?? "Prefer not to say");
    setBirthDate(item.date_of_birth ?? "");
    setHeight(item.height_cm ? String(item.height_cm) : item.height ? String(item.height) : "");
    setWeight(item.weight_kg ? String(item.weight_kg) : item.weight ? String(item.weight) : "");
    setConditions(asList(item.conditions));
  }, [editing, item, profile.isSuccess]);

  const save = useMutation({
    mutationFn: () => apiFetch("/profile/general", {
      method: "PUT",
      body: JSON.stringify({ payload: {
        preferred_name: name || item.preferred_name || "MoveInRange user",
        conditions,
        height: Number(height) || undefined,
        weight: Number(weight) || undefined,
        units: "metric",
        gender,
        date_of_birth: birthDate,
        height_cm: Number(height) || undefined,
        weight_kg: Number(weight) || undefined
      }})
    }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditing(false);
    }
  });

  if (profile.isLoading) return <LoadingState label="Loading general information" />;
  if (!editing) {
    return (
      <Panel title="General Information">
        <BodyText>Name: {item.preferred_name ?? "Not saved"}</BodyText>
        <BodyText>Gender: {item.gender ?? "Not saved"}</BodyText>
        <BodyText>Date of birth: {item.date_of_birth ?? "Not saved"}</BodyText>
        <BodyText>Age: {ageFromDate(item.date_of_birth)}</BodyText>
        <BodyText>Height: {item.height_cm ?? item.height ?? "Not saved"}{item.height_cm || item.height ? " cm" : ""}</BodyText>
        <BodyText>Weight: {item.weight_kg ?? item.weight ?? "Not saved"}{item.weight_kg || item.weight ? " kg" : ""}</BodyText>
        <BodyText>Medical conditions: {asList(item.conditions).join(", ") || "None saved"}</BodyText>
        <ActionButton label="Edit information" onPress={() => setEditing(true)} />
      </Panel>
    );
  }

  return (
    <Panel title="Edit information">
      <TextField label="Name" value={name} onChangeText={setName} />
      <BodyText>Gender</BodyText>
      <ChipGroup labels={genderOptions} selected={[gender]} onToggle={setGender} />
      <TextField label="Date of birth YYYY-MM-DD" value={birthDate} onChangeText={setBirthDate} />
      <TextField label="Height cm" value={height} onChangeText={setHeight} keyboardType="number-pad" />
      <TextField label="Weight kg" value={weight} onChangeText={setWeight} keyboardType="number-pad" />
      <BodyText>Medical conditions</BodyText>
      <ChipGroup labels={medicalConditionOptions} selected={conditions} onToggle={(value) => setConditions(conditions.includes(value) ? conditions.filter((item) => item !== value) : [...conditions, value])} />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}><ActionButton label="Cancel" onPress={() => setEditing(false)} /></View>
        <View style={{ flex: 1 }}><ActionButton label={save.isPending ? "Saving..." : "Save changes"} disabled={save.isPending} onPress={() => save.mutate()} /></View>
      </View>
      <ErrorText error={profile.error ?? save.error} />
    </Panel>
  );
}

export function MovementProfileScreen() {
  const theme = useTheme();
  const profile = useQuery({ queryKey: ["profile"], queryFn: () => apiFetch<any>("/profile") });
  const [editing, setEditing] = useState(false);
  const item = profile.data?.profile ?? {};
  if (profile.isLoading) return <LoadingState label="Loading movement profile" />;
  if (editing) return <OnboardingScreen mode="edit" returnTo="/onboarding-edit" />;
  return (
    <Panel title="Movement Profile">
      <BodyText>Goal: {asList(item.goals)[0] ?? "Not saved"}</BodyText>
      <BodyText>Limitations: {asList(item.movement_limitations).join(", ") || asList(item.conditions).join(", ") || "None saved"}</BodyText>
      <BodyText>Body areas: {asList(item.limitation_body_areas).join(", ") || "None saved"}</BodyText>
      <BodyText>Equipment: {asList(item.equipment).join(", ") || "Bodyweight"}</BodyText>
      <BodyText>Training: {item.preferred_days_per_week ?? "3"} days per week</BodyText>
      <BodyText>Duration: {item.preferred_minutes ?? item.normal_session_duration ?? 15} minutes</BodyText>
      <ActionButton label="Edit movement profile" onPress={() => setEditing(true)} />
      <View style={{ borderTopColor: theme.border, borderTopWidth: 1, paddingTop: 10 }}>
        <BodyText muted>Regenerate future plans only after explicit confirmation from the plan generation screen.</BodyText>
        <ActionButton label="Regenerate future plans" onPress={() => router.push("/generate-plan?scope=weekly&source=movement-profile&returnTo=/onboarding-edit" as never)} />
      </View>
      <ErrorText error={profile.error} />
    </Panel>
  );
}
