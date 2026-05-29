"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface DocumentPreviewProps {
  fileUrl: string | null;
  onClose: () => void;
}

type FileKind = "pdf" | "docx" | "xlsx" | "image" | "text" | "unsupported";

function detectKind(url: string): FileKind {
  const ext = url.split(".").pop()?.toLowerCase() || "";
  if (["pdf"].includes(ext)) return "pdf";
  if (["docx"].includes(ext)) return "docx";
  if (["xlsx"].includes(ext)) return "xlsx";
  if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "image";
  if (["txt", "md", "csv", "json", "xml", "log", "py", "js", "ts"].includes(ext))
    return "text";
  return "unsupported";
}

function DocxViewer({ url }: { url: string }) {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const mammoth = await import("mammoth");
        const res = await fetch(url);
        const blob = await res.arrayBuffer();
        const result = await mammoth.default.convertToHtml({ arrayBuffer: blob });
        setHtml(result.value);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [url]);

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!html) return <div className="p-4 text-gray-400">Загрузка...</div>;
  return (
    <div className="p-4 overflow-auto h-full prose prose-sm max-w-none">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function XlsxViewer({ url }: { url: string }) {
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const XLSX = await import("xlsx");
        const res = await fetch(url);
        const blob = await res.arrayBuffer();
        const data = new Uint8Array(blob);
        const workbook = XLSX.read(data, { type: "array" });
        const sheets: string[] = [];
        workbook.SheetNames.forEach((name) => {
          const sheet = workbook.Sheets[name];
          sheets.push(
            `<h3 class="text-sm font-semibold mt-3 mb-1">${name}</h3>` +
              XLSX.utils.sheet_to_html(sheet, { id: `sheet-${name}` })
          );
        });
        setHtml(sheets.join("\n"));
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [url]);

  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;
  if (!html) return <div className="p-4 text-gray-400">Загрузка...</div>;
  return (
    <div
      className="p-4 overflow-auto h-full"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function DocumentPreview({ fileUrl, onClose }: DocumentPreviewProps) {
  const [loading, setLoading] = useState(true);
  const [textContent, setTextContent] = useState("");
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fileUrl) return;
    setLoading(true);
    setTextContent("");

    const kind = detectKind(fileUrl);

    if (kind === "text") {
      fetch(fileUrl)
        .then((r) => r.text())
        .then((t) => {
          setTextContent(t);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fileUrl]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  if (!fileUrl) return null;

  const kind = detectKind(fileUrl);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/30"
      onClick={handleOverlayClick}
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      <div className="w-full max-w-3xl h-full bg-white shadow-xl flex flex-col animate-slide-in">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <span className="text-sm font-medium text-gray-700 truncate">
            {fileUrl.split("/").pop()}
          </span>
          <button
            onClick={onClose}
            className="ml-2 text-gray-400 hover:text-gray-600 text-xl leading-none"
            aria-label="Close preview"
          >
            &times;
          </button>
        </div>

        <div className="flex-1 overflow-hidden">
          {loading && kind === "text" ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Загрузка...
            </div>
          ) : kind === "pdf" ? (
            <iframe
              src={fileUrl}
              className="w-full h-full border-0"
              title="PDF preview"
            />
          ) : kind === "docx" ? (
            <DocxViewer url={fileUrl} />
          ) : kind === "xlsx" ? (
            <XlsxViewer url={fileUrl} />
          ) : kind === "image" ? (
            <div className="flex items-center justify-center h-full p-4">
              <img
                src={fileUrl}
                alt="preview"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : kind === "text" ? (
            <pre className="p-4 overflow-auto h-full text-sm text-gray-800 whitespace-pre-wrap font-mono">
              {textContent}
            </pre>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
              <span>Предпросмотр недоступен</span>
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 underline text-sm"
              >
                Скачать файл
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
