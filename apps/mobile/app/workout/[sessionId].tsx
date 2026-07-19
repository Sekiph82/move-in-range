import { useLocalSearchParams } from "expo-router";
import { ProductWorkflowScreen } from "../../src/screens/ProductWorkflowScreen";

export default function WorkoutRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <ProductWorkflowScreen kind="workout" id={sessionId} />;
}
