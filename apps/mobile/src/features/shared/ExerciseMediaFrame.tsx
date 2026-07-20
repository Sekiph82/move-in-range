import { Image, Text, View } from "react-native";
import { useTheme } from "../../theme";
import type { ExerciseMedia } from "./productTypes";

type Props = {
  media?: ExerciseMedia;
  title: string;
  section?: string;
  target?: string;
  size?: "compact" | "large" | "hero";
};

export function ExerciseMediaFrame({ media, title, section, target, size = "compact" }: Props) {
  const theme = useTheme();
  const height = size === "hero" ? 260 : size === "large" ? 210 : 120;
  const uri = media?.playable ? media.mp4 || media.gif || media.image || media.thumbnail : "";
  if (uri) {
    return (
      <View style={{ minHeight: height, borderRadius: 8, overflow: "hidden", backgroundColor: theme.border }}>
        <Image source={{ uri }} accessibilityLabel={`${title} movement preview`} resizeMode="cover" style={{ width: "100%", height }} />
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
        <Text style={{ color: theme.muted, fontWeight: "700", fontSize: 12 }}>{media?.raw_gif_path_present ? "Media pending review" : "Instruction guided"}</Text>
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
    </View>
  );
}
