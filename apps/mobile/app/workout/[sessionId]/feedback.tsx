import { useLocalSearchParams } from "expo-router";
import { ProductWorkflowScreen } from "../../../src/screens/ProductWorkflowScreen";

export default function WorkoutFeedbackRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <ProductWorkflowScreen kind="workout-feedback" id={sessionId} />;
}
