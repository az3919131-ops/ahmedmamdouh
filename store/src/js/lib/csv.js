// تصدير CSV آمن لمستخدمي Excel: يمنع حقن الصيغ (=,+,-,@) ويهرّب الاقتباس والفواصل.
// CSV export that neutralises spreadsheet formula injection (a customer could type "=HYPERLINK(...)" as their name).
//
// Project manager · Eng. Ahmed Zahran

export function csvCell(value) {
  let s = value === null || value === undefined ? '' : String(value);
  // خلية تبدأ بـ = + - @ أو Tab/CR قد تُنفَّذ كصيغة في Excel/Sheets ⇒ نسبقها بفاصلة علوية
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows) {
  // BOM كي يفتح Excel العربية بترميز UTF-8 صحيح
  return '﻿' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
