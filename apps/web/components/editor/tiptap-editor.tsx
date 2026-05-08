"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";

type Props = {
  placeholder?: string;
  onChange?: (json: string) => void;
  initialContent?: string;
  className?: string;
  minHeight?: string;
};

export function TiptapEditor({ placeholder, onChange, initialContent, className, minHeight = "120px" }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: placeholder ?? "Write something…" }),
    ],
    content: initialContent ? JSON.parse(initialContent) : undefined,
    onUpdate({ editor }) {
      onChange?.(JSON.stringify(editor.getJSON()));
    },
    editorProps: {
      attributes: {
        class: "outline-none prose prose-sm max-w-none dark:prose-invert",
      },
    },
  });

  return (
    <div
      className={cn(
        "rounded-md border border-border bg-muted px-3 py-2 text-sm focus-within:border-primary transition-colors cursor-text",
        className
      )}
      style={{ minHeight }}
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
