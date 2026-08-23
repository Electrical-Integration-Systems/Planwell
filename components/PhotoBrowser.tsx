"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import {
  Camera,
  Download,
  ExternalLink,
  ImageIcon,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { ConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function downloadFile(url: string, fileName: string) {
  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "photo";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(() => {
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || "photo";
      link.setAttribute("target", "_blank");
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 100);
    });
}

export function PhotoBrowser({
  fixedProjectId,
  fixedTaskId,
  emptyTitle = "No photos yet",
  emptyDescription = "Upload photos to get started",
  uploadLabel = "Upload photos",
}: {
  fixedProjectId?: Id<"projects">;
  fixedTaskId?: Id<"tasks">;
  emptyTitle?: string;
  emptyDescription?: string;
  uploadLabel?: string;
}) {
  const photos = useQuery(
    api.files.listPhotos,
    fixedTaskId ? { taskId: fixedTaskId } : { projectId: fixedProjectId },
  );
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const deleteFile = useMutation(api.files.deleteFile);
  const logDownload = useMutation(api.files.logDownload);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotoId, setSelectedPhotoId] = useState<Id<"files"> | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    photoId: Id<"files">;
    name: string;
  } | null>(null);

  const sortedPhotos =
    photos === undefined
      ? undefined
      : [...photos].sort((a, b) => b.createdAt - a.createdAt);

  const query = searchQuery.toLowerCase().trim();
  const filteredPhotos =
    sortedPhotos === undefined
      ? undefined
      : sortedPhotos.filter((photo) => {
          if (query.length === 0) return true;

          return [
            photo.name,
            photo.uploaderName,
            photo.project?.name,
            photo.task?.title,
          ]
            .filter((value): value is string => typeof value === "string")
            .join(" ")
            .toLowerCase()
            .includes(query);
        });

  const selectedPhoto =
    filteredPhotos?.find((photo) => photo._id === selectedPhotoId) ??
    sortedPhotos?.find((photo) => photo._id === selectedPhotoId) ??
    null;

  function handleUploadClick() {
    fileInputRef.current?.click();
  }

  function uploadPhotos(selectedFiles: FileList) {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    const errors: { file: string; reason: string }[] = [];

    const uploads = Array.from(selectedFiles).map(async (file) => {
      try {
        const contentType = file.type || "application/octet-stream";
        if (!contentType.startsWith("image/")) {
          throw new Error("Only image files can be uploaded as photos");
        }

        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: file,
        });
        if (!result.ok) {
          throw new Error(getErrorReason(null, result.status));
        }

        const json = (await result.json()) as { storageId?: Id<"_storage"> };
        if (!json.storageId) {
          throw new Error("Server did not return a storage ID");
        }

        await saveFile({
          storageId: json.storageId,
          name: file.name,
          size: file.size,
          type: contentType,
          kind: "photo",
          projectId: fixedTaskId ? undefined : fixedProjectId,
          taskId: fixedTaskId,
        });
        successCount++;
      } catch (error) {
        errors.push({
          file: file.name,
          reason: getErrorReason(error),
        });
      }
    });

    Promise.all(uploads).finally(() => {
      if (errors.length > 0 && successCount > 0) {
        const errorMsg = errors.map((entry) => `${entry.file}: ${entry.reason}`).join("\n");
        toast.warning(`${successCount} uploaded, ${errors.length} failed:\n${errorMsg}`);
      } else if (errors.length > 0) {
        if (errors.length === 1) {
          toast.error(`${errors[0].file}: ${errors[0].reason}`);
        } else {
          const errorMsg = errors.map((entry) => `${entry.file}: ${entry.reason}`).join("\n");
          toast.error(`Upload failed:\n${errorMsg}`);
        }
      } else if (successCount > 0) {
        toast.success(`${successCount} photo(s) uploaded successfully`);
      }

      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    uploadPhotos(selectedFiles);
  }

  function handleDelete(photoId: Id<"files">) {
    void deleteFile({ fileId: photoId })
      .then(() => {
        if (selectedPhotoId === photoId) {
          setSelectedPhotoId(null);
        }
        toast.success("Photo deleted");
      })
      .catch(() => toast.error("Failed to delete photo"));
  }

  function handleDownload(photoId: Id<"files">, url: string, fileName: string) {
    void logDownload({ fileId: photoId }).catch(() => {
      // download audit is best-effort
    });
    downloadFile(url, fileName);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2">
        {(sortedPhotos?.length ?? 0) > 0 && (
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search photos..."
              className="h-8 rounded-lg border-border/50 bg-transparent pl-8 text-xs shadow-none"
            />
          </div>
        )}

        <Button
          onClick={handleUploadClick}
          disabled={uploading}
          size="sm"
          className="h-8 rounded-lg px-3 text-xs gap-1.5"
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : uploadLabel}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      {photos === undefined ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          Loading photos...
        </div>
      ) : photos.length === 0 ? (
        <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 py-16 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Camera className="h-5 w-5 text-primary/60" />
          </div>
          <p className="text-sm text-muted-foreground">{emptyTitle}</p>
          <p className="mt-1 text-xs text-muted-foreground/60">{emptyDescription}</p>
        </div>
      ) : filteredPhotos !== undefined && filteredPhotos.length === 0 ? (
        <div className="p-12 text-center">
          <Search className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            No photos matching &ldquo;{searchQuery}&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredPhotos?.map((photo) => (
            <Card
              key={photo._id}
              className="overflow-hidden border-border/50 bg-card/70 py-0 shadow-warm-sm transition-colors hover:border-primary/30"
            >
              <button
                type="button"
                className="group text-left"
                onClick={() => setSelectedPhotoId(photo._id)}
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted/40">
                  {photo.url ? (
                    <Image
                      src={photo.url}
                      alt={photo.name}
                      width={1600}
                      height={1200}
                      unoptimized
                      className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                    </div>
                  )}
                </div>
              </button>
              <CardContent className="space-y-3 p-4">
                <div className="space-y-1">
                  <p className="truncate text-sm font-medium" title={photo.name}>
                    {photo.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {photo.uploaderName} · {formatDate(photo.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {photo.task ? (
                    <Badge variant="outline" className="border-primary/30 text-[11px]">
                      Task: {photo.task.title}
                    </Badge>
                  ) : photo.project ? (
                    <Badge variant="outline" className="text-[11px]">
                      Project: {photo.project.name}
                    </Badge>
                  ) : null}
                </div>

                <div className="flex items-center justify-end gap-1">
                  {photo.url && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" asChild>
                      <a href={photo.url} target="_blank" rel="noopener noreferrer" title="Open full size">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                  )}
                  {photo.url && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => handleDownload(photo._id, photo.url!, photo.name)}
                      title="Download"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                    onClick={() =>
                      setPendingDelete({ photoId: photo._id, name: photo.name })
                    }
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selectedPhoto !== null} onOpenChange={(open) => !open && setSelectedPhotoId(null)}>
        <DialogContent className="max-w-4xl border-border/60 p-0 shadow-warm-lg sm:max-w-4xl">
          {selectedPhoto && (
            <>
              <div className="overflow-hidden rounded-t-lg bg-muted/40">
                {selectedPhoto.url ? (
                  <Image
                    src={selectedPhoto.url}
                    alt={selectedPhoto.name}
                    width={1800}
                    height={1200}
                    unoptimized
                    className="max-h-[75vh] w-full object-contain"
                  />
                ) : (
                  <div className="flex h-[320px] items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="p-6 pt-0">
                <DialogHeader className="pt-6">
                  <DialogTitle className="font-serif text-xl tracking-tight">
                    {selectedPhoto.name}
                  </DialogTitle>
                  <DialogDescription>
                    Uploaded by {selectedPhoto.uploaderName} on {formatDate(selectedPhoto.createdAt)}
                  </DialogDescription>
                </DialogHeader>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedPhoto.task ? (
                    <Badge variant="outline">Task: {selectedPhoto.task.title}</Badge>
                  ) : null}
                  {selectedPhoto.project ? (
                    <Badge variant="outline">Project: {selectedPhoto.project.name}</Badge>
                  ) : null}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title="Delete photo?"
        description={
          pendingDelete
            ? `Delete \"${pendingDelete.name}\"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete photo"
        onConfirm={() =>
          pendingDelete
            ? handleDelete(pendingDelete.photoId)
            : Promise.resolve()
        }
      />
    </div>
  );
}