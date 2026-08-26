import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  Footer,
  PageNumber,
  AlignmentType,
} from 'docx';
import { saveAs } from 'file-saver';

const LINE_BORDER = {
  bottom: { style: BorderStyle.SINGLE, size: 4, color: 'B0B0B0' },
};

function linedParagraph() {
  return new Paragraph({
    text: '',
    spacing: { before: 260, after: 40 },
    border: LINE_BORDER,
  });
}

function ruledBlock(lineCount) {
  const paras = [];
  for (let i = 0; i < lineCount; i++) {
    paras.push(linedParagraph());
  }
  return paras;
}

function gridTable(rows = 16, cols = 10) {
  const emptyCell = () =>
    new TableCell({
      children: [new Paragraph({ text: '' })],
      width: { size: 100 / cols, type: WidthType.PERCENTAGE },
      margins: { top: 100, bottom: 100, left: 50, right: 50 },
    });

  const tableRows = [];
  for (let r = 0; r < rows; r++) {
    const cells = [];
    for (let c = 0; c < cols; c++) cells.push(emptyCell());
    tableRows.push(new TableRow({ children: cells }));
  }

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function habitTrackerTable(days = 31, habitRows = 8) {
  const headerCells = [
    new TableCell({ children: [new Paragraph({ text: 'Habitude', alignment: AlignmentType.LEFT })] }),
  ];
  for (let d = 1; d <= days; d++) {
    headerCells.push(new TableCell({ children: [new Paragraph({ text: String(d), alignment: AlignmentType.CENTER })] }));
  }

  const tableRows = [new TableRow({ children: headerCells })];

  for (let r = 0; r < habitRows; r++) {
    const cells = [new TableCell({ children: [new Paragraph({ text: '' })] })];
    for (let d = 1; d <= days; d++) {
      cells.push(new TableCell({ children: [new Paragraph({ text: '' })] }));
    }
    tableRows.push(new TableRow({ children: cells }));
  }

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  });
}

function buildPage({ pageNumber, promptText, template, linesPerPage }) {
  const children = [];

  children.push(
    new Paragraph({
      text: promptText || `Page ${pageNumber}`,
      heading: HeadingLevel.HEADING_2,
      spacing: { after: 200 },
    })
  );

  if (template === 'grid') {
    children.push(gridTable(16, 10));
  } else if (template === 'habit_tracker') {
    children.push(habitTrackerTable());
  } else {
    // lined, prompted, gratitude → lignes réglées
    children.push(...ruledBlock(linesPerPage || 10));
  }

  return children;
}

export async function exportCarnetToDocx(project) {
  const config = project.carnet_config || {};
  const template = config.template || 'lined';
  const numPages = config.num_pages || 30;
  const linesPerPage = config.lines_per_page || 12;
  const prompts = config.prompts || [];

  const children = [
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.TITLE,
      spacing: { after: 200 },
    }),
  ];

  if (config.intro_text) {
    children.push(
      new Paragraph({
        text: config.intro_text,
        spacing: { after: 400 },
      })
    );
  }

  for (let i = 0; i < numPages; i++) {
    children.push(new Paragraph({ children: [new PageBreak()] }));
    const promptText = prompts.length > 0 ? prompts[i % prompts.length] : null;
    children.push(
      ...buildPage({
        pageNumber: i + 1,
        promptText,
        template,
        linesPerPage,
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        children,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (project.title || 'carnet').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  saveAs(blob, `${safeName}.docx`);
}
