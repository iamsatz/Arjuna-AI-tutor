import Link from "next/link";

const MVP_SHIPPED = [
  "Invite link per family + child profile (name, grade, board)",
  "Homework: photo, mic, or type → auto tasks",
  "Task-by-task teaching with Doubt + Explain again",
  "Parent PIN to unlock full solution",
  "Pure Telugu, English, and Mixed language modes",
  "Phone-only, Phone + TV live sync, TV-only modes",
  "Exam prep: upload pages, timetable, revise + practice test",
  "Owner dashboard + analytics (research events)",
];

const BACKLOG = [
  {
    title: "Learning intelligence",
    items: [
      "Per-concept mastery tracking",
      "Spaced repetition queue",
      "Weakness detection after each session",
      "Adaptive difficulty based on attempts",
      "Daily plan and streak",
      "Teaching memory — parent trains the tutor daily",
    ],
  },
  {
    title: "Parent trust & reporting",
    items: [
      "Weekly progress report (email / WhatsApp)",
      "Exam-readiness score before each test",
      "Screen-time daily cap and usage summary",
      "Session highlights for parents",
    ],
  },
  {
    title: "Content depth",
    items: [
      "Full syllabus auto-mapping per board (CBSE, ICSE, IB, State)",
      "Saved chapter library per child",
      "Reusable exam question banks",
      "Multi-subject timetables in one view",
      "Interactive card types and maths mini-games",
      "More mother tongues beyond Telugu / English",
    ],
  },
  {
    title: "Platform & growth",
    items: [
      "Native remote-mic on Android TV",
      "Offline mode for homework without internet",
      "Self-serve family signup (replace invite-only)",
      "Real auth (email / phone login)",
      "Multi-child households in one account",
      "Play Store release (phone + TV)",
    ],
  },
  {
    title: "Exam engine upgrades",
    items: [
      "Scored mock tests with timing",
      "Timed exam mode",
      "Printable worksheets",
      "Answer-sheet photo grading",
      "Compare performance across subjects",
    ],
  },
];

export default function RoadmapPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-md bg-white px-6 py-10">
      <Link href="/" className="text-sm text-arjuna-primaryDark underline">
        ← Back
      </Link>
      <h1 className="mt-4 text-2xl font-semibold text-arjuna-text">
        Roadmap & backlog
      </h1>
      <p className="mt-2 text-sm text-arjuna-muted">
        Alpha MVP is what you are testing now. Everything below is planned after
        MVP.
      </p>

      <section className="mt-6 rounded-2xl border border-green-200 bg-green-50/80 p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-green-800">
          MVP · Shipped in alpha
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-green-900">
          {MVP_SHIPPED.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="mt-8 text-sm font-semibold text-arjuna-text">
        Backlog (after MVP)
      </p>

      <div className="mt-3 space-y-4">
        {BACKLOG.map((section) => (
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
