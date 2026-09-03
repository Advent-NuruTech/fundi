import { ManualShell } from "@/modules/manual/components/manual-shell";

export default function ManualLayout({ children }: { children: React.ReactNode }) {
  return <ManualShell>{children}</ManualShell>;
}
