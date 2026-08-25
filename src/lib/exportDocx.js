import { Document, Packer, Paragraph, HeadingLevel, PageBreak } from 'docx';
import { saveAs } from 'file-saver';

export async function exportProjectToDocx(project, chapters) {
  const children = [
    new Paragraph({
      text: project.title,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({ text: '', spacing: { after: 400 } }),
  ];

  chapters
    .filter((c) => c.content)
    .sort((a, b) => a.order_index - b.order_index)
    .forEach((chapter, i) => {
      if (i > 0) {
        children.push(new Paragraph({ children: [new PageBreak()] }));
      }
      children.push(
        new Paragraph({
          text: chapter.title,
          heading: HeadingLevel.HEADING_1,
          spacing: { after: 200 },
        })
      );
      chapter.content.split('\n').forEach((line) => {
        if (line.trim() === '') {
          children.push(new Paragraph({ text: '' }));
        } else {
          children.push(
            new Paragraph({
              text: line,
              spacing: { after: 120 },
            })
          );
        }
      });
    });

  const doc = new Document({
    sections: [{ children }],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = (project.title || 'livre').replace(/[^a-z0-9]/gi, '_').toLowerCase();
  saveAs(blob, `${safeName}.docx`);
}
