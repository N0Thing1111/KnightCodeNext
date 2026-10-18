import { Extension, Mark, Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";

const classes = new Set(["lesson-block", "lesson-block-heading", "code-label"]);
const safeClass = (value: string | null) => (value || "").split(/\s+/).filter(v => classes.has(v)).join(" ") || null;
const Section = Node.create({
  name: "lessonSection", group: "block", content: "block+", defining: true,
  parseHTML: () => [{ tag: "div" }],
  renderHTML: ({ HTMLAttributes }) => ["div", HTMLAttributes, 0],
});
const Span = Mark.create({
  name: "lessonSpan", parseHTML: () => [{ tag: "span" }],
  renderHTML: ({ HTMLAttributes }) => ["span", HTMLAttributes, 0],
});
const LessonClasses = Extension.create({
  name: "lessonClasses",
  addGlobalAttributes() {
    return [{ types: ["lessonSection", "lessonSpan", "paragraph", "heading", "codeBlock", "blockquote", "bulletList", "orderedList", "listItem", "bold", "italic", "underline", "code"],
      attributes: { class: { default: null,
        parseHTML: element => safeClass(element.getAttribute("class")),
        renderHTML: attributes => { const value = safeClass(attributes.class); return value ? { class: value } : {}; },
      } },
    }];
  },
});
export function lessonEditorExtensions() {
  return [StarterKit.configure({ heading: { levels: [2, 3, 4] }, link: false, strike: false }),
    Section, Span, LessonClasses, TableKit.configure({ table: { resizable: false } })];
}
