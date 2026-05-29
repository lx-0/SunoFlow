import { useRef, useState } from "react";
import { useOutsideClick } from "./useOutsideClick";

interface UseMenuStateOptions {
  initialLoading?: boolean;
}

export function useMenuState<T extends HTMLElement = HTMLDivElement>(
  options: UseMenuStateOptions = {}
) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(options.initialLoading ?? false);
  const ref = useRef<T>(null);

  useOutsideClick(ref, () => setShow(false), show);

  return { show, setShow, loading, setLoading, ref };
}
