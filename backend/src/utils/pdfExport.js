// pdfExport.js
//
// Generic landscape-table PDF generator used by the Phase 11
// Reports & Exports module. Keeps formatting consistent across
// Student / Teacher / Attendance / Fee / Expense / Profit reports.

const PDFDocument = require('pdfkit');

const FONT_REGULAR = 'Helvetica';
const FONT_BOLD = 'Helvetica-Bold';

/**
 * Stream a tabular PDF report to the HTTP response.
 *
 * @param {import('express').Response} res
 * @param {Object} opts
 * @param {string} opts.title - Report title.
 * @param {string} [opts.subtitle] - Optional subtitle (e.g. filters applied).
 * @param {Array<{ key: string, label: string, width?: number, align?: 'left'|'right'|'center' }>} opts.columns
 * @param {Array<Object>} opts.rows - Row data, keyed by column key.
 * @param {string[]} [opts.summary] - Optional lines of summary text shown after the table.
 * @param {string} opts.filename - Filename (without extension) for the download.
 */
const streamPdfReport = (res, { title, subtitle, columns, rows, summary = [], filename }) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

  const doc = new PDFDocument({ margin: 36, size: 'A4', layout: 'landscape' });
  doc.pipe(res);

  // ---- Header ----
  doc.font(FONT_BOLD).fontSize(16).fillColor('#1B1F2A').text(title);
  if (subtitle) {
    doc.font(FONT_REGULAR).fontSize(10).fillColor('#3D5A80').text(subtitle);
  }
  doc.font(FONT_REGULAR).fontSize(8).fillColor('#888888').text(`Generated: ${new Date().toLocaleString()}`);
  doc.fillColor('#000000');
  doc.moveDown(0.75);

  const startX = doc.page.margins.left;
  const usableWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  const totalWeight = columns.reduce((sum, c) => sum + (c.width || 1), 0);
  const colWidths = columns.map((c) => ((c.width || 1) / totalWeight) * usableWidth);
  const rowHeight = 20;
  const cellPadding = 5;

  let y = doc.y;

  const drawRow = (cells, { bold = false, fillHeader = false } = {}) => {
    let x = startX;
    if (fillHeader) {
      doc.rect(startX, y, usableWidth, rowHeight).fill('#3D5A80');
      doc.fillColor('#FFFFFF');
    } else {
      doc.fillColor('#1B1F2A');
    }
    doc.font(bold || fillHeader ? FONT_BOLD : FONT_REGULAR).fontSize(8.5);

    cells.forEach((text, i) => {
      doc.rect(x, y, colWidths[i], rowHeight).stroke('#E2E2E2');
      doc.text(text === null || text === undefined ? '' : String(text), x + cellPadding, y + 5, {
        width: colWidths[i] - cellPadding * 2,
        align: columns[i].align || 'left',
        ellipsis: true,
        lineBreak: false,
      });
      x += colWidths[i];
    });

    doc.fillColor('#1B1F2A');
    y += rowHeight;
  };

  const drawHeaderRow = () => drawRow(columns.map((c) => c.label), { fillHeader: true });

  drawHeaderRow();

  if (!rows.length) {
    doc.font(FONT_REGULAR).fontSize(9).fillColor('#888888').text('No records found.', startX + cellPadding, y + 5);
    y += rowHeight;
  } else {
    rows.forEach((row) => {
      if (y + rowHeight > bottomLimit - 70) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeaderRow();
      }
      drawRow(columns.map((c) => row[c.key]));
    });
  }

  // ---- Summary ----
  if (summary.length) {
    y += 14;
    if (y + summary.length * 16 > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.font(FONT_BOLD).fontSize(10).fillColor('#1B1F2A');
    summary.forEach((line) => {
      doc.text(line, startX, y);
      y += 16;
    });
  }

  doc.end();
};

module.exports = { streamPdfReport };
