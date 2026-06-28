import { JoinForm } from "@/components/JoinForm";

type JoinPageProps = {
  params: { code: string };
};

export default function JoinPage({ params }: JoinPageProps) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center bg-arjuna-bg px-6 py-10">
      <JoinForm code={params.code} />
    </main>
  );
}
