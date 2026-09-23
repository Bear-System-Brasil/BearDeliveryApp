"use client";

import { apiService } from "@/services/api";
import { Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface UserPhotoUploadProps {
  value: string;
  onChange: (url: string) => void;
  userId: string;
  userData?: {
    name?: string;
    email?: string;
    cpf?: string;
    phone?: string;
  };
  label?: string;
  maxSizeMB?: number;
}

export function UserPhotoUpload({
  value,
  onChange,
  userId,
  userData,
  label = "Escolher imagem",
  maxSizeMB = 5,
}: UserPhotoUploadProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevenir hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Sincronizar preview quando value mudar (dados carregados do backend)
  useEffect(() => {
    if (isMounted) {
      setPreview(value || null);
    }
  }, [value, isMounted]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
      toast.error(`A imagem deve ter no máximo ${maxSizeMB}MB`);
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to backend
    try {
      setUploading(true);
      const response = await apiService.uploadUserPhoto(file, userData);

      if (response.success && response.data?.photoUrl) {
        onChange(response.data.photoUrl);
        setPreview(response.data.photoUrl);
        toast.success("Foto atualizada com sucesso!");
      } else {
        toast.error(response.message || "Erro ao fazer upload");
        setPreview(value || null);
      }
    } catch (error) {
      toast.error("Erro ao fazer upload da foto");
      setPreview(value || null);
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

  // Não renderizar até estar montado (evita hydration mismatch)
  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="relative w-40 h-40 mx-auto">
          <div className="w-full h-full bg-linear-to-br from-brand-50 to-brand-100 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-brand-300 dark:border-brand-700">
            <Upload className="w-10 h-10 text-brand-400 mb-2" />
            <span className="text-sm text-brand-600 dark:text-brand-400 font-medium">
              Carregando...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Clickable Preview Area */}
      <div className="relative w-40 h-40 mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          // Upload skeleton loading
          <div className="w-full h-full rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-linear-to-br from-brand-200 to-brand-200 animate-pulse" />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              <span className="mt-3 text-xs font-medium text-white drop-shadow-lg">
                Enviando...
              </span>
            </div>
          </div>
        ) : preview ? (
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="relative w-full h-full rounded-full bg-card border-4 border-brand-200 dark:border-brand-800 hover:border-brand-400 transition-all overflow-hidden cursor-pointer group"
          >
            {/* Image Container */}
            <div
              className="w-full h-full flex items-center justify-center bg-card"
              style={{ position: "relative", zIndex: 1 }}
            >
              <img
                src={preview}
                alt="Foto de perfil"
                className="w-full h-full object-cover rounded-full"
                style={{
                  display: "block",
                  opacity: 1,
                  visibility: "visible",
                  objectFit: "cover",
                }}
                onLoad={(e) => {
                  // Imagem carregada com sucesso
                }}
                onError={(e) => {
                  console.error("❌ Erro ao carregar foto:", preview);
                  // Esconder imagem quebrada
                  e.currentTarget.style.display = "none";
                  // Mostrar mensagem de erro
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector(".error-message")) {
                    const errorDiv = document.createElement("div");
                    errorDiv.className = "error-message text-center p-4";
                    errorDiv.innerHTML = `
                      <div class="text-red-500 dark:text-red-400 mb-2">
                        <p class="text-sm font-medium">Erro ao carregar imagem</p>
                      </div>
                    `;
                    parent.appendChild(errorDiv);
                  }
                }}
              />
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-full transition-all flex items-center justify-center pointer-events-none">
              <div className="text-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <p className="text-xs font-medium">Alterar</p>
              </div>
            </div>

            {/* Remove button */}
            {!uploading && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-lg z-10"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className="w-full h-full bg-linear-to-br from-brand-50 to-brand-100 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-brand-300 dark:border-brand-700 hover:border-brand-500 hover:from-brand-100 hover:to-brand-200 transition-all cursor-pointer"
          >
            <Upload className="w-10 h-10 text-brand-400 transition-colors mb-2" />
            <span className="text-sm text-brand-600 dark:text-brand-400 font-medium">
              {uploading ? "Enviando..." : "Adicionar Foto"}
            </span>
          </div>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground">
        Clique para fazer upload • Até {maxSizeMB}MB (JPG, PNG, GIF)
      </p>
    </div>
  );
}
