"use client";
import { useState } from "react";
import styles from "@/components/python.module.css";
import { useRouter } from "next/navigation";
import {
  pythonContentSchema,
  type PythonActivity,
  type PythonContent,
} from "@/lib/python-contract";

export function PythonForm({
  op,
  children,
  submitLabel = "Save",
}: {
  op: "review";
  children: React.ReactNode;
  submitLabel?: string;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage("");
        const data = Object.fromEntries(new FormData(event.currentTarget));
        try {
          const body = { ...data, op };
          const response = await fetch("/api/python", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
          const result = await response.json();
          if (!response.ok) throw Error(result.error);
          setMessage("Saved.");
          router.refresh();
        } catch (error) {
          setMessage((error as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className={styles.primary} disabled={busy}>
        {busy ? "Saving..." : submitLabel}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
export function PythonActivitySettings({
  activity,
  lessonId,
}:
  | { activity: PythonActivity; lessonId?: never }
  | { activity?: never; lessonId: number }) {
  const [content, setContent] = useState<PythonContent>(() => activity?.content ?? {
    title: "",
    concept: "",
    instructions: "",
    guide: "",
    starter: "",
    extension: "",
    cases: [{ label: "Example 1", inputs: [], expected: "" }],
  });
  const [published, setPublished] = useState(activity?.published ?? false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        setMessage("");
        const validated = pythonContentSchema.safeParse(content);
        if (!validated.success) {
          const issue = validated.error.issues[0];
          setMessage(
            "Please check " + issue.path.join(" / ") + ": " + issue.message,
          );
          return;
        }
        setBusy(true);
        try {
          const activityId = activity?.id ?? createdId;
          const r = await fetch("/api/python", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...(activityId
                ? { op: "activity", activity: activityId }
                : { op: "create_activity", lesson: lessonId }),
              content: validated.data,
              published,
            }),
          });
          const j = await r.json();
          if (!r.ok) throw Error(j.error);
          if (!activityId) setCreatedId(j.data.id);
          setMessage(activityId
            ? "Saved a new activity revision. Earlier Runs keep their original instructions."
            : published
              ? "Python activity added and published for this lesson."
              : "Python activity added as unpublished. Publish it when it is ready for students.");
          router.refresh();
        } catch (e) {
          setMessage((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {(
        [
          "title",
          "concept",
          "instructions",
          "guide",
          "starter",
          "extension",
        ] as const
      ).map((key) => (
        <label key={key}>
          {
            {
              title: "Title",
              concept: "Logic concept",
              instructions: "Instructions",
              guide: "Python explanation",
              starter: "Starter code",
              extension: "Optional extension",
            }[key]
          }
          <textarea
            required={key !== "starter" && key !== "extension"}
            value={content[key]}
            onChange={(e) => setContent({ ...content, [key]: e.target.value })}
          />
        </label>
      ))}
      <h3>Practice examples</h3>
      {content.cases.map((test, index) => (
        <fieldset key={index}>
          <legend>Example {index + 1}</legend>
          {(["label", "inputs", "expected"] as const).map((key) => (
            <label key={key}>
              {key === "inputs"
                ? "Answers, one per line"
                : key === "expected"
                  ? "Expected printed output"
                  : "Example name"}
              <textarea
                required={key === "label"}
                value={key === "inputs" ? test.inputs.join("\n") : test[key]}
                onChange={(e) =>
                  setContent({
                    ...content,
                    cases: content.cases.map((c, i) =>
                      i === index
                        ? {
                            ...c,
                            [key]:
                              key === "inputs"
                                ? e.target.value === ""
                                  ? []
                                  : e.target.value.split("\n")
                                : e.target.value,
                          }
                        : c,
                    ),
                  })
                }
              />
            </label>
          ))}
          <button
            type="button"
            disabled={busy || content.cases.length <= 1}
            onClick={() => setContent({ ...content, cases: content.cases.filter((_, i) => i !== index) })}
          >Remove example {index + 1}</button>
        </fieldset>
      ))}
      <button
        type="button"
        disabled={busy || content.cases.length >= 10}
        onClick={() => setContent({ ...content, cases: [...content.cases, { label: "", inputs: [], expected: "" }] })}
      >Add practice example</button>
      <p>Include 1–10 examples. Leave answers empty for programs that do not use input(). Expected output must match what the program prints.</p>
      <label>
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published for students
      </label>
      <button disabled={busy}>{busy ? "Saving..." : activity || createdId ? "Save activity revision" : "Add Python activity"}</button>
      <p role="status">{message}</p>
    </form>
  );
}
