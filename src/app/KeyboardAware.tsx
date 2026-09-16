"use client";

import { useEffect } from "react";

const TEXT_INPUT = 'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="file"]):not([type="range"]), textarea, [contenteditable="true"]';

/**
 * Keeps whatever you're typing into visible above the on-screen keyboard,
 * app-wide (Jaideep, 2026-09-15: fields were hidden behind the keyboard).
 *
 * - Android Chrome: the viewport's `interactive-widget=resizes-content`
 *   (src/app/layout.tsx) shrinks the page, so bottom-pinned bars move up.
 * - iOS Safari ignores that and overlays the keyboard, so the keyboard's
 *   height is measured from `visualViewport` and published as the CSS var
 *   `--keyboard-inset`; sticky footers and modals offset themselves by it.
 * - `data-typing` on <html> while a text field has focus hides the tab dock.
 * - The focused field is scrolled to the middle of the visible area, unless
 *   it (or an ancestor) sets `data-keyboard-align="start"` — that pins the
 *   field to the top instead, which is what a search box wants: centring it
 *   pushes its own results down behind the keyboard (Jaideep hit this on
 *   Dex search, 2026-09-16).
 */
export function KeyboardAware() {
  useEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    function updateInset() {
      if (!vv) return;
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      root.style.setProperty("--keyboard-inset", `${inset}px`);
    }

    function isTextField(el: EventTarget | null): el is HTMLElement {
      return el instanceof HTMLElement && el.matches(TEXT_INPUT);
    }

    function onFocusIn(e: FocusEvent) {
      if (!isTextField(e.target)) return;
      root.setAttribute("data-typing", "true");
      const el = e.target;
      // Wait for the keyboard to finish opening before measuring/scrolling.
      window.setTimeout(() => {
        updateInset();
        const align = el.closest<HTMLElement>("[data-keyboard-align]")?.dataset.keyboardAlign;
        el.scrollIntoView({ block: align === "start" ? "start" : "center", behavior: "smooth" });
      }, 350);
    }

    function onFocusOut() {
      // Defer: focus may be moving straight to another field.
      window.setTimeout(() => {
        if (!isTextField(document.activeElement)) root.removeAttribute("data-typing");
      }, 50);
    }

    updateInset();
    vv?.addEventListener("resize", updateInset);
    vv?.addEventListener("scroll", updateInset);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    return () => {
      vv?.removeEventListener("resize", updateInset);
      vv?.removeEventListener("scroll", updateInset);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  return null;
}
