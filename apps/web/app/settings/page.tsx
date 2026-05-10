"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Profile = {
  id: string;
  name: string;
  image: string | null;
  banner: string | null;
  bio: string | null;
};

async function uploadImage(file: File): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type }),
  });
  const { url, fields, publicUrl } = (await res.json()) as {
    url: string;
    fields: Record<string, string>;
    publicUrl: string;
  };
  const form = new FormData();
  Object.entries(fields).forEach(([k, v]) => form.append(k, v));
  form.append("file", file);
  await fetch(url, { method: "POST", body: form });
  return publicUrl;
}

export default function SettingsPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState("");

  const [confirmName, setConfirmName] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isPending) return;
    if (!session) {
      router.replace("/sign-in?callbackUrl=/settings");
      return;
    }
    fetch(`/api/users/${session.user.name}`)
      .then((r) => r.json())
      .then((p: Profile) => {
        setName(p.name);
        setBio(p.bio ?? "");
        setImage(p.image);
        setBanner(p.banner);
      });
  }, [isPending, session, router]);

  async function handleAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      setImage(await uploadImage(file));
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleBanner(file: File) {
    setUploadingBanner(true);
    try {
      setBanner(await uploadImage(file));
    } finally {
      setUploadingBanner(false);
    }
  }

  async function handleSave() {
    setError("");
    setSaving(true);
    const res = await fetch("/api/users/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), bio: bio.trim() || null, image, banner }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to save");
      return;
    }
    setSavedAt(Date.now());
    // Refresh nav (avatar in header, etc.)
    router.refresh();
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch("/api/users/me", { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setError("Failed to delete account");
      return;
    }
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.href = "/";
        },
      },
    });
  }

  if (isPending || !session) {
    return <main className="mx-auto max-w-2xl px-4 py-8 text-sm text-muted-foreground">Loading…</main>;
  }

  const canDelete = confirmName === session.user.name;

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      <h1 className="text-xl font-bold">Settings</h1>

      <section className="space-y-6">
        <h2 className="text-base font-semibold">Profile</h2>

        <div className="space-y-1.5">
          <Label>Banner</Label>
          <div className="relative h-32 w-full overflow-hidden rounded-lg border border-input bg-input/30">
            {banner ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={banner} alt="Banner" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                No banner
              </div>
            )}
            <label
              className={cn(
                "absolute right-2 bottom-2 flex items-center gap-1.5 rounded-md bg-background/90 px-2 py-1 text-xs cursor-pointer ring-1 ring-foreground/10 hover:bg-background",
                uploadingBanner && "opacity-50 pointer-events-none",
              )}
            >
              <Upload className="size-3.5" />
              {uploadingBanner ? "Uploading…" : "Change"}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleBanner(f);
                }}
              />
            </label>
            {banner && (
              <button
                type="button"
                onClick={() => setBanner(null)}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1 ring-1 ring-foreground/10 hover:bg-background"
                aria-label="Remove banner"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Avatar</Label>
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              {image && <AvatarImage src={image} alt={name} />}
              <AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <label
              className={cn(
                "flex items-center gap-2 rounded-md border border-input bg-transparent px-3 py-1.5 text-sm cursor-pointer hover:bg-accent",
                uploadingAvatar && "opacity-50 pointer-events-none",
              )}
            >
              <Upload className="size-4" />
              {uploadingAvatar ? "Uploading…" : "Upload"}
              <input
                type="file"
                className="hidden"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleAvatar(f);
                }}
              />
            </label>
            {image && (
              <Button variant="ghost" size="sm" onClick={() => setImage(null)}>
                Remove
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="name">Display name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={32}
          />
          <p className="text-right text-xs text-muted-foreground">{name.length}/32</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder="Tell people a little about yourself"
          />
          <p className="text-right text-xs text-muted-foreground">{bio.length}/300</p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving || uploadingAvatar || uploadingBanner || !name.trim()}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
          {savedAt && !saving && (
            <span className="text-sm text-muted-foreground">Saved.</span>
          )}
        </div>
      </section>

      <section className="space-y-3 rounded-lg border border-destructive/40 p-4">
        <div>
          <h2 className="text-base font-semibold text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting your account will permanently remove your posts, comments, votes, and profile. This can't be undone.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="destructive" size="sm">
                Delete account
              </Button>
            }
          />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your profile and all of your posts, comments,
                votes, and saved items. This cannot be undone. To confirm, type{" "}
                <span className="font-semibold text-foreground">{session.user.name}</span> below.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={session.user.name ?? ""}
              autoComplete="off"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirmName("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                disabled={!canDelete || deleting}
                onClick={handleDelete}
              >
                {deleting ? "Deleting…" : "Delete account"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}
