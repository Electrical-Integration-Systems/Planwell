"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { ImageIcon, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function getUploadError(error: unknown) {
  return error instanceof Error ? error.message : "Failed to upload banner";
}

export function ProjectBanner({
  projectId,
  projectName,
  bannerUrl,
}: {
  projectId: Id<"projects">;
  projectName: string;
  bannerUrl: string | null;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const saveFile = useMutation(api.files.saveFile);
  const setBannerPhoto = useMutation(api.projects.setBannerPhoto);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const contentType = file.type || "application/octet-stream";
    if (!contentType.startsWith("image/")) {
      toast.error("Banner must be an image file");
      event.target.value = "";
      return;
    }

    setUploading(true);
    void generateUploadUrl()
      .then((uploadUrl) =>
        fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": contentType },
          body: file,
        }),
      )
      .then((response) => {
        if (!response.ok) throw new Error("Banner upload failed");
        return response.json() as Promise<{ storageId?: Id<"_storage"> }>;
      })
      .then((result) => {
        if (!result.storageId) throw new Error("Upload did not return a storage ID");
        return saveFile({
          storageId: result.storageId,
          name: file.name,
          size: file.size,
          type: contentType,
          kind: "photo",
          projectId,
        });
      })
      .then((fileId) => setBannerPhoto({ id: projectId, fileId }))
      .then(() => toast.success("Project banner updated"))
      .catch((error: unknown) => toast.error(getUploadError(error)))
      .finally(() => {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      });
  }

  function handleRemove() {
    void setBannerPhoto({ id: projectId })
      .then(() => toast.success("Project banner removed"))
      .catch(() => toast.error("Failed to remove project banner"));
  }

  return (
    <div className="group relative h-36 overflow-hidden rounded-lg border border-border/50 bg-muted/40 sm:h-52">
      {bannerUrl ? (
        <Image
          src={bannerUrl}
          alt={`${projectName} banner`}
          fill
          unoptimized
          sizes="(max-width: 1400px) 100vw, 1400px"
          className="object-cover"
          priority
        />
      ) : (
        <div className="flex h-full items-center justify-center border border-dashed border-primary/30 bg-primary/5">
          <ImageIcon className="h-8 w-8 text-primary/40" />
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 p-3 pt-10 transition-opacity ${
          bannerUrl
            ? "bg-gradient-to-t from-black/65 to-transparent opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
            : "bg-gradient-to-t from-black/50 to-transparent opacity-100"
        }`}
      >
        <Button
          size="sm"
          variant="secondary"
          className="h-8 gap-1.5 rounded-lg text-xs"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-3.5 w-3.5" />
          {uploading ? "Uploading..." : bannerUrl ? "Replace banner" : "Upload banner"}
        </Button>
        {bannerUrl ? (
          <Button
            size="icon"
            variant="destructive"
            className="h-8 w-8 rounded-lg"
            onClick={handleRemove}
            title="Remove banner"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}