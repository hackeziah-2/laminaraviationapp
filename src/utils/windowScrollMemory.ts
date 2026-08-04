/** Shared window-scroll memory for list preserve + SweetAlert flows. */

let rememberedWindowScroll = { x: 0, y: 0 };

export function rememberWindowScroll(pos?: { x: number; y: number }) {
  rememberedWindowScroll = pos ?? {
    x: window.scrollX,
    y: window.scrollY,
  };
  return rememberedWindowScroll;
}

export function getRememberedWindowScroll() {
  return rememberedWindowScroll;
}

export function restoreRememberedWindowScroll() {
  const { x, y } = rememberedWindowScroll;
  window.scrollTo({ left: x, top: y, behavior: "auto" });
  window.requestAnimationFrame(() => {
    window.scrollTo({ left: x, top: y, behavior: "auto" });
    window.setTimeout(() => {
      window.scrollTo({ left: x, top: y, behavior: "auto" });
    }, 0);
    window.setTimeout(() => {
      window.scrollTo({ left: x, top: y, behavior: "auto" });
    }, 50);
  });
}
