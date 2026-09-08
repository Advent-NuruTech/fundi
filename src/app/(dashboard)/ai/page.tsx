"use client";

import { useAuth } from "@/features/auth/components/auth-context";
import { AiChat } from "@/modules/ai/components/ai-chat";

export default function AiAssistantPage() {
  const { user, business } = useAuth();
  const businessName = business?.name || (user?.name ? `${user.name.split(" ")[0]}'s business` : "Your business");

  return (
    <div className="h-[calc(100dvh-7.5rem)] min-h-[540px]">
      <h1 className="sr-only">{businessName} private business advisor</h1>
      <AiChat businessName={businessName} />
    </div>
  );
}
