import { Image, Pressable, Text, View } from "react-native";
import { useState } from "react";
import { useTheme } from "../../theme";
import type { ExerciseMedia } from "./productTypes";

type Props = {
  media?: ExerciseMedia;
  title: string;
  section?: string;
  target?: string;
  size?: "compact" | "large" | "hero";
  animated?: boolean;
  onRetry?: () => void;
};

export function ExerciseMediaFrame({ media, title, section, target, size = "compact", animated = size !== "compact", onRetry }: Props) {
  const theme = useTheme();
  const [failed, setFailed] = useState(false);
  const height = size === "hero" ? 260 : size === "large" ? 210 : 120;
  const thumbnail = media?.thumbnail_url || media?.thumbnail || media?.image;
  const animation = media?.gif_url || media?.gif || media?.mp4;
  const uri = media?.playable && !failed ? (animated ? animation || thumbnail : thumbnail || animation) : "";
  if (uri && uri.startsWith("https://")) {
    return (
      <View style={{ minHeight: height, borderRadius: 8, overflow: "hidden", backgroundColor: theme.border }}>
        <Image source={{ uri }} accessibilityLabel={`${title} movement preview`} resizeMode="cover" onError={() => setFailed(true)} style={{ width: "100%", height }} />
        {!animated && animation ? (
          <View style={{ position: "absolute", right: 8, bottom: 8, borderRadius: 8, backgroundColor: `${theme.text}cc`, paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: theme.background, fontSize: 12, fontWeight: "800" }}>GIF in detail</Text>
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View
      accessibilityLabel={`${title} movement preview fallback`}
      style={{
        minHeight: height,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.border,
        backgroundColor: theme.surface,
        overflow: "hidden",
        padding: 14,
        justifyContent: "space-between"
      }}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ color: theme.primary, fontWeight: "800", textTransform: "uppercase", fontSize: 12 }}>{section ?? "Movement"}</Text>
        <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>{failed ? "Media retry available" : media?.raw_gif_path_present ? "Media pending review" : "Instruction guided"}</Text>
      </View>
      <View style={{ alignItems: "center", justifyContent: "center", minHeight: Math.max(44, height - 84), gap: 6 }}>
        <View style={{ width: height * 0.32, height: height * 0.32, borderRadius: height, backgroundColor: `${theme.primary}22`, borderColor: `${theme.primary}66`, borderWidth: 2 }} />
        <View style={{ width: height * 0.55, height: 10, borderRadius: 8, backgroundColor: `${theme.accent}66` }} />
        <View style={{ width: height * 0.38, height: 10, borderRadius: 8, backgroundColor: `${theme.info}66` }} />
      </View>
      <View>
        <Text numberOfLines={1} style={{ color: theme.text, fontWeight: "800" }}>{title}</Text>
        <Text numberOfLines={1} style={{ color: theme.muted }}>{target ?? "Controlled range"}</Text>
      </View>
      {failed && onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`Retry loading ${title} media`} onPress={() => { setFailed(false); onRetry(); }} style={{ minHeight: 36, alignItems: "center", justifyContent: "center", borderRadius: 8, borderColor: theme.border, borderWidth: 1 }}>
          <Text style={{ color: theme.primary, fontWeight: "800" }}>Retry media</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
