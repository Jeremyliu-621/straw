"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, X, FileText, Image as ImageIcon } from "lucide-react";
import {
  TASK_MAX_ATTACHMENT_SIZE_MB,
  TASK_MAX_ATTACHMENTS,
  TASK_ALLOWED_FILE_TYPES,
} from "@/constants";

export interface UploadedFile {
  file: File;
  description: string;
  previewUrl: string | null;
}

interface FileUploadZoneProps {
  files: UploadedFile[];
  onChange: (files: UploadedFile[]) => void;
  label: string;
  hint?: string;
  maxFiles?: number;
}

const ACCEPTED = TASK_ALLOWED_FILE_TYPES.join(",");
const MAX_BYTES = TASK_MAX_ATTACHMENT_SIZE_MB * 1024 * 1024;

function isImageType(type: string): boolean {
  return type.startsWith("image/");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadZone({
  files,
  onChange,
  label,
  hint,
  maxFiles = TASK_MAX_ATTACHMENTS,
}: FileUploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = useCallback(
    (incoming: FileList | File[]) => {
      setError(null);
      const newFiles: UploadedFile[] = [];

      for (const file of Array.from(incoming)) {
        if (files.length + newFiles.length >= maxFiles) {
          setError(`Maximum ${maxFiles} files allowed`);
          break;
        }
        if (file.size > MAX_BYTES) {
          setError(`${file.name} exceeds ${TASK_MAX_ATTACHMENT_SIZE_MB}MB limit`);
          continue;
        }
        const allowed = TASK_ALLOWED_FILE_TYPES as readonly string[];
        if (!allowed.includes(file.type) && file.type !== "") {
          setError(`${file.name}: unsupported file type`);
          continue;
        }
        const previewUrl = isImageType(file.type) ? URL.createObjectURL(file) : null;
        newFiles.push({ file, description: "", previewUrl });
      }

      if (newFiles.length > 0) {
        onChange([...files, ...newFiles]);
      }
    },
    [files, onChange, maxFiles]
  );

  function removeFile(index: number) {
    const removed = files[index];
    if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onChange(files.filter((_, i) => i !== index));
  }

  function updateDescription(index: number, description: string) {
    onChange(files.map((f, i) => (i === index ? { ...f, description } : f)));
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  return (
    <div>
      <label
        className="mb-2 block font-sans"
        style={{ fontSize: "13px", fontWeight: 500, color: "var(--text-muted)" }}
      >
        {label}
      </label>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        style={{
          padding: "28px 20px",
          borderRadius: "10px",
          border: `2px dashed ${dragOver ? "var(--text)" : "var(--border)"}`,
          background: dragOver ? "var(--bg-subtle)" : "transparent",
          cursor: "pointer",
          transition: "all 0.15s",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <Upload
          size={20}
          strokeWidth={1.5}
          style={{ color: "var(--text-faint)" }}
        />
        <p
          className="font-sans"
          style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center" }}
        >
          Drop files here or{" "}
          <span style={{ color: "var(--text)", fontWeight: 500 }}>browse</span>
        </p>
        {hint && (
          <p
            className="font-sans"
            style={{ fontSize: "12px", color: "var(--text-faint)", textAlign: "center" }}
          >
            {hint}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
          style={{ display: "none" }}
        />
      </div>

      {error && (
        <p className="mt-2 font-sans" style={{ fontSize: "12px", color: "var(--error)" }}>
          {error}
        </p>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
          {files.map((f, i) => (
            <div
              key={`${f.file.name}-${i}`}
              style={{
                display: "flex",
                gap: "12px",
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                alignItems: "flex-start",
              }}
            >
              {/* Preview / icon */}
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "6px",
                  background: "var(--bg-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  overflow: "hidden",
                }}
              >
                {f.previewUrl ? (
                  <img
                    src={f.previewUrl}
                    alt={f.file.name}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : isImageType(f.file.type) ? (
                  <ImageIcon size={18} strokeWidth={1.5} style={{ color: "var(--text-faint)" }} />
                ) : (
                  <FileText size={18} strokeWidth={1.5} style={{ color: "var(--text-faint)" }} />
                )}
              </div>

              {/* File info + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-2">
                  <span
                    className="font-sans truncate"
                    style={{ fontSize: "13px", fontWeight: 500, color: "var(--text)" }}
                  >
                    {f.file.name}
                  </span>
                  <span
                    className="font-mono"
                    style={{ fontSize: "11px", color: "var(--text-faint)", flexShrink: 0 }}
                  >
                    {formatSize(f.file.size)}
                  </span>
                </div>
                <input
                  type="text"
                  value={f.description}
                  onChange={(e) => updateDescription(i, e.target.value)}
                  placeholder="Describe this file..."
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 w-full font-sans outline-none"
                  style={{
                    padding: "6px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                  }}
                />
              </div>

              {/* Remove */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  color: "var(--text-faint)",
                  flexShrink: 0,
                }}
              >
                <X size={14} strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
