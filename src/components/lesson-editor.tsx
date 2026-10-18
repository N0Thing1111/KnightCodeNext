"use client";
import { useId, useRef, useState } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import { lessonEditorExtensions } from "./lesson-editor-extensions";
import styles from "./lesson-editor.module.css";

export function LessonEditor({ initialContent = "" }: { initialContent?: string }) {
  const id = useId();
  const [html, setHtml] = useState(initialContent);
  const [source, setSource] = useState(false);
  const savedInput = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    extensions: lessonEditorExtensions(), content: initialContent, immediatelyRender: false,
    editorProps: { attributes: { role: "textbox", "aria-label": "Lesson content", "aria-multiline": "true", "aria-describedby": id + "-help" } },
    onUpdate: ({ editor }) => {
      const value = editor.getHTML();
      // Keep the actual form value current even before React renders again.
      if (savedInput.current) savedInput.current.value = value;
      setHtml(value);
    },
  });
  const state = useEditorState({ editor, selector: ({ editor }) => editor ? {
    bold: editor.isActive("bold"), italic: editor.isActive("italic"), underline: editor.isActive("underline"),
    bullets: editor.isActive("bulletList"), numbers: editor.isActive("orderedList"),
    code: editor.isActive("codeBlock"), inlineCode: editor.isActive("code"), quote: editor.isActive("blockquote"),
    heading: editor.isActive("heading", { level: 2 }) ? "2" : editor.isActive("heading", { level: 3 }) ? "3" : editor.isActive("heading", { level: 4 }) ? "4" : "p",
    undo: editor.can().undo(), redo: editor.can().redo(), table: editor.isActive("table"),
  } : null });
  function visual() {
    if (source && editor) editor.commands.setContent(html, { emitUpdate: false, parseOptions: { preserveWhitespace: "full" } });
    setSource(false);
  }
  const button = (label: string, command: () => void, active?: boolean, disabled = false) => (
    <button type="button" aria-pressed={active} disabled={!editor || disabled} onClick={command}>{label}</button>
  );
  return (
    <div className={"wide " + styles.root}>
      <div className={styles.header}>
        <strong>Lesson content</strong>
        <div className={styles.modes} aria-label="Editing mode">
          <button type="button" aria-pressed={!source} onClick={visual}>Visual editor</button>
          <button type="button" aria-pressed={source} onClick={() => setSource(true)}>HTML (advanced)</button>
        </div>
      </div>
      <p id={id + "-help"} className={styles.help}>Write your lesson below. Select text to format it. Use a code block for Python examples; indentation is preserved. Save changes using the lesson form.</p>
      <input ref={savedInput} type="hidden" name="content" value={html} />
      <div hidden={source}>
        <div className={styles.toolbar} role="group" aria-label="Lesson formatting">
          <label className={styles.blockLabel}>Text style
            <select aria-label="Text style" value={state?.heading || "p"} disabled={!editor} onChange={e => {
              if (e.target.value === "p") editor?.chain().focus().setParagraph().run();
              else editor?.chain().focus().toggleHeading({ level: Number(e.target.value) as 2 | 3 | 4 }).run();
            }}>
              <option value="p">Paragraph</option><option value="2">Heading</option><option value="3">Subheading</option><option value="4">Small heading</option>
            </select>
          </label>
          {button("Bold", () => { editor?.chain().focus().toggleBold().run(); }, state?.bold)}
          {button("Italic", () => { editor?.chain().focus().toggleItalic().run(); }, state?.italic)}
          {button("Underline", () => { editor?.chain().focus().toggleUnderline().run(); }, state?.underline)}
          {button("Bullet list", () => { editor?.chain().focus().toggleBulletList().run(); }, state?.bullets)}
          {button("Numbered list", () => { editor?.chain().focus().toggleOrderedList().run(); }, state?.numbers)}
          {button("Code block", () => { editor?.chain().focus().toggleCodeBlock().run(); }, state?.code)}
          {button("Inline code", () => { editor?.chain().focus().toggleCode().run(); }, state?.inlineCode)}
          {button("Quote", () => { editor?.chain().focus().toggleBlockquote().run(); }, state?.quote)}
          {button("Divider", () => { editor?.chain().focus().setHorizontalRule().run(); })}
          {button("Insert table", () => { editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(); }, undefined, state?.table)}
          {button("Undo", () => { editor?.chain().focus().undo().run(); }, undefined, !state?.undo)}
          {button("Redo", () => { editor?.chain().focus().redo().run(); }, undefined, !state?.redo)}
          {state?.table && <>
            {button("Add row", () => { editor?.chain().focus().addRowAfter().run(); })}
            {button("Add column", () => { editor?.chain().focus().addColumnAfter().run(); })}
            {button("Remove row", () => { editor?.chain().focus().deleteRow().run(); })}
            {button("Remove column", () => { editor?.chain().focus().deleteColumn().run(); })}
            {button("Remove table", () => { editor?.chain().focus().deleteTable().run(); })}
          </>}
        </div>
        {!editor && <p role="status">Loading lesson editor...</p>}
        <EditorContent editor={editor} className={styles.canvas} />
        <p className={styles.help}>To leave a code block, press Arrow Down at its end or choose Paragraph. Ctrl+Z undoes your last edit.</p>
      </div>
      {source && <label htmlFor={id + "-source"}>HTML source (advanced)
        <textarea id={id + "-source"} className={styles.source} spellCheck={false} rows={18} value={html} onChange={e => {
          setHtml(e.target.value); if (savedInput.current) savedInput.current.value = e.target.value;
        }} />
        <small>Only supported lesson formatting is saved. Scripts, embedded media, and unsafe attributes are removed.</small>
      </label>}
    </div>
  );
}
