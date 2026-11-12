export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
export function downloadText(text: string, name: string, type = "text/plain;charset=utf-8") {
  downloadBlob(new Blob(["﻿" + text], { type }), name);
}

/** Simple DOCX from paragraphs (RTL aware). */
export async function textToDocx(text: string, rtl: boolean): Promise<Blob> {
  const { Document, Packer, Paragraph, TextRun, AlignmentType } = await import("docx");
  const doc = new Document({
    sections: [{
      children: [
        ...text.split("\n").map((line) => new Paragraph({ bidirectional: rtl, alignment: rtl ? AlignmentType.RIGHT : AlignmentType.LEFT, children: [new TextRun({ text: line, rightToLeft: rtl, font: rtl ? "Arial" : "Calibri", size: 24 })] })),
        new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "Project manager · Eng. Ahmed Zahran", size: 16, color: "888888" })] }),
      ],
    }],
  });
  return Packer.toBlob(doc);
}
