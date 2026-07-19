import { useLocalSearchParams } from "expo-router";
import { ProductWorkflowScreen } from "../../../src/screens/ProductWorkflowScreen";

export default function WorkoutSymptomRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <ProductWorkflowScreen kind="workout-symptom" id={sessionId} />;
}
