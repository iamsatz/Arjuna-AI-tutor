type StepDotsProps = {
  current: number;
  total: number;
};

export function StepDots({ current, total }: StepDotsProps) {
  return (
    <div className="mb-6 flex justify-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2.5 rounded-full transition-all ${
            i + 1 === current
              ? "w-8 bg-arjuna-primary"
              : i + 1 < current
                ? "w-2.5 bg-arjuna-green"
                : "w-2.5 bg-arjuna-border"
          }`}
        />
      ))}
    </div>
  );
}
