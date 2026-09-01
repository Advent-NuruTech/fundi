"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { BadgeCheck, ChevronDown, ChevronUp, Copy, Loader2, Plus, Save, Search, Trash2, UserCheck, UserX } from "lucide-react";
import { toast } from "sonner";
import type { Order, UserProfile, UserRole } from "@/types/domain";
import { fetchTeamDirectory, manageTeamRecord, type OrphanedEmployeeAccount, type TeamInvitation } from "@/services/auth.service";
import { listenOrders, updateMemberCompensation } from "@/services/firestore.service";
import { useBusinessContext } from "@/modules/shared/use-business-context";
import { useAuth } from "@/features/auth/components/auth-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserAvatar } from "@/components/profile/user-avatar";

const ROLE_OPTIONS: UserRole[] = ["admin_manager", "tailor", "receptionist", "inventory_manager", "cashier"];

function EmployeeCard({ member, orders, businessId, onChanged }: { member: UserProfile; orders: Order[]; businessId: string; onChanged: () => Promise<void> }) {
  const [showPay, setShowPay] = useState(false);
  const [payRate, setPayRate] = useState(String(member.payRate ?? ""));
  const [payPeriod, setPayPeriod] = useState<"daily" | "weekly" | "monthly">(member.payPeriod ?? "monthly");
  const [nextPayDate, setNextPayDate] = useState(member.nextPayDate ?? "");
  const [savingPay, setSavingPay] = useState(false);
  const [changingAccess, setChangingAccess] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isNonOwner = member.role !== "owner";
  const roles = member.roles?.length ? member.roles : [member.role];
  const assignedOrders = orders.filter((order) => order.assignedTailorId === member.uid && order.stage !== "delivered").length;
  const lateOrders = orders.filter((order) => order.assignedTailorId === member.uid && order.dueDate < new Date().toISOString().slice(0, 10) && order.stage !== "delivered").length;

  const savePay = async () => {
    setSavingPay(true);
    try {
      await updateMemberCompensation(businessId, member.uid, { payRate: Number(payRate) || 0, payPeriod, nextPayDate });
      await onChanged();
      setShowPay(false);
      toast.success("Compensation updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update compensation");
    } finally { setSavingPay(false); }
  };

  const changeAccess = async () => {
    setChangingAccess(true);
    try {
      await manageTeamRecord(businessId, "set_membership_active", { memberUid: member.uid, active: !member.active });
      await onChanged();
      toast.success(member.active ? "Employee is no longer a member and cannot access this business." : "Employee access restored.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update access");
    } finally { setChangingAccess(false); }
  };

  const deleteMembership = async () => {
    if (!window.confirm(`Permanently remove ${member.displayName}'s membership? Their invitation history will be kept for your records.`)) return;
    setDeleting(true);
    try {
      await manageTeamRecord(businessId, "delete_membership", { memberUid: member.uid });
      await onChanged();
      toast.success(`${member.displayName} was removed from this business.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove employee");
    } finally { setDeleting(false); }
  };

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        <UserAvatar profile={member} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0"><p className="truncate font-bold text-slate-900">{member.displayName}</p><p className="truncate text-xs text-slate-500">{member.email}</p>{member.employeeNumber && <span className="mt-1 inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[11px] font-bold tracking-wide text-indigo-700"><BadgeCheck className="h-3 w-3" />{member.employeeNumber}</span>}</div>
            <Badge variant={member.active ? "success" : "danger"} className="shrink-0 text-[11px]">{member.active ? "Active" : "No longer a member"}</Badge>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">{roles.map((role) => <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium capitalize text-slate-600">{role.replaceAll("_", " ")}</span>)}</div>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <div className="rounded-xl bg-blue-50 p-2.5 text-center"><p className="text-lg font-bold text-blue-700">{assignedOrders}</p><p className="text-[10px] font-medium uppercase tracking-wide text-blue-500">Orders</p></div>
        <div className="rounded-xl bg-rose-50 p-2.5 text-center"><p className="text-lg font-bold text-rose-600">{lateOrders}</p><p className="text-[10px] font-medium uppercase tracking-wide text-rose-400">Late</p></div>
        <div className="col-span-2 rounded-xl bg-emerald-50 p-2.5"><p className="text-xs font-bold text-emerald-700">KES {(member.payRate ?? 0).toLocaleString()}<span className="ml-1 font-normal capitalize text-emerald-500">/ {member.payPeriod ?? "monthly"}</span></p>{member.nextPayDate && <p className="mt-0.5 text-[10px] text-emerald-500">Next pay: {new Date(member.nextPayDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}</p>}</div>
      </div>
      {isNonOwner && <><button type="button" onClick={() => setShowPay((current) => !current)} className="flex items-center gap-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-700">{showPay ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{showPay ? "Hide" : "Edit"} compensation</button>{showPay && <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-semibold text-slate-600">Update compensation</p><div className="grid grid-cols-2 gap-2"><Input type="number" min="0" value={payRate} onChange={(event) => setPayRate(event.target.value)} placeholder="Pay rate (KES)" className="h-9 text-sm" /><select value={payPeriod} onChange={(event) => setPayPeriod(event.target.value as typeof payPeriod)} className="h-9 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div><Input type="date" value={nextPayDate} onChange={(event) => setNextPayDate(event.target.value)} className="h-9 text-sm" /><Button size="sm" onClick={savePay} disabled={savingPay} className="w-full gap-2">{savingPay ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}Save compensation</Button></div>}</>}
      <div className="flex items-center gap-2 pt-1">
        <Link href={`/employees/${member.uid}`} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-center text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50">View activity</Link>
        {isNonOwner && <button type="button" onClick={changeAccess} disabled={changingAccess} className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50 ${member.active ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100" : "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>{changingAccess ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : member.active ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}{member.active ? "No longer a member" : "Restore access"}</button>}
        {isNonOwner && <button type="button" onClick={deleteMembership} disabled={deleting} aria-label={`Delete ${member.displayName}'s membership`} className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600 transition-colors hover:bg-rose-100 disabled:opacity-50">{deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}</button>}
      </div>
    </div>
  );
}

function OrphanedAccountCard({ account, businessId, onChanged, onCredentials }: { account: OrphanedEmployeeAccount; businessId: string; onChanged: () => Promise<void>; onCredentials: (details: { email: string; password: string; token: string }) => void }) {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [role, setRole] = useState<UserRole>("tailor");
  const [payRate, setPayRate] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const complete = async () => { setSaving(true); try { const result = await manageTeamRecord(businessId, "complete_orphan", { orphanUserId: account.uid, displayName, roles: [role], payRate: payRate.trim() ? Number(payRate) : null }); if (!result.temporaryPassword || !result.token) throw new Error("The invitation was completed but its login details were unavailable."); onCredentials({ email: account.email, password: result.temporaryPassword, token: result.token }); await onChanged(); toast.success("Invitation setup completed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not complete setup"); } finally { setSaving(false); } };
  const remove = async () => { if (!window.confirm(`Permanently delete the incomplete account for ${account.email}?`)) return; setDeleting(true); try { await manageTeamRecord(businessId, "delete_orphan", { orphanUserId: account.uid }); await onChanged(); toast.success("Incomplete account deleted."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not delete incomplete account"); } finally { setDeleting(false); } };
  return <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-amber-950">Incomplete account</p><p className="text-xs text-amber-800">{account.email}</p></div><button type="button" onClick={remove} disabled={deleting} aria-label="Delete incomplete account" className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50">{deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}</button></div><p className="text-xs text-amber-800">Edit the details below, then complete the invitation to create the missing employee profile and business access.</p><div className="grid gap-2 sm:grid-cols-3"><Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Employee name" className="h-9 bg-white text-sm" /><select value={role} onChange={(event) => setRole(event.target.value as UserRole)} className="h-9 rounded-xl border border-amber-300 bg-white px-3 text-sm text-slate-900">{ROLE_OPTIONS.map((entry) => <option key={entry} value={entry}>{entry.replaceAll("_", " ")}</option>)}</select><Input type="number" min="0" value={payRate} onChange={(event) => setPayRate(event.target.value)} placeholder="Optional pay (KES)" className="h-9 bg-white text-sm" /></div><Button size="sm" onClick={complete} disabled={saving || !displayName.trim()} className="gap-2">{saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UserCheck className="h-3.5 w-3.5" />}Complete invitation setup</Button></div>;
}

function InvitationRow({ invite, businessId, onChanged }: { invite: TeamInvitation; businessId: string; onChanged: () => Promise<void> }) {
  const [revoking, setRevoking] = useState(false);
  const revoke = async () => { setRevoking(true); try { await manageTeamRecord(businessId, "revoke_invitation", { invitationId: invite.id }); await onChanged(); toast.success("Invitation revoked and access removed."); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not revoke invitation"); } finally { setRevoking(false); } };
  return <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{invite.displayName}</p><p className="truncate text-xs text-slate-500">{invite.email}</p><div className="mt-1 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${invite.status === "pending" ? "bg-amber-100 text-amber-700" : invite.status === "accepted" ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>{invite.status}</span><span className="text-[11px] text-slate-400">Created {new Date(invite.createdAt).toLocaleDateString("en-KE")}</span></div></div>{invite.status === "pending" && <button type="button" onClick={revoke} disabled={revoking} aria-label="Revoke invitation" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-rose-50 disabled:opacity-50">{revoking ? <Loader2 className="h-4 w-4 animate-spin text-rose-500" /> : <Trash2 className="h-4 w-4 text-rose-400" />}</button>}</div>;
}

export function EmployeesPage() {
  const { businessId, ready } = useBusinessContext();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [orphanedAccounts, setOrphanedAccounts] = useState<OrphanedEmployeeAccount[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingDirectory, setLoadingDirectory] = useState(true);
  const [credentials, setCredentials] = useState<{ email: string; password: string; token: string } | null>(null);
  const isOwner = user?.role === "owner" || user?.roles?.includes("owner") || false;
  const loadDirectory = useCallback(async () => { if (!businessId || !isOwner) return; setLoadingDirectory(true); try { const directory = await fetchTeamDirectory(businessId); setMembers(directory.members); setInvitations(directory.invitations); setOrphanedAccounts(directory.orphanedAccounts); } catch (error) { toast.error(error instanceof Error ? error.message : "Could not load the team directory"); } finally { setLoadingDirectory(false); } }, [businessId, isOwner]);
  useEffect(() => { if (!ready || !isOwner) return; void loadDirectory(); return listenOrders(businessId, setOrders); }, [businessId, isOwner, loadDirectory, ready]);
  const filteredMembers = useMemo(() => members.filter((member) => `${member.displayName} ${member.email} ${member.employeeNumber ?? ""}`.toLowerCase().includes(search.toLowerCase())), [members, search]);
  const activeCount = members.filter((member) => member.active).length;
  const pendingInvites = invitations.filter((invite) => invite.status === "pending").length;
  const copyCredentials = () => { if (!credentials) return; const link = `${window.location.origin}/login?invite=${credentials.token}&workspace=${businessId}`; navigator.clipboard.writeText(`Email: ${credentials.email}\nTemporary Password: ${credentials.password}\nLogin link: ${link}\n\nPlease log in and set your own password to continue.`); toast.success("Invitation details copied."); };
  if (!isOwner) return <div className="py-8 text-center text-sm text-slate-500">Only the business owner can view and manage the full employee directory.</div>;
  return <div className="space-y-6"><div className="flex items-start justify-between gap-4"><div><h1 className="text-2xl font-bold text-slate-900">Team</h1><p className="mt-0.5 text-sm text-slate-500">{activeCount} active · {pendingInvites} pending invite{pendingInvites !== 1 ? "s" : ""}</p></div><Link href="/employees/new" className="flex shrink-0 items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"><Plus className="h-4 w-4" />Invite employee</Link></div>{credentials && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"><div><p className="font-semibold">Invitation setup completed</p><p className="text-emerald-800">Copy the employee email, new temporary password, and sign-in link to send them.</p></div><Button size="sm" variant="outline" onClick={copyCredentials} className="gap-2 border-emerald-300 bg-white"><Copy className="h-3.5 w-3.5" />Copy details</Button></div>}<div className="grid grid-cols-3 gap-3"><div className="rounded-2xl border bg-white p-4 text-center"><p className="text-2xl font-bold text-slate-900">{members.length}</p><p className="mt-0.5 text-xs text-slate-500">All member records</p></div><div className="rounded-2xl border bg-white p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{activeCount}</p><p className="mt-0.5 text-xs text-slate-500">Can access business</p></div><div className="rounded-2xl border bg-white p-4 text-center"><p className="text-2xl font-bold text-amber-500">{orphanedAccounts.length}</p><p className="mt-0.5 text-xs text-slate-500">Incomplete accounts</p></div></div>{orphanedAccounts.length > 0 && <section className="space-y-3"><div><h2 className="font-bold text-slate-900">Incomplete invitation setups</h2><p className="text-sm text-slate-500">These account attempts did not get a complete employee record yet.</p></div>{orphanedAccounts.map((account) => <OrphanedAccountCard key={account.uid} account={account} businessId={businessId} onChanged={loadDirectory} onCredentials={setCredentials} />)}</section>}<div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name, email, or employee ID..." className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" /></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{loadingDirectory && <div className="col-span-full flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>}{!loadingDirectory && filteredMembers.length === 0 && <div className="col-span-full py-12 text-center text-sm text-slate-400">No employee records match your search.</div>}{filteredMembers.map((member) => <EmployeeCard key={member.uid} member={member} orders={orders} businessId={businessId} onChanged={loadDirectory} />)}</div>{invitations.length > 0 && <section className="rounded-2xl border bg-white p-5"><h2 className="mb-1 text-sm font-bold text-slate-900">Invitation history</h2><p className="mb-3 text-xs text-slate-500">All invitation attempts are retained, including expired and revoked records.</p><div className="space-y-2">{invitations.map((invite) => <InvitationRow key={invite.id} invite={invite} businessId={businessId} onChanged={loadDirectory} />)}</div></section>}</div>;
}
