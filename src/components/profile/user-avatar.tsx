"use client";

import { Avatar } from "@/components/ui/avatar";

interface UserAvatarProps {
  profile: { displayName: string; photoURL?: string | null };
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

export function UserAvatar({ profile, size = "md", className }: UserAvatarProps) {
  return (
    <Avatar
      src={profile.photoURL ?? null}
      alt={profile.displayName}
      size={size}
      className={className}
    />
  );
}
