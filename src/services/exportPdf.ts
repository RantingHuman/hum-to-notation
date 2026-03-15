import { jsPDF } from 'jspdf';

/**
 * Exports the VexFlow SVG notation element to a PDF and triggers download.
 * Strategy: serialise SVG → data-URL → Image → offscreen canvas → jsPDF.addImage
 */
export async function exportNotationToPdf(
  notationContainer: HTMLElement,
  projectName: string
): Promise<void> {
  const svgEl = notationContainer.querySelector('svg');
  if (!svgEl) throw new Error('No SVG element found in notation container');

  const svgWidth = svgEl.viewBox.baseVal.width || svgEl.clientWidth || 700;
  const svgHeight = svgEl.viewBox.baseVal.height || svgEl.clientHeight || 400;

  // Serialise SVG
  const serializer = new XMLSerializer();
  let svgStr = serializer.serializeToString(svgEl);
  // Ensure xmlns is present for standalone SVG
  if (!svgStr.includes('xmlns=')) {
    svgStr = svgStr.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  }
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
  const svgUrl = URL.createObjectURL(svgBlob);

  // Render to an offscreen canvas
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = svgUrl;
  });
  URL.revokeObjectURL(svgUrl);

  const canvas = document.createElement('canvas');
  const scale = 2; // 2× for retina-quality PDF
  canvas.width = svgWidth * scale;
  canvas.height = svgHeight * scale;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.scale(scale, scale);
  ctx.drawImage(img, 0, 0, svgWidth, svgHeight);

  const imgData = canvas.toDataURL('image/png');

  // Build PDF — A4 landscape if wide, portrait otherwise
  const pxPerMm = 3.7795; // 96 dpi
  const widthMm = Math.min(svgWidth / pxPerMm, 297);
  const orientation = widthMm > 180 ? 'landscape' : 'portrait';
  const pageWidthMm = orientation === 'landscape' ? 297 : 210;
  const pageHeightMm = orientation === 'landscape' ? 210 : 297;

  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

  // Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(projectName, 10, 12);

  const titleGap = 18;
  const imgWidthMm = Math.min(widthMm, pageWidthMm - 20);
  const imgHeightMm = (svgHeight / svgWidth) * imgWidthMm;

  // Paginate if tall
  const usableHeight = pageHeightMm - titleGap - 10;
  if (imgHeightMm <= usableHeight) {
    doc.addImage(imgData, 'PNG', 10, titleGap, imgWidthMm, imgHeightMm);
  } else {
    // Split into pages
    const rowHeightPx = (usableHeight / imgHeightMm) * (svgHeight * scale);
    const totalPages = Math.ceil((svgHeight * scale) / rowHeightPx);

    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();

      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = Math.min(rowHeightPx, canvas.height - page * rowHeightPx);
      const sliceCtx = sliceCanvas.getContext('2d')!;
      sliceCtx.fillStyle = '#ffffff';
      sliceCtx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      sliceCtx.drawImage(
        canvas,
        0, page * rowHeightPx, canvas.width, sliceCanvas.height,
        0, 0, sliceCanvas.width, sliceCanvas.height
      );

      const sliceData = sliceCanvas.toDataURL('image/png');
      const sliceHeightMm = (sliceCanvas.height / (svgWidth * scale)) * imgWidthMm;
      const yOffset = page === 0 ? titleGap : 10;
      doc.addImage(sliceData, 'PNG', 10, yOffset, imgWidthMm, sliceHeightMm);
    }
  }

  doc.save(`${projectName}.pdf`);
}
