import { useRef } from "react";
import { Maximize2 } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/contexts/LangContext";

function embedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]{6,})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}?autoplay=1`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}?autoplay=1`;
  return null;
}

export function VideoModal({ url, title, onClose }: { url: string | null; title?: string; onClose: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const { tr } = useLang();
  if (!url) return null;
  const embed = embedUrl(url);
  return (
    <Dialog open={!!url} onClose={onClose} title={title} wide>
      <div className="overflow-hidden rounded-2xl bg-black">
        {embed ? (
          <iframe src={embed} title={title} className="aspect-video w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : (
          <video ref={ref} src={url} controls autoPlay playsInline className="aspect-video w-full bg-black" />
        )}
      </div>
      {!embed && (
        <div className="mt-3 flex justify-end">
          <Button variant="outline" size="sm" onClick={() => ref.current?.requestFullscreen?.()}><Maximize2 className="h-4 w-4" />{tr("ملء الشاشة", "Fullscreen")}</Button>
        </div>
      )}
    </Dialog>
  );
}
