import { Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MuteButtonProps = {
  muted: boolean;
  onToggle: () => void;
};

export function MuteButton({ muted, onToggle }: MuteButtonProps) {
  return (
    <Button
      type="button"
      variant="icon"
      size="icon"
      onClick={onToggle}
      aria-pressed={muted}
      aria-label={muted ? "Unmute" : "Mute"}
      title={muted ? "Unmute (Space)" : "Mute (Space)"}
    >
      <span className="relative block size-5">
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center transition-[opacity,transform,filter] duration-200 ease-out",
            muted
              ? "scale-100 opacity-100 blur-none"
              : "scale-[0.25] opacity-0 blur-[4px]",
          )}
        >
          <VolumeX className="size-5" strokeWidth={1.75} />
        </span>
        <span
          className={cn(
            "flex items-center justify-center transition-[opacity,transform,filter] duration-200 ease-out",
            muted
              ? "scale-[0.25] opacity-0 blur-[4px]"
              : "scale-100 opacity-100 blur-none",
          )}
        >
          <Volume2 className="size-5" strokeWidth={1.75} />
        </span>
      </span>
    </Button>
  );
}
