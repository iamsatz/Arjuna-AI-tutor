import { type ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "success" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
};

const variants = {
  primary:
    "bg-arjuna-primary text-white hover:bg-arjuna-primaryDark active:bg-arjuna-primaryDark",
  secondary:
    "border border-arjuna-border bg-white text-arjuna-text hover:bg-arjuna-bg active:bg-arjuna-bg",
  success:
    "bg-arjuna-teal text-white hover:bg-teal-700 active:bg-teal-700",
  ghost:
    "bg-transparent text-arjuna-muted hover:bg-arjuna-border/40 active:bg-arjuna-border/60",
  danger:
    "bg-arjuna-red text-white hover:bg-red-700 active:bg-red-700",
};

const sizes = {
  sm: "px-3 py-2 text-sm",
  md: "px-4 py-2.5 text-sm",
  lg: "px-5 py-3 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  type = "button",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-card transition-all active:scale-[0.98] active:shadow-none disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
