import { useRouter } from "expo-router";

import HomeLoading from "../components/HomeLoading";
import HomeScreen from "../components/HomeScreen";
import { useHomeGate } from "../hooks/useHomeGate";

export default function HomeRoute() {
  const router = useRouter();
  const gate = useHomeGate();

  if (gate.status === "loading") {
    return <HomeLoading />;
  }

  return (
    <HomeScreen onOpenSettings={() => router.push("/settings")} />
  );
}
