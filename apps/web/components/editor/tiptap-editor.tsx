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
    immediatelyRender: false,
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
        "rounded-lg border border-input bg-transparent dark:bg-input/30 px-3 py-2 text-sm transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50 cursor-text",
        className,
      )}
      style={{ minHeight }}
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
