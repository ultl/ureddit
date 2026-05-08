import { notFound } from "next/navigation";
import { db } from "@repo/db/client";
import { users } from "@repo/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ProfileTabs } from "@/components/profile/profile-tabs";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      image: users.image,
      banner: users.banner,
      bio: users.bio,
      postKarma: users.postKarma,
      commentKarma: users.commentKarma,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.name, username));
  if (!user) notFound();

  const session = await auth.api.getSession({ headers: await headers() });
  const isOwner = session?.user?.id === user.id;

  return (
    <div>
      <div
        className="h-32 w-full bg-gradient-to-r from-primary/30 to-primary/10"
        style={user.banner ? { backgroundImage: `url(${user.banner})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
      />

      <main className="mx-auto max-w-4xl px-4">
        <div className="-mt-10 flex items-end gap-4">
          <Avatar className="size-20 ring-4 ring-background">
            {user.image && <AvatarImage src={user.image} alt={user.name} />}
            <AvatarFallback className="text-2xl">
              {user.name.slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="pb-2 min-w-0 flex-1">
            <h1 className="text-2xl font-bold truncate">{user.name}</h1>
            <p className="text-sm text-muted-foreground">u/{user.name}</p>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          {user.bio && <p className="text-sm">{user.bio}</p>}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
            <span>
              <span className="font-semibold text-foreground">
                {user.postKarma.toLocaleString()}
              </span>{" "}
              post karma
            </span>
            <span>
              <span className="font-semibold text-foreground">
                {user.commentKarma.toLocaleString()}
              </span>{" "}
              comment karma
            </span>
            <span>Joined {format(new Date(user.createdAt), "MMM yyyy")}</span>
          </div>
        </div>

        <div className="mt-6 pb-12">
          <ProfileTabs username={user.name} isOwner={isOwner} />
        </div>
      </main>
    </div>
  );
}
