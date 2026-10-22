import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb } from "pdf-lib";
import type { PDFFont } from "pdf-lib";
import { loadReportLogo } from "@/lib/reports/logo";
import { reportContent, reportIssuerLines, reportMetadata, reportTemplate } from "@/lib/reports/model";
import type { ReportSnapshot } from "@/lib/reports/model";

export async function buildReportPdf(snapshot: ReportSnapshot, fontBytes?: ArrayBuffer, boldFontBytes?: ArrayBuffer): Promise<Blob> {
  const { form, company } = snapshot;
  async function loadFont(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Fontul PDF nu a putut fi încărcat.");
    return await response.arrayBuffer();
  }
  const [bytes, boldBytes, logoBytes] = await Promise.all([
    fontBytes ?? loadFont("/fonts/NotoSans-Regular.ttf"),
    boldFontBytes ?? loadFont("/fonts/NotoSans-Bold.ttf"),
    loadReportLogo(snapshot),
  ]);
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const [font, boldFont] = await Promise.all([document.embedFont(bytes, { subset: true }), document.embedFont(boldBytes, { subset: true })]);
  const logo = logoBytes ? await document.embedPng(logoBytes) : null;
  const logoSize = logo?.scaleToFit(104, 48);
  const width = 595.28;
  const height = 841.89;
  const margin = 44;
  const contentWidth = width - margin * 2;
  const color = rgb(0.12, 0.16, 0.23);
  const navy = rgb(0.06, 0.09, 0.16);
  const accent = rgb(0.06, 0.46, 0.43);
  const muted = rgb(0.39, 0.45, 0.55);
  const pale = rgb(0.94, 0.96, 0.98);
  const border = rgb(0.88, 0.91, 0.94);
  const headerLines = reportIssuerLines(company);

  // Wrap by Unicode code point, including long identifiers without spaces.
  function wrap(value: string, size: number, maxWidth: number, textFont: PDFFont = font): string[] {
    const output: string[] = [];
    for (const paragraph of value.replace(/\r/g, "").split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/)) {
        if (!word) continue;
        if (textFont.widthOfTextAtSize(`${line}${line ? " " : ""}${word}`, size) <= maxWidth) {
          line += `${line ? " " : ""}${word}`;
          continue;
        }
        if (line) output.push(line);
        line = "";
        for (const character of word) {
          if (line && textFont.widthOfTextAtSize(line + character, size) > maxWidth) {
            output.push(line);
            line = "";
          }
          line += character;
        }
      }
      output.push(line);
    }
    return output.length ? output : [""];
  }

  const headerWidth = contentWidth - (logo ? 124 : 0);
  const renderedHeader = headerLines.flatMap((line) => wrap(line, 8, headerWidth, boldFont));
  const renderedFooter = wrap(company.footer, 7, contentWidth).filter(Boolean);
  const headerHeight = Math.max(renderedHeader.length * 11, logoSize?.height ?? 0);
  const headerBottom = height - margin - headerHeight - 14;
  const bodyTop = headerBottom - 22;
  const bodyBottom = margin + renderedFooter.length * 10 + 18;
  if (bodyTop - bodyBottom < 200) throw new Error("Antetul sau subsolul este prea lung pentru pagina PDF. Scurtează-l în configurare.");
  let page = document.addPage([width, height]);
  let y = bodyTop;

  function newPage() {
    page = document.addPage([width, height]);
    y = bodyTop;
  }

  function ensure(space: number) {
    if (y - space < bodyBottom) newPage();
  }

  function text(value: string, size = 10, bold = false, foreground = color) {
    if (!value.trim()) return;
    const textFont = bold ? boldFont : font;
    const lines = wrap(value.trim(), size, contentWidth, textFont);
    for (const line of lines) {
      ensure(size * 1.5);
      page.drawText(line, { x: margin, y: y - size, size, font: textFont, color: foreground });
      y -= size * 1.5;
    }
    y -= 8;
  }

  function sectionHeading(value: string, level: 1 | 2) {
    const size = level === 1 ? 11 : 10.5;
    const lines = wrap(value, size, contentWidth - (level === 1 ? 26 : 0), boldFont);
    if (level === 1) {
      const maxLines = Math.max(1, Math.floor((bodyTop - bodyBottom - 52) / 16));
      for (let start = 0; start < lines.length; start += maxLines) {
        const chunk = lines.slice(start, start + maxLines);
        const boxHeight = chunk.length * 16 + 14;
        ensure(boxHeight + 38);
        page.drawRectangle({ x: margin, y: y - boxHeight, width: contentWidth, height: boxHeight, color: pale });
        page.drawRectangle({ x: margin, y: y - boxHeight, width: 3, height: boxHeight, color: accent });
        chunk.forEach((line, index) => page.drawText(line, { x: margin + 12, y: y - 10 - size - index * 16, size, font: boldFont, color: navy }));
        y -= boxHeight + 13;
      }
    } else {
      ensure(Math.min(lines.length * 16 + 38, bodyTop - bodyBottom));
      text(value, size, true, accent);
    }
  }

  function measureTable(rows: string[][], proportions: number[], header: boolean, signatureRow?: number) {
    return rows.reduce((total, cells, rowIndex) => {
      const lines = Math.max(...cells.map((cell, column) => wrap(cell.trim(), 9, proportions[column] * contentWidth - 16, (header && rowIndex === 0) || (!header && column === 0) ? boldFont : font).length));
      return total + Math.max(lines * 13 + 12, rowIndex === signatureRow ? 64 : 0);
    }, 0);
  }

  function table(rows: string[][], proportions: number[], header = false, keepTogether = false, signatureRow?: number) {
    const columnWidths = proportions.map((fraction) => fraction * contentWidth);
    const height = measureTable(rows, proportions, header, signatureRow);
    if (keepTogether && height <= bodyTop - bodyBottom) ensure(height);
    function drawRow(cells: string[], isHeader: boolean, rowIndex = 0) {
      const cellLines = cells.map((cell, index) => wrap(cell.trim(), 9, columnWidths[index] - 16, isHeader || (!header && index === 0) ? boldFont : font));
      let offset = 0;
      const maxLines = Math.max(...cellLines.map((lines) => lines.length));
      const minimumHeight = rowIndex === signatureRow ? 64 : 0;
      const fullHeight = Math.max(maxLines * 13 + 12, minimumHeight);
      if (fullHeight <= bodyTop - bodyBottom && y - fullHeight < bodyBottom) {
        newPage();
        if (header && cells !== rows[0]) drawRow(rows[0], true);
      }
      while (offset < maxLines) {
        ensure(Math.max(26, minimumHeight));
        const availableLines = Math.max(1, Math.floor((y - bodyBottom - 12) / 13));
        const count = Math.min(maxLines - offset, availableLines);
        const rowHeight = Math.max(count * 13 + 12, minimumHeight);
        let x = margin;
        columnWidths.forEach((columnWidth, index) => {
          const labelCell = !header && index === 0;
          const fill = isHeader ? navy : labelCell ? pale : rowIndex % 2 === 0 ? rgb(0.98, 0.99, 1) : rgb(1, 1, 1);
          page.drawRectangle({ x, y: y - rowHeight, width: columnWidth, height: rowHeight, borderWidth: 0.4, borderColor: isHeader ? navy : border, color: fill });
          cellLines[index].slice(offset, offset + count).forEach((line, lineIndex) => page.drawText(line, { x: x + 8, y: y - 16 - lineIndex * 13, size: 9, font: isHeader || labelCell ? boldFont : font, color: isHeader ? rgb(1, 1, 1) : color }));
          x += columnWidth;
        });
        y -= rowHeight;
        offset += count;
        if (offset < maxLines) {
          newPage();
          if (header && cells !== rows[0]) drawRow(rows[0], true);
        }
      }
    }
    rows.forEach((row, index) => {
      if (header && index > 0 && y - 30 < bodyBottom) {
        newPage();
        drawRow(rows[0], true);
      }
      drawRow(row, header && index === 0, index);
    });
    y -= 18;
  }

  text(reportTemplate.title, 18, true, navy);
  text(form.title, 11, false, muted);
  const metadataLines = wrap(reportMetadata(snapshot), 8.5, contentWidth - 20);
  const metadataHeight = metadataLines.length * 13 + 14;
  ensure(metadataHeight + 40);
  page.drawRectangle({ x: margin, y: y - metadataHeight, width: contentWidth, height: metadataHeight, color: pale });
  metadataLines.forEach((line, index) => page.drawText(line, { x: margin + 10, y: y - 16 - index * 13, size: 8.5, font, color: muted }));
  y -= metadataHeight + 22;
  const content = reportContent(snapshot);
  for (const [index, block] of content.entries()) {
    if (block.type === "heading") {
      const nextBlock = content[index + 1];
      if (block.level === 1 && nextBlock?.type === "table" && nextBlock.keepTogether) {
        const groupHeight = wrap(block.text, 11, contentWidth - 26, boldFont).length * 16 + 27 + measureTable(nextBlock.rows, nextBlock.widths, nextBlock.header, nextBlock.signatureRow);
        if (groupHeight <= bodyTop - bodyBottom) ensure(groupHeight);
      }
      sectionHeading(block.text, block.level);
    }
    else if (block.type === "text") text(block.text, block.size);
    else table(block.rows, block.widths, block.header, block.keepTogether, block.signatureRow);
  }

  const pages = document.getPages();
  pages.forEach((currentPage, index) => {
    renderedHeader.forEach((line, lineIndex) => currentPage.drawText(line, { x: margin, y: height - margin - 8 - lineIndex * 11, size: 8, font: lineIndex === 0 && company.companyName.trim() ? boldFont : font, color: lineIndex === 0 ? navy : muted }));
    if (logo && logoSize) currentPage.drawImage(logo, { x: width - margin - logoSize.width, y: height - margin - logoSize.height, ...logoSize });
    currentPage.drawLine({ start: { x: margin, y: headerBottom }, end: { x: width - margin, y: headerBottom }, thickness: 1.5, color: accent });
    currentPage.drawLine({ start: { x: margin, y: bodyBottom - 5 }, end: { x: width - margin, y: bodyBottom - 5 }, thickness: 0.5, color: border });
    renderedFooter.forEach((line, lineIndex) => currentPage.drawText(line, { x: margin, y: margin + (renderedFooter.length - lineIndex) * 10 + 5, size: 7, font, color: muted }));
    currentPage.drawText(`Pagina ${index + 1} din ${pages.length}`, { x: width - margin - 95, y: margin - 6, size: 8, font, color: muted });
    if (snapshot.number) currentPage.drawText(snapshot.number, { x: margin, y: margin - 6, size: 8, font, color: muted });
  });
  document.setTitle(`${reportTemplate.title} – ${snapshot.number}`);
  document.setAuthor(company.companyName || "Planwell");
  document.setSubject(`${snapshot.status === "draft" ? `Versiunea ${snapshot.version}; ` : ""}model ${snapshot.templateVersion}`);
  const pdf = await document.save();
  return new Blob([new Uint8Array(pdf)], { type: "application/pdf" });
}
