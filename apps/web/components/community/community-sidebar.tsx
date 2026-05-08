import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type Community = {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  memberCount: number;
  createdAt: Date;
};

type Rule = {
  id: string;
  title: string;
  description: string | null;
  order: number;
};

type Flair = {
  id: string;
  name: string;
  color: string;
};

type Props = {
  community: Community;
  rules: Rule[];
  flairs: Flair[];
  isMember: boolean;
  userId: string | undefined;
};

export function CommunitySidebar({ community, rules, flairs }: Props) {
  return (
    <aside className="w-80 shrink-0 space-y-4">
      {/* About */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-sm">About u/{community.name}</h3>
        {community.description && (
          <p className="text-sm text-muted-foreground">{community.description}</p>
        )}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-semibold">{community.memberCount.toLocaleString()}</span>
          <span className="text-muted-foreground">members</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Created {formatDistanceToNow(new Date(community.createdAt), { addSuffix: true })}
        </p>
        <div className="flex flex-col gap-2 pt-1">
          <Link href={`/submit?community=${community.name}`}>
            <Button className="w-full" size="sm">Create Post</Button>
          </Link>
        </div>
      </div>

      {/* Rules */}
      {rules.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">Rules</h3>
          <ol className="space-y-2">
            {rules.map((rule) => (
              <li key={rule.id} className="text-sm">
                <p className="font-medium">{rule.order + 1}. {rule.title}</p>
                {rule.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Flairs */}
      {flairs.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4 space-y-2">
          <h3 className="font-semibold text-sm">Flairs</h3>
          <div className="flex flex-wrap gap-1.5">
            {flairs.map((flair) => (
              <span
                key={flair.id}
                className="rounded px-2 py-0.5 text-xs font-semibold text-white"
                style={{ backgroundColor: flair.color }}
              >
                {flair.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
