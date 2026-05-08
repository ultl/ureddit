"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { Image, Link2, FileText, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Community = { id: string; name: string; displayName: string };
type Flair = { id: string; name: string; color: string };
type PostType = "text" | "image" | "link";

const TABS: { type: PostType; label: string; icon: React.ReactNode }[] = [
  { type: "text", label: "Text", icon: <FileText className="h-4 w-4" /> },
  { type: "image", label: "Image", icon: <Image className="h-4 w-4" /> },
  { type: "link", label: "Link", icon: <Link2 className="h-4 w-4" /> },
];

export default function SubmitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCommunity = searchParams.get("community");

  const [communities, setCommunities] = useState<Community[]>([]);
  const [flairs, setFlairs] = useState<Flair[]>([]);
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [selectedFlair, setSelectedFlair] = useState<string>("");
  const [postType, setPostType] = useState<PostType>("text");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Load all communities
  useEffect(() => {
    fetch("/api/communities/list")
      .then((r) => r.json())
      .then((data: Community[]) => {
        setCommunities(data);
        if (presetCommunity) {
          const match = data.find((c) => c.name === presetCommunity);
          if (match) setSelectedCommunity(match);
        }
      });
  }, [presetCommunity]);

  // Load flairs when community changes
  useEffect(() => {
    if (!selectedCommunity) { setFlairs([]); return; }
    fetch(`/api/communities/${selectedCommunity.name}/flairs`)
      .then((r) => r.json())
      .then((data: Flair[]) => setFlairs(data));
  }, [selectedCommunity]);

  async function handleImageUpload(file: File) {
    setUploading(true);
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: file.type }),
      });
      const { url, fields, publicUrl } = await res.json() as { url: string; fields: Record<string, string>; publicUrl: string };

      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", file);

      await fetch(url, { method: "POST", body: form });
      setImageUrl(publicUrl);
      setImagePreview(URL.createObjectURL(file));
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!title.trim()) { setError("Title is required"); return; }
    if (!selectedCommunity) { setError("Please select a community"); return; }
    if (postType === "image" && !imageUrl) { setError("Please upload an image"); return; }
    if (postType === "link" && !linkUrl.trim()) { setError("Please enter a URL"); return; }

    setSubmitting(true);
    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        type: postType,
        content: postType === "text" ? content : undefined,
        imageUrl: postType === "image" ? imageUrl : undefined,
        linkUrl: postType === "link" ? linkUrl : undefined,
        communityId: selectedCommunity.id,
        flairId: selectedFlair || undefined,
      }),
    });

    if (!res.ok) {
      const data = await res.json() as { error: string };
      setError(data.error ?? "Something went wrong");
      setSubmitting(false);
      return;
    }

    const { post, communityName } = await res.json() as { post: { id: string }; communityName: string };
    router.push(`/u/${communityName}/comments/${post.id}`);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-xl font-bold mb-6">Create a post</h1>
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Community selector */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Community</label>
          <select
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary"
            value={selectedCommunity?.id ?? ""}
            onChange={(e) => {
              const c = communities.find((c) => c.id === e.target.value) ?? null;
              setSelectedCommunity(c);
              setSelectedFlair("");
            }}
            required
          >
            <option value="" disabled>Choose a community</option>
            {communities.map((c) => (
              <option key={c.id} value={c.id}>u/{c.name}</option>
            ))}
          </select>
        </div>

        {/* Post type tabs */}
        <div className="flex rounded-md border border-border overflow-hidden">
          {TABS.map((tab) => (
            <button
              key={tab.type}
              type="button"
              onClick={() => setPostType(tab.type)}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium border-r border-border last:border-r-0 transition-colors",
                postType === tab.type
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:bg-muted"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Title</label>
          <input
            className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary"
            placeholder="An interesting title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={300}
            required
          />
          <p className="text-right text-xs text-muted-foreground">{title.length}/300</p>
        </div>

        {/* Post body by type */}
        {postType === "text" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Body <span className="text-muted-foreground font-normal">(optional)</span></label>
            <TiptapEditor placeholder="Text (optional)" onChange={setContent} minHeight="160px" />
          </div>
        )}

        {postType === "image" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Image</label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="Preview" className="max-h-64 rounded-md object-contain" />
                <button
                  type="button"
                  onClick={() => { setImagePreview(""); setImageUrl(""); }}
                  className="absolute -top-2 -right-2 rounded-full bg-destructive p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <label className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-muted p-8 text-sm text-muted-foreground cursor-pointer hover:border-primary transition-colors",
                uploading && "opacity-50 pointer-events-none"
              )}>
                <Upload className="h-6 w-6" />
                <span>{uploading ? "Uploading…" : "Click to upload image"}</span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                />
              </label>
            )}
          </div>
        )}

        {postType === "link" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">URL</label>
            <input
              type="url"
              className="w-full rounded-md border border-border bg-muted px-3 py-2 text-sm outline-none focus:border-primary"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
            />
          </div>
        )}

        {/* Flair selector */}
        {flairs.length > 0 && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Flair <span className="text-muted-foreground font-normal">(optional)</span></label>
            <div className="flex flex-wrap gap-2">
              {flairs.map((flair) => (
                <button
                  key={flair.id}
                  type="button"
                  onClick={() => setSelectedFlair(selectedFlair === flair.id ? "" : flair.id)}
                  className={cn(
                    "rounded px-2.5 py-1 text-xs font-semibold text-white transition-opacity",
                    selectedFlair === flair.id ? "opacity-100 ring-2 ring-offset-1 ring-primary" : "opacity-70 hover:opacity-100"
                  )}
                  style={{ backgroundColor: flair.color }}
                >
                  {flair.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={submitting || uploading}>
            {submitting ? "Posting…" : "Post"}
          </Button>
        </div>
      </form>
    </main>
  );
}
