import { useLocalSearchParams } from "expo-router";
import { ProductWorkflowScreen } from "../../../src/screens/ProductWorkflowScreen";

export default function WorkoutPainRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <ProductWorkflowScreen kind="workout-pain" id={sessionId} />;
}
