import type { ReactNode } from "react";
import { TabBar } from "@/components/TabBar";
import { OnboardingGate } from "@/components/OnboardingGate";
import { SurvivalPrompt } from "@/components/SurvivalPrompt";

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <OnboardingGate />
      <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      <SurvivalPrompt />
      <TabBar />
    </div>
  );
}
