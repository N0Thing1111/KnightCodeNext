"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import styles from "./searchable-select.module.css";

export type SearchOption = { id: string; label: string };
export function SearchableSelect({
  label,
  name,
  options,
  value,
  onChange,
  disabled = false,
  emptyLabel,
  className = "",
}: {
  label: string;
  name?: string;
  options: SearchOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
  className?: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null),
    popup = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [active, setActive] = useState(0);
  const [position, setPosition] = useState<CSSProperties>({});
  const choices = useMemo(() => {
    const sorted = [...options].sort((a, b) => a.label.localeCompare(b.label));
    return emptyLabel ? [{ id: "", label: emptyLabel }, ...sorted] : sorted;
  }, [emptyLabel, options]);
  const selected = choices.find((option) => option.id === value);
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  const filtered = choices.filter((option) =>
    words.every((word) => option.label.toLocaleLowerCase().includes(word)),
  );
  const expanded = open && !disabled;
  const activeIndex = Math.min(active, filtered.length - 1);
  function show() {
    if (disabled || expanded) return;
    setQuery("");
    setActive(
      Math.max(
        0,
        choices.findIndex((option) => option.id === value),
      ),
    );
    setOpen(true);
  }
  function choose(option: SearchOption) {
    onChange(option.id);
    setOpen(false);
    setQuery("");
  }
  useLayoutEffect(() => {
    if (!expanded) return;
    const place = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const below = window.innerHeight - rect.bottom - 12;
      const above = rect.top - 12;
      const upward = below < 220 && above > below;
      setPosition({
        position: "fixed",
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16),
        maxHeight: Math.max(80, Math.min(300, upward ? above : below)),
        ...(upward
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    const observer = new ResizeObserver(place);
    if (root.current) observer.observe(root.current);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      observer.disconnect();
    };
  }, [expanded]);
  useEffect(() => {
    if (!expanded) return;
    const close = (event: PointerEvent) => {
      if (
        !root.current?.contains(event.target as Node) &&
        !popup.current?.contains(event.target as Node)
      )
        setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [expanded]);
  useEffect(() => {
    const menu = popup.current;
    const option = menu?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`,
    );
    if (!expanded || !menu || !option) return;
    // Scroll the results only; scrollIntoView also moves the page on mobile.
    if (option.offsetTop < menu.scrollTop) menu.scrollTop = option.offsetTop;
    else if (
      option.offsetTop + option.offsetHeight >
      menu.scrollTop + menu.clientHeight
    )
      menu.scrollTop =
        option.offsetTop + option.offsetHeight - menu.clientHeight;
  }, [expanded, activeIndex]);
  function keys(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!expanded) {
        show();
        return;
      }
      setActive((index) =>
        Math.max(
          0,
          Math.min(
            filtered.length - 1,
            index + (event.key === "ArrowDown" ? 1 : -1),
          ),
        ),
      );
    } else if (event.key === "Enter") {
      // Never submit a destructive form while the user is searching.
      event.preventDefault();
      if (expanded && filtered[activeIndex]) choose(filtered[activeIndex]);
      else show();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    } else if (event.key === "Tab") setOpen(false);
  }
  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id}>{label}</label>
      {name && (
        <input
          type="hidden"
          name={name}
          value={selected?.id ?? ""}
          disabled={disabled}
        />
      )}
      <div ref={root} className={styles.control}>
        <input
          ref={input}
          id={id}
          role="combobox"
          aria-expanded={expanded}
          aria-controls={expanded ? `${id}-list` : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            expanded && filtered[activeIndex]
              ? `${id}-option-${activeIndex}`
              : undefined
          }
          autoComplete="off"
          disabled={disabled}
          placeholder={`Search ${label.toLowerCase()}...`}
          value={expanded ? query : (selected?.label ?? "")}
          onFocus={show}
          onClick={show}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
            if (value) onChange("");
          }}
          onKeyDown={keys}
          onBlur={(event) => {
            if (
              !root.current?.contains(event.relatedTarget) &&
              !popup.current?.contains(event.relatedTarget)
            )
              setOpen(false);
          }}
        />
        <button
          type="button"
          disabled={disabled}
          className={styles.toggle}
          tabIndex={-1}
          aria-label={`${expanded ? "Close" : "Browse"} ${label.toLowerCase()}`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            if (expanded) setOpen(false);
            else {
              input.current?.focus();
              show();
            }
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
      </div>
      {expanded &&
        createPortal(
          <div ref={popup} className={styles.popup} style={position}>
            <div id={`${id}-list`} role="listbox" aria-label={label}>
              {filtered.map((option, index) => (
                <button
                  type="button"
                  role="option"
                  key={option.id}
                  id={`${id}-option-${index}`}
                  aria-selected={option.id === value}
                  data-index={index}
                  data-active={index === activeIndex}
                  tabIndex={-1}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(option)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p role="status" className={styles.status}>
              {filtered.length
                ? `${filtered.length} ${filtered.length === 1 ? "match" : "matches"}. Choose a result.`
                : "No matches. Try another name or email."}
            </p>
          </div>,
          document.body,
        )}
    </div>
  );
}
