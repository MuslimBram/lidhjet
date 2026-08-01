import { useCallback, useEffect, useRef } from "react";
import { notifyUser } from "@/lib/notify";

const CHANNEL = "lidhjet_posts_v1";

export interface PostBroadcast {
  id: string;
  authorFullName: string;
  body: string;
  offerType: string;
  price: number;
}

/**
 * Every registered user gets a notification for every new post.
 * Cross-tab/cross-session delivery via BroadcastChannel; local delivery uses
 * the notification mode selected in the header.
 */
export function usePostNotifications(onRemotePost?: (p: PostBroadcast) => void) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const handlerRef = useRef(onRemotePost);
  handlerRef.current = onRemotePost;

  useEffect(() => {
    if (typeof window === "undefined" || !("BroadcastChannel" in window)) return;
    const ch = new BroadcastChannel(CHANNEL);
    channelRef.current = ch;
    ch.onmessage = (e: MessageEvent<PostBroadcast>) => {
      const p = e.data;
      if (!p?.id) return;
      handlerRef.current?.(p);
      notifyUser("Postim i re në Lidhjet", `${p.authorFullName}: ${p.body.slice(0, 80)}`);
    };
    return () => {
      ch.onmessage = null;
      ch.close();
      channelRef.current = null;
    };
  }, []);

  const announce = useCallback((p: PostBroadcast) => {
    channelRef.current?.postMessage(p);
    notifyUser("Postimi u publikua", `${p.body.slice(0, 80)}`);
  }, []);

  return { announce };
}
