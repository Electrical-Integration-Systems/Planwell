"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Header } from "@/components/layout/Header";
import { SettingsDialog } from "@/components/SettingsDialog";
import { AuditHistoryDialog } from "@/components/AuditHistoryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FolderUp, Trash2, FileIcon, Download, Search, FolderOpen, Eye } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

function formatBytes(bytes: number) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isPreviewableType(type: string): boolean {
  if (!type) return false;
  const previewable = [
    "image/",
    "application/pdf",
    "text/",
    "application/json",
    "video/",
    "audio/",
  ];
  return previewable.some((prefix) => type.startsWith(prefix));
}

export default function FilesPage() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const files = useQuery(api.files.list);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const deleteFile = useMutation(api.files.deleteFile);
  const logDownload = useMutation(api.files.logDownload);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  function handleUpload() {
    fileInputRef.current?.click();
  }

  function handleFolderUpload() {
    folderInputRef.current?.click();
  }

  function getErrorReason(error: unknown, statusCode?: number): string {
    if (statusCode === 413 || statusCode === 400) {
      return "File size too large";
    }
    if (statusCode === 429) {
      return "Rate limited, please try again later";
    }
    if (statusCode === 403 || statusCode === 401) {
      return "Not authorized";
    }
    if (statusCode === 500 || statusCode === 502 || statusCode === 503) {
      return "Server error";
    }
    if (error instanceof Error) {
      if (error.message.includes("NetworkError")) {
        return "Network connection failed";
      }
      if (error.message.includes("Failed to fetch")) {
        return "Network connection failed";
      }
      return error.message;
    }
    return "Unknown error";
  }

  function uploadFiles(selectedFiles: FileList) {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    const errors: { file: string; reason: string }[] = [];

    const uploads = Array.from(selectedFiles).map(async (file) => {
      try {
        const contentType = file.type || "application/octet-stream";
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: file,
        });
        if (!result.ok) {
          const reason = getErrorReason(null, result.status);
          throw new Error(reason);
        }
        const json = (await result.json()) as { storageId?: Id<"_storage"> };
        if (!json.storageId) {
          throw new Error("Server did not return a storage ID");
        }
        // Preserve relative path for folder uploads
        const name = file.webkitRelativePath || file.name;
        await saveFile({
          storageId: json.storageId,
          name,
          size: file.size,
          type: contentType,
        });
        successCount++;
      } catch (err) {
        errors.push({
          file: file.name,
          reason: getErrorReason(err),
        });
      }
    });

    Promise.all(uploads)
      .finally(() => {
        if (errors.length > 0 && successCount > 0) {
          const errorMsg = errors.map((e) => `${e.file}: ${e.reason}`).join("\n");
          toast.warning(`${successCount} uploaded, ${errors.length} failed:\n${errorMsg}`);
        } else if (errors.length > 0) {
          if (errors.length === 1) {
            toast.error(`${errors[0].file}: ${errors[0].reason}`);
          } else {
            const errorMsg = errors.map((e) => `${e.file}: ${e.reason}`).join("\n");
            toast.error(`Upload failed:\n${errorMsg}`);
          }
        } else if (successCount > 0) {
          toast.success(`${successCount} file(s) uploaded successfully`);
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
        if (folderInputRef.current) folderInputRef.current.value = "";
      });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    uploadFiles(selectedFiles);
  }

  function handleDownload(fileId: Id<"files">, url: string, fileName: string) {
    void logDownload({ fileId }).catch(() => {
      // download audit is best-effort
    });
    
    // Fetch the file as a blob and trigger download
    fetch(url)
      .then((res) => res.blob())
      .then((blob) => {
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName || "file";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
      })
      .catch(() => {
        // Fallback: try direct download
        const link = document.createElement("a");
        link.href = url;
        link.download = fileName || "file";
        link.setAttribute("target", "_blank");
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 100);
      });
  }

  function handleDelete(fileId: Id<"files">) {
    void deleteFile({ fileId })
      .then(() => toast.success("File deleted"))
      .catch(() => toast.error("Failed to delete file"));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center">
            <span className="font-serif text-base text-primary animate-subtle-pulse">
              P
            </span>
          </div>
          <p className="text-xs text-muted-foreground tracking-wide">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="h-dvh flex flex-col">
      <Header
        onSettingsOpen={() => setSettingsOpen(true)}
        onHistoryOpen={() => setHistoryOpen(true)}
      />

      <main className="flex-1 overflow-y-auto">
        {/* Sticky toolbar: heading, search, upload controls */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border/40">
          <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8">
            {/* Page heading */}
            <div className="flex items-end justify-between pt-4 sm:pt-5 pb-2 sm:pb-3 animate-fade-in-up">
              <div>
                <h2 className="font-serif text-xl sm:text-2xl tracking-tight flex items-center gap-2">
                  Files
                  <span className="h-[2px] flex-1 max-w-[80px] bg-gradient-to-r from-primary/60 to-transparent rounded-full" />
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Organize and manage uploaded files
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleFolderUpload}
                  disabled={uploading}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs gap-1.5 rounded-lg px-3"
                >
                  <FolderUp className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Folder</span>
                </Button>
                <Button
                  onClick={handleUpload}
                  disabled={uploading}
                  size="sm"
                  className="h-8 text-xs gap-1.5 rounded-lg px-3"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Uploading..." : "Upload"}
                </Button>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={folderInputRef}
              type="file"
              className="hidden"
              onChange={handleFileChange}
              {...({ webkitdirectory: "", directory: "" } as React.InputHTMLAttributes<HTMLInputElement>)}
            />

            {/* Search and file size info */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-2 pb-2">
              {files !== undefined && files.length > 0 && (
                <div className="relative w-full sm:flex-1 sm:max-w-xs">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search files..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
                  />
                </div>
              )}
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Max file size: 512 MB
              </span>
            </div>

            {/* Column headers - hidden on mobile, shown as grid on md+ */}
            {files !== undefined && files.length > 0 && (() => {
              const query = searchQuery.toLowerCase().trim();
              const filtered = query
                ? files.filter((f) =>
                    f.name.toLowerCase().includes(query) ||
                    f.type.toLowerCase().includes(query) ||
                    f.uploaderName.toLowerCase().includes(query)
                  )
                : files;
              return filtered.length > 0 ? (
                <div className="hidden md:grid items-center py-2.5 border-t border-border/30 gap-1" style={{ gridTemplateColumns: "1fr 100px 120px 150px 120px" }}>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uploaded by</div>
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</div>
                </div>
              ) : null;
            })()}
          </div>
        </div>

        {/* Files list */}
        <div className="max-w-[1400px] w-full mx-auto px-3 sm:px-6 lg:px-8 pt-0 pb-6 animate-fade-in-up stagger-3">
          {files === undefined ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Loading files...
            </div>
          ) : files.length === 0 ? (
            <div className="p-16 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm font-medium text-muted-foreground mb-1">
                No files yet
              </p>
              <p className="text-xs text-muted-foreground/70">
                Upload files or folders to get started
              </p>
            </div>
          ) : (() => {
            const query = searchQuery.toLowerCase().trim();
            const filtered = query
              ? files.filter((f) =>
                  f.name.toLowerCase().includes(query) ||
                  f.type.toLowerCase().includes(query) ||
                  f.uploaderName.toLowerCase().includes(query)
                )
              : files;
            return filtered.length === 0 ? (
              <div className="p-12 text-center">
                <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No files matching &ldquo;{searchQuery}&rdquo;
                </p>
              </div>
            ) : (
              <div className="border border-border/40 rounded-lg overflow-hidden bg-card/50">
                <table className="w-full text-sm">
                  <thead className="border-b border-border/30 bg-muted/20">
                    <tr>
                      <th className="p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</th>
                      <th className="hidden sm:table-cell p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</th>
                      <th className="hidden md:table-cell p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                      <th className="hidden lg:table-cell p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Uploaded by</th>
                      <th className="hidden lg:table-cell p-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      <th className="p-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {filtered.map((file) => (
                      <tr key={file._id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                            <span className="truncate max-w-xs font-medium text-foreground">{file.name}</span>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell p-3 text-muted-foreground text-xs">
                          {formatBytes(file.size)}
                        </td>
                        <td className="hidden md:table-cell p-3 text-muted-foreground text-xs">
                          {file.type || "—"}
                        </td>
                        <td className="hidden lg:table-cell p-3 text-muted-foreground text-xs">
                          {file.uploaderName}
                        </td>
                        <td className="hidden lg:table-cell p-3 text-muted-foreground text-xs">
                          {formatDate(file.createdAt)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-end gap-1">
                            {file.url && isPreviewableType(file.type) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                asChild
                              >
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  title="Preview"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                </a>
                              </Button>
                            )}
                            {file.url && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() =>
                                  handleDownload(file._id, file.url!, file.name)
                                }
                                title="Download"
                              >
                                <Download className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(file._id)}
                              title="Delete"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <AuditHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </div>
  );
}
