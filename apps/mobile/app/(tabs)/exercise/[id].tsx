import { useLocalSearchParams } from "expo-router";
import { ProductWorkflowScreen } from "../../../src/screens/ProductWorkflowScreen";

export default function ExerciseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <ProductWorkflowScreen kind="exercise-detail" id={id} />;
}
