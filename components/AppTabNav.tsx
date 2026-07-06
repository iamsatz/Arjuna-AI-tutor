"use client";

import Link from "next/link";

type AppTabNavProps = {
  active: "homework" | "exam" | "english";
};

export function AppTabNav({ active }: AppTabNavProps) {
  const tabs = [
    { id: "homework" as const, href: "/", emoji: "📚", label: "Homework" },
    { id: "exam" as const, href: "/exam", emoji: "🎯", label: "Exam" },
    { id: "english" as const, href: "/english", emoji: "🗣️", label: "English" },
  ];

  return (
    <nav className="grid grid-cols-3 gap-2">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            href={tab.href}
            className={`rounded-2xl border-2 p-3 text-center shadow-sm transition active:scale-95 ${
              isActive
                ? "border-emerald-400 bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-chunky"
                : "border-gray-200 bg-white text-arjuna-text"
            }`}
          >
            <span className="text-2xl">{tab.emoji}</span>
            <p className="mt-1 font-display text-xs font-bold">{tab.label}</p>
            {isActive && (
              <p className="mt-0.5 text-[10px] opacity-90">You&apos;re here</p>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
