/**
 * The app's own hand-drawn icon set (from `icons/aquarium-icons-svg.zip`,
 * Jaideep's ask: "use those icons wherever you see fit") — one outline
 * style, 24px grid, 1.75 stroke, `currentColor` throughout so every icon
 * inherits whatever text colour its container sets (nav active/inactive
 * state, a badge's semantic colour, etc.) without needing per-state SVG
 * variants. Inlined as paths here rather than referenced as static files
 * so `currentColor` and `size` both work without an extra network request.
 */

const PATHS: Record<string, string> = {
  dex: '<path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2"/><path d="M7 14.8C10.5 9.5 14.5 8.8 17.5 12M7 9.2C10.5 14.5 14.5 15.2 17.5 12"/><circle cx="15.2" cy="11.4" r=".7" fill="currentColor" stroke="none"/>',
  tanks:
    '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9.5c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/><path d="M7.5 19c0-3.5-.8-5.5-2-7.5M7.5 19c0-3 .8-4.8 2.3-6.3"/><path d="M13 19c0-1.1.9-2 2-2h1a2 2 0 0 1 2 2"/>',
  "ask-aqua":
    '<path d="M20 11.5A8 8 0 0 1 8 18.43L4.5 19.5l.57-4A8 8 0 1 1 20 11.5z"/><path d="M12 7.7c.4 2 1.5 3.4 3.8 3.8-2.3.4-3.4 1.8-3.8 3.8-.4-2-1.5-3.4-3.8-3.8 2.3-.4 3.4-1.8 3.8-3.8z"/>',
  community:
    '<path d="M3 11.3C6.5 6 10.5 5.3 13 8.5M3 5.7C6.5 11 10.5 11.7 13 8.5"/><path d="M10 18.8C13.5 13.5 17.5 12.8 20 16M10 13.2C13.5 18.5 17.5 19.2 20 16"/><circle cx="10.9" cy="8.2" r=".6" fill="currentColor" stroke="none"/><circle cx="17.9" cy="15.7" r=".6" fill="currentColor" stroke="none"/>',
  profile: '<circle cx="12" cy="8.5" r="3.5"/><path d="M5 20c.8-3.4 3.6-5.5 7-5.5s6.2 2.1 7 5.5"/>',
  freshwater: '<path d="M12 3c3.5 4 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 8.5 7 12 3z"/><path d="M9 14a3 3 0 0 0 3 3"/>',
  brackish:
    '<path d="M12 3c3.5 4 6 7.2 6 10.5a6 6 0 0 1-12 0C6 10.2 8.5 7 12 3z"/><path d="M6.3 13.2c1.4 0 1.4-.9 2.9-.9s1.4.9 2.8.9 1.4-.9 2.8-.9 1.5.9 2.9.9"/>',
  marine: '<path d="M12.00 4.00 L14.76 8.80 L20.18 9.94 L16.47 14.05 L17.05 19.56 L12.00 17.30 L6.95 19.56 L7.53 14.05 L3.82 9.94 L9.24 8.80Z"/><circle cx="12" cy="12.6" r=".6" fill="currentColor" stroke="none"/>',
  planted: '<path d="M12 20V11"/><path d="M12 14c-3.5 0-5.5-2.2-5.5-5.5 3.5 0 5.5 2.2 5.5 5.5z"/><path d="M12 11c0-3 1.8-5 5-5 0 3-1.8 5-5 5z"/><path d="M8 20h8"/>',
};

export type AquaIconName = keyof typeof PATHS;

export function AquaIcon({ name, size = 24, className }: { name: AquaIconName; size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}
