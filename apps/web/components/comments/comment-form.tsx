"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Mention from "@tiptap/extension-mention";
import { Button } from "@/components/ui/button";
import type { CommentNode } from "./comment-list";

type Props = {
  postId: string;
  parentId?: string;
  onSubmit: (comment: CommentNode) => void;
  onCancel?: () => void;
};

type UserSuggestion = { id: string; name: string };

function buildMentionSuggestion() {
  return {
    items: async ({ query }: { query: string }): Promise<UserSuggestion[]> => {
      if (!query) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      return res.json();
    },
    render: () => {
      let el: HTMLDivElement | null = null;

      return {
        onStart(props: { clientRect?: (() => DOMRect | null) | null; items: UserSuggestion[]; command: (a: { id: string; label: string }) => void }) {
          el = document.createElement("div");
          el.className = "absolute z-50 rounded-md border border-border bg-card shadow-md p-1 min-w-[160px]";
          const rect = props.clientRect?.();
          if (rect) {
            el.style.top = `${rect.bottom + window.scrollY + 4}px`;
            el.style.left = `${rect.left + window.scrollX}px`;
          }
          document.body.appendChild(el);

          function render(items: UserSuggestion[]) {
            if (!el) return;
            el.innerHTML = "";
            if (!items.length) { el.remove(); el = null; return; }
            items.forEach((item) => {
              const btn = document.createElement("button");
              btn.className = "flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted text-left";
              btn.textContent = item.name;
              btn.addEventListener("mousedown", (e) => {
                e.preventDefault();
                props.command({ id: item.id, label: item.name });
              });
              el?.appendChild(btn);
            });
          }
          render(props.items);
        },
        onUpdate(props: { items: UserSuggestion[]; clientRect?: (() => DOMRect | null) | null; command: (a: { id: string; label: string }) => void }) {
          if (!el) return;
          const rect = props.clientRect?.();
          if (rect) {
            el.style.top = `${rect.bottom + window.scrollY + 4}px`;
            el.style.left = `${rect.left + window.scrollX}px`;
          }
          const items = props.items;
          el.innerHTML = "";
          if (!items.length) { el.remove(); el = null; return; }
          items.forEach((item) => {
            const btn = document.createElement("button");
            btn.className = "flex w-full items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted text-left";
            btn.textContent = item.name;
            btn.addEventListener("mousedown", (e) => {
              e.preventDefault();
              props.command({ id: item.id, label: item.name });
            });
            el?.appendChild(btn);
          });
        },
        onExit() { el?.remove(); el = null; },
      };
    },
  };
}

export function CommentForm({ postId, parentId, onSubmit, onCancel }: Props) {
  const [submitting, setSubmitting] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "What are your thoughts?" }),
      Mention.configure({
        HTMLAttributes: { class: "text-primary font-semibold" },
        suggestion: buildMentionSuggestion(),
      }),
    ],
    editorProps: {
      attributes: { class: "outline-none prose prose-sm max-w-none dark:prose-invert min-h-[80px]" },
    },
  });

  async function handleSubmit() {
    if (!editor || editor.isEmpty) return;
    setSubmitting(true);

    const content = JSON.stringify(editor.getJSON());
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });

    if (res.ok) {
      const comment = await res.json() as CommentNode;
      onSubmit({ ...comment, children: [] });
      editor.commands.clearContent();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-2">
      <div
        className="rounded-md border border-border bg-muted px-3 py-2 text-sm focus-within:border-primary transition-colors cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !editor || editor.isEmpty}>
          {submitting ? "Submitting…" : "Comment"}
        </Button>
      </div>
    </div>
  );
}
