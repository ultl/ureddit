"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "@/lib/auth-client";

type Listener = (data: unknown) => void;

type SSEContextValue = {
  setPostId: (id: string | null) => void;
  setCommunityId: (id: string | null) => void;
  addListener: (event: string, fn: Listener) => () => void;
};

const SSEContext = createContext<SSEContextValue | null>(null);

export function SSEProvider({ children }: { children: ReactNode }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [postId, setPostId] = useState<string | null>(null);
  const [communityId, setCommunityId] = useState<string | null>(null);
  const listenersRef = useRef<Map<string, Set<Listener>>>(new Map());

  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams();
    if (postId) params.set("postId", postId);
    if (communityId) params.set("communityId", communityId);
    const qs = params.toString();
    const es = new EventSource(`/api/sse${qs ? `?${qs}` : ""}`);

    const handlerFor = (event: string) => (e: MessageEvent) => {
      const set = listenersRef.current.get(event);
      if (!set) return;
      let data: unknown;
      try { data = JSON.parse(e.data); } catch { data = e.data; }
      set.forEach((fn) => fn(data));
    };

    const onComment = handlerFor("comment");
    const onNotification = handlerFor("notification");
    const onReady = handlerFor("ready");

    es.addEventListener("comment", onComment);
    es.addEventListener("notification", onNotification);
    es.addEventListener("ready", onReady);

    return () => {
      es.removeEventListener("comment", onComment);
      es.removeEventListener("notification", onNotification);
      es.removeEventListener("ready", onReady);
      es.close();
    };
  }, [userId, postId, communityId]);

  const addListener = useCallback((event: string, fn: Listener) => {
    const map = listenersRef.current;
    if (!map.has(event)) map.set(event, new Set());
    map.get(event)!.add(fn);
    return () => { map.get(event)?.delete(fn); };
  }, []);

  return (
    <SSEContext.Provider value={{ setPostId, setCommunityId, addListener }}>
      {children}
    </SSEContext.Provider>
  );
}

function useSSEContext() {
  const ctx = useContext(SSEContext);
  if (!ctx) throw new Error("useSSEContext must be used inside SSEProvider");
  return ctx;
}

export function useSubscribePost(postId: string | null) {
  const { setPostId } = useSSEContext();
  useEffect(() => {
    setPostId(postId);
    return () => setPostId(null);
  }, [postId, setPostId]);
}

export function useSubscribeCommunity(communityId: string | null) {
  const { setCommunityId } = useSSEContext();
  useEffect(() => {
    setCommunityId(communityId);
    return () => setCommunityId(null);
  }, [communityId, setCommunityId]);
}

export function useSSEListener<T>(event: string, handler: (data: T) => void) {
  const { addListener } = useSSEContext();
  const ref = useRef(handler);
  useEffect(() => { ref.current = handler; });
  useEffect(() => {
    return addListener(event, (data) => ref.current(data as T));
  }, [event, addListener]);
}
