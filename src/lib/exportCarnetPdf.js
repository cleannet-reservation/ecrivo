import { jsPDF } from 'jspdf';

const PAGE_WIDTH = 6;
const PAGE_HEIGHT = 9;
const MARGIN_TOP = 0.85;
const MARGIN_BOTTOM = 0.75;
const MARGIN_SIDE = 0.7;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_SIDE * 2;
const LINE_COLOR = 176; // gris clair

function newDoc() {
  return new jsPDF({ unit: 'in', format: [PAGE_WIDTH, PAGE_HEIGHT] });
}

function addFooter(doc, pageNum) {
  doc.setFont('times', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(String(pageNum), PAGE_WIDTH / 2, PAGE_HEIGHT - 0.45, { align: 'center' });
  doc.setTextColor(0);
}

function drawRuledLines(doc, startY, count) {
  const spacing = Math.min(0.4, (PAGE_HEIGHT - MARGIN_BOTTOM - startY) / Math.max(count, 1));
  doc.setDrawColor(LINE_COLOR);
  doc.setLineWidth(0.008);
  let y = startY;
  for (let i = 0; i < count; i++) {
    doc.line(MARGIN_SIDE, y, PAGE_WIDTH - MARGIN_SIDE, y);
    y += spacing;
  }
}

function drawGrid(doc, startY) {
  const endY = PAGE_HEIGHT - MARGIN_BOTTOM;
  const cellSize = 0.28;
  doc.setDrawColor(LINE_COLOR);
  doc.setLineWidth(0.006);

  for (let x = MARGIN_SIDE; x <= PAGE_WIDTH - MARGIN_SIDE + 0.01; x += cellSize) {
    doc.line(x, startY, x, endY);
  }
  for (let y = startY; y <= endY + 0.01; y += cellSize) {
    doc.line(MARGIN_SIDE, y, PAGE_WIDTH - MARGIN_SIDE, y);
  }
}

function drawHabitTracker(doc, startY, monthLabel) {
  const days = 31;
  const habitRows = 8;
  const endY = PAGE_HEIGHT - MARGIN_BOTTOM;
  const labelColWidth = 1.1;
  const gridWidth = CONTENT_WIDTH - labelColWidth;
  const colWidth = gridWidth / days;
  const rowHeight = (endY - startY) / (habitRows + 1);

  doc.setDrawColor(LINE_COLOR);
  doc.setLineWidth(0.006);
  doc.setFontSize(6);

  // en-têtes jours
  for (let d = 0; d <= days; d++) {
    const x = MARGIN_SIDE + labelColWidth + d * colWidth;
    doc.line(x, startY, x, endY);
    if (d < days) {
      doc.text(String(d + 1), x + colWidth / 2, startY + rowHeight * 0.65, { align: 'center' });
    }
  }
  doc.line(MARGIN_SIDE, startY, MARGIN_SIDE, endY);

  // lignes horizontales
  for (let r = 0; r <= habitRows + 1; r++) {
    const y = startY + r * rowHeight;
    doc.line(MARGIN_SIDE, y, PAGE_WIDTH - MARGIN_SIDE, y);
  }
}

function renderPage(doc, { promptText, template, linesPerPage }) {
  let y = MARGIN_TOP;

  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  const titleLines = doc.splitTextToSize(promptText || '', CONTENT_WIDTH);
  doc.text(titleLines, PAGE_WIDTH / 2, y, { align: 'center' });
  y += titleLines.length * 0.24 + 0.3;

  if (template === 'grid') {
    drawGrid(doc, y);
  } else if (template === 'habit_tracker') {
    drawHabitTracker(doc, y, promptText);
  } else {
    drawRuledLines(doc, y + 0.15, linesPerPage || 10);
  }
}

export async function exportCarnetToPdf(project) {
  const config = project.carnet_config || {};
  const template = config.template || 'lined';
  const numPages = config.num_pages || 30;
  const linesPerPage = config.lines_per_page || 12;
  const prompts = config.prompts || [];

  const doc = newDoc();
  let pageNum = 1;

  // Page de titre
  doc.setFont('times', 'bold');
  doc.setFontSize(24);
  const titleLines = doc.splitTextToSize(project.title || 'Sans titre', CONTENT_WIDTH);
  doc.text(titleLines, PAGE_WIDTH / 2, PAGE_HEIGHT / 2 - 0.6, { align: 'center' });

  if (config.intro_text) {
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(90);
    const introLines = doc.splitTextToSize(config.intro_text, CONTENT_WIDTH - 0.4);
    doc.text(introLines, PAGE_WIDTH / 2, PAGE_HEIGHT / 2 + 0.2, { align: 'center' });
    doc.setTextColor(0);
  }

  for (let i = 0; i < numPages; i++) {
    doc.addPage();
    pageNum++;
    const promptText = prompts.length > 0 ? prompts[i % prompts.length] : `Page ${i + 1}`;
    renderPage(doc, { promptText, template, linesPerPage });
    addFooter(doc, pageNum);
  }

  const safeName = (project.title || 'carnet').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeName}.pdf`);
}
