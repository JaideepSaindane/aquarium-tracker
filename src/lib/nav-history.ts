"use client";

// In-app navigation stack for this page load. `window.history.length` counts
// the whole tab's history — other sites, the pre-sign-in /login page — so a
// "Back" that trusted it could leave the app or land on sign-in. Recorded by
// <PageViewTracker> on every pathname change. A change to the path just below
// the top is treated as a back navigation (pop); anything else is a push.
const stack: string[] = [];

export function recordNavigation(path: string): void {
  if (stack[stack.length - 1] === path) return;
  if (stack.length >= 2 && stack[stack.length - 2] === path) {
    stack.pop();
    return;
  }
  stack.push(path);
}

export function hasInAppHistory(): boolean {
  return stack.length > 1;
}

/** Back within the app if there's an in-app page to return to, otherwise go to `fallback` without adding a history entry. */
export function goBack(router: { back: () => void; replace: (href: string) => void }, fallback = "/"): void {
  if (hasInAppHistory()) router.back();
  else router.replace(fallback);
}
