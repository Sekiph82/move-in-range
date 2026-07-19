import { type ReactNode } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Link, router } from "expo-router";
import { useTheme } from "../../theme";

export function ActionButton({ label, onPress, disabled, tone = "primary" }: { label: string; onPress: () => void; disabled?: boolean; tone?: "primary" | "safety" }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={{
        minHeight: 48,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: tone === "safety" ? theme.safety : theme.primary,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: 14
      }}
    >
      <Text style={{ color: theme.surface, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryLink({ href, label }: { href: string; label: string }) {
  const theme = useTheme();
  return (
    <Link href={href as never} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={label} style={{ minHeight: 44, justifyContent: "center" }}>
        <Text style={{ color: theme.primary, fontWeight: "700" }}>{label}</Text>
      </Pressable>
    </Link>
  );
}

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={{ backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderRadius: 8, padding: 16, gap: 10 }}>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 18, fontWeight: "700" }}>{title}</Text>
      {children}
    </View>
  );
}

export function BodyText({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  const theme = useTheme();
  return <Text style={{ color: muted ? theme.muted : theme.text, lineHeight: 21 }}>{children}</Text>;
}

export function ErrorText({ error }: { error: unknown }) {
  const theme = useTheme();
  if (!error) return null;
  const message = error instanceof Error ? error.message : String(error);
  return <Text accessibilityRole="alert" style={{ color: theme.safety }}>{message}</Text>;
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <View accessibilityLabel={label} style={{ minHeight: 56, justifyContent: "center" }}>
      <ActivityIndicator />
    </View>
  );
}

export function TextField({ label, value, onChangeText, keyboardType = "default", multiline = false }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "number-pad" | "email-address"; multiline?: boolean }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ color: theme.text, fontWeight: "700" }}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        style={{
          minHeight: multiline ? 84 : 48,
          borderColor: theme.border,
          borderWidth: 1,
          borderRadius: 8,
          padding: 12,
          color: theme.text,
          textAlignVertical: multiline ? "top" : "center"
        }}
      />
    </View>
  );
}

export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{
        minHeight: 42,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
        backgroundColor: selected ? `${theme.primary}22` : theme.surface,
        justifyContent: "center",
        paddingHorizontal: 12
      }}
    >
      <Text style={{ color: theme.text, fontWeight: selected ? "700" : "500" }}>{label}</Text>
    </Pressable>
  );
}

export function ChipGroup({ labels, selected, onToggle }: { labels: string[]; selected: string[]; onToggle: (label: string) => void }) {
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {labels.map((label) => <ChoiceChip key={label} label={label} selected={selected.includes(label)} onPress={() => onToggle(label)} />)}
    </View>
  );
}

export function RouteHeader({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.canGoBack() ? router.back() : router.replace("/(tabs)")}>
        <Text style={{ color: theme.primary, fontWeight: "700" }}>Back</Text>
      </Pressable>
      <Text accessibilityRole="header" style={{ color: theme.text, fontSize: 28, fontWeight: "700" }}>{title}</Text>
      <Text style={{ color: theme.muted, fontSize: 16 }}>{subtitle}</Text>
    </View>
  );
}

export function RouteScaffold({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const theme = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <RouteHeader title={title} subtitle={subtitle} />
      {children}
      <Panel title="Next actions">
        <SecondaryLink href="/readiness" label="Readiness" />
        <SecondaryLink href="/daily-plan" label="Daily plan" />
        <SecondaryLink href="/exercises" label="Exercise library" />
        <SecondaryLink href="/privacy" label="Privacy" />
      </Panel>
    </ScrollView>
  );
}
