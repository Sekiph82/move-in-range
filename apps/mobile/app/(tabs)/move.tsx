import { ScrollView } from "react-native";
import { ExerciseLibraryScreen } from "../../src/features/exercises/ExerciseScreens";
import { useTheme } from "../../src/theme";

export default function MoveScreen() {
  const theme = useTheme();
  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.background }} contentContainerStyle={{ padding: 20, gap: 16 }}>
      <ExerciseLibraryScreen />
    </ScrollView>
  );
}
