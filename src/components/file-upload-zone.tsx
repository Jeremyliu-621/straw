"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import {
  Plus,
  X,
  FileText,
  Image as ImageIcon,
  Paperclip,
  Camera,
  Github,
} from "lucide-react";
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

interface TextareaWithAttachmentsProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
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

const MENU_OPTIONS = [
  { id: "files", label: "Add files or photos", icon: Paperclip, enabled: true },
  { id: "screenshot", label: "Paste from clipboard", icon: Camera, enabled: true },
  { id: "gdrive", label: "Google Drive", icon: GoogleDriveIcon, enabled: false },
  { id: "github", label: "GitHub", icon: Github, enabled: false },
] as const;

export function TextareaWithAttachments({
  label,
  required,
  value,
  onChange,
  placeholder,
  rows = 3,
  files,
  onFilesChange,
  maxFiles = TASK_MAX_ATTACHMENTS,
}: TextareaWithAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingDesc, setEditingDesc] = useState<number | null>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

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
        if (file.type && !allowed.includes(file.type)) {
          setError(`${file.name}: unsupported file type`);
          continue;
        }
        const previewUrl = isImageType(file.type)
          ? URL.createObjectURL(file)
          : null;
        newFiles.push({ file, description: "", previewUrl });
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
      }
    },
    [files, onFilesChange, maxFiles]
  );

  function removeFile(index: number) {
    const removed = files[index];
    if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    onFilesChange(files.filter((_, i) => i !== index));
  }

  function updateDescription(index: number, description: string) {
    onFilesChange(files.map((f, i) => (i === index ? { ...f, description } : f)));
  }

  async function handlePasteFromClipboard() {
    setMenuOpen(false);
    try {
      const items = await navigator.clipboard.read();
      const pastedFiles: File[] = [];
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const ext = type.split("/")[1] || "png";
            const file = new File([blob], `clipboard-${Date.now()}.${ext}`, {
              type,
            });
            pastedFiles.push(file);
          }
        }
      }
      if (pastedFiles.length > 0) {
        addFiles(pastedFiles);
      } else {
        setError("No image found on clipboard");
      }
    } catch {
      setError("Could not read clipboard. Try pasting an image first.");
    }
  }

  function handleMenuSelect(id: string) {
    switch (id) {
      case "files":
        setMenuOpen(false);
        inputRef.current?.click();
        break;
      case "screenshot":
        handlePasteFromClipboard();
        break;
      default:
        setMenuOpen(false);
        break;
    }
  }

  return (
    <div>
      <label
        className="mb-1 block font-sans"
        style={{ fontSize: "13px", color: "var(--text-muted)" }}
      >
        {label}
        {required && <span style={{ color: "var(--error)" }}> *</span>}
      </label>

      {/* Container that wraps files + textarea + button */}
      <div
        style={{
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
          background: "var(--bg)",
          position: "relative",
        }}
      >
        {/* File thumbnails — above the textarea */}
        {files.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
              padding: "12px 12px 0",
            }}
          >
            {files.map((f, i) => (
              <div key={`${f.file.name}-${i}`} style={{ position: "relative" }}>
                {f.previewUrl ? (
                  <div
                    style={{
                      position: "relative",
                      width: "72px",
                      height: "72px",
                      borderRadius: "var(--radius)",
                      overflow: "hidden",
                      border: "1px solid var(--border)",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setEditingDesc(editingDesc === i ? null : i)
                    }
                  >
                    <img
                      src={f.previewUrl}
                      alt={f.file.name}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(i);
                      }}
                      style={{
                        position: "absolute",
                        top: "3px",
                        right: "3px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "rgba(0,0,0,0.6)",
                        border: "none",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      <X size={9} strokeWidth={2.5} color="#fff" />
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 10px",
                      borderRadius: "var(--radius)",
                      border: "1px solid var(--border)",
                      background: "var(--bg-subtle)",
                      cursor: "pointer",
                    }}
                    onClick={() =>
                      setEditingDesc(editingDesc === i ? null : i)
                    }
                  >
                    <FileText
                      size={14}
                      strokeWidth={1.5}
                      style={{ color: "var(--text-faint)", flexShrink: 0 }}
                    />
                    <span
                      className="font-sans truncate"
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "var(--text)",
                        maxWidth: "120px",
                      }}
                    >
                      {f.file.name}
                    </span>
                    <span
                      className="font-mono"
                      style={{
                        fontSize: "10px",
                        color: "var(--text-faint)",
                        flexShrink: 0,
                      }}
                    >
                      {formatSize(f.file.size)}
                    </span>
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
                        padding: "1px",
                        color: "var(--text-faint)",
                        flexShrink: 0,
                      }}
                    >
                      <X size={12} strokeWidth={1.5} />
                    </button>
                  </div>
                )}

                {/* Description popover */}
                {editingDesc === i && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      zIndex: 20,
                      width: "220px",
                    }}
                  >
                    <input
                      type="text"
                      value={f.description}
                      onChange={(e) => updateDescription(i, e.target.value)}
                      placeholder="Describe this file..."
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === "Escape")
                          setEditingDesc(null);
                      }}
                      onBlur={() => setEditingDesc(null)}
                      className="w-full font-sans outline-none"
                      style={{
                        padding: "7px 10px",
                        borderRadius: "var(--radius)",
                        fontSize: "12px",
                        color: "var(--text)",
                        border: "1px solid var(--border)",
                        background: "var(--bg)",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                      }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Textarea */}
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full resize-none font-sans outline-none"
          style={{
            padding: "10px 12px",
            fontSize: "14px",
            color: "var(--text)",
            background: "transparent",
            border: "none",
            display: "block",
          }}
        />

        {/* Bottom bar with + button */}
        <div
          style={{
            padding: "4px 8px 8px",
            position: "relative",
          }}
        >
          <button
            ref={buttonRef}
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              border: "1px solid var(--border)",
              background: "var(--bg)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--text-faint)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border)";
            }}
          >
            <Plus
              size={15}
              strokeWidth={1.5}
              style={{ color: "var(--text-muted)" }}
            />
          </button>

          {/* Popover menu — opens upward */}
          {menuOpen && (
            <div
              ref={menuRef}
              style={{
                position: "absolute",
                bottom: "calc(100% + 2px)",
                left: "8px",
                minWidth: "200px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                padding: "6px",
                zIndex: 50,
              }}
            >
              {MENU_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      opt.enabled && handleMenuSelect(opt.id)
                    }
                    className="font-sans"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: "var(--radius)",
                      border: "none",
                      background: "transparent",
                      cursor: opt.enabled ? "pointer" : "default",
                      fontSize: "13px",
                      color: opt.enabled
                        ? "var(--text)"
                        : "var(--text-faint)",
                      transition: "background 0.1s",
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) => {
                      if (opt.enabled)
                        e.currentTarget.style.background =
                          "var(--bg-subtle)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <Icon size={16} strokeWidth={1.5} />
                    <span>{opt.label}</span>
                    {!opt.enabled && (
                      <span
                        className="font-sans"
                        style={{
                          marginLeft: "auto",
                          fontSize: "10px",
                          color: "var(--text-faint)",
                          background: "var(--bg-subtle)",
                          padding: "2px 6px",
                          borderRadius: "var(--radius)",
                        }}
                      >
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
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

      {error && (
        <p
          className="mt-2 font-sans"
          style={{ fontSize: "12px", color: "var(--error)" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}

/* Google Drive icon — inline SVG since lucide doesn't have it */
function GoogleDriveIcon({
  size = 16,
}: {
  size?: number;
  strokeWidth?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 2l7 12H24l-7-12z" />
      <path d="M1 14l3.5 6h15l-3.5-6z" />
      <path d="M8.5 2L1 14l3.5 6" />
    </svg>
  );
}
