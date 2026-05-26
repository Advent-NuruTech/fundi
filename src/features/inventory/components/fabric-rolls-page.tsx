"use client";

import { fabricRolls } from "../data/fabric-rolls.mock";
import { FabricRollCard } from "./fabric-roll-card";

export function FabricRollsPage() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">
          Fabric Roll Tracking
        </h1>

        <p className="text-gray-500">
          Track every fabric roll independently
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {fabricRolls.map((roll) => (
          <FabricRollCard
            key={roll.rollId}
            roll={roll}
          />
        ))}
      </div>
    </div>
  );
}