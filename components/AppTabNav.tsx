"use client";

import Link from "next/link";

type AppTabNavProps = {
  active: "homework" | "exam" | "english";
};

export function AppTabNav({ active }: AppTabNavProps) {
  const tabs = [
    {
      id: "homework" as const,
      href: "/",
      label: "Homework",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      id: "exam" as const,
      href: "/exam",
      label: "Exam",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ),
    },
    {
      id: "english" as const,
      href: "/english",
      label: "English",
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
  ];

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-md px-4 pb-3">
      <div className="flex items-center justify-around rounded-[28px] bg-[#111827] px-2 py-2 shadow-card">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-[22px] py-2.5 transition-all active:scale-95 ${
                isActive
                  ? "bg-arjuna-primary text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              {tab.icon}
              <span className="font-sans text-[10px] font-semibold leading-none tracking-wide">
                {tab.label}
              </span>
              <span className="sr-only">{isActive ? "(current)" : ""}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
