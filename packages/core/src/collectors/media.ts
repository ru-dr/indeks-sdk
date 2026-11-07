import { scrubUrl } from "@indeks/shared";
import type { IndeksMediaEvent, IndeksMediaProgressEvent } from "@indeks/shared";
import type { Collector } from "../context";
import { describeElement } from "../dom";

const MEDIA_EVENT_TYPES = ["play", "pause", "volumechange", "seeking", "seeked", "ended"] as const;
const PROGRESS_THRESHOLDS = [25, 50, 75, 100] as const;
const MAX_MEDIA_ENTRIES = 50;

function asMedia(target: EventTarget | null): HTMLMediaElement | null {
  const element = target as HTMLMediaElement | null;
  return element && ["VIDEO", "AUDIO"].includes(element.tagName) ? element : null;
}

export const media: Collector = (ctx) => {
  for (const type of MEDIA_EVENT_TYPES) {
    ctx.on(
      document,
      type,
      (e) => {
        const target = asMedia(e.target);
        if (!target) return;
        ctx.emit<IndeksMediaEvent>({
          type,
          element: {
            ...describeElement(target),
            src: scrubUrl(target.currentSrc || target.src),
            currentTime: target.currentTime,
            duration: target.duration,
            volume: target.volume,
            muted: target.muted,
          },
        });
      },
      true,
    );
  }
};

export const mediaProgress: Collector = (ctx) => {
  const reachedByMedia = new Map<string, Set<number>>();
  const mediaId = (element: HTMLMediaElement) => element.currentSrc || element.src;

  ctx.on(
    document,
    "timeupdate",
    (e) => {
      const target = asMedia(e.target);
      if (!target) return;
      const id = mediaId(target);
      let reached = reachedByMedia.get(id);
      if (!reached) {
        if (reachedByMedia.size >= MAX_MEDIA_ENTRIES) {
          const oldest = reachedByMedia.keys().next().value;
          if (oldest !== undefined) reachedByMedia.delete(oldest);
        }
        reached = new Set();
        reachedByMedia.set(id, reached);
      }
      if (!Number.isFinite(target.duration) || target.duration <= 0) return;
      const progress = Math.round((target.currentTime / target.duration) * 100);
      for (const threshold of PROGRESS_THRESHOLDS) {
        if (progress < threshold || reached.has(threshold)) continue;
        reached.add(threshold);
        ctx.emit<IndeksMediaProgressEvent>({
          type: target.tagName === "VIDEO" ? "video_progress" : "audio_progress",
          progress: threshold,
          currentTime: target.currentTime,
          duration: target.duration,
          mediaUrl: scrubUrl(id),
        });
      }
    },
    true,
  );
  ctx.on(
    document,
    "ended",
    (e) => {
      const target = asMedia(e.target);
      if (target) reachedByMedia.delete(mediaId(target));
    },
    true,
  );
};
