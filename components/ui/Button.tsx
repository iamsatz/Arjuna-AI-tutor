import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "ghost";
  size?: "md" | "lg";
};

const variants = {
  primary: "bg-arjuna-primary text-white hover:bg-arjuna-primaryDark",
  secondary:
    "border-2 border-arjuna-primary/25 bg-white text-arjuna-text hover:bg-orange-50",
  success: "bg-arjuna-green text-white hover:bg-green-600",
  ghost: "bg-transparent text-arjuna-muted shadow-none hover:bg-white/60",
};

const sizes = {
  md: "px-5 py-3 text-base",
  lg: "px-6 py-4 text-lg",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  ...props
}: ButtonProps) {
  const shadow = variant === "ghost" ? "" : "btn-chunky";
  return (
    <button
      type={type}
      className={`${shadow} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
