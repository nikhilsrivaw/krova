"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  className?: string;
}

// Minimal syntax-highlight: keywords/strings/comments — just to add color without a heavy dep.
function highlight(code: string, lang: string) {
  // Don't highlight inside <span> we add — split into lines, escape, then color.
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const lines = code.split("\n").map((line) => {
    let out = escape(line);

    // Comments
    out = out.replace(
      /(\/\/.*$|#.*$)/g,
      '<span class="text-os-text-dim/70">$1</span>',
    );

    // Strings
    out = out.replace(
      /("[^"\n]*"|'[^'\n]*'|`[^`\n]*`)/g,
      '<span class="text-emerald-400">$1</span>',
    );

    // Numbers
    out = out.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      '<span class="text-amber-400">$1</span>',
    );

    // HTTP verbs
    out = out.replace(
      /\b(GET|POST|PATCH|PUT|DELETE)\b/g,
      '<span class="text-violet-400 font-bold">$1</span>',
    );

    // Common keywords
    const keywords =
      lang === "bash"
        ? ["curl", "export", "npm", "npx", "pnpm", "yarn", "git", "cd", "echo"]
        : [
            "const",
            "let",
            "var",
            "function",
            "return",
            "import",
            "export",
            "from",
            "async",
            "await",
            "if",
            "else",
            "new",
            "class",
            "interface",
            "type",
            "true",
            "false",
            "null",
            "undefined",
            "for",
            "while",
            "in",
            "of",
            "def",
            "as",
          ];
    const kwRegex = new RegExp(`\\b(${keywords.join("|")})\\b`, "g");
    out = out.replace(kwRegex, '<span class="text-sky-400">$1</span>');

    return out || "&nbsp;";
  });

  return lines.join("\n");
}

export function CodeBlock({ code, language = "bash", filename, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-os-border bg-black/40 overflow-hidden",
        className,
      )}
    >
      <div className="flex items-center justify-between px-4 py-2 border-b border-os-border bg-os-bg/60">
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            <div className="w-2 h-2 rounded-full bg-os-border" />
            <div className="w-2 h-2 rounded-full bg-os-border" />
            <div className="w-2 h-2 rounded-full bg-os-border" />
          </div>
          <span className="ml-2 text-[10px] font-mono text-os-text-dim">
            {filename || language}
          </span>
        </div>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
        >
          {copied ? (
            <>
              <Check size={11} className="text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy size={11} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="p-4 text-[12px] font-mono leading-relaxed overflow-x-auto text-white">
        <code
          dangerouslySetInnerHTML={{ __html: highlight(code, language) }}
        />
      </pre>
    </div>
  );
}
