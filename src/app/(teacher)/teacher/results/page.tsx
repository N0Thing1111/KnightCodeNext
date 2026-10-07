import { getSessionResults } from "@/lib/session-results";
import { SessionResults } from "@/components/session-results";
import { Hero } from "@/components/teacher-ui";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const result = await getSessionResults("teacher", await searchParams);
  return (
    <>
      <Hero
        eyebrow="STUDENT RUN HISTORY"
        title="Session Results"
        description="Find sessions for students in your sections and review their submitted code on assigned levels."
      />
      <SessionResults result={result} role="teacher" />
    </>
  );
}
