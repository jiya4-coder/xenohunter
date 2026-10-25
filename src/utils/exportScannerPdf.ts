import jsPDF from 'jspdf';

export interface ScannerPdfData {
  subject: string;
  chapterTitle: string;
  classLevel: string;
  detectedPageType?: string;
  quickSummary: string;
  explainedNotes: Array<{
    topic: string;
    summary: string;
    bulletPoints: string[];
  }>;
  formulas?: Array<{
    concept: string;
    formula: string;
    siUnit: string;
    takeaway: string;
  }>;
  realWorldAnalogy?: {
    title: string;
    story: string;
    takeaway: string;
  };
  questionsList: Array<{
    id: string;
    questionNumber: number;
    questionText: string;
    questionSummary: string;
    difficulty: 'Easy' | 'Medium' | 'Hard';
    formulaUsed: string;
    steps: string[];
    finalAnswer: string;
  }>;
  questionsSummary?: string;
  examTips: string[];
}

/**
 * Strips basic markdown markers like **bold**, *italic*, $math$, LaTeX commands etc.
 * so jsPDF renders pristine, readable typography without raw formatting codes.
 */
function cleanMarkdown(text: string = ''): string {
  if (!text) return '';
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$([^$]+)\$/g, '$1')
    .replace(/\\text\{([^}]+)\}/g, '$1')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '$1 / $2')
    .replace(/\\cdot/g, '·')
    .replace(/\\times/g, '×')
    .replace(/\\ll/g, '<<')
    .replace(/\\gg/g, '>>')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\implies/g, '=>')
    .replace(/\\textless/g, '<')
    .replace(/\\textgreater/g, '>')
    .replace(/\\/g, '')
    .trim();
}

/**
 * Generates and downloads a multi-page, publication-grade educational PDF
 * for scanned handwritten student copies using jsPDF.
 */
export function exportScannerToPdf(data: ScannerPdfData): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm
  let y = margin;

  const checkPageBreak = (neededHeight: number) => {
    if (y + neededHeight > pageHeight - 20) {
      doc.addPage();
      y = 16;
      // Header banner for subsequent pages
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(
        `StudyBot AI · ${cleanMarkdown(data.subject)} · ${cleanMarkdown(data.chapterTitle)}`,
        margin,
        10
      );
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 12, pageWidth - margin, 12);
    }
  };

  // ====================================================================
  // 1. BRAND HEADER BANNER
  // ====================================================================
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(margin, y, contentWidth, 26, 3, 3, 'F');

  // StudyBot AI title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('StudyBot AI', margin + 6, y + 9);

  // Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(147, 197, 253); // blue-300
  doc.text('Smart Problem & Notes Scanner Solutions · NCF-SE 2026–27', margin + 6, y + 16);

  // Class & Date Badges on top right of banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  const classText = `${cleanMarkdown(data.classLevel || 'Class 9')} · CBSE & State Boards`;
  doc.text(classText, pageWidth - margin - 6, y + 9, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  doc.text(`Generated on ${dateStr}`, pageWidth - margin - 6, y + 16, { align: 'right' });

  y += 32;

  // ====================================================================
  // 2. DOCUMENT / TOPIC TITLE
  // ====================================================================
  doc.setFillColor(239, 246, 255); // blue-50
  doc.setDrawColor(191, 219, 254); // blue-200
  doc.setLineWidth(0.2);
  doc.roundedRect(margin, y, 48, 6, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(29, 78, 216); // blue-700
  doc.text(cleanMarkdown(data.subject).toUpperCase(), margin + 24, y + 4.2, { align: 'center' });

  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  const titleLines = doc.splitTextToSize(cleanMarkdown(data.chapterTitle), contentWidth);
  doc.text(titleLines, margin, y);
  y += titleLines.length * 6 + 2;

  if (data.detectedPageType) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`Source: ${cleanMarkdown(data.detectedPageType)}`, margin, y);
    y += 6;
  }

  // ====================================================================
  // 3. EXECUTIVE SUMMARY (TL;DR)
  // ====================================================================
  if (data.quickSummary) {
    const summaryClean = cleanMarkdown(data.quickSummary);
    const summaryLines = doc.splitTextToSize(summaryClean, contentWidth - 14);
    const boxHeight = summaryLines.length * 4.2 + 13;

    checkPageBreak(boxHeight + 4);

    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2.5, 2.5, 'FD');

    // Left accent bar
    doc.setFillColor(37, 99, 235); // blue-600
    doc.roundedRect(margin, y, 2.5, boxHeight, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 58, 138); // blue-900
    doc.text('EXECUTIVE SUMMARY & TL;DR', margin + 6, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(51, 65, 85);
    doc.text(summaryLines, margin + 6, y + 10.5);

    y += boxHeight + 6;
  }

  // ====================================================================
  // 4. CHAPTER NOTES & CONCEPTS
  // ====================================================================
  if (data.explainedNotes && data.explainedNotes.length > 0) {
    checkPageBreak(16);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('1. Chapter Notes & Concept Breakdown', margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    data.explainedNotes.forEach((concept, cIdx) => {
      const topicTitle = `${cIdx + 1}. ${cleanMarkdown(concept.topic)}`;
      checkPageBreak(18);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 41, 59);
      doc.text(topicTitle, margin, y);
      y += 4.5;

      if (concept.summary) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(71, 85, 105);
        const sumLines = doc.splitTextToSize(cleanMarkdown(concept.summary), contentWidth - 4);
        checkPageBreak(sumLines.length * 3.8 + 2);
        doc.text(sumLines, margin + 2, y);
        y += sumLines.length * 3.8 + 2;
      }

      if (concept.bulletPoints && concept.bulletPoints.length > 0) {
        concept.bulletPoints.forEach((point) => {
          const ptClean = cleanMarkdown(point);
          const ptLines = doc.splitTextToSize(ptClean, contentWidth - 10);
          checkPageBreak(ptLines.length * 3.8 + 2);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(9);
          doc.setTextColor(37, 99, 235);
          doc.text('•', margin + 3, y);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text(ptLines, margin + 8, y);
          y += ptLines.length * 3.8 + 1.5;
        });
      }
      y += 3;
    });
  }

  // ====================================================================
  // 5. FORMULAS & RULES
  // ====================================================================
  if (data.formulas && data.formulas.length > 0) {
    checkPageBreak(25);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Key Formulas & Principles', margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    data.formulas.forEach((f) => {
      checkPageBreak(18);
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(margin, y, contentWidth, 14, 2, 2, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(cleanMarkdown(f.concept), margin + 4, y + 5);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(29, 78, 216);
      doc.text(`Formula: ${cleanMarkdown(f.formula)}`, margin + 4, y + 10);

      if (f.siUnit) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`SI Unit: ${cleanMarkdown(f.siUnit)}`, pageWidth - margin - 4, y + 5, {
          align: 'right',
        });
      }

      if (f.takeaway) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(cleanMarkdown(f.takeaway), pageWidth - margin - 4, y + 10, { align: 'right' });
      }

      y += 17;
    });
    y += 2;
  }

  // ====================================================================
  // 6. REAL-WORLD ANALOGY
  // ====================================================================
  if (data.realWorldAnalogy) {
    const storyLines = doc.splitTextToSize(
      cleanMarkdown(data.realWorldAnalogy.story),
      contentWidth - 14
    );
    const boxHeight = storyLines.length * 4 + 20;

    checkPageBreak(boxHeight + 4);

    doc.setFillColor(254, 252, 232); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2.5, 2.5, 'FD');

    // Left amber accent bar
    doc.setFillColor(217, 119, 6); // amber-600
    doc.roundedRect(margin, y, 2.5, boxHeight, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text(`THINK OF IT LIKE THIS: ${cleanMarkdown(data.realWorldAnalogy.title)}`, margin + 6, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(69, 26, 3);
    doc.text(storyLines, margin + 6, y + 11);

    if (data.realWorldAnalogy.takeaway) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 83, 9);
      doc.text(
        `Core Takeaway: ${cleanMarkdown(data.realWorldAnalogy.takeaway)}`,
        margin + 6,
        y + boxHeight - 4
      );
    }

    y += boxHeight + 8;
  }

  // ====================================================================
  // 7. QUESTIONS & STEP-BY-STEP SOLUTIONS
  // ====================================================================
  if (data.questionsList && data.questionsList.length > 0) {
    checkPageBreak(18);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`3. Questions & Step-by-Step Solutions (${data.questionsList.length})`, margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;

    data.questionsList.forEach((q, qIdx) => {
      const qText = cleanMarkdown(q.questionText);
      const qLines = doc.splitTextToSize(qText, contentWidth - 12);
      const qHeaderHeight = qLines.length * 4.2 + 13;

      checkPageBreak(qHeaderHeight + 25);

      // Question Container Card
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(margin, y, contentWidth, qHeaderHeight, 2, 2, 'FD');

      // Question Badge
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(37, 99, 235);
      doc.text(`Question ${q.questionNumber || qIdx + 1}:`, margin + 4, y + 5.5);

      // Difficulty Pill
      const diff = q.difficulty || 'Medium';
      doc.setFontSize(7.5);
      if (diff === 'Easy') {
        doc.setTextColor(22, 101, 52); // green
      } else if (diff === 'Hard') {
        doc.setTextColor(185, 28, 28); // red
      } else {
        doc.setTextColor(180, 83, 9); // amber
      }
      doc.text(`[${diff} Difficulty]`, pageWidth - margin - 4, y + 5.5, { align: 'right' });

      // Question Text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(qLines, margin + 4, y + 10.5);

      y += qHeaderHeight + 3;

      // Formula / Rule if present
      if (q.formulaUsed) {
        checkPageBreak(8);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(`Formula / Theorem: ${cleanMarkdown(q.formulaUsed)}`, margin + 4, y);
        y += 4.5;
      }

      // Step-by-Step Breakdown
      if (q.steps && q.steps.length > 0) {
        checkPageBreak(10);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(71, 85, 105);
        doc.text('Step-by-Step Solution:', margin + 4, y);
        y += 4.5;

        q.steps.forEach((step, sIdx) => {
          const stepClean = cleanMarkdown(step);
          const stepLines = doc.splitTextToSize(stepClean, contentWidth - 18);
          checkPageBreak(stepLines.length * 3.8 + 2);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(37, 99, 235);
          doc.text(`Step ${sIdx + 1}:`, margin + 6, y);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(51, 65, 85);
          doc.text(stepLines, margin + 20, y);
          y += stepLines.length * 3.8 + 1.5;
        });
      }

      // Final Answer Box
      if (q.finalAnswer) {
        const ansClean = cleanMarkdown(q.finalAnswer);
        const ansLines = doc.splitTextToSize(ansClean, contentWidth - 20);
        const ansBoxHeight = ansLines.length * 4 + 7;

        checkPageBreak(ansBoxHeight + 4);

        doc.setFillColor(240, 253, 244); // green-50
        doc.setDrawColor(187, 247, 208); // green-200
        doc.roundedRect(margin + 4, y, contentWidth - 8, ansBoxHeight, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(22, 101, 52); // green-800
        doc.text('Final Answer:', margin + 8, y + 4.8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(21, 128, 61);
        doc.text(ansLines, margin + 8, y + 9.2);

        y += ansBoxHeight + 6;
      }

      y += 4;
    });
  }

  // ====================================================================
  // 8. EXAM REVISION TIPS
  // ====================================================================
  if (data.examTips && data.examTips.length > 0) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('4. Board Exam Takeaways & Tips', margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;

    data.examTips.forEach((tip) => {
      const tipClean = cleanMarkdown(tip);
      const tipLines = doc.splitTextToSize(tipClean, contentWidth - 10);
      checkPageBreak(tipLines.length * 3.8 + 2);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(234, 88, 12);
      doc.text('★', margin + 3, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      doc.text(tipLines, margin + 8, y);
      y += tipLines.length * 3.8 + 1.5;
    });
    y += 6;
  }

  // ====================================================================
  // FOOTER NUMBERING ACROSS ALL PAGES
  // ====================================================================
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      'StudyBot AI · India’s #1 CBSE & State Board Learning Assistant',
      margin,
      pageHeight - 8
    );
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right',
    });
  }

  // Download PDF file
  const safeSubject = cleanMarkdown(data.subject).replace(/[^a-zA-Z0-9]/g, '_');
  const safeChapter = cleanMarkdown(data.chapterTitle).replace(/[^a-zA-Z0-9]/g, '_');
  const filename = `StudyBot_${safeSubject}_${safeChapter}_Solutions.pdf`;
  doc.save(filename);
}
