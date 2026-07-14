import { type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  variant?: "default" | "tinted" | "outline";
};

const variants = {
  default: "bg-arjuna-surface border border-arjuna-border shadow-card",
  tinted: "bg-arjuna-primaryLight border border-orange-200",
  outline: "bg-transparent border border-arjuna-border",
};

export function Card({
  padded = true,
  variant = "default",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-2xl ${variants[variant]} ${padded ? "p-4" : ""} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
