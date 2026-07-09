import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import xlsx from "xlsx";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import PDFDocument from "pdfkit";
import * as pdfParseModule from "pdf-parse";

const pdfParse = (pdfParseModule as any).default || pdfParseModule;

export function registerFileHandlers(win: BrowserWindow | null) {
  // --- File Upload / Parsing ---
  ipcMain.handle('file:parse', async (_, fileData: { name: string; type: string; buffer: ArrayBuffer }) => {
    try {
      const buffer = Buffer.from(fileData.buffer);
      let parsedText = "";

      if (fileData.type === "application/pdf" || fileData.name.endsWith(".pdf")) {
        const pdfData = await pdfParse(buffer);
        parsedText = pdfData.text;
      } else if (
        fileData.type === "text/plain" ||
        fileData.type === "text/markdown" ||
        fileData.name.endsWith(".txt") ||
        fileData.name.endsWith(".md") ||
        fileData.name.endsWith(".json")
      ) {
        parsedText = buffer.toString("utf-8");
      } else {
        throw new Error("Unsupported file type. Please upload PDF, TXT, or MD.");
      }

      if (parsedText.length > 100000) {
        parsedText = parsedText.substring(0, 100000) + "\n\n【⚠️ 系統警告：檔案過長，已截斷至前 10 萬字元】";
      }

      return {
        success: true,
        filename: fileData.name,
        content: parsedText,
        size: buffer.length,
      };
    } catch (err: any) {
      console.error("File parsing error:", err);
      throw new Error("Failed to parse file: " + err.message);
    }
  });

  // --- Document Export ---
  ipcMain.handle('export:document', async (_, data: { filename: string; content: string }) => {
    if (!win) throw new Error("Window not found");
    const { filename, content } = data;
    const cleanContent = content || "";

    const ext = filename.split('.').pop()?.toLowerCase();
    
    // 1. Show Save Dialog natively in Electron
    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: '匯出文件',
      defaultPath: filename,
      filters: [
        { name: 'Documents', extensions: [ext || 'txt'] }
      ]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    try {
      if (ext === "xlsx" || ext === "csv") {
        const lines = cleanContent.trim().split("\n");
        const rows = lines.map(line => line.split(","));
        const wb = xlsx.utils.book_new();
        const ws = xlsx.utils.aoa_to_sheet(rows);
        const maxCol = rows.reduce((max, row) => Math.max(max, row.length), 0);
        ws["!cols"] = Array(maxCol).fill({ wch: 15 });
        xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });
        await fs.writeFile(filePath, buffer);
      } 
      else if (ext === "docx") {
        const paragraphs = cleanContent.split("\n\n").map(textBlock => {
          const lines = textBlock.split("\n");
          if (lines[0]?.startsWith("#") || lines[0]?.startsWith("專案：") || lines[0]?.startsWith("一、") || lines[0]?.startsWith("二、") || lines[0]?.startsWith("三、")) {
            return new Paragraph({
              text: textBlock.replace(/^#\s*/, ""),
              heading: HeadingLevel.HEADING_2,
              spacing: { before: 200, after: 100 }
            });
          }
          return new Paragraph({
            children: [new TextRun({ text: textBlock, size: 24 })],
            spacing: { after: 120 }
          });
        });

        const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
        const buffer = await Packer.toBuffer(doc);
        await fs.writeFile(filePath, buffer);
      } 
      else if (ext === "pdf") {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: Buffer[] = [];
        doc.on("data", (chunk) => buffers.push(chunk));
        
        const pdfPromise = new Promise((resolve) => {
          doc.on("end", async () => {
            const pdfData = Buffer.concat(buffers);
            await fs.writeFile(filePath, pdfData);
            resolve(true);
          });
        });

        // Design margin accent line
        doc.rect(0, 0, 612, 10).fill("#C5A059");
        doc.moveDown(2);

        // Title
        doc.fillColor("#3D2E1A").font("Times-Bold").fontSize(20).text(filename.replace(/\.pdf$/, ""), { align: "center" });
        doc.moveDown(0.5);
        
        // Metadata
        doc.font("Times-Italic").fontSize(9).fillColor("#8A6E3E").text("WaveForm Premium Compiled PDF Document | Certified by Acrobat Engine", { align: "center" });
        doc.moveDown(1.5);
        doc.strokeColor("#E1D7D4").lineWidth(0.5).moveTo(50, doc.y).lineTo(562, doc.y).stroke();
        doc.moveDown(2);

        // Body Text
        doc.font("Helvetica").fontSize(10.5).fillColor("#3E3532").lineGap(6);
        const bodyLines = cleanContent.split("\n");
        bodyLines.forEach(line => {
          const trimmed = line.trim();
          if (trimmed.startsWith("一、") || trimmed.startsWith("二、") || trimmed.startsWith("三、") || trimmed.startsWith("四、")) {
            doc.moveDown(1);
            doc.font("Helvetica-Bold").fontSize(12).fillColor("#8A6E3E").text(line);
            doc.font("Helvetica").fontSize(10.5).fillColor("#3E3532");
          } else if (trimmed.startsWith("- ") || trimmed.startsWith("· ")) {
            doc.font("Helvetica").fontSize(10.5).fillColor("#3E3532").text(`  ${line}`);
          } else {
            doc.font("Helvetica").fontSize(10.5).fillColor("#3E3532").text(line);
          }
        });

        doc.font("Helvetica-Oblique").fontSize(8).fillColor("#C3B5B2").text("Page 1 / 1", 50, 740, { align: "center" });
        doc.end();
        await pdfPromise;
      } 
      else {
        // Plain text fallback
        await fs.writeFile(filePath, cleanContent, "utf-8");
      }

      return { success: true, filePath };
    } catch (err: any) {
      console.error("Export Error:", err);
      throw new Error(`Export failed: ${err.message}`);
    }
  });
}
