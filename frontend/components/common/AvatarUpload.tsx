"use client";
import { useRef, useState } from "react";
import { Upload, X, User as UserIcon } from "lucide-react";
import Image from "next/image";

type Props = {
  currentAvatar?: string;
  onUpload: (file: File) => Promise<void>;
};

export default function AvatarUpload({ currentAvatar, onUpload }: Props) {
  const [preview, setPreview] = useState<string | null>(currentAvatar || null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!file.type.startsWith("image/")) {
      alert("Le fichier doit être une image");
      return;
    }

    // Validate size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert("La taille maximale est de 2 Mo");
      return;
    }

    // Generate preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      await onUpload(file);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Échec du téléchargement");
    } finally {
      setUploading(false);
    }
  };

  const clearPreview = () => {
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="h-32 w-32 rounded-full border-4 border-white/10 bg-white/5 flex items-center justify-center overflow-hidden">
          {preview ? (
            <Image src={preview} alt="Avatar" width={128} height={128} className="object-cover" />
          ) : (
            <UserIcon className="h-16 w-16 text-zinc-400" />
          )}
        </div>
        {preview && (
          <button
            onClick={clearPreview}
            className="absolute top-0 right-0 rounded-full bg-red-600 p-1 text-white hover:bg-red-700"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <label className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 flex items-center gap-2">
        <Upload className="h-4 w-4" />
        {uploading ? "Envoi..." : "Choisir une photo"}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />
      </label>
      <p className="text-xs text-zinc-500">Max 2 Mo, format JPG/PNG</p>
    </div>
  );
}
