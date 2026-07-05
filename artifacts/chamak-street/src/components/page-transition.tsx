import { type ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function RevealSection({
  children,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  amount?: number;
}) {
  return <div className={className}>{children}</div>;
}

export function RevealList({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
  stagger?: number;
}) {
  return <div className={className}>{children}</div>;
}

export const revealItem = {};
