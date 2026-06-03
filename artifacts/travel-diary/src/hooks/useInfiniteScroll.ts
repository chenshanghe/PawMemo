import { useEffect, useRef } from "react";

export function useInfiniteScroll(
  onLoadMore: () => void,
  hasMore: boolean,
  loading: boolean,
): React.RefObject<HTMLDivElement | null> {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const cbRef = useRef(onLoadMore);
  cbRef.current = onLoadMore;

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          cbRef.current();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  return sentinelRef;
}
