import { jsPDF } from 'jspdf';

// Format 6x9 pouces — le format d'impression le plus courant pour les romans KDP
const PAGE_WIDTH = 6;
const PAGE_HEIGHT = 9;
const MARGIN_TOP = 0.85;
const MARGIN_BOTTOM = 0.75;
const MARGIN_SIDE = 0.75;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_SIDE * 2;
const BODY_SIZE = 11;
const LINE_HEIGHT = 0.22;

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

export async function exportProjectToPdf(project, chapters) {
  const doc = newDoc();
  let pageNum = 1;

  // Page de titre
  doc.setFont('times', 'bold');
  doc.setFontSize(26);
  const titleLines = doc.splitTextToSize(project.title || 'Sans titre', CONTENT_WIDTH);
  doc.text(titleLines, PAGE_WIDTH / 2, PAGE_HEIGHT / 2 - 0.5, { align: 'center' });

  if (project.genre) {
    doc.setFont('times', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(110);
    doc.text(project.genre, PAGE_WIDTH / 2, PAGE_HEIGHT / 2 + 0.3, { align: 'center' });
    doc.setTextColor(0);
  }

  const sortedChapters = chapters
    .filter((c) => c.content)
    .sort((a, b) => a.order_index - b.order_index);

  sortedChapters.forEach((chapter) => {
    doc.addPage();
    pageNum++;
    let y = MARGIN_TOP + 0.4;

    doc.setFont('times', 'bold');
    doc.setFontSize(16);
    const chapterTitleLines = doc.splitTextToSize(
      `Chapitre ${chapter.order_index + 1}`,
      CONTENT_WIDTH
    );
    doc.text(chapterTitleLines, PAGE_WIDTH / 2, y, { align: 'center' });
    y += chapterTitleLines.length * 0.28 + 0.15;

    doc.setFontSize(13);
    const subTitleLines = doc.splitTextToSize(chapter.title || '', CONTENT_WIDTH);
    doc.text(subTitleLines, PAGE_WIDTH / 2, y, { align: 'center' });
    y += subTitleLines.length * 0.24 + 0.35;

    doc.setFont('times', 'normal');
    doc.setFontSize(BODY_SIZE);

    const paragraphs = chapter.content.split('\n').filter((p) => p.trim() !== '');

    paragraphs.forEach((para) => {
      const lines = doc.splitTextToSize(para, CONTENT_WIDTH);
      lines.forEach((line) => {
        if (y > PAGE_HEIGHT - MARGIN_BOTTOM - 0.2) {
          addFooter(doc, pageNum);
          doc.addPage();
          pageNum++;
          y = MARGIN_TOP;
        }
        doc.text(line, MARGIN_SIDE, y);
        y += LINE_HEIGHT;
      });
      y += LINE_HEIGHT * 0.5; // espace entre paragraphes
    });

    addFooter(doc, pageNum);
  });

  const safeName = (project.title || 'livre').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  doc.save(`${safeName}.pdf`);
}
