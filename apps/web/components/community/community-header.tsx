"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

type Community = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  icon: string | null;
  banner: string | null;
  memberCount: number;
};

type Props = {
  community: Community;
  isMember: boolean;
  userId: string | undefined;
};

export function CommunityHeader({ community, isMember: initialMember, userId }: Props) {
  const [isMember, setIsMember] = useState(initialMember);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function toggleMembership() {
    if (!userId) {
      router.push("/sign-in");
      return;
    }
    setLoading(true);
    const endpoint = isMember ? "leave" : "join";
    await fetch(`/api/communities/${community.name}/${endpoint}`, { method: "POST" });
    setIsMember(!isMember);
    setLoading(false);
    router.refresh();
  }

  return (
    <div>
      <div className="h-24 w-full bg-gradient-to-r from-orange-400 to-orange-600 sm:h-32">
        {community.banner && (
          <img src={community.banner} alt="" className="h-full w-full object-cover" />
        )}
      </div>

      <div className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-6xl items-end gap-4 px-4 pb-3 pt-0 -mt-4">
          <div className="shrink-0 rounded-full ring-4 ring-card">
            <Avatar size="lg" className="size-16">
              {community.icon && <AvatarImage src={community.icon} alt="" />}
              <AvatarFallback className="bg-orange-500 text-2xl font-bold text-white">
                {community.displayName[0]}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-between gap-2 pb-1">
            <div>
              <h1 className="text-xl font-bold">{community.displayName}</h1>
              <p className="text-sm text-muted-foreground">u/{community.name}</p>
            </div>
            <Button
              size="sm"
              variant={isMember ? "outline" : "default"}
              onClick={toggleMembership}
              disabled={loading}
            >
              {isMember ? "Joined" : "Join"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
