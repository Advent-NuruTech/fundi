export interface GrowthFeatureSignal {
  key: string;
  label: string;
  events: number;
  averageDailyBusinesses: number;
  repeatUse: number;
  adoptionPercent: number;
  status: "strong" | "watch" | "dormant" | "collecting";
}

export interface GrowthRecommendation {
  id: string;
  title: string;
  kind: "product" | "experience" | "revenue" | "reliability";
  evidence: string;
  expectedImpact: string;
  effort: "Low" | "Medium" | "High";
  expectedRoi: string;
  confidence: "Low" | "Medium" | "High";
  nextStep: string;
}

export interface GrowthIntelligenceReport {
  generatedAt: string;
  windowDays: number;
  privacy: {
    mode: "aggregated_only";
    tenantContentAccessed: false;
    description: string;
  };
  summary: {
    totalBusinesses: number;
    activeSubscriptions: number;
    trackedBusinessDailyAverage: number;
    aiHelpfulnessPercent: number | null;
    feedbackResponses: number;
    aiCostMarkupPercent: number;
    aiTargetMarkupPercent: number;
    aiMarkupOnTarget: boolean;
  };
  features: GrowthFeatureSignal[];
  strongestFeatures: GrowthFeatureSignal[];
  dormantFeatures: GrowthFeatureSignal[];
  supportThemes: Array<{ label: string; count: number }>;
  recommendations: GrowthRecommendation[];
}
