import QRCode from 'qrcode';
import type { BusPassRecord } from '../types';

export function buildTicketUrl(pass: BusPassRecord): string {
  const origin =
    typeof window !== 'undefined' ? window.location.origin : '';
  const params = new URLSearchParams({
    view: 'ticket',
    appId: String(pass.applicationID),
    studentId: pass.studentID,
    name: pass.name,
    dept: pass.department,
    route: pass.route,
    stop: pass.boardingPoint,
    type: pass.passType,
    valid: pass.validity,
    status: pass.status,
  });
  return `${origin}/?${params.toString()}`;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
}

export async function generateDigitalTicketImage(
  pass: BusPassRecord
): Promise<string> {
  if (typeof document === 'undefined') {
    return '';
  }

  const width = 960;
  const height = 560;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return '';
  }

  // Background card
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 0, 0, width, height, 28);
  ctx.fill();

  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 4;
  drawRoundedRect(ctx, 2, 2, width - 4, height - 4, 28);
  ctx.stroke();

  // Top Navy Header
  ctx.save();
  drawRoundedRect(ctx, 0, 0, width, 118, 28);
  ctx.clip();
  ctx.fillStyle = '#111C35';
  ctx.fillRect(0, 0, width, 118);
  ctx.restore();

  // Bottom border under header so rounded top stays sharp
  ctx.fillStyle = '#111C35';
  ctx.fillRect(0, 90, width, 28);

  // App Logo Badge (exact original white/navy/orange design)
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, 36, 28, 60, 60, 14);
  ctx.fill();
  try {
    const logoImg = await loadImage(
      '/assets/aistudio/Gemini_Generated_Image_ujd0k6ujd0k6ujd0_e4a283ea.png'
    );
    ctx.save();
    drawRoundedRect(ctx, 36, 28, 60, 60, 14);
    ctx.clip();
    ctx.drawImage(logoImg, 32, 24, 68, 68);
    ctx.restore();
  } catch {
    // Fallback text if logo fails to load offline
    ctx.fillStyle = '#111C35';
    ctx.font = 'bold 14px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BUS', 66, 63);
    ctx.textAlign = 'left';
  }

  // Header titles
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 26px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('BUSPASS DIGITAL TRANSIT CARD', 114, 56);

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '600 15px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('SRM UNIVERSITY AP · OFFICIAL SHUTTLE PASS', 114, 83);

  // Application ID right-aligned
  ctx.textAlign = 'right';
  ctx.fillStyle = '#CBD5E1';
  ctx.font = '500 14px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('Application ID', width - 36, 48);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`#${pass.applicationID}`, width - 36, 80);
  ctx.textAlign = 'left';

  // Student Name & Status Badge
  const studentName = (pass.name || 'Student').trim();
  ctx.fillStyle = '#111C35';
  ctx.font = 'bold 34px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText(studentName, 36, 182, 560);

  const nameWidth = Math.min(ctx.measureText(studentName).width, 560);
  const statusText = (pass.status || 'Pending').toUpperCase();
  const statusColors =
    pass.status === 'Approved'
      ? { bg: '#ECFDF5', border: '#A7F3D0', text: '#047857' }
      : pass.status === 'Rejected'
        ? { bg: '#FFF1F2', border: '#FECDD3', text: '#BE123C' }
        : { bg: '#FFFBEB', border: '#FDE68A', text: '#B45309' };

  const badgeX = Math.min(36 + nameWidth + 18, 520);
  const badgeY = 152;
  ctx.font = 'bold 14px Inter, system-ui, -apple-system, sans-serif';
  const badgeW = ctx.measureText(statusText).width + 28;
  ctx.fillStyle = statusColors.bg;
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, 34, 10);
  ctx.fill();
  ctx.strokeStyle = statusColors.border;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.fillStyle = statusColors.text;
  ctx.fillText(statusText, badgeX + 14, badgeY + 22);

  // Student ID & Department row
  ctx.fillStyle = '#475569';
  ctx.font = '500 17px Inter, system-ui, -apple-system, sans-serif';
  const idText = `Student ID: ${pass.studentID || 'N/A'}   ·   Department: ${
    pass.department || 'SRM University AP'
  }`;
  ctx.fillText(idText, 36, 224, 590);

  // Divider line on left section
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(36, 250);
  ctx.lineTo(640, 250);
  ctx.stroke();

  // Four Pass Detail Boxes (2x2 grid)
  const boxes = [
    {
      label: 'Route Number',
      value: pass.route?.trim() || 'Not Assigned',
      color: '#2563EB',
      mono: true,
    },
    {
      label: 'Boarding Point',
      value: pass.boardingPoint?.trim() || 'Not Assigned',
      color: '#111C35',
      mono: false,
    },
    {
      label: 'Pass Type',
      value: pass.passType?.trim() || 'Not Assigned',
      color: '#111C35',
      mono: false,
    },
    {
      label: 'Valid Until',
      value: pass.validity?.trim() || 'Not Assigned',
      color: '#111C35',
      mono: true,
    },
  ];

  const boxW = 290;
  const boxH = 88;
  const gapX = 24;
  const gapY = 20;
  const startX = 36;
  const startY = 274;

  boxes.forEach((box, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const bx = startX + col * (boxW + gapX);
    const by = startY + row * (boxH + gapY);

    ctx.fillStyle = '#F8FAFC';
    drawRoundedRect(ctx, bx, by, boxW, boxH, 14);
    ctx.fill();
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#64748B';
    ctx.font = '600 14px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText(box.label, bx + 18, by + 30);

    ctx.fillStyle = box.color;
    ctx.font = box.mono
      ? 'bold 22px ui-monospace, SFMono-Regular, Menlo, monospace'
      : 'bold 21px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText(box.value, bx + 18, by + 64, boxW - 36);
  });

  // Right-side QR Card
  const qrBoxX = 674;
  const qrBoxY = 152;
  const qrBoxW = 250;
  const qrBoxH = 318;
  ctx.fillStyle = '#F8FAFC';
  drawRoundedRect(ctx, qrBoxX, qrBoxY, qrBoxW, qrBoxH, 20);
  ctx.fill();
  ctx.strokeStyle = '#CBD5E1';
  ctx.lineWidth = 2;
  ctx.stroke();

  const ticketUrl = buildTicketUrl(pass);
  const qrDataUrl = await QRCode.toDataURL(ticketUrl, {
    width: 440,
    margin: 2,
    errorCorrectionLevel: 'M',
    color: {
      dark: '#111C35',
      light: '#FFFFFF',
    },
  });

  const qrImg = await loadImage(qrDataUrl);
  ctx.fillStyle = '#FFFFFF';
  drawRoundedRect(ctx, qrBoxX + 20, qrBoxY + 20, 210, 210, 14);
  ctx.fill();
  ctx.drawImage(qrImg, qrBoxX + 25, qrBoxY + 25, 200, 200);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#2563EB';
  ctx.font = 'bold 14px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('SCAN QR TO VERIFY', qrBoxX + qrBoxW / 2, qrBoxY + 266);
  ctx.fillStyle = '#64748B';
  ctx.font = '500 12px ui-monospace, SFMono-Regular, Menlo, monospace';
  ctx.fillText(`PASS #${pass.applicationID}`, qrBoxX + qrBoxW / 2, qrBoxY + 292);
  ctx.textAlign = 'left';

  // Footer strip
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(36, 496);
  ctx.lineTo(width - 36, 496);
  ctx.stroke();

  ctx.fillStyle = '#64748B';
  ctx.font = '500 14px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText(
    pass.status === 'Approved'
      ? 'Valid for boarding SRM University AP campus shuttle buses along the assigned route.'
      : 'Pending Transport Administrator approval.',
    36,
    528
  );

  ctx.textAlign = 'right';
  ctx.fillStyle = '#111C35';
  ctx.font = 'bold 14px Inter, system-ui, -apple-system, sans-serif';
  ctx.fillText('SRM AP TRANSPORT DESK', width - 36, 528);
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}
