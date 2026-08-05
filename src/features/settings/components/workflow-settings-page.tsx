"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  GripVertical,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Pencil,
  Save,
  RotateCcw,
  Shield,
  Bell,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/features/auth/components/auth-context";
import { canAccessSettings } from "@/lib/db";
import {
  listenProductionStages,
  saveProductionStages,
  getProductionStages,
} from "@/services/firestore.service";
import type { ProductionStageConfig, StageMilestone } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const MAX_STAGES = 20;

const STAGE_COLORS = [
  "bg-slate-500",
  "bg-sky-500",
  "bg-blue-500",
  "bg-indigo-500",
  "bg-violet-500",
  "bg-fuchsia-500",
  "bg-pink-500",
  "bg-rose-500",
  "bg-orange-500",
  "bg-amber-500",
  "bg-lime-500",
  "bg-green-600",
  "bg-emerald-500",
  "bg-teal-500",
  "bg-cyan-500",
];

const PRESET_STAGES: Array<{
  name: string;
  description: string;
  color: string;
  notifyCustomer: boolean;
  milestone: StageMilestone;
}> = [
  { name: "Cutting", description: "Garment has been cut from fabric", color: "bg-sky-500", notifyCustomer: false, milestone: "none" },
  { name: "Stitching", description: "Garment is being stitched or sewn", color: "bg-blue-500", notifyCustomer: false, milestone: "none" },
  { name: "Fitting", description: "Garment is being fitted on the customer", color: "bg-indigo-500", notifyCustomer: false, milestone: "none" },
  { name: "Finishing", description: "Final touches and finishing work", color: "bg-violet-500", notifyCustomer: false, milestone: "none" },
  { name: "Ready for Pickup", description: "Order is complete and awaiting collection", color: "bg-emerald-500", notifyCustomer: true, milestone: "ready_for_pickup" },
  { name: "Delivered", description: "Order has been delivered to the customer", color: "bg-green-600", notifyCustomer: true, milestone: "delivered" },
];

const MILESTONE_LABELS: Record<StageMilestone, string> = {
  none: "No milestone",
  ready_for_pickup: "Ready for Pickup",
  delivered: "Delivered",
};

export function WorkflowSettingsPage() {
  const { user, business } = useAuth();
  const canAccess = canAccessSettings(user?.role || "");
  const [stages, setStages] = useState<ProductionStageConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editMilestone, setEditMilestone] = useState<StageMilestone>("none");
  const [editColor, setEditColor] = useState("bg-slate-500");
  const dragIndexRef = useRef<number | null>(null);

  // Add-stage form state
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newColor, setNewColor] = useState("bg-sky-500");
  const [newNotify, setNewNotify] = useState(false);
  const [newMilestone, setNewMilestone] = useState<StageMilestone>("none");

  const businessId = user?.businessId ?? business?.id ?? "";

  useEffect(() => {
    if (!businessId) return;
    setLoading(true);
    const off = listenProductionStages(businessId, (rows) => {
      setStages(rows);
      setLoading(false);
    });
    getProductionStages(businessId)
      .then(setStages)
      .finally(() => setLoading(false));
    return off;
  }, [businessId]);

  const markDirty = useCallback(() => setDirty(true), []);

  const moveStage = useCallback(
    (index: number, dir: -1 | 1) => {
      setStages((prev) => {
        const next = [...prev];
        const target = index + dir;
        if (target < 0 || target >= next.length) return prev;
        [next[index], next[target]] = [next[target], next[index]];
        return next;
      });
      markDirty();
    },
    [markDirty]
  );

  const updateStage = useCallback(
    (index: number, patch: Partial<ProductionStageConfig>) => {
      setStages((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
      markDirty();
    },
    [markDirty]
  );

  const toggleActive = useCallback(
    (index: number) => {
      setStages((prev) => prev.map((s, i) => (i === index ? { ...s, isActive: !s.isActive } : s)));
      markDirty();
    },
    [markDirty]
  );

  const toggleNotify = useCallback(
    (index: number) => {
      setStages((prev) => prev.map((s, i) => (i === index ? { ...s, notifyCustomer: !s.notifyCustomer } : s)));
      markDirty();
    },
    [markDirty]
  );

  const addStage = useCallback(() => {
    if (stages.length >= MAX_STAGES) {
      toast.error(`A business can have at most ${MAX_STAGES} production stages`);
      return;
    }
    if (!newName.trim()) {
      toast.error("Stage name is required");
      return;
    }
    if (stages.some((s) => s.name.toLowerCase() === newName.trim().toLowerCase())) {
      toast.error("A stage with that name already exists");
      return;
    }
    setStages((prev) => [
      ...prev,
      {
        id: "",
        businessId,
        name: newName.trim(),
        description: newDescription.trim() || undefined,
        color: newColor,
        icon: undefined,
        isActive: true,
        notifyCustomer: newNotify,
        milestone: newMilestone,
        displayOrder: prev.length + 1,
        isSeeded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    setNewName("");
    setNewDescription("");
    setNewColor("bg-sky-500");
    setNewNotify(false);
    setNewMilestone("none");
    setAddOpen(false);
    markDirty();
  }, [stages, newName, newDescription, newColor, newNotify, newMilestone, businessId, markDirty]);

  const addPreset = useCallback(
    (preset: (typeof PRESET_STAGES)[number]) => {
      if (stages.length >= MAX_STAGES) {
        toast.error(`A business can have at most ${MAX_STAGES} production stages`);
        return;
      }
      if (stages.some((s) => s.name.toLowerCase() === preset.name.toLowerCase())) {
        toast.error(`"${preset.name}" is already in your workflow`);
        return;
      }
      setStages((prev) => [
        ...prev,
        {
          id: "",
          businessId,
          name: preset.name,
          description: preset.description,
          color: preset.color,
          icon: undefined,
          isActive: true,
          notifyCustomer: preset.notifyCustomer,
          milestone: preset.milestone,
          displayOrder: prev.length + 1,
          isSeeded: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]);
      markDirty();
    },
    [stages, businessId, markDirty]
  );

  const removeStage = useCallback(
    (index: number) => {
      setStages((prev) => prev.filter((_, i) => i !== index));
      markDirty();
    },
    [markDirty]
  );

  const resetToDefaults = useCallback(() => {
    setStages(
      PRESET_STAGES.map((p, i) => ({
        id: "",
        businessId,
        name: p.name,
        description: p.description,
        color: p.color,
        icon: undefined,
        isActive: true,
        notifyCustomer: p.notifyCustomer,
        milestone: p.milestone,
        displayOrder: i + 1,
        isSeeded: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))
    );
    setDirty(true);
  }, [businessId]);

  const handleSave = async () => {
    if (stages.length === 0) {
      toast.error("Add at least one production stage");
      return;
    }
    if (stages.some((s) => !s.name.trim())) {
      toast.error("Every stage needs a name");
      return;
    }
    setSaving(true);
    try {
      await saveProductionStages(businessId, stages.map((s) => ({
        id: s.id || undefined,
        name: s.name,
        description: s.description,
        color: s.color,
        icon: s.icon,
        isActive: s.isActive,
        notifyCustomer: s.notifyCustomer,
        milestone: s.milestone,
      })));
      setDirty(false);
      toast.success("Production workflow saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save workflow");
    } finally {
      setSaving(false);
    }
  };

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <Shield className="mb-4 h-16 w-16 text-gray-300" />
        <p className="text-xl font-bold">Access Restricted</p>
        <p className="mt-2 text-sm">Only business admins and managers can edit settings.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Production Workflow</h1>
          <p className="text-gray-500">
            Design your order pipeline — the stages every order moves through.
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-3 py-1 text-sm font-medium",
            stages.length >= MAX_STAGES ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
          )}
        >
          {stages.length} / {MAX_STAGES} stages
        </span>
      </div>

      {loading ? (
        <div className="rounded-3xl border bg-white p-12 text-center text-sm text-gray-500">
          Loading your workflow…
        </div>
      ) : (
        <>
          {/* Quick-add presets */}
          <div className="rounded-3xl border bg-white p-6">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              <h2 className="font-bold">Add a stage</h2>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Start from a preset, or add your own custom stage.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {PRESET_STAGES.map((p) => (
                <button
                  key={p.name}
                  onClick={() => addPreset(p)}
                  disabled={stages.length >= MAX_STAGES}
                  className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition hover:border-emerald-400 hover:bg-emerald-50 disabled:opacity-50"
                >
                  <span className={cn("h-2.5 w-2.5 rounded-full", p.color)} />
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-1.5 rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
                disabled={stages.length >= MAX_STAGES}
              >
                <Plus className="h-4 w-4" />
                Custom stage
              </button>
            </div>
          </div>

          {/* Stage list */}
          <div className="rounded-3xl border bg-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-bold">Order of production</h2>
              <p className="text-xs text-gray-500">Drag or use the arrows to reorder</p>
            </div>

            {stages.length === 0 ? (
              <p className="mt-6 rounded-2xl bg-neutral-50 py-10 text-center text-sm text-gray-500">
                No stages yet. Add your first production stage above.
              </p>
            ) : (
              <div className="mt-4 space-y-2">
                {stages.map((stage, index) => (
                  <div
                    key={stage.id || `new-${index}`}
                    draggable
                    onDragStart={() => { dragIndexRef.current = index; }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      const from = dragIndexRef.current;
                      dragIndexRef.current = null;
                      if (from === null || from === index) return;
                      setStages((prev) => {
                        const next = [...prev];
                        const [item] = next.splice(from, 1);
                        next.splice(index, 0, item);
                        return next;
                      });
                      markDirty();
                    }}
                    onDragEnd={() => { dragIndexRef.current = null; }}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border px-4 py-3 transition",
                      stage.isActive ? "bg-white" : "bg-neutral-50 opacity-60"
                    )}
                  >
                    <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-300" />
                    <span className="w-5 text-center text-xs font-bold text-slate-400">{index + 1}</span>
                    <span className={cn("h-3 w-3 shrink-0 rounded-full", stage.color ?? "bg-slate-400")} />

                    <div className="min-w-0 flex-1">
                      {editingIndex === index ? (
                        <div className="space-y-2">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            placeholder="Stage name"
                            className="h-9 w-full rounded-xl border px-3 text-sm outline-none focus:border-black"
                          />
                          <input
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="h-9 w-full rounded-xl border px-3 text-sm outline-none focus:border-black"
                          />
                          <div className="flex items-center gap-3">
                            <select
                              value={editMilestone}
                              onChange={(e) => setEditMilestone(e.target.value as StageMilestone)}
                              className="h-9 rounded-xl border px-2 text-sm outline-none focus:border-black"
                            >
                              <option value="none">No milestone</option>
                              <option value="ready_for_pickup">Ready for Pickup</option>
                              <option value="delivered">Delivered</option>
                            </select>
                            <div className="flex flex-wrap gap-1">
                              {STAGE_COLORS.slice(0, 8).map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => updateStage(index, { color: c })}
                                  className={cn("h-5 w-5 rounded-full", c, editColor === c && "ring-2 ring-black ring-offset-1")}
                                />
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                if (editName.trim()) updateStage(index, { name: editName.trim(), description: editDescription.trim() || undefined });
                                setEditingIndex(null);
                              }}
                              className="ml-auto rounded-lg bg-black px-3 py-1.5 text-xs font-medium text-white"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingIndex(null)}
                              className="rounded-lg border px-2.5 py-1.5 text-xs"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium">{stage.name}</p>
                          {stage.description && (
                            <p className="truncate text-xs text-gray-500">{stage.description}</p>
                          )}
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {stage.milestone !== "none" && (
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                  stage.milestone === "delivered"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-emerald-100 text-emerald-700"
                                )}
                              >
                                {MILESTONE_LABELS[stage.milestone]}
                              </span>
                            )}
                            <button
                              onClick={() => toggleNotify(index)}
                              className={cn(
                                "flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition",
                                stage.notifyCustomer
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              )}
                              title={stage.notifyCustomer ? "Customers get an SMS when an order reaches this stage" : "No SMS is sent for this stage"}
                            >
                              <Bell className="h-3 w-3" />
                              {stage.notifyCustomer ? "Notify customer" : "No SMS"}
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {editingIndex !== index && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => { setEditingIndex(index); setEditName(stage.name); setEditDescription(stage.description ?? ""); setEditMilestone(stage.milestone); setEditColor(stage.color ?? "bg-slate-500"); }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveStage(index, -1)}
                          disabled={index === 0}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => moveStage(index, 1)}
                          disabled={index === stages.length - 1}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => toggleActive(index)}
                          className={cn(
                            "relative ml-1 h-5 w-9 rounded-full transition",
                            stage.isActive ? "bg-emerald-500" : "bg-slate-300"
                          )}
                          title={stage.isActive ? "Active (click to disable)" : "Disabled (click to enable)"}
                        >
                          <span
                            className={cn(
                              "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
                              stage.isActive ? "left-[18px]" : "left-0.5"
                            )}
                          />
                        </button>
                        <button
                          onClick={() => removeStage(index)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                          title="Remove stage"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save bar */}
          <div className="flex items-center justify-between rounded-3xl border bg-white p-4">
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 text-sm text-slate-500 transition hover:text-slate-800"
            >
              <RotateCcw className="h-4 w-4" />
              Restore default workflow
            </button>
            <Button onClick={handleSave} disabled={saving || !dirty}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Workflow"}
            </Button>
          </div>
        </>
      )}

      {/* Custom stage dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} title="Add custom stage">
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Stage name</label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Embroidery"
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optional)</label>
            <input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="What happens at this stage?"
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Milestone</label>
            <select
              value={newMilestone}
              onChange={(e) => setNewMilestone(e.target.value as StageMilestone)}
              className="h-12 w-full rounded-2xl border px-4 text-sm outline-none focus:border-black"
            >
              <option value="none">No milestone</option>
              <option value="ready_for_pickup">Ready for Pickup</option>
              <option value="delivered">Delivered</option>
            </select>
            <p className="text-xs text-gray-500">
              {newMilestone === "ready_for_pickup" && "Orders reaching this stage trigger the pickup SMS to the customer."}
              {newMilestone === "delivered" && "Orders reaching this stage count as completed/delivered."}
              {newMilestone === "none" && "A normal intermediate production stage."}
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Colour</label>
            <div className="flex flex-wrap gap-2">
              {STAGE_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  className={cn("h-7 w-7 rounded-full", c, newColor === c && "ring-2 ring-black ring-offset-2")}
                />
              ))}
            </div>
          </div>
          <label className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Notify customer by SMS</p>
              <p className="text-xs text-gray-500">Send the customer a message when an order reaches this stage</p>
            </div>
            <button
              onClick={() => setNewNotify((v) => !v)}
              className={cn("relative h-6 w-11 rounded-full transition", newNotify ? "bg-emerald-500" : "bg-slate-300")}
            >
              <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", newNotify ? "left-[22px]" : "left-0.5")} />
            </button>
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={addStage}>Add stage</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
