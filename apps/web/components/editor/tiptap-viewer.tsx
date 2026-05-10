"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

type Props = { content: string };

export function TiptapViewer({ content }: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit],
    content: JSON.parse(content),
    editable: false,
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none dark:prose-invert outline-none",
      },
    },
  });

  return <EditorContent editor={editor} />;
}
