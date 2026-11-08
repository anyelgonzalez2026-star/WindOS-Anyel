import { useState } from "react";
import { useOS } from "@/lib/os/store";
import { cn } from "@/lib/utils";
import { Copy, Delete, History, RotateCcw } from "lucide-react";

type Token = number | string;

function tokenize(expression: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expression.length) {
    const char = expression[i];
    if (/\s/.test(char)) { i++; continue; }
    if (/[0-9.]/.test(char)) {
      let number = "";
      while (i < expression.length && /[0-9.]/.test(expression[i])) number += expression[i++];
      const value = parseFloat(number);
      if (Number.isNaN(value)) throw new Error("Invalid number");
      tokens.push(value);
      continue;
    }
    if (/[a-z]/i.test(char)) {
      let name = "";
      while (i < expression.length && /[a-z]/i.test(expression[i])) name += expression[i++];
      tokens.push(name.toLowerCase());
      continue;
    }
    if ("+-*/^%()!".includes(char)) {
      tokens.push(char);
      i++;
      continue;
    }
    throw new Error(`Unexpected character ${char}`);
  }
  return tokens;
}

/** Small recursive-descent parser — no eval, no host execution. */
function evaluate(expression: string, degrees: boolean): number {
  const tokens = tokenize(expression.replace(/×/g, "*").replace(/÷/g, "/").replace(/π/g, "pi"));
  let index = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const toRad = (value: number) => (degrees ? (value * Math.PI) / 180 : value);
  const factorial = (n: number): number => {
    if (n < 0 || !Number.isInteger(n) || n > 170) throw new Error("Invalid factorial");
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  function parsePrimary(): number {
    const token = take();
    if (token === undefined) throw new Error("Unexpected end of expression");
    if (token === "-") return -parsePrimary();
    if (token === "+") return parsePrimary();
    if (token === "(") {
      const value = parseExpression();
      if (take() !== ")") throw new Error("Missing closing parenthesis");
      return value;
    }
    if (typeof token === "number") {
      if (peek() === "!") { take(); return factorial(token); }
      return token;
    }
    if (token === "pi") return Math.PI;
    if (token === "e") return Math.E;
    if (typeof token === "string" && ["sin", "cos", "tan", "sqrt", "log", "ln", "abs", "exp", "round", "asin", "acos", "atan"].includes(token)) {
      if (take() !== "(") throw new Error(`Expected ( after ${token}`);
      const value = parseExpression();
      if (take() !== ")") throw new Error("Missing closing parenthesis");
      switch (token) {
        case "sin": return Math.sin(toRad(value));
        case "cos": return Math.cos(toRad(value));
        case "tan": return Math.tan(toRad(value));
        case "asin": return degrees ? (Math.asin(value) * 180) / Math.PI : Math.asin(value);
        case "acos": return degrees ? (Math.acos(value) * 180) / Math.PI : Math.acos(value);
        case "atan": return degrees ? (Math.atan(value) * 180) / Math.PI : Math.atan(value);
        case "sqrt": return Math.sqrt(value);
        case "log": return Math.log10(value);
        case "ln": return Math.log(value);
        case "abs": return Math.abs(value);
        case "exp": return Math.exp(value);
        default: return Math.round(value);
      }
    }
    throw new Error(`Unexpected token ${String(token)}`);
  }

  function parsePower(): number {
    const base = parsePrimary();
    if (peek() === "^") {
      take();
      return Math.pow(base, parsePower());
    }
    return base;
  }

  function parseTerm(): number {
    let value = parsePower();
    while (peek() === "*" || peek() === "/" || peek() === "%") {
      const op = take();
      const right = parsePower();
      if (op === "*") value *= right;
      if (op === "/") {
        if (right === 0) throw new Error("Division by zero");
        value /= right;
      }
      if (op === "%") value %= right;
    }
    return value;
  }

  function parseExpression(): number {
    let value = parseTerm();
    while (peek() === "+" || peek() === "-") {
      const op = take();
      const right = parseTerm();
      value = op === "+" ? value + right : value - right;
    }
    return value;
  }

  const result = parseExpression();
  if (index < tokens.length) throw new Error("Unexpected input");
  if (!Number.isFinite(result)) throw new Error("Result is not finite");
  return result;
}

const SWATCHES = [
  ["7", "8", "9", "/"],
  ["4", "5", "6", "*"],
  ["1", "2", "3", "-"],
  ["0", ".", "%", "+"],
];

export default function Calculator() {
  const os = useOS();
  const [expression, setExpression] = useState("");
  const [display, setDisplay] = useState("0");
  const [error, setError] = useState("");
  const [scientific, setScientific] = useState(false);
  const [degrees, setDegrees] = useState(true);
  const [memory, setMemory] = useState(0);
  const [history, setHistory] = useState<{ expression: string; result: string }[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  function calculate() {
    if (!expression.trim()) return;
    try {
      const result = evaluate(expression, degrees);
      const rounded = parseFloat(result.toPrecision(12));
      const text = String(rounded);
      setDisplay(text);
      setHistory((prev) => [{ expression, result: text }, ...prev].slice(0, 30));
      setExpression("");
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid expression");
    }
  }

  function press(value: string) {
    setError("");
    if (value === "=") {
      calculate();
      return;
    }
    if (value === "C") {
      setExpression("");
      setDisplay("0");
      setError("");
      return;
    }
    if (value === "⌫") {
      setExpression((prev) => prev.slice(0, -1));
      return;
    }
    if (["sin", "cos", "tan", "sqrt", "log", "ln"].includes(value)) {
      setExpression((prev) => `${prev}${value}(`);
      return;
    }
    if (value === "x²") {
      setExpression((prev) => `${prev}^2`);
      return;
    }
    if (value === "π") {
      setExpression((prev) => `${prev}pi`);
      return;
    }
    if (value === "e") {
      setExpression((prev) => `${prev}e`);
      return;
    }
    setExpression((prev) => prev + value);
  }

  function memoryAction(action: "M+" | "M-" | "MR" | "MC") {
    const current = parseFloat(display) || 0;
    if (action === "M+") setMemory((m) => m + current);
    if (action === "M-") setMemory((m) => m - current);
    if (action === "MR") setExpression((prev) => prev + String(memory));
    if (action === "MC") setMemory(0);
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
        <p className="text-[11px] font-semibold">WindCalculator</p>
        <div className="flex items-center gap-1">
          <button
            className={cn("rounded px-2 py-1 text-[10px] font-medium transition", scientific ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted")}
            onClick={() => setScientific((v) => !v)}
          >
            Scientific
          </button>
          <button className={cn("rounded p-1 transition", showHistory ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-muted")} onClick={() => setShowHistory((v) => !v)} aria-label="History">
            <History className="size-3.5" />
          </button>
        </div>
      </div>

      <div className="border-b border-border/60 px-4 pb-3 pt-4 text-right">
        <p className="h-5 truncate font-mono text-[11px] text-muted-foreground">{expression || "\u00A0"}</p>
        <p className="mt-1 truncate text-[34px] font-semibold leading-tight tracking-tight tabular-nums">{display}</p>
        <div className="mt-1 flex h-4 items-center justify-between">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
            {degrees ? "DEG" : "RAD"} {memory ? `· M ${memory}` : ""}
          </span>
          <button
            className="flex items-center gap-1 text-[9.5px] text-muted-foreground hover:text-foreground"
            onClick={() => {
              void os.copyText(display, "WindCalculator");
              os.notify({ appId: "WindCalculator", title: "Result copied", body: `${display} is on the WindOS clipboard.` });
            }}
          >
            <Copy className="size-3" /> Copy
          </button>
        </div>
        {error && <p className="mt-1 text-[10px] text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {showHistory && (
        <div className="max-h-32 shrink-0 overflow-y-auto border-b border-border/60 bg-muted/20 px-3 py-2">
          {history.length === 0 ? (
            <p className="py-3 text-center text-[10px] text-muted-foreground">Calculations you complete appear here.</p>
          ) : history.map((entry, index) => (
            <button
              key={index}
              className="flex w-full items-baseline justify-between gap-3 rounded px-1 py-1 text-left hover:bg-muted/60"
              onClick={() => { setDisplay(entry.result); setExpression(""); }}
            >
              <span className="truncate font-mono text-[10px] text-muted-foreground">{entry.expression}</span>
              <span className="shrink-0 font-mono text-[11px] font-medium">{entry.result}</span>
            </button>
          ))}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
        {scientific && (
          <div className="grid grid-cols-6 gap-1.5">
            {["sin", "cos", "tan", "sqrt", "log", "ln", "x²", "^", "(", ")", "π", "e"].map((key) => (
              <CalcKey key={key} label={key} onClick={() => press(key)} small />
            ))}
          </div>
        )}

        <div className="flex gap-1.5">
          {["M+", "M-", "MR", "MC"].map((key) => (
            <button key={key} className="flex-1 rounded-md border border-border py-1 text-[10px] text-muted-foreground transition hover:bg-muted" onClick={() => memoryAction(key as "M+" | "M-" | "MR" | "MC")}>
              {key}
            </button>
          ))}
          <button className={cn("flex-1 rounded-md border px-2 py-1 text-[10px] transition", degrees ? "border-primary/40 bg-primary/10 text-primary" : "border-border text-muted-foreground")} onClick={() => setDegrees((v) => !v)}>
            {degrees ? "DEG" : "RAD"}
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-4 grid-rows-5 gap-1.5">
          <CalcKey label="C" onClick={() => press("C")} tone="muted" />
          <CalcKey label="⌫" onClick={() => press("⌫")} tone="muted" icon={<Delete className="size-4" />} />
          <CalcKey label="(" onClick={() => press("(")} tone="muted" />
          <CalcKey label=")" onClick={() => press(")")} tone="muted" />
          {SWATCHES.flatMap((row) =>
            row.map((key) => (
              <CalcKey
                key={key}
                label={key}
                onClick={() => press(key)}
                tone={["/", "*", "-", "+"].includes(key) ? "accent" : "normal"}
              />
            )),
          )}
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button className="h-10 flex-1 rounded-lg bg-primary text-[16px] font-semibold text-primary-foreground transition hover:bg-primary/90 active:scale-[0.99]" onClick={calculate}>=</button>
          <button className="flex w-24 items-center justify-center gap-1 rounded-lg border border-border text-[10px] text-muted-foreground transition hover:bg-muted" onClick={() => { setExpression(""); setDisplay("0"); setHistory([]); }}>
            <RotateCcw className="size-3" /> Clear tape
          </button>
        </div>
      </div>
    </div>
  );
}

function CalcKey({
  label,
  onClick,
  tone = "normal",
  small,
  wide,
  icon,
}: {
  label: string;
  onClick: () => void;
  tone?: "normal" | "muted" | "accent" | "primary";
  small?: boolean;
  wide?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-lg text-[15px] font-medium transition active:scale-[0.98]",
        small && "h-7 text-[10px] font-normal",
        wide && "col-span-2",
        tone === "normal" && "border border-border bg-card hover:bg-muted",
        tone === "muted" && "bg-muted text-muted-foreground hover:bg-muted/70",
        tone === "accent" && "bg-primary/10 text-primary hover:bg-primary/15",
        tone === "primary" && "bg-primary text-primary-foreground hover:bg-primary/90",
      )}
    >
      {icon ?? label}
    </button>
  );
}
