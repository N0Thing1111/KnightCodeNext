// Display-only coloring. The original source is always saved and executed unchanged.
export type PythonToken = { text: string; kind: string };
const keywords = new Set("and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(" "));
const builtins = new Set("abs all any bool dict enumerate float input int len list max min open print range reversed round set sorted str sum tuple type zip".split(" "));
const constants = new Set(["True", "False", "None"]);

export function highlightPython(source: string): PythonToken[] {
  // Match strings before comments/identifiers; unfinished strings stay colored while typing.
  const pattern = /#[^\n]*|(?:\b(?:[rRuUbBfF]|[rR][fFbB]|[fFbB][rR]))?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$)|"(?:\\[\s\S]|[^"\\\n])*(?:"|(?=\n)|$)|'(?:\\[\s\S]|[^'\\\n])*(?:'|(?=\n)|$))|\b(?:0[xX][\da-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[\d_]*(?:\.[\d_]*)?(?:[eE][+-]?[\d_]+)?[jJ]?)|\.[\d_]+(?:[eE][+-]?[\d_]+)?[jJ]?|[\p{L}_][\p{L}\p{N}_]*|(?:==|!=|<=|>=|:=|\*\*|\/\/|->|[+*/%=<>!&|^~:@-])/gu;
  const tokens: PythonToken[] = [];
  let end = 0;
  let definition = false;
  for (const match of source.matchAll(pattern)) {
    const start = match.index!;
    if (start > end) tokens.push({ text: source.slice(end, start), kind: "plain" });
    const text = match[0];
    let kind = "plain";
    if (text.startsWith("#")) kind = "comment";
    else if (/^[rRuUbBfF]{0,2}["']/.test(text)) kind = "string";
    else if (/^(?:\d|\.\d)/.test(text)) kind = "number";
    else if (constants.has(text)) kind = "constant";
    else if (keywords.has(text)) kind = "keyword";
    else if (/^[\p{L}_]/u.test(text)) {
      kind = definition || /^\s*\(/.test(source.slice(start + text.length)) ? "function" : builtins.has(text) ? "builtin" : "variable";
    } else kind = "operator";
    tokens.push({ text, kind });
    definition = text === "def" || text === "class";
    end = start + text.length;
  }
  if (end < source.length) tokens.push({ text: source.slice(end), kind: "plain" });
  return tokens;
}
