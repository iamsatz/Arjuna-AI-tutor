import Link from "next/link";

const SECTIONS = [
  {
    title: "Learning intelligence",
    items: [
      "Mastery score per concept",
      "Spaced revision queue",
      "Daily plan & streak",
      "Teaching memory — train the tutor your way",
    ],
  },
  {
    title: "Parent trust & reporting",
    items: [
      "Weekly progress report",
      "No-marks diagnostic exams",
      "Screen-time daily cap",
    ],
  },
  {
    title: "Content depth",
    items: [
      "9 interactive card types",
      "7 maths mini-games",
      "Multi-curriculum support",
      "More mother tongues",
    ],
  },
  {
    title: "Platform & growth",
    items: [
      "Cloud accounts",
      "Multi-family invites",
      "Owner analytics dashboard",
      "Play Store (phone + TV)",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-arjuna-bg px-6 py-10">
      <Link href="/" className="text-sm text-arjuna-primaryDark underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-arjuna-text">
        Coming soon
      </h1>
      <p className="mt-2 text-sm text-arjuna-muted">
        You are on the alpha test build. These features are planned next.
      </p>

      <div className="mt-6 space-y-4">
        {SECTIONS.map((section) => (
          <section
            key={section.title}
            className="rounded-2xl bg-white/95 p-5 shadow-sm"
          >
            <h2 className="font-semibold text-arjuna-text">{section.title}</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-arjuna-muted">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
