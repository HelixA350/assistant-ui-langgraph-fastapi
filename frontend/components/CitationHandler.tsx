"use client";

import { useEffect, useCallback } from "react";

interface CitationHandlerProps {
  apiUrl: string;
  onOpenPreview: (url: string) => void;
}

const DOCUMENT_PATTERN = /\/api\/documents\//;

export function CitationHandler({ apiUrl, onOpenPreview }: CitationHandlerProps) {
  const handleLinkClick = useCallback(
    (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !DOCUMENT_PATTERN.test(href)) return;

      e.preventDefault();
      e.stopPropagation();

      const fullUrl = href.startsWith("http")
        ? href
        : `${apiUrl.replace(/\/+$/, "")}${href}`;
      onOpenPreview(fullUrl);
    },
    [apiUrl, onOpenPreview]
  );

  useEffect(() => {
    document.addEventListener("click", handleLinkClick, true);
    return () => document.removeEventListener("click", handleLinkClick, true);
  }, [handleLinkClick]);

  return null;
}
