"use client";

import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createFabricRoll } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatKes } from "@/lib/utils";
import type { FabricRoll } from "@/types/domain";

interface RollForm {
  fabricType: string;
  color: string;
  metersRemaining: number;
  costPerMeter: number;
  purchasedOn: string;
}

export function FabricRollsSection({ rolls }: { rolls: FabricRoll[] }) {
  const { businessId } = useBusinessContext();
  const { register, handleSubmit, reset } = useForm<RollForm>({
    defaultValues: {
      purchasedOn: new Date().toISOString().slice(0, 10),
      metersRemaining: 0,
      costPerMeter: 0,
    },
  });

  const saveRoll = handleSubmit(async (values) => {
    try {
      await createFabricRoll(businessId, { ...values, businessId });
      reset({
        purchasedOn: new Date().toISOString().slice(0, 10),
        metersRemaining: 0,
        costPerMeter: 0,
        fabricType: "",
        color: "",
      });
      toast.success("Fabric roll added");
    } catch {
      toast.error("Could not add roll");
    }
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fabric Rolls</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-3" onSubmit={saveRoll}>
          <Input placeholder="Fabric type (e.g. Cotton)" {...register("fabricType", { required: true })} />
          <Input placeholder="Color" {...register("color", { required: true })} />
          <Input type="number" step="0.1" placeholder="Meters remaining" {...register("metersRemaining", { valueAsNumber: true })} />
          <Input type="number" step="0.01" placeholder="Cost per meter" {...register("costPerMeter", { valueAsNumber: true })} />
          <Input type="date" {...register("purchasedOn")} />
          <Button type="submit">Add roll</Button>
        </form>

        <div className="space-y-2">
          {rolls.length === 0 ? (
            <p className="text-sm text-slate-500">No fabric rolls yet.</p>
          ) : (
            rolls.map((r) => (
              <div key={r.id} className="rounded-xl border px-3 py-2 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{r.fabricType}</p>
                  <Badge variant={r.metersRemaining < 10 ? "danger" : "default"}>
                    {r.metersRemaining}m
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {r.color} &middot; {formatKes(r.costPerMeter)}/m
                </p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
