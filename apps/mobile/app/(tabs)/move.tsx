import { ExerciseLibraryScreen } from "../../src/features/exercises/ExerciseScreens";
import { TabScreenScroll } from "../../src/features/shared/ui";

export default function MoveScreen() {
  return (
    <TabScreenScroll testID="move-tab-scroll">
      <ExerciseLibraryScreen />
    </TabScreenScroll>
  );
}
