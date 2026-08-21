"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Download,
  Eye,
  FileIcon,
  FolderOpen,
  FolderUp,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

const FILE_GRID_COLS_WITH_PROJECT =
  "minmax(0,1.6fr) 150px 100px 120px 130px 120px 72px";
const FILE_GRID_COLS_PROJECT_SCOPED =
  "minmax(0,1.8fr) 100px 120px 150px 120px 72px";

type FileSortValue =
  | "newest"
  | "oldest"
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc";

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
    if (
      error.message.includes("NetworkError") ||
      error.message.includes("Failed to fetch")
    ) {
      return "Network connection failed";
    }
    return error.message;
  }
  return "Unknown error";
}

export function FilesBrowser({
  fixedProjectId,
}: {
  fixedProjectId?: Id<"projects">;
}) {
  const files = useQuery(
    api.files.list,
    fixedProjectId ? { projectId: fixedProjectId } : {},
  );
  const projects = useQuery(api.projects.list, { includeArchived: true }) ?? [];
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const updateFileProject = useMutation(api.files.updateProject);
  const deleteFile = useMutation(api.files.deleteFile);
  const logDownload = useMutation(api.files.logDownload);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortValue, setSortValue] = useState<FileSortValue>("newest");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [uploadProjectId, setUploadProjectId] = useState<string>(
    fixedProjectId ?? "__none__",
  );

  const showProjectControls = fixedProjectId === undefined;
  const visibleProjects = projects.filter((project) => !project.archived);

  function handleUpload() {
    fileInputRef.current?.click();
  }

  function handleFolderUpload() {
    folderInputRef.current?.click();
  }

  function uploadFiles(selectedFiles: FileList) {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    const errors: { file: string; reason: string }[] = [];
    const targetProjectId =
      fixedProjectId ??
      (uploadProjectId === "__none__"
        ? undefined
        : (uploadProjectId as Id<"projects">));

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
        const name = file.webkitRelativePath || file.name;
        await saveFile({
          storageId: json.storageId,
          name,
          size: file.size,
          type: contentType,
          projectId: targetProjectId,
        });
        successCount++;
      } catch (err) {
        errors.push({
          file: file.name,
          reason: getErrorReason(err),
        });
      }
    });

    Promise.all(uploads).finally(() => {
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

  function handleProjectChange(fileId: Id<"files">, nextProjectId: string) {
    void updateFileProject({
      fileId,
      projectId:
        nextProjectId === "__none__"
          ? undefined
          : (nextProjectId as Id<"projects">),
    })
      .then(() => toast.success("File project updated"))
      .catch(() => toast.error("Failed to update file project"));
  }

  const query = searchQuery.toLowerCase().trim();
  const filteredFiles =
    files === undefined
      ? undefined
      : files
          .filter((file) => {
            if (!showProjectControls || projectFilter === "all") return true;
            if (projectFilter === "__none__") return file.projectId === undefined;
            return file.projectId === projectFilter;
          })
          .filter((file) => {
            if (query.length === 0) return true;

            return (
              file.name.toLowerCase().includes(query) ||
              file.type.toLowerCase().includes(query) ||
              file.uploaderName.toLowerCase().includes(query) ||
              (file.project?.name ?? "").toLowerCase().includes(query)
            );
          })
          .sort((a, b) => {
            switch (sortValue) {
              case "oldest":
                return a.createdAt - b.createdAt;
              case "name-asc":
                return a.name.localeCompare(b.name);
              case "name-desc":
                return b.name.localeCompare(a.name);
              case "size-asc":
                return a.size - b.size;
              case "size-desc":
                return b.size - a.size;
              case "newest":
              default:
                return b.createdAt - a.createdAt;
            }
          });

  const gridCols = showProjectControls
    ? FILE_GRID_COLS_WITH_PROJECT
    : FILE_GRID_COLS_PROJECT_SCOPED;

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 pt-2 pb-2">
        {(files?.length ?? 0) > 0 && (
          <div className="relative w-full sm:flex-1 sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={fixedProjectId ? "Search project files..." : "Search files..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 text-xs pl-8 border-border/50 bg-transparent shadow-none rounded-lg"
            />
          </div>
        )}

        {showProjectControls && (
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="h-8 w-full sm:w-[170px] text-xs border-border/50 bg-transparent shadow-none rounded-lg">
              <SelectValue placeholder="Filter project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="__none__">Unassigned</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Select value={sortValue} onValueChange={(value) => setSortValue(value as FileSortValue)}>
          <SelectTrigger className="h-8 w-full sm:w-[160px] text-xs border-border/50 bg-transparent shadow-none rounded-lg">
            <SelectValue placeholder="Sort files" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name-asc">Name A-Z</SelectItem>
            <SelectItem value="name-desc">Name Z-A</SelectItem>
            <SelectItem value="size-desc">Largest first</SelectItem>
            <SelectItem value="size-asc">Smallest first</SelectItem>
          </SelectContent>
        </Select>

        {showProjectControls && (
          <Select value={uploadProjectId} onValueChange={setUploadProjectId}>
            <SelectTrigger className="h-8 w-full sm:w-[170px] text-xs border-border/50 bg-transparent shadow-none rounded-lg">
              <SelectValue placeholder="Upload target" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">No project</SelectItem>
              {visibleProjects.map((project) => (
                <SelectItem key={project._id} value={project._id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center gap-2 w-full sm:w-auto">
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

      <div className="pt-1 pb-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
          Max file size: 512 MB
        </span>
      </div>

      {filteredFiles !== undefined && filteredFiles.length > 0 && (
        <div
          className="hidden md:grid items-center py-2.5 border-t border-border/30 gap-3"
          style={{ gridTemplateColumns: gridCols }}
        >
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</div>
          {showProjectControls && (
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Project</div>
          )}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Size</div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Uploaded by</div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</div>
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider text-right">Actions</div>
        </div>
      )}

      <div className="pt-0 pb-6 animate-fade-in-up stagger-3">
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
        ) : filteredFiles !== undefined && filteredFiles.length === 0 ? (
          <div className="p-12 text-center">
            <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              No files matching &ldquo;{searchQuery || "your filters"}&rdquo;
            </p>
          </div>
        ) : (
          <div>
            {filteredFiles?.map((file, index) => (
              <div key={file._id}>
                <div
                  className="md:hidden border-b border-border/50 transition-colors hover:bg-muted/50 animate-fade-in p-3"
                  style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                        <p className="font-medium text-sm truncate">{file.name}</p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-muted-foreground">
                        <span>{formatBytes(file.size)}</span>
                        <span>{file.type || "—"}</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                        <span>{file.uploaderName}</span>
                        <span>{formatDate(file.createdAt)}</span>
                      </div>
                      {showProjectControls && (
                        <div className="mt-2">
                          <Select
                            value={file.projectId ?? "__none__"}
                            onValueChange={(value) => handleProjectChange(file._id, value)}
                          >
                            <SelectTrigger className="h-7 w-full text-[11px] border-border/50 bg-transparent shadow-none rounded-lg">
                              <SelectValue placeholder="Assign project" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">No project</SelectItem>
                              {projects.map((project) => (
                                <SelectItem key={project._id} value={project._id}>
                                  {project.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {file.url && isPreviewableType(file.type) && (
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" asChild>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" title="Preview">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      )}
                      {file.url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-lg"
                          onClick={() => handleDownload(file._id, file.url!, file.name)}
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                        onClick={() => handleDelete(file._id)}
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div
                  className="hidden md:grid items-center py-2.5 border-b border-border/50 transition-colors hover:bg-muted/50 animate-fade-in gap-3"
                  style={{
                    gridTemplateColumns: gridCols,
                    animationDelay: `${Math.min(index, 20) * 25}ms`,
                  }}
                >
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                    <span className="font-medium text-sm truncate">{file.name}</span>
                  </div>
                  {showProjectControls && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <Select
                        value={file.projectId ?? "__none__"}
                        onValueChange={(value) => handleProjectChange(file._id, value)}
                      >
                        <SelectTrigger className="h-7 w-[140px] text-xs border-border/50 bg-transparent shadow-none rounded-lg overflow-hidden">
                          <SelectValue placeholder="Assign project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project._id} value={project._id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatBytes(file.size)}
                  </div>
                  <div className="text-xs text-muted-foreground truncate pr-2" title={file.type || "—"}>
                    {file.type || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate pr-2" title={file.uploaderName}>
                    {file.uploaderName}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    {formatDate(file.createdAt)}
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    {file.url && isPreviewableType(file.type) && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg" asChild>
                        <a href={file.url} target="_blank" rel="noopener noreferrer" title="Preview">
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    )}
                    {file.url && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg"
                        onClick={() => handleDownload(file._id, file.url!, file.name)}
                        title="Download"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-destructive hover:text-destructive"
                      onClick={() => handleDelete(file._id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}