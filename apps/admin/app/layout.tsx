import type { ReactNode } from "react";
import "./styles.css";

export const metadata = {
  title: "MoveInRange Admin",
  description: "Health-aware movement planning administration"
};

export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
