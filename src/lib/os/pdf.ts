export interface PdfOptions {
  title: string;
  text: string;
  author?: string;
  subject?: string;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;
const FONT_SIZE = 11;
const LINE_HEIGHT = 15;
const MAX_LINES = Math.floor((PAGE_HEIGHT - MARGIN * 2) / LINE_HEIGHT);

function pdfString(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7e]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrap(text: string, width = 88): string[] {
  const output: string[] = [];
  for (const rawLine of text.replace(/\r\n/g, "\n").split("\n")) {
    if (!rawLine) {
      output.push("");
      continue;
    }
    let line = rawLine;
    while (line.length > width) {
      let cut = line.lastIndexOf(" ", width);
      if (cut < Math.floor(width * 0.55)) cut = width;
      output.push(line.slice(0, cut));
      line = line.slice(cut).trimStart();
    }
    output.push(line);
  }
  return output.length ? output : [""];
}

function paginate(lines: string[]): string[][] {
  const pages: string[][] = [];
  let page: string[] = [];
  let used = 0;
  for (const line of lines) {
    if (used >= MAX_LINES) {
      pages.push(page);
      page = [];
      used = 0;
    }
    page.push(line);
    used++;
  }
  if (page.length || pages.length === 0) pages.push(page);
  return pages;
}

/** Builds a small, valid PDF 1.4 document with one or more A4 pages. */
export function buildPdf(options: PdfOptions): Blob {
  const title = options.title.trim() || "Untitled document";
  const pages = paginate(wrap(options.text || " "));
  const objects: string[] = [];
  const add = (body: string) => {
    objects.push(body);
    return objects.length;
  };

  const catalogId = add("");
  const pagesId = add("");
  const fontId = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const infoId = add(`<< /Title (${pdfString(title)}) /Author (${pdfString(options.author ?? "WindOS")}) /Creator (WindPDF 1.0.0) /Producer (WindOS 1.0.0) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}) /Subject (${pdfString(options.subject ?? "Generated with WindOS")}) >>`);

  const pageIds: number[] = [];
  for (const page of pages) {
    const content = [
      "BT",
      `/F1 ${FONT_SIZE} Tf`,
      `${LINE_HEIGHT} TL`,
      `1 0 0 1 ${MARGIN} ${PAGE_HEIGHT - MARGIN - FONT_SIZE} Tm`,
      ...page.map((line) => `(${pdfString(line)}) Tj T*`),
      "ET",
    ].join("\n");
    const contentId = add(`<< /Length ${new TextEncoder().encode(content).length} >>\nstream\n${content}\nendstream`);
    const pageId = add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`);
    pageIds.push(pageId);
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageIds.length} >>`;

  let output = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(new TextEncoder().encode(output).length);
    output += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = new TextEncoder().encode(output).length;
  output += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) output += `${String(offset).padStart(10, "0")} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return new Blob([output], { type: "application/pdf" });
}

export function pdfDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read the generated PDF."));
    reader.readAsDataURL(blob);
  });
}
