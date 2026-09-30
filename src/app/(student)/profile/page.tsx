import Link from "next/link";
import { requireStudent } from "@/lib/auth";
import { formatDuration, formatDate } from "@/lib/format";
import { getAchievements, getStudentStats } from "@/lib/student-data";
import { ProfileForm } from "./profile-form";

export default async function ProfilePage() {
  const student = await requireStudent();
  const [stats, achievements] = await Promise.all([
    getStudentStats(student),
    getAchievements(student.id),
  ]);

  return (
    <main className="page-container profile-page">
      <ProfileForm
        student={student}
        stats={{
          rank: stats.rank,
          level: stats.level,
          xp: stats.xp,
          streak: stats.streak,
          lessonsCompleted: stats.lessonsCompleted,
          challengesDone: stats.challengesDone,
          attempts: stats.attempts,
          mistakes: stats.mistakes,
          playTime: formatDuration(stats.playTimeSeconds),
        }}
      />
      <section className="panel achievements-full" id="achievements">
        <div className="panel-title-row">
          <div>
            <span className="panel-kicker">COLLECTION</span>
            <h2>Achievements &amp; Badges</h2>
            <p>Earn milestones as you learn and complete challenges.</p>
          </div>
          <Link href="/progress" className="text-link">
            View progress →
          </Link>
        </div>
        <div className="achievement-grid">
          {achievements.map((achievement) => (
            <div
              className={`achievement-card ${achievement.earned_at ? "earned" : "locked"}`}
              key={achievement.id}
            >
              <span className="achievement-icon">{achievement.icon}</span>
              <div>
                <b>{achievement.name}</b>
                <p>{achievement.description}</p>
                <small>
                  {achievement.earned_at
                    ? `Earned ${formatDate(achievement.earned_at)}`
                    : "Keep learning to unlock"}
                </small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
