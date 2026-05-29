"use client";

import { useEdgeRuntime, Thread } from "@assistant-ui/react";
import { makeMarkdownText } from "@assistant-ui/react-markdown";
import { CitationHandler } from "./CitationHandler";
import { DocumentPreview } from "./DocumentPreview";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const MarkdownText = makeMarkdownText();

export function MyAssistant() {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const runtime = useEdgeRuntime({
    api: `${API_URL}/api/chat`,
    unstable_AISDKInterop: true,
  });

  return (
    <>
      <CitationHandler apiUrl={API_URL} onOpenPreview={setPreviewUrl} />
      <Thread
        runtime={runtime}
        assistantMessage={{ components: { Text: MarkdownText } }}
      />
      <DocumentPreview fileUrl={previewUrl} onClose={() => setPreviewUrl(null)} />
    </>
  );
}
