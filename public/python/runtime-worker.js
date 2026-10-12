/* Python runs in a dedicated worker with its own restrictive HTTP CSP.
   It receives code and a private input buffer, never credentials or DB clients. */
(() => {
  const send = self.postMessage.bind(self);
  const listen = self.addEventListener.bind(self);
  let python;
  let control;
  let inputBytes;
  let suppliedInputs = [];
  let testInputs = null;
  let text = "";
  let checking = false;
  const limit = 20000;
  function append(value) {
    const line = String(value) + "\n";
    if (text.length + line.length > limit)
      throw Error("Output limit reached (20,000 characters).");
    text += line;
    if (!checking) send({ type: "output", text: line });
  }
  function readInput(prompt) {
    if (testInputs) {
      if (!testInputs.length)
        throw Error(
          "The program requested more input than this example provides.",
        );
      return testInputs.shift();
    }
    if (suppliedInputs.length >= 100)
      throw Error("Input limit reached (100 answers).");
    Atomics.store(control, 0, 0);
    send({ type: "input", prompt: String(prompt).slice(0, 1000) });
    Atomics.wait(control, 0, 0);
    const length = Atomics.load(control, 1);
    if (length < 0 || length > inputBytes.length)
      throw Error("Invalid input length.");
    const answer = new TextDecoder().decode(inputBytes.slice(0, length));
    suppliedInputs.push(answer);
    send({ type: "resumed" });
    return answer;
  }
  async function execute(code, inputs) {
    text = "";
    testInputs = inputs ? [...inputs] : null;
    const scope = python.toPy({ __name__: "__main__" });
    try {
      // Only input is adapted; student Python syntax and control flow are unchanged.
      await python.runPythonAsync(
        'import builtins\nfrom kc_terminal import read_input\nbuiltins.input = lambda prompt="": read_input(str(prompt))',
      );
      const result = await python.runPythonAsync(code, { globals: scope });
      if (result && typeof result.destroy === "function") result.destroy();
      return { output: text, error: "" };
    } catch (error) {
      return {
        output: text,
        error: String(error.message || error).slice(0, 6000),
      };
    } finally {
      scope.destroy();
    }
  }
  listen("message", async ({ data }) => {
    if (data.type !== "run" || !python) return;
    control = new Int32Array(data.buffer, 0, 2);
    inputBytes = new Uint8Array(data.buffer, 8);
    suppliedInputs = [];
    checking = false;
    const main = await execute(data.code, null);
    const checks = [];
    if (!main.error) {
      checking = true;
      send({ type: "checking" });
      for (const example of data.cases) {
        const result = await execute(data.code, example.inputs);
        const normalize = (value) => value.replace(/\r\n/g, "\n").trim();
        checks.push({
          label: example.label,
          passed:
            !result.error &&
            normalize(result.output) === normalize(example.expected),
          actual: result.output.slice(0, 5000),
          expected: example.expected,
          error: result.error.slice(0, 1000),
        });
      }
    }
    send({
      type: "done",
      output: main.output,
      error: main.error,
      inputs: suppliedInputs,
      checks,
    });
  });
  (async () => {
    try {
      importScripts("https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js");
      python = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.27.7/full/",
      });
      python.setStdout({ batched: append });
      python.setStderr({ batched: append });
      python.registerJsModule("kc_terminal", { read_input: readInput });
      // This classroom runner uses the built-in library only. Disable browser
      // storage, additional workers and network APIs after loading the runtime.
      // HTTP CSP separately blocks requests to the authenticated site's origin.
      for (const key of [
        "fetch",
        "XMLHttpRequest",
        "WebSocket",
        "EventSource",
        "indexedDB",
        "caches",
        "navigator",
        "Worker",
        "SharedWorker",
        "BroadcastChannel",
        "importScripts",
        "postMessage",
      ]) {
        Object.defineProperty(self, key, {
          value: undefined,
          writable: false,
          configurable: false,
        });
      }
      send({ type: "ready" });
    } catch (error) {
      send({
        type: "load-error",
        error: String(error.message || error).slice(0, 2000),
      });
    }
  })();
})();
