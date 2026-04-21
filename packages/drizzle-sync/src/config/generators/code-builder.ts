type SupportedParser = "typescript" | "babel-ts" | "json";

function parserForPath(filePath: string): SupportedParser | null {
  if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
    return "typescript";
  }

  if (filePath.endsWith(".js") || filePath.endsWith(".jsx") || filePath.endsWith(".mjs")) {
    return "babel-ts";
  }

  if (filePath.endsWith(".json")) {
    return "json";
  }

  return null;
}

export class CodeBuilder {
  private readonly lines: string[] = [];
  private depth = 0;

  constructor(private readonly indentText = "  ") {}

  line(value = ""): this {
    if (value.length === 0) {
      this.lines.push("");
      return this;
    }

    this.lines.push(`${this.indentText.repeat(this.depth)}${value}`);
    return this;
  }

  linesFrom(values: Iterable<string>): this {
    for (const value of values) {
      this.line(value);
    }
    return this;
  }

  blank(): this {
    return this.line();
  }

  indent(fn: (builder: CodeBuilder) => void): this {
    this.depth += 1;
    try {
      fn(this);
    } finally {
      this.depth -= 1;
    }
    return this;
  }

  block(start: string, fn: (builder: CodeBuilder) => void, end = "}"): this {
    this.line(start);
    this.indent(fn);
    this.line(end);
    return this;
  }

  hasContent(): boolean {
    return this.lines.length > 0;
  }

  toString(): string {
    return this.lines.join("\n");
  }
}

export async function formatGeneratedCode(code: string, filePath: string): Promise<string> {
  const parser = parserForPath(filePath);
  if (!parser) {
    return code;
  }

  try {
    const prettier = await import("prettier");
    return await prettier.format(code, {
      parser,
      semi: true,
      singleQuote: false,
      trailingComma: "es5",
      printWidth: 100,
    });
  } catch {
    return code;
  }
}
