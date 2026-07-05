import { RefObject, useEffect } from "react";

type UseIntersectionObserverProps = {
  target: RefObject<Element | null>;
  onIntersect: () => void;
  enabled?: boolean;
  threshold?: number;
  rootMargin?: string;
};

export const useIntersectionObserver = ({
  target,
  onIntersect,
  enabled = true,
  threshold = 0.5,
  rootMargin = "0px",
}: UseIntersectionObserverProps) => {
  useEffect(() => {
    if (!enabled || !target.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          onIntersect();
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(target.current);

    return () => observer.disconnect();
  }, [target, enabled, threshold, rootMargin, onIntersect]);
};
