import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm">About u/{community.name}</CardTitle>
          {community.description && (
            <CardDescription>{community.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold">{community.memberCount.toLocaleString()}</span>
            <span className="text-muted-foreground">members</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Created {formatDistanceToNow(new Date(community.createdAt), { addSuffix: true })}
          </p>
          <Separator />
          <Link href={`/submit?community=${community.name}`} className="block">
            <Button className="w-full" size="sm">
              Create Post
            </Button>
          </Link>
        </CardContent>
      </Card>

      {rules.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Rules</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-2">
              {rules.map((rule) => (
                <li key={rule.id} className="text-sm">
                  <p className="font-medium">
                    {rule.order + 1}. {rule.title}
                  </p>
                  {rule.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                  )}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      )}

      {flairs.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm">Flairs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {flairs.map((flair) => (
                <Badge
                  key={flair.id}
                  className="text-white border-transparent"
                  style={{ backgroundColor: flair.color }}
                >
                  {flair.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </aside>
  );
}
