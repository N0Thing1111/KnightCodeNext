"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { highlightPython } from "@/lib/python-highlight";
import styles from "@/components/python.module.css";

export function PythonCodeEditor({ value, onChange, readOnly }: {
  value: string;
  onChange: (source: string) => void;
  readOnly: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const colors = useRef<HTMLPreElement>(null);
  const tokens = useMemo(() => highlightPython(value), [value]);
  function syncScroll() {
    if (input.current && colors.current) {
      colors.current.scrollTop = input.current.scrollTop;
      colors.current.scrollLeft = input.current.scrollLeft;
    }
  }
  useLayoutEffect(syncScroll, [value]);
  return (
    <div className={styles.codeEditor}>
      <pre ref={colors} className={styles.codeColors} aria-hidden="true">
        {tokens.map((token, index) => (
          <span key={index} data-token={token.kind}>{token.text}</span>
        ))}{"\n"}
      </pre>
      <textarea
        ref={input}
        id="python-source"
        className={styles.codeInput}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        wrap="off"
        maxLength={32768}
        value={value}
        readOnly={readOnly}
        onScroll={syncScroll}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Tab" && !event.shiftKey && !readOnly && !event.nativeEvent.isComposing) {
            event.preventDefault();
            const field = event.currentTarget;
            const start = field.selectionStart, end = field.selectionEnd;
            if (value.length - (end - start) + 4 > 32768) return;
            onChange(value.slice(0, start) + "    " + value.slice(end));
            requestAnimationFrame(() => {
              field.setSelectionRange(start + 4, start + 4);
              syncScroll();
            });
          }
        }}
      />
    </div>
  );
}
