import { type ReactNode, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ApiClientError, loginUser, logoutUser, registerUser, requestPasswordReset, resetPassword } from "../../api";
import { useTheme } from "../../theme";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../validation/schemas";
import { ActionButton, BodyText, ChoiceChip, ErrorText, Panel, SecondaryLink, TextField } from "../shared/ui";
import { LOGIN_ROUTE, ONBOARDING_ROUTE, REGISTER_ROUTE } from "./sessionGate";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password" | "reset-password-success" | "session-expired";

function AuthShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentInsetAdjustmentBehavior="automatic"
        style={{ flex: 1, backgroundColor: theme.background }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: Math.max(24, insets.top + 16), paddingBottom: Math.max(32, insets.bottom + 24), gap: 14 }}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function CompactToggle({ label, description, selected, onPress, icon = "check-square" }: { label: string; description?: string; selected: boolean; onPress: () => void; icon?: keyof typeof Feather.glyphMap }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 }}
    >
      <Feather name={selected ? icon : "square"} color={selected ? theme.primary : theme.muted} size={22} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: "800" }}>{label}</Text>
        {description ? <Text style={{ color: theme.muted, fontSize: 12 }}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

function connectionError(error: unknown) {
  return error instanceof ApiClientError && ["offline", "timeout", "unavailable"].includes(error.kind);
}

function AuthErrorState({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  if (!error) return null;
  if (!connectionError(error)) return <ErrorText error={error} />;
  return (
    <View accessibilityRole="alert" style={{ gap: 8 }}>
      <BodyText>Unable to connect</BodyText>
      <BodyText muted>We couldn't reach MoveInRange. Check your connection and try again.</BodyText>
      <ActionButton label="Retry" onPress={onRetry} />
    </View>
  );
}

export function AuthScreen({ mode = "login" }: { mode?: AuthMode }) {
  const params = useLocalSearchParams<{ token?: string }>();
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState(params.token ?? "");
  const [resetRequestMessage, setResetRequestMessage] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const enableSessionReset = process.env.NODE_ENV !== "production" && process.env.EXPO_PUBLIC_ENABLE_SESSION_RESET === "true";
  const theme = useTheme();

  const loginValidation = useMemo(() => loginSchema.safeParse({ email, password, rememberSession }), [email, password, rememberSession]);
  const registerValidation = useMemo(() => registerSchema.safeParse({ preferredName, email, password, confirmPassword, acceptedTerms, marketingConsent }), [preferredName, email, password, confirmPassword, acceptedTerms, marketingConsent]);
  const forgotValidation = useMemo(() => forgotPasswordSchema.safeParse({ email }), [email]);
  const resetValidation = useMemo(() => resetPasswordSchema.safeParse({ token: resetToken, password, confirmPassword }), [resetToken, password, confirmPassword]);

  const login = useMutation({
    mutationFn: () => loginUser({ email, password }),
    onSuccess: () => router.replace(ONBOARDING_ROUTE)
  });
  const register = useMutation({
    mutationFn: () => registerUser({ preferredName, email, password, marketingConsent }),
    onSuccess: () => router.replace(ONBOARDING_ROUTE)
  });
  const forgot = useMutation({
    mutationFn: () => requestPasswordReset(email),
    onSuccess: (payload) => setResetRequestMessage(payload.message)
  });
  const reset = useMutation({
    mutationFn: () => resetPassword({ token: resetToken, password }),
    onSuccess: () => router.replace("/auth/reset-password-success")
  });
  const logout = useMutation({ mutationFn: logoutUser, onSuccess: () => router.replace(LOGIN_ROUTE) });

  if (mode === "session-expired") {
    return (
      <AuthShell>
        <Panel title="Session expired">
          <BodyText>Your secure session expired. Sign in again to continue where you left off.</BodyText>
          <ActionButton label="Sign in again" onPress={() => router.replace(LOGIN_ROUTE)} />
        </Panel>
      </AuthShell>
    );
  }

  if (mode === "forgot-password") {
    const errors = forgotValidation.success ? [] : forgotValidation.error.issues.map((issue) => issue.message);
    return (
      <AuthShell>
        <Panel title="Reset password">
          <BodyText muted>Enter your email. If the account exists, MoveInRange will start the recovery flow.</BodyText>
          <TextField label="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
          {resetRequestMessage ? <BodyText>{resetRequestMessage}</BodyText> : null}
          <ActionButton label={forgot.isPending ? "Sending..." : "Send reset instructions"} disabled={!forgotValidation.success} onPress={() => forgot.mutate()} />
          <SecondaryLink href="/auth/reset-password" label="I have a reset token" />
          <SecondaryLink href={LOGIN_ROUTE} label="Back to sign in" />
          <AuthErrorState error={forgot.error} onRetry={() => forgot.mutate()} />
        </Panel>
      </AuthShell>
    );
  }

  if (mode === "reset-password") {
    const errors = resetValidation.success ? [] : resetValidation.error.issues.map((issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`);
    return (
      <AuthShell>
        <Panel title="Choose a new password">
          <TextField label="Reset token" value={resetToken} onChangeText={setResetToken} />
          <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TextField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
          <CompactToggle label={showPassword ? "Hide password" : "Show password"} selected={showPassword} onPress={() => setShowPassword(!showPassword)} icon={showPassword ? "eye-off" : "eye"} />
          {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
          <ActionButton label={reset.isPending ? "Updating..." : "Update password"} disabled={!resetValidation.success} onPress={() => reset.mutate()} />
          <SecondaryLink href={LOGIN_ROUTE} label="Back to sign in" />
          <AuthErrorState error={reset.error} onRetry={() => reset.mutate()} />
        </Panel>
      </AuthShell>
    );
  }

  if (mode === "reset-password-success") {
    return (
      <AuthShell>
        <Panel title="Password updated">
          <BodyText>Your password has been changed and existing sessions were signed out.</BodyText>
          <ActionButton label="Sign in" onPress={() => router.replace(LOGIN_ROUTE)} />
        </Panel>
      </AuthShell>
    );
  }

  if (mode === "register") {
    const errors = registerValidation.success ? [] : registerValidation.error.issues.map((issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`);
    return (
      <AuthShell>
        <Panel title="Create your account">
          <TextField label="Preferred name" value={preferredName} onChangeText={setPreferredName} />
          <TextField label="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
          <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
          <View style={{ gap: 4 }}>
            <CompactToggle label={showPassword ? "Hide password" : "Show password"} selected={showPassword} onPress={() => setShowPassword(!showPassword)} icon={showPassword ? "eye-off" : "eye"} />
            <ChoiceChip label="I accept the terms and wellness limitation" selected={acceptedTerms} onPress={() => setAcceptedTerms(!acceptedTerms)} />
            <ChoiceChip label="Send me product updates" selected={marketingConsent} onPress={() => setMarketingConsent(!marketingConsent)} />
          </View>
          {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
          <ActionButton label={register.isPending ? "Creating account..." : "Create account"} disabled={!registerValidation.success} onPress={() => register.mutate()} />
          <SecondaryLink href={LOGIN_ROUTE} label="Already have an account? Sign in" />
          <AuthErrorState error={register.error} onRetry={() => register.mutate()} />
        </Panel>
      </AuthShell>
    );
  }

  const errors = loginValidation.success ? [] : loginValidation.error.issues.map((issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`);
  return (
    <AuthShell>
      <Panel title="Sign in">
        <TextField label="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <View style={{ gap: 4 }}>
          <CompactToggle label={showPassword ? "Hide password" : "Show password"} selected={showPassword} onPress={() => setShowPassword(!showPassword)} icon={showPassword ? "eye-off" : "eye"} />
          <CompactToggle label="Remember this session" description="Keep this device signed in." selected={rememberSession} onPress={() => setRememberSession(!rememberSession)} />
        </View>
        {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
        <ActionButton label={login.isPending ? "Signing in..." : "Sign in"} disabled={!loginValidation.success} onPress={() => login.mutate()} />
        <SecondaryLink href={REGISTER_ROUTE} label="Create an account" />
        <SecondaryLink href="/auth/forgot-password" label="Forgot password?" />
        {process.env.EXPO_PUBLIC_ENABLE_DEMO_LOGIN === "true" ? <BodyText muted>Development-only demo login is enabled for this build.</BodyText> : null}
        {enableSessionReset ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear saved session" onPress={() => logout.mutate()} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ color: theme.muted, fontWeight: "700" }}>Clear saved session</Text>
          </Pressable>
        ) : null}
        <AuthErrorState error={login.error ?? logout.error} onRetry={() => login.mutate()} />
      </Panel>
    </AuthShell>
  );
}
