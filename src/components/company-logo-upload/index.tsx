"use client";

import { apiService } from "@/services/api";
import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CompanyLogoUploadProps {
  value: string;
  onChange: (url: string) => void;
  companyId: string;
  companyData?: {
    tradeName?: string;
    legalName?: string;
    cnpj?: string;
    email?: string;
    phone?: string;
  };
  maxSizeMB?: number;
}

export function CompanyLogoUpload({
  value,
  onChange,
  companyId,
  companyData,
  maxSizeMB = 5,
}: CompanyLogoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted) {
      setPreview(value || null);
    }
  }, [value, isMounted]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const file = input.files?.[0];

    // Limpa o valor do input imediatamente para permitir selecionar o mesmo arquivo em envios seguintes
    input.value = "";

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida");
      return;
    }

    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      toast.error(`A imagem deve ter no máximo ${maxSizeMB}MB`);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    try {
      setUploading(true);
      const response = await apiService.uploadCompanyLogo(
        file,
        companyId,
        companyData,
      );

      if (response.success && response.data?.logo_url) {
        onChange(response.data.logo_url);
        setPreview(response.data.logo_url);
        toast.success("Logo atualizado com sucesso!");
      } else {
        toast.error(response.message || "Erro ao fazer upload");
        setPreview(value || null);
      }
    } catch (_error) {
      toast.error("Erro ao fazer upload do logo");
      setPreview(value || null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!isMounted) {
    return (
      <div className="h-[76px] w-[76px] shrink-0 -mt-[30px] rounded-full border-[3px] border-background bg-muted" />
    );
  }

  return (
    <div
      onClick={() => !uploading && fileInputRef.current?.click()}
      className="group relative h-[76px] w-[76px] shrink-0 -mt-[30px] cursor-pointer overflow-hidden rounded-full border-[3px] border-background bg-card shadow-sm"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        onClick={(e) => {
          e.stopPropagation();
          (e.target as HTMLInputElement).value = "";
        }}
        className="hidden"
      />

      {preview ? (
        <img
          src={preview}
          alt="Logo da empresa"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-muted text-[10px] font-semibold text-muted-foreground">
          Logo
        </div>
      )}

      <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 transition-colors group-hover:bg-black/35">
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <Camera className="h-4 w-4 text-white opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </div>
  );
}
