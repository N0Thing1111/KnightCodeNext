"use client";

import { useActionState, useState } from "react";
import { updateProfile, type ProfileState } from "@/app/actions/profile";
import { ThemeControls } from "@/components/theme-controls";
import type { Profile } from "@/types/database";

const initial: ProfileState = {};
const avatars = [
  ["knight", "♞", "Knight"],
  ["blue", "🛡️", "Guardian"],
  ["mage", "🧙", "Mage"],
  ["fox", "🦊", "Fox"],
  ["dragon", "🐉", "Dragon"],
  ["robot", "🤖", "Robot"],
] as const;
const avatarIcons: Record<string, string> = Object.fromEntries(
  avatars.map(([key, icon]) => [key, icon]),
);

type ProfileStats = {
  rank: string;
  level: number;
  xp: number;
  streak: number;
  lessonsCompleted: number;
  challengesDone: number;
  attempts: number;
  mistakes: number;
  playTime: string;
};

export function ProfileForm({
  student,
  stats,
}: {
  student: Profile;
  stats: ProfileStats;
}) {
  const initialPreview = student.profile_image
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/profile-images/${student.profile_image}`
    : null;
  const [state, action, pending] = useActionState(updateProfile, initial);
  const [custom, setCustom] = useState(Boolean(student.profile_image));
  const [preview, setPreview] = useState<string | null>(initialPreview);
  const [selectedAvatar, setSelectedAvatar] = useState(
    student.avatar_key || "knight",
  );

  const reset = () => {
    setSelectedAvatar(student.avatar_key || "knight");
    setCustom(Boolean(student.profile_image));
    setPreview(initialPreview);
  };

  const openPicker = () =>
    document.getElementById("profileImageInput")?.click();

  return (
    <>
      <section className="profile-cover">
        <div
          className="profile-avatar-large profile-avatar-edit"
          role="button"
          tabIndex={0}
          aria-label="Choose profile picture"
          onClick={openPicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") openPicker();
          }}
        >
          {preview ? (
            <img src={preview} alt={`${student.name} profile picture`} />
          ) : (
            <span>{avatarIcons[selectedAvatar] ?? "♞"}</span>
          )}
          <span className="profile-avatar-camera">✎</span>
        </div>
        <div className="profile-cover-copy">
          <span className="eyebrow">KNIGHT PROFILE</span>
          <h1>{student.name}</h1>
          <p>
            {stats.rank} · {student.email}
          </p>
          <div className="profile-meta-pills">
            <span>Level {stats.level}</span>
            <span>{stats.xp.toLocaleString()} XP</span>
            <span>🔥 {stats.streak} day streak</span>
          </div>
        </div>
        <div className="profile-cover-stats">
          <div>
            <b>{stats.level}</b>
            <span>Level</span>
          </div>
          <div>
            <b>{stats.xp.toLocaleString()}</b>
            <span>XP</span>
          </div>
          <div>
            <b>{stats.streak}</b>
            <span>Streak</span>
          </div>
        </div>
      </section>

      {state.success && (
        <div className="alert alert-success">{state.success}</div>
      )}
      {state.error && <div className="alert alert-error">{state.error}</div>}

      <form action={action} className="profile-layout-form" onReset={reset}>
        <input
          type="hidden"
          name="use_custom_picture"
          value={custom ? "1" : "0"}
        />
        <input
          className="profile-image-native"
          id="profileImageInput"
          name="profile_image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              setPreview(URL.createObjectURL(file));
              setCustom(true);
            }
          }}
        />

        <section className="profile-grid">
          <article className="panel profile-form-panel">
            <div className="panel-title-row">
              <div>
                <span className="panel-kicker">ACCOUNT</span>
                <h2>Personal Information</h2>
                <p>Keep your KnightCode account details current.</p>
              </div>
            </div>
            <div className="profile-form">
              <label>
                Full Name
                <input
                  name="name"
                  defaultValue={student.name}
                  required
                  maxLength={150}
                  autoComplete="name"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  defaultValue={student.email}
                  required
                  maxLength={150}
                  autoComplete="email"
                />
              </label>
              <label>
                Student ID
                <input value={student.student_id ?? ""} disabled />
              </label>
              <label>
                Class / Section
                <input
                  name="class_section"
                  defaultValue={student.class_section ?? ""}
                  maxLength={100}
                  autoComplete="organization"
                />
              </label>
            </div>

            <div className="profile-picture-section">
              <div className="subsection-heading">
                <div>
                  <span className="panel-kicker">IDENTITY</span>
                  <h3>Profile Picture</h3>
                  <p>Choose a KnightCode avatar or upload your own photo.</p>
                </div>
              </div>
              <div className="profile-picture-options">
                <div className="picture-option-block">
                  <div className="option-label">
                    <strong>Choose Avatar</strong>
                    <span>Built-in KnightCode avatars</span>
                  </div>
                  <div
                    className="avatar-options"
                    role="radiogroup"
                    aria-label="KnightCode avatars"
                  >
                    {avatars.map(([key, icon, label]) => (
                      <label className="avatar-option" key={key}>
                        <input
                          type="radio"
                          name="avatar_key"
                          value={key}
                          checked={selectedAvatar === key}
                          onChange={() => {
                            setSelectedAvatar(key);
                            setCustom(false);
                            setPreview(null);
                          }}
                          aria-label={`${label} avatar`}
                        />
                        <span>{icon}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="picture-option-block upload-option-block">
                  <div className="option-label">
                    <strong>Upload Your Own Picture</strong>
                    <span>JPG, PNG, or WebP · up to 5 MB</span>
                  </div>
                  <div className="photo-upload-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={openPicker}
                    >
                      Choose Photo
                    </button>
                    <span>
                      {custom
                        ? "Custom photo selected"
                        : "No custom photo selected"}
                    </span>
                  </div>
                </div>
              </div>
              <p className="profile-picture-note">
                Uploading a photo makes it your active profile picture. Choosing
                an avatar switches back to the selected KnightCode avatar.
              </p>
            </div>
          </article>

          <aside className="profile-side">
            <section className="panel settings-panel" id="preferences">
              <div className="panel-title-row">
                <div>
                  <span className="panel-kicker">PREFERENCES</span>
                  <h2>Appearance</h2>
                  <p>Choose how KnightCode looks across your account.</p>
                </div>
              </div>
              <ThemeControls initial={student.theme_preference} />
            </section>
            <section className="panel stats-profile">
              <div className="panel-title-row">
                <div>
                  <span className="panel-kicker">SNAPSHOT</span>
                  <h2>Learning Snapshot</h2>
                </div>
              </div>
              <div>
                <span>Lessons Completed</span>
                <b>{stats.lessonsCompleted}</b>
              </div>
              <div>
                <span>Challenges Completed</span>
                <b>{stats.challengesDone}</b>
              </div>
              <div>
                <span>Attempts</span>
                <b>{stats.attempts.toLocaleString()}</b>
              </div>
              <div>
                <span>Play Time</span>
                <b>{stats.playTime}</b>
              </div>
              <div>
                <span>Mistakes</span>
                <b>{stats.mistakes.toLocaleString()}</b>
              </div>
            </section>
          </aside>
        </section>

        <section className="panel password-panel">
          <div className="panel-title-row">
            <div>
              <span className="panel-kicker">SECURITY</span>
              <h2>Change Password</h2>
              <p>
                Leave these fields empty if you do not want to change your
                password.
              </p>
            </div>
          </div>
          <div className="password-section">
            <label>
              Current Password
              <input
                type="password"
                name="current_password"
                autoComplete="current-password"
              />
            </label>
            <label>
              New Password
              <input
                type="password"
                name="new_password"
                minLength={8}
                autoComplete="new-password"
              />
            </label>
          </div>
        </section>

        <div className="profile-form-actions">
          <button className="btn btn-primary" type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save Profile Changes"}
          </button>
          <button className="btn btn-secondary" type="reset">
            Reset Form
          </button>
          <a className="btn btn-danger" href="/logout">
            Log Out
          </a>
        </div>
      </form>
    </>
  );
}
