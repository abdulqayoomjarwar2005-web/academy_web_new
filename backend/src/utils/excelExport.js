// excelExport.js
//
// Generic Excel report generator used by the Phase 11
// Reports & Exports module. Keeps formatting consistent across
// Student / Teacher / Attendance / Fee / Expense / Profit reports.

const ExcelJS = require('exceljs');

/**
 * Stream an Excel (.xlsx) report to the HTTP response.
 *
 * @param {import('express').Response} res
 * @param {Object} opts
 * @param {string} opts.title - Report title (used as the sheet name and header row).
 * @param {string} [opts.subtitle] - Optional subtitle (e.g. filters applied).
 * @param {Array<{ key: string, label: string, excelWidth?: number }>} opts.columns
 * @param {Array<Object>} opts.rows - Row data, keyed by column key.
 * @param {string[]} [opts.summary] - Optional lines of summary text added after the table.
 * @param {string} opts.filename - Filename (without extension) for the download.
 */
const streamExcelReport = async (res, { title, subtitle, columns, rows, summary = [], filename }) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Nation Builders Institute of Learning Larkana';
  workbook.created = new Date();

  const sheetName = (title || 'Report').substring(0, 31);
  const sheet = workbook.addWorksheet(sheetName);

  let currentRow = 1;

  // ---- Title & subtitle ----
  const titleCell = sheet.getCell(currentRow, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1B1F2A' } };
  currentRow += 1;

  if (subtitle) {
    const subtitleCell = sheet.getCell(currentRow, 1);
    subtitleCell.value = subtitle;
    subtitleCell.font = { italic: true, size: 10, color: { argb: 'FF3D5A80' } };
    currentRow += 1;
  }

  const generatedCell = sheet.getCell(currentRow, 1);
  generatedCell.value = `Generated: ${new Date().toLocaleString()}`;
  generatedCell.font = { size: 9, color: { argb: 'FF888888' } };
  currentRow += 2;

  // ---- Header row ----
  const headerRowIndex = currentRow;
  columns.forEach((col, i) => {
    const cell = sheet.getCell(headerRowIndex, i + 1);
    cell.value = col.label;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3D5A80' } };
    cell.alignment = { vertical: 'middle' };
    sheet.getColumn(i + 1).width = col.excelWidth || 18;
  });
  currentRow += 1;

  // ---- Data rows ----
  rows.forEach((row) => {
    columns.forEach((col, i) => {
      sheet.getCell(currentRow, i + 1).value = row[col.key] ?? '';
    });
    currentRow += 1;
  });

  if (!rows.length) {
    sheet.getCell(currentRow, 1).value = 'No records found.';
    sheet.getCell(currentRow, 1).font = { italic: true, color: { argb: 'FF888888' } };
    currentRow += 1;
  }

  // ---- Summary ----
  if (summary.length) {
    currentRow += 1;
    summary.forEach((line) => {
      const cell = sheet.getCell(currentRow, 1);
      cell.value = line;
      cell.font = { bold: true };
      currentRow += 1;
    });
  }

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);

  await workbook.xlsx.write(res);
  res.end();
};

module.exports = { streamExcelReport };
