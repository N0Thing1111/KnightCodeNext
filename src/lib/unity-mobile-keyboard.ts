// Unity's WebGL runtime appends its native keyboard editor to document.body.
// Keep that same editor (and its listeners/value) inside our fullscreen element.
export function attachUnityMobileKeyboard(host: HTMLElement, className: string) {
  type KeyboardPanel = HTMLElement & {
    input?: HTMLInputElement | HTMLTextAreaElement;
    okButton?: HTMLButtonElement;
    multiline?: boolean;
  };
  let panel: KeyboardPanel | null = null;
  const viewport = window.visualViewport;
  const position = () => {
    if (!panel?.isConnected) return;
    const covered = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
    panel.style.bottom = `${covered}px`;
  };
  const adopt = (node: Node) => {
    if (!(node instanceof HTMLElement) || node.parentElement !== document.body) return;
    const candidate = node as KeyboardPanel;
    const input = candidate.input;
    // Match Unity's runtime-owned references, not arbitrary site inputs.
    if (!(input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement)
      || input.parentElement !== candidate
      || !(candidate.okButton instanceof HTMLButtonElement)
      || candidate.okButton.parentElement !== candidate
      || typeof candidate.multiline !== "boolean") return;
    panel = candidate;
    candidate.classList.add(className);
    input.setAttribute("aria-label", "Game code editor");
    input.setAttribute("autocapitalize", "off");
    const focused = document.activeElement === input;
    const start = input.selectionStart;
    const end = input.selectionEnd;
    // Reparenting focused inputs can fire blur. Unity would close this editor
    // on blur, so suppress only the event caused by this synchronous move.
    const movingBlur = (event: Event) => event.stopImmediatePropagation();
    input.addEventListener("blur", movingBlur, true);
    host.appendChild(candidate);
    if (focused) {
      input.focus({ preventScroll: true });
      if (start !== null && end !== null) input.setSelectionRange(start, end);
    }
    input.removeEventListener("blur", movingBlur, true);
    position();
  };
  const observer = new MutationObserver(records => {
    for (const record of records) for (const node of record.addedNodes) adopt(node);
  });
  observer.observe(document.body, { childList: true });
  for (const node of document.body.children) adopt(node);
  viewport?.addEventListener("resize", position);
  viewport?.addEventListener("scroll", position);
  window.addEventListener("resize", position);
  return () => {
    observer.disconnect();
    viewport?.removeEventListener("resize", position);
    viewport?.removeEventListener("scroll", position);
    window.removeEventListener("resize", position);
    // Let Unity handle its normal blur/save/close lifecycle before unmount.
    if (panel?.isConnected && host.contains(panel)) panel.input?.blur();
  };
}
