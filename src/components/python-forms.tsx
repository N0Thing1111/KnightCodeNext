"use client";
import { useState } from "react";
import styles from "@/components/python.module.css";
import { useRouter } from "next/navigation";
import type { PythonActivity, PythonContent } from "@/lib/python-contract";

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
}: {
  activity: PythonActivity;
}) {
  const [content, setContent] = useState<PythonContent>(activity.content);
  const [published, setPublished] = useState(activity.published);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        try {
          const r = await fetch("/api/python", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              op: "activity",
              activity: activity.id,
              content,
              published,
            }),
          });
          const j = await r.json();
          if (!r.ok) throw Error(j.error);
          setMessage(
            "Saved a new activity revision. Earlier Runs keep their original instructions.",
          );
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
        </fieldset>
      ))}
      <label>
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
        />
        Published for students
      </label>
      <button disabled={busy}>Save activity revision</button>
      <p role="status">{message}</p>
    </form>
  );
}
