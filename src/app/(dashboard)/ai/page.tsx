"use client";

import { Sparkles } from "lucide-react";
import { useAuth } from "@/features/auth/components/auth-context";
import { AiChat } from "@/modules/ai/components/ai-chat";

export default function AiAssistantPage() {
  const { user, business } = useAuth();

  const businessName = business?.name || (user?.name ? `${user.name.split(" ")[0]}'s business` : "Your business");

  return (
    <div className="flex h-[calc(100vh-8.5rem)] min-h-[520px] flex-col">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">AI Assistant</h1>
            <p className="text-xs text-slate-500">
              {businessName} Assistant — your AI business partner, always on.
            </p>
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <AiChat businessName={businessName} />
      </div>
    </div>
  );
}
