import { type HTMLAttributes } from "react";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
};

export function Card({
  padded = true,
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`rounded-3xl border-2 border-orange-100 bg-white shadow-chunky ${
        padded ? "p-5" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
