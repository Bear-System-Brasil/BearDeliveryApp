"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiService } from "@/services/api";
import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
  aspectRatio?: "square" | "video" | "auto";
  maxSizeMB?: number;
}

export function ImageUpload({
  value,
  onChange,
  label = "Imagem",
  folder = "products",
  aspectRatio = "square",
  maxSizeMB = 5,
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`Imagem muito grande. Máximo ${maxSizeMB}MB`);
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to S3
    try {
      setUploading(true);
      const response = await apiService.uploadImage(file, folder);

      if (response.success && response.data?.url) {
        onChange(response.data.url);
        setPreview(response.data.url);
        toast.success("Imagem enviada com sucesso!");
      } else {
        toast.error(response.message || "Erro ao fazer upload");
        setPreview(null);
      }
    } catch (error) {
      toast.error("Erro ao fazer upload da imagem");
      setPreview(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    auto: "",
  }[aspectRatio];

  return (
    <div className="grid gap-1.5">
      {label && <Label className="text-xs sm:text-sm">{label}</Label>}

      <div className="flex items-start gap-3">
        {/* Preview */}
        {preview && (
          <div
            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden border-2 border-border 
                          shadow-sm shrink-0 ${aspectRatioClass}`}
          >
            <Image
              src={preview}
              quality={70}
              alt="Preview"
              fill
              sizes="(min-width: 640px) 96px, 80px"
              className="object-cover"
              onError={() => {
                setPreview(null);
                toast.error("Erro ao carregar imagem");
              }}
            />
            <button
              onClick={handleRemove}
              className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 
                         transition-all shadow-md"
              type="button"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Upload Button */}
        <div className="flex-1 flex flex-col gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full h-20 sm:h-24 border-2 border-dashed border-border hover:border-brand-400 hover:bg-linear-to-br hover:from-brand-50 hover:to-brand-50 transition-all cursor-pointer flex-col gap-2"
          >
            {uploading ? (
              <>
                <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-muted-foreground">Enviando...</span>
              </>
            ) : (
              <>
                <Upload className="w-6 h-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Clique para {preview ? "alterar" : "enviar"}
                </span>
              </>
            )}
          </Button>

          <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
            JPG, PNG ou WEBP • Máx. {maxSizeMB}MB
          </p>
        </div>
      </div>
    </div>
  );
}
