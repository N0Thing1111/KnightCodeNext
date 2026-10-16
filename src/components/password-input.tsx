"use client";

import { useId, useState, type InputHTMLAttributes } from "react";
import styles from "./password-input.module.css";

type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export function PasswordInput({ id, style, disabled, ...props }: PasswordInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const [visible, setVisible] = useState(false);
  const fieldName = props.name?.replaceAll("_", " ") || "password";
  const toggleLabel = (visible ? "Hide " : "Show ") + fieldName;

  return (
    <span className={styles.field}>
      <input
        {...props}
        id={inputId}
        type={visible ? "text" : "password"}
        disabled={disabled}
        style={{ ...style, paddingRight: "5.5rem" }}
      />
      <button
        className={styles.toggle}
        type="button"
        disabled={disabled}
        aria-label={toggleLabel}
        aria-controls={inputId}
        title={toggleLabel}
        onClick={() => setVisible((value) => !value)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
        {visible ? "Hide" : "Show"}
      </button>
    </span>
  );
}
