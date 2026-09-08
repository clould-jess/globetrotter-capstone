import type { SVGProps } from "react";

const paths = {
  send: "m3 3 19 9-19 9 4-9-4-9Zm4 9h15",
  plus: "M12 4v16M4 12h16",
  camera: "M4 6h4l2-3h4l2 3h4v15H4V6Zm12 7a4 4 0 1 0-8 0 4 4 0 0 0 8 0",
  image: "M3 3h18v18H3V3Zm1 15 5-6 4 4 3-4 4 6M8 7h.01",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0V5ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M9 22h6",
  smile: "M21 12a9 9 0 1 0-18 0 9 9 0 0 0 18 0ZM8 9h.01M16 9h.01M8 14c2 3 6 3 8 0",
  reply: "m9 5-6 6 6 6M3 11h10a7 7 0 0 1 7 7",
  close: "m6 6 12 12M6 18 18 6",
  back: "m14 5-7 7 7 7",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  lock: "M6 10h12v11H6V10Zm2 0V6a4 4 0 0 1 8 0v4M12 14v3",
  people: "M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-3a7 7 0 0 1 14 0v3M16 3a4 4 0 0 1 0 8M18 14a5 5 0 0 1 4 5v2",
  search: "m16 16 5 5M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0",
  down: "m5 9 7 7 7-7",
  stop: "M5 5h14v14H5V5Z",
  trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
  flag: "M5 22V3h14l-3 5 3 5H5",
} as const;
export function ChatIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name]} /></svg>;
}
