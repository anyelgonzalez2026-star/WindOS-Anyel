import { useEffect, useRef, useState } from "react";
import { useOS } from "@/lib/os/store";
import { downloadBlob } from "@/lib/os/zip";
import { cn } from "@/lib/utils";
import { AppShell, AppToolbar, GhostButton, ToolButton, PrimaryButton, inputClass } from "./ui";
import { Brush, Circle, Download, Eraser, Image as ImageIcon, Minus, Pencil, Redo2, RotateCcw, Save, Square, Trash2, Type, Undo2, Upload } from "lucide-react";

type Tool = "pencil" | "brush" | "eraser" | "line" | "rect" | "ellipse" | "text";

const TOOLS: { id: Tool; label: string; icon: typeof Pencil }[] = [
  { id: "pencil", label: "Pencil", icon: Pencil },
  { id: "brush", label: "Brush", icon: Brush },
  { id: "eraser", label: "Eraser", icon: Eraser },
  { id: "line", label: "Line", icon: Minus },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "ellipse", label: "Ellipse", icon: Circle },
  { id: "text", label: "Text", icon: Type },
];

const PALETTE = ["#111827", "#475569", "#94a3b8", "#ffffff", "#4f5bd5", "#178f8a", "#22a7a0", "#c1802a", "#c2557a", "#7a5cd6", "#dc6b5f", "#111c33"];

export default function Paint({ payload }: { payload?: Record<string, unknown> }) {
  const os = useOS();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState("#4f5bd5");
  const [size, setSize] = useState(6);
  const [opacity, setOpacity] = useState(100);
  const [fill, setFill] = useState(false);
  const [text, setText] = useState("WindOS");
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [images, setImages] = useState(false);
  const drawing = useRef(false);
  const start = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0 });
  const strokeSnapshot = useRef<ImageData | null>(null);
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const uploadRef = useRef<HTMLInputElement>(null);
  const WIDTH = 960;
  const HEIGHT = 600;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const imageId = typeof payload?.openId === "string" ? payload.openId : null;
    const node = imageId ? os.fs.byId(imageId) : null;
    if (node?.content) void drawImage(node.content);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function ctx2d() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function getPos(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  function pushUndo() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    undoStack.current = [...undoStack.current.slice(-19), canvas.toDataURL("image/png")];
    redoStack.current = [];
    setUndoCount(undoStack.current.length);
    setRedoCount(0);
  }

  async function restore(url: string): Promise<void> {
    const ctx = ctx2d();
    if (!ctx) return;
    const image = await loadImage(url);
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.drawImage(image, 0, 0, WIDTH, HEIGHT);
  }

  function undo() {
    const canvas = canvasRef.current;
    if (!canvas || !undoStack.current.length) return;
    const previous = undoStack.current.pop()!;
    redoStack.current.push(canvas.toDataURL("image/png"));
    void restore(previous);
    setUndoCount(undoStack.current.length);
    setRedoCount(redoStack.current.length);
  }

  function redo() {
    const canvas = canvasRef.current;
    if (!canvas || !redoStack.current.length) return;
    const next = redoStack.current.pop()!;
    undoStack.current.push(canvas.toDataURL("image/png"));
    void restore(next);
    setUndoCount(undoStack.current.length);
    setRedoCount(redoStack.current.length);
  }

  function pointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.preventDefault();
    if (!canvasRef.current) return;
    const ctx = ctx2d();
    if (!ctx) return;
    canvasRef.current.setPointerCapture(event.pointerId);
    const pos = getPos(event);
    if (tool === "text") {
      pushUndo();
      ctx.globalAlpha = opacity / 100;
      ctx.fillStyle = color;
      ctx.font = `600 ${Math.max(16, size * 3)}px system-ui, sans-serif`;
      ctx.textBaseline = "top";
      ctx.fillText(text || "Text", pos.x, pos.y);
      return;
    }
    pushUndo();
    drawing.current = true;
    start.current = pos;
    last.current = pos;
    strokeSnapshot.current = ctx.getImageData(0, 0, WIDTH, HEIGHT);
    ctx.globalCompositeOperation = tool === "eraser" ? "source-over" : "source-over";
    ctx.globalAlpha = tool === "eraser" ? 1 : opacity / 100;
    ctx.strokeStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.fillStyle = tool === "eraser" ? "#ffffff" : color;
    ctx.lineWidth = tool === "pencil" ? Math.max(1, size / 3) : size;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "pencil" || tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function pointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = ctx2d();
    if (!ctx) return;
    const pos = getPos(event);
    if (tool === "pencil" || tool === "brush" || tool === "eraser") {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      last.current = pos;
      return;
    }
    if (strokeSnapshot.current) ctx.putImageData(strokeSnapshot.current, 0, 0);
    ctx.globalAlpha = opacity / 100;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = size;
    ctx.beginPath();
    if (tool === "line") {
      ctx.moveTo(start.current.x, start.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === "rect") {
      const x = Math.min(start.current.x, pos.x);
      const y = Math.min(start.current.y, pos.y);
      const w = Math.abs(pos.x - start.current.x);
      const h = Math.abs(pos.y - start.current.y);
      if (fill) ctx.fillRect(x, y, w, h);
      else ctx.strokeRect(x, y, w, h);
    } else if (tool === "ellipse") {
      const cx = (start.current.x + pos.x) / 2;
      const cy = (start.current.y + pos.y) / 2;
      const rx = Math.abs(pos.x - start.current.x) / 2;
      const ry = Math.abs(pos.y - start.current.y) / 2;
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      if (fill) ctx.fill();
      else ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function pointerUp() {
    drawing.current = false;
    strokeSnapshot.current = null;
  }

  function clearCanvas() {
    pushUndo();
    const ctx = ctx2d();
    if (!ctx) return;
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  async function drawImage(dataUrl: string) {
    const ctx = ctx2d();
    if (!ctx) return;
    const image = await loadImage(dataUrl);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    const scale = Math.min(WIDTH / image.width, HEIGHT / image.height, 1);
    const w = image.width * scale;
    const h = image.height * scale;
    ctx.drawImage(image, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
  }

  function saveToDrive() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const name = `Artwork ${new Date().toISOString().slice(0, 10)} ${new Date().toTimeString().slice(0, 5).replace(":", "")}.png`;
    const node = os.fs.createFile("folder_pictures", name, dataUrl, "image/png");
    if (!node) {
      os.notify({ appId: "WindOS", title: "Cannot save in guest mode", body: "The guest drive is read-only." });
      return;
    }
    os.notify({ appId: "WindOS", title: "Painting saved", body: `${node.name} is in Pictures.`, actions: [{ label: "Open WindPhotos", appId: "photos" }] });
    os.logEvent({ level: "info", title: "Paint export", detail: `${node.name} saved to Pictures.` });
  }

  function downloadCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `windos-painting-${Date.now()}.png`);
    }, "image/png");
  }

  function handleUpload(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === "string") void drawImage(reader.result); };
    reader.readAsDataURL(file);
  }

  const imagesList = os.fs.children("folder_pictures").filter((node) => node.type === "file" && (node.mime ?? "").startsWith("image/"));

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/60 px-3 py-2">
          <p className="mr-1 text-[12px] font-semibold">WindPaint</p>
          <span className="text-[9.5px] text-muted-foreground">Canvas 960×600 · PNG</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            <ToolButton icon={Undo2} label="Undo" disabled={!undoCount} onClick={undo} />
            <ToolButton icon={Redo2} label="Redo" disabled={!redoCount} onClick={redo} />
            <ToolButton icon={Trash2} label="Clear" onClick={clearCanvas} />
            <ToolButton icon={Upload} label="Open" onClick={() => uploadRef.current?.click()} />
            <ToolButton icon={ImageIcon} label="Gallery" onClick={() => setImages((v) => !v)} active={images} />
            <GhostButton onClick={downloadCanvas}><Download className="size-3.5" /> PNG</GhostButton>
            <PrimaryButton onClick={saveToDrive}><Save className="size-3.5" /> Save to Pictures</PrimaryButton>
          </div>
        </div>

        <AppToolbar className="border-t-0">
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-background p-0.5">
            {TOOLS.map((item) => (
              <button
                key={item.id}
                onClick={() => setTool(item.id)}
                title={item.label}
                aria-label={item.label}
                className={cn("flex size-7 items-center justify-center rounded transition", tool === item.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
              >
                <item.icon className="size-3.5" />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="size-7 cursor-pointer rounded border border-border bg-transparent" aria-label="Colour" />
            {PALETTE.map((swatch) => (
              <button
                key={swatch}
                onClick={() => setColor(swatch)}
                className={cn("size-4 rounded-full border transition", color === swatch ? "ring-2 ring-primary ring-offset-1" : "border-black/10")}
                style={{ background: swatch }}
                aria-label={`Colour ${swatch}`}
              />
            ))}
          </div>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            Size
            <input type="range" min={1} max={60} value={size} onChange={(event) => setSize(Number(event.target.value))} className="w-20 accent-[var(--os-accent)]" />
            <span className="w-4 tabular-nums">{size}</span>
          </label>
          <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            Opacity
            <input type="range" min={5} max={100} value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="w-20 accent-[var(--os-accent)]" />
            <span className="w-7 tabular-nums">{opacity}%</span>
          </label>
          {(tool === "rect" || tool === "ellipse") && (
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <input type="checkbox" checked={fill} onChange={(event) => setFill(event.target.checked)} className="accent-[var(--os-accent)]" /> Filled
            </label>
          )}
          {tool === "text" && <input value={text} onChange={(event) => setText(event.target.value)} className={cn(inputClass, "h-7 w-36")} placeholder="Text to place" />}
        </AppToolbar>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-[#e9edf3] p-4 dark:bg-[#0d131d]">
            <canvas
              ref={canvasRef}
              width={WIDTH}
              height={HEIGHT}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerLeave={pointerUp}
              className={cn(
                "max-h-full w-auto max-w-full rounded-md bg-white shadow-[0_18px_60px_-24px_rgba(15,23,42,0.5)]",
                tool === "text" ? "cursor-text" : tool === "eraser" ? "cursor-cell" : "cursor-crosshair",
              )}
              style={{ touchAction: "none", aspectRatio: `${WIDTH}/${HEIGHT}` }}
            />
          </div>
          {images && (
            <aside className="w-52 shrink-0 overflow-y-auto border-l border-border/60 bg-muted/15 p-2">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pictures</p>
                <button className="text-[9px] text-muted-foreground hover:text-foreground" onClick={() => setImages(false)}>Close</button>
              </div>
              {imagesList.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">No images yet. Save a painting first.</p>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {imagesList.map((node) => (
                    <button key={node.id} className="overflow-hidden rounded border border-border/60 bg-white" onClick={() => { if (node.content) void drawImage(node.content); }} title={node.name}>
                      <img src={node.content} alt={node.name} className="h-14 w-full object-cover" />
                      <p className="truncate px-1 py-0.5 text-[8px]">{node.name}</p>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-lg border border-border/60 p-2 text-[9px] text-muted-foreground">
                Opening an image replaces the canvas. Undo history always starts fresh after opening.
              </div>
            </aside>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-3 py-1.5 text-[9.5px] text-muted-foreground">
          <span className="flex items-center gap-1"><RotateCcw className="size-3" /> {undoCount} undo steps available</span>
          <span className="flex items-center gap-1"><ImageIcon className="size-3" /> Saved as a real PNG in the virtual filesystem</span>
        </div>
      </div>
      <input ref={uploadRef} type="file" accept="image/*" className="hidden" onChange={(event) => handleUpload(event.target.files)} />
    </AppShell>
  );
}


function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be loaded"));
    image.src = src;
  });
}
