import { useMemo, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import { loginUser, logoutUser, registerUser, requestPasswordReset, resetPassword } from "../../api";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "../validation/schemas";
import { ActionButton, BodyText, ChoiceChip, ErrorText, Panel, SecondaryLink, TextField } from "../shared/ui";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password" | "reset-password-success" | "session-expired";

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

  const loginValidation = useMemo(() => loginSchema.safeParse({ email, password, rememberSession }), [email, password, rememberSession]);
  const registerValidation = useMemo(() => registerSchema.safeParse({ preferredName, email, password, confirmPassword, acceptedTerms, marketingConsent }), [preferredName, email, password, confirmPassword, acceptedTerms, marketingConsent]);
  const forgotValidation = useMemo(() => forgotPasswordSchema.safeParse({ email }), [email]);
  const resetValidation = useMemo(() => resetPasswordSchema.safeParse({ token: resetToken, password, confirmPassword }), [resetToken, password, confirmPassword]);

  const login = useMutation({
    mutationFn: () => loginUser({ email, password }),
    onSuccess: () => router.replace("/onboarding")
  });
  const register = useMutation({
    mutationFn: () => registerUser({ preferredName, email, password, marketingConsent }),
    onSuccess: () => router.replace("/onboarding")
  });
  const forgot = useMutation({
    mutationFn: () => requestPasswordReset(email),
    onSuccess: (payload) => setResetRequestMessage(payload.development_reset_token ? `${payload.message} Development token: ${payload.development_reset_token}` : payload.message)
  });
  const reset = useMutation({
    mutationFn: () => resetPassword({ token: resetToken, password }),
    onSuccess: () => router.replace("/auth/reset-password-success")
  });
  const logout = useMutation({ mutationFn: logoutUser, onSuccess: () => router.replace("/auth/login") });

  if (mode === "session-expired") {
    return (
      <Panel title="Session expired">
        <BodyText>Your secure session expired. Sign in again to continue where you left off.</BodyText>
        <ActionButton label="Sign in again" onPress={() => router.replace("/auth/login")} />
      </Panel>
    );
  }

  if (mode === "forgot-password") {
    const errors = forgotValidation.success ? [] : forgotValidation.error.issues.map((issue) => issue.message);
    return (
      <Panel title="Reset password">
        <BodyText muted>Enter your email. If the account exists, MoveInRange will start the recovery flow.</BodyText>
        <TextField label="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
        {resetRequestMessage ? <BodyText>{resetRequestMessage}</BodyText> : null}
        <ActionButton label={forgot.isPending ? "Sending..." : "Send reset instructions"} disabled={!forgotValidation.success} onPress={() => forgot.mutate()} />
        <SecondaryLink href="/auth/reset-password" label="I have a reset token" />
        <SecondaryLink href="/auth/login" label="Back to sign in" />
        <ErrorText error={forgot.error} />
      </Panel>
    );
  }

  if (mode === "reset-password") {
    const errors = resetValidation.success ? [] : resetValidation.error.issues.map((issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`);
    return (
      <Panel title="Choose a new password">
        <TextField label="Reset token" value={resetToken} onChangeText={setResetToken} />
        <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <TextField label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
        <ChoiceChip label={showPassword ? "Hide password" : "Show password"} selected={showPassword} onPress={() => setShowPassword(!showPassword)} />
        {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
        <ActionButton label={reset.isPending ? "Updating..." : "Update password"} disabled={!resetValidation.success} onPress={() => reset.mutate()} />
        <SecondaryLink href="/auth/login" label="Back to sign in" />
        <ErrorText error={reset.error} />
      </Panel>
    );
  }

  if (mode === "reset-password-success") {
    return (
      <Panel title="Password updated">
        <BodyText>Your password has been changed and existing sessions were signed out.</BodyText>
        <ActionButton label="Sign in" onPress={() => router.replace("/auth/login")} />
      </Panel>
    );
  }

  if (mode === "register") {
    const errors = registerValidation.success ? [] : registerValidation.error.issues.map((issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`);
    return (
      <Panel title="Create your account">
        <TextField label="Preferred name" value={preferredName} onChangeText={setPreferredName} />
        <TextField label="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
        <TextField label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} />
        <View style={{ gap: 8 }}>
          <ChoiceChip label={showPassword ? "Hide password" : "Show password"} selected={showPassword} onPress={() => setShowPassword(!showPassword)} />
          <ChoiceChip label="I accept the terms and wellness limitation" selected={acceptedTerms} onPress={() => setAcceptedTerms(!acceptedTerms)} />
          <ChoiceChip label="Send me product updates" selected={marketingConsent} onPress={() => setMarketingConsent(!marketingConsent)} />
        </View>
        {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
        <ActionButton label={register.isPending ? "Creating account..." : "Create account"} disabled={!registerValidation.success} onPress={() => register.mutate()} />
        <SecondaryLink href="/auth/login" label="Already have an account? Sign in" />
        <ErrorText error={register.error} />
      </Panel>
    );
  }

  const errors = loginValidation.success ? [] : loginValidation.error.issues.map((issue) => `${String(issue.path[0] ?? "form")}: ${issue.message}`);
  return (
    <Panel title="Sign in">
      <TextField label="Email" keyboardType="email-address" value={email} onChangeText={setEmail} />
      <TextField label="Password" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} />
      <View style={{ gap: 8 }}>
        <ChoiceChip label={showPassword ? "Hide password" : "Show password"} selected={showPassword} onPress={() => setShowPassword(!showPassword)} />
        <ChoiceChip label="Remember this session" selected={rememberSession} onPress={() => setRememberSession(!rememberSession)} />
      </View>
      {errors.map((error) => <BodyText key={error} muted>{error}</BodyText>)}
      <ActionButton label={login.isPending ? "Signing in..." : "Sign in"} disabled={!loginValidation.success} onPress={() => login.mutate()} />
      <SecondaryLink href="/auth/register" label="Create an account" />
      <SecondaryLink href="/auth/forgot-password" label="Forgot password?" />
      {process.env.EXPO_PUBLIC_ENABLE_DEMO_LOGIN === "true" ? <BodyText muted>Development-only demo login is enabled for this build.</BodyText> : null}
      <ActionButton label="Clear saved session" onPress={() => logout.mutate()} />
      <ErrorText error={login.error ?? logout.error} />
    </Panel>
  );
}
