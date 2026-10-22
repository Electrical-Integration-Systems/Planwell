import { AlignmentType, BorderStyle, Document, Footer, Header, HeadingLevel, HeightRule, ImageRun, Packer, PageNumber, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import { loadReportLogo } from "@/lib/reports/logo";
import { reportContent, reportIssuerLines, reportMetadata, reportTemplate } from "@/lib/reports/model";
import type { ReportSnapshot } from "@/lib/reports/model";

function paragraphs(text: string, size = 11): Paragraph[] {
  if (!text.trim()) return [];
  return text.trim().split(/\r?\n/).map((line) => new Paragraph({ children: [new TextRun({ text: line, size: size * 2 })], spacing: { after: 120 }, widowControl: true }));
}

function table(rows: string[][], widths: number[], hasHeader: boolean, keepTogether = false, signatureRow?: number): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, index) => new TableRow({
      tableHeader: hasHeader && index === 0,
      cantSplit: keepTogether,
      height: index === signatureRow ? { value: 1280, rule: HeightRule.ATLEAST } : undefined,
      children: cells.map((text, column) => new TableCell({
        width: { size: widths[column] * 100, type: WidthType.PERCENTAGE },
        shading: { fill: hasHeader && index === 0 ? "0F172A" : (!hasHeader && column === 0) ? "F1F5F9" : index % 2 === 0 ? "F8FAFC" : "FFFFFF" },
        margins: { top: 120, bottom: 120, left: 140, right: 140 },
        children: text.trim().split(/\r?\n/).map((line, lineIndex, lines) => new Paragraph({
          children: [new TextRun({ text: line, size: 19, color: hasHeader && index === 0 ? "FFFFFF" : "1E293B", bold: (hasHeader && index === 0) || (!hasHeader && column === 0) })],
          spacing: { after: 60 },
          keepNext: keepTogether && (index < rows.length - 1 || lineIndex < lines.length - 1),
        })),
      })),
    })),
    borders: Object.fromEntries(["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"].map((edge) => [edge, { style: BorderStyle.SINGLE, size: 4, color: "E2E8F0" }])),
  });
}

export async function buildReportDocx(snapshot: ReportSnapshot): Promise<Blob> {
  const { form, company } = snapshot;
  const logoBytes = await loadReportLogo(snapshot);
  const logoScale = company.logo ? Math.min(140 / company.logo.width, 64 / company.logo.height) : 0;
  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: [new TextRun({ text: reportTemplate.title, size: 36, bold: true, color: "0F172A" })], heading: HeadingLevel.TITLE, spacing: { after: 160 } }),
    ...(form.title.trim() ? [new Paragraph({ children: [new TextRun({ text: form.title.trim(), size: 22, color: "64748B" })], spacing: { after: 160 } })] : []),
    new Paragraph({ children: [new TextRun({ text: reportMetadata(snapshot), size: 18, color: "64748B" })], shading: { fill: "F1F5F9" }, spacing: { before: 120, after: 300 }, indent: { left: 140, right: 140 } }),
  ];
  for (const block of reportContent(snapshot)) {
    if (block.type === "heading") children.push(new Paragraph({
      children: [new TextRun({ text: block.text, bold: true, size: block.level === 1 ? 22 : 21, color: block.level === 1 ? "0F172A" : "0F766E" })],
      heading: block.level === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      spacing: { before: block.level === 1 ? 280 : 160, after: 160 },
      keepNext: true,
      shading: block.level === 1 ? { fill: "F1F5F9" } : undefined,
      border: block.level === 1 ? { left: { style: BorderStyle.SINGLE, size: 18, color: "0F766E", space: 8 } } : undefined,
    }));
    else if (block.type === "text") children.push(...paragraphs(block.text, block.size));
    else children.push(table(block.rows, block.widths, block.header, block.keepTogether, block.signatureRow));
  }

  const headerText = reportIssuerLines(company);
  const lineCount = (values: string[]) => values.reduce((count, value) => count + value.split(/\r?\n/).reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 90)), 0), 0);
  const textHeaderLines = logoBytes ? headerText.reduce((count, value) => count + value.split(/\r?\n/).reduce((lines, line) => lines + Math.max(1, Math.ceil(line.length / 65)), 0), 0) : lineCount(headerText);
  const topMargin = Math.max(1620, 450 + Math.max(textHeaderLines * 240, logoBytes ? 960 : 0) + 480);
  const bottomMargin = Math.max(1440, 450 + lineCount(company.footer.trim() ? [company.footer.trim()] : []) * 240 + 700);
  if (topMargin + bottomMargin > 12500) throw new Error("Antetul sau subsolul este prea lung pentru documentul Word. Scurtează-l în configurare.");
  function smallParagraphs(text: string, bold = false): Paragraph[] {
    return text.split(/\r?\n/).map((line) => new Paragraph({ children: [new TextRun({ text: line, size: 16, bold, color: bold ? "0F172A" : "64748B" })], spacing: { after: 20, line: 220 } }));
  }
  const issuerParagraphs = headerText.flatMap((line, index) => smallParagraphs(line, index === 0 && Boolean(company.companyName.trim())));
  const headerChildren: (Paragraph | Table)[] = logoBytes && company.logo ? [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: Object.fromEntries(["top", "bottom", "left", "right", "insideHorizontal", "insideVertical"].map((edge) => [edge, { style: BorderStyle.NONE, size: 0, color: "FFFFFF" }])),
    rows: [new TableRow({ children: [
      new TableCell({ width: { size: 76, type: WidthType.PERCENTAGE }, margins: { top: 0, bottom: 0, left: 0, right: 100 }, children: issuerParagraphs.length ? issuerParagraphs : [new Paragraph("")] }),
      new TableCell({ width: { size: 24, type: WidthType.PERCENTAGE }, margins: { top: 0, bottom: 0, left: 0, right: 0 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new ImageRun({ type: "png", data: logoBytes, transformation: { width: Math.round(company.logo.width * logoScale), height: Math.round(company.logo.height * logoScale) } })] })] }),
    ] })],
  })] : issuerParagraphs;
  headerChildren.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, color: "0F766E", size: 12, space: 4 } }, spacing: { before: 80, after: 0 } }));
  const document = new Document({
    creator: company.companyName || "Planwell",
    title: `${reportTemplate.title} – ${snapshot.number}`,
    description: `${snapshot.status === "draft" ? `Versiunea ${snapshot.version}. ` : ""}Model: ${snapshot.templateVersion}`,
    styles: {
      default: { document: { run: { font: "Calibri", size: 21, color: "1E293B" }, paragraph: { spacing: { line: 290, after: 120 } } } },
    },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: topMargin, bottom: bottomMargin, left: 1134, right: 1134, header: 450, footer: 450 } } },
      headers: { default: new Header({ children: headerChildren }) },
      footers: { default: new Footer({ children: [
        new Paragraph({ border: { top: { style: BorderStyle.SINGLE, color: "E2E8F0", size: 4 } }, spacing: { before: 80, after: 100 } }),
        ...(company.footer.trim() ? smallParagraphs(company.footer.trim()) : []),
        new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ size: 16, color: "64748B", children: [snapshot.number ? `${snapshot.number} · ` : "", "Pagina ", PageNumber.CURRENT, " din ", PageNumber.TOTAL_PAGES] })] }),
      ] }) },
      children,
    }],
  });
  return await Packer.toBlob(document);
}
