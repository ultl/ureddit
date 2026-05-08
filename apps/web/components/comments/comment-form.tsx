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

// Tiptap's suggestion plugin needs imperative DOM control, so the popup is
// hand-rolled but uses shadcn popover-style tokens for visual consistency.
function buildMentionSuggestion() {
  return {
    items: async ({ query }: { query: string }): Promise<UserSuggestion[]> => {
      if (!query) return [];
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      return res.json();
    },
    render: () => {
      let el: HTMLDivElement | null = null;

      function position(rect: DOMRect | null) {
        if (!el || !rect) return;
        el.style.top = `${rect.bottom + window.scrollY + 4}px`;
        el.style.left = `${rect.left + window.scrollX}px`;
      }

      function paint(
        items: UserSuggestion[],
        command: (a: { id: string; label: string }) => void,
      ) {
        if (!el) return;
        el.innerHTML = "";
        if (!items.length) {
          el.remove();
          el = null;
          return;
        }
        items.forEach((item) => {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className =
            "flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent hover:text-accent-foreground text-left";
          btn.textContent = item.name;
          btn.addEventListener("mousedown", (e) => {
            e.preventDefault();
            command({ id: item.id, label: item.name });
          });
          el!.appendChild(btn);
        });
      }

      return {
        onStart(props: {
          clientRect?: (() => DOMRect | null) | null;
          items: UserSuggestion[];
          command: (a: { id: string; label: string }) => void;
        }) {
          el = document.createElement("div");
          el.className =
            "absolute z-50 min-w-[160px] rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10";
          document.body.appendChild(el);
          position(props.clientRect?.() ?? null);
          paint(props.items, props.command);
        },
        onUpdate(props: {
          items: UserSuggestion[];
          clientRect?: (() => DOMRect | null) | null;
          command: (a: { id: string; label: string }) => void;
        }) {
          if (!el) return;
          position(props.clientRect?.() ?? null);
          paint(props.items, props.command);
        },
        onExit() {
          el?.remove();
          el = null;
        },
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
      attributes: {
        class: "outline-none prose prose-sm max-w-none dark:prose-invert min-h-[80px]",
      },
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
      const comment = (await res.json()) as CommentNode;
      onSubmit({ ...comment, children: [] });
      editor.commands.clearContent();
    }
    setSubmitting(false);
  }

  return (
    <div className="space-y-2">
      <div
        className="rounded-lg border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 cursor-text"
        onClick={() => editor?.commands.focus()}
      >
        <EditorContent editor={editor} />
      </div>
      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={handleSubmit} disabled={submitting || !editor || editor.isEmpty}>
          {submitting ? "Submitting…" : "Comment"}
        </Button>
      </div>
    </div>
  );
}
