import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMediaQuery } from "./useMediaQuery";

describe("useMediaQuery", () => {
  let matchMedia: ReturnType<typeof vi.fn> = vi.fn();
  let addListener: ReturnType<typeof vi.fn> = vi.fn();
  let removeListener: ReturnType<typeof vi.fn> = vi.fn();

  beforeEach(() => {
    addListener = vi.fn();
    removeListener = vi.fn();
    matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: addListener,
      removeEventListener: removeListener,
    });
    window.matchMedia = matchMedia;
  });

  it("should return false by default", () => {
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(result.current).toBe(false);
  });

  it("should call matchMedia with the provided query", () => {
    const query = "(min-width: 768px)";
    renderHook(() => useMediaQuery(query));
    expect(matchMedia).toHaveBeenCalledWith(query);
  });

  it("should add event listener on mount", () => {
    renderHook(() => useMediaQuery("(min-width: 768px)"));
    expect(addListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("should remove event listener on unmount", () => {
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 768px)"));
    unmount();
    expect(removeListener).toHaveBeenCalledWith("change", expect.any(Function));
  });
});
