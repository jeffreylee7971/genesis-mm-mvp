import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { X, Camera } from "lucide-react";
import { toast } from "sonner";

export default function PhotoUploader({
  userId,
  photos,
  onChange,
  max = 6,
}: {
  userId: string;
  photos: string[];
  onChange: (urls: string[]) => void;
  max?: number;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (photos.length >= max) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("profile-photos").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
      onChange([...photos, data.publicUrl]);
    } catch (e: any) {
      toast.error(e.message ?? "Could not upload photo");
    } finally {
      setUploading(false);
    }
  };

  const remove = async (url: string) => {
    onChange(photos.filter((p) => p !== url));
    // Best-effort delete from storage
    const path = url.split("/profile-photos/")[1];
    if (path) await supabase.storage.from("profile-photos").remove([path]);
  };

  return (
    <div>
      <div className="grid grid-cols-3 gap-3">
        {photos.map((url) => (
          <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-cream-deep">
            <img src={url} alt="Profile photo" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => remove(url)}
              className="absolute right-1.5 top-1.5 rounded-full bg-navy/70 p-1 text-cream backdrop-blur transition hover:bg-navy"
              aria-label="Remove photo"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
        {photos.length < max && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border text-navy/50 transition hover:border-terracotta hover:bg-cream-deep/40 hover:text-terracotta disabled:opacity-50"
          >
            <Camera className="size-6" />
            <span className="text-xs">{uploading ? "Uploading…" : "Add photo"}</span>
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <p className="mt-3 text-xs text-navy/50">
        {photos.length} of {max} photos. Choose photos that show who you really are.
      </p>
    </div>
  );
}
