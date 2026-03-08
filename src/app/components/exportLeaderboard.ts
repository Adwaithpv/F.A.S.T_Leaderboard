import { Team, Game } from '../context/TournamentContext';

export type LeaderboardEntry = {
  rank: number;
  team: Team;
  total: number;
  breakdown: { game: Game; score: number }[];
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function slugify(s: string) {
  return s.toLowerCase().replace(/\s+/g, '_');
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── XML Export ───────────────────────────────────────────────────────────────

function escapeXML(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function exportToXML(
  entries: LeaderboardEntry[],
  roundName: string,
  eventName = 'HackClub Hackathon'
): void {
  const timestamp = new Date().toISOString();

  const teamNodes = entries
    .map(({ rank, team, total, breakdown }) => {
      const gameNodes = breakdown
        .map(
          ({ game, score }) =>
            `      <game id="${escapeXML(game.id)}" name="${escapeXML(game.name)}" score="${score}" />`
        )
        .join('\n');

      return `  <team rank="${rank}" id="${escapeXML(team.id)}">
    <name>${escapeXML(team.name)}</name>
    <totalScore>${total}</totalScore>
    <games>
${gameNodes}
    </games>
  </team>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<leaderboard
  event="${escapeXML(eventName)}"
  round="${escapeXML(roundName)}"
  exportedAt="${timestamp}"
  totalTeams="${entries.length}"
>
${teamNodes}
</leaderboard>`;

  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  triggerDownload(blob, `${slugify(eventName)}_${slugify(roundName)}_results.xml`);
}

// ── PDF Export (canvas-based, zero dependencies) ─────────────────────────────

const PDF_COLORS = {
  bg: '#080c1a',
  headerBg: '#0d1226',
  rowEven: '#0d1224',
  rowOdd: '#0a0f1e',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  accent: '#76B900',
  scoreGreen: '#5be8a8',
  mutedBlue: '#7a8dbb',
  text: '#dde4f5',
  subText: '#6a7a9f',
  border: '#1e2845',
};

const RANK_COLORS: Record<number, string> = {
  1: PDF_COLORS.gold,
  2: PDF_COLORS.silver,
  3: PDF_COLORS.bronze,
};

function rankLabel(rank: number): string {
  const suffixes: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${rank}${suffixes[rank] ?? 'th'}`;
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function buildPDFFromPNG(pngBase64: string, canvasW: number, canvasH: number): Uint8Array {
  const imgBytes = atob(pngBase64);
  const imgLen = imgBytes.length;
  const ptW = 595;
  const ptH = Math.round((canvasH / canvasW) * ptW);
  const enc = new TextEncoder();

  const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /I Do Q`;

  // We'll track byte offsets for xref
  const parts: (Uint8Array | string)[] = [];
  const offsets: number[] = [];
  let byteLen = 0;

  const push = (s: string) => {
    const b = enc.encode(s);
    parts.push(b);
    byteLen += b.length;
  };

  push('%PDF-1.4\n');
  offsets.push(byteLen);
  push(`1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n`);
  offsets.push(byteLen);
  push(`2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n`);
  offsets.push(byteLen);
  push(`3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${ptW} ${ptH}]/Contents 4 0 R/Resources<</XObject<</I 5 0 R>>>>>>endobj\n`);
  offsets.push(byteLen);
  push(`4 0 obj<</Length ${content.length}>>\nstream\n${content}\nendstream\nendobj\n`);

  // Image object
  offsets.push(byteLen);
  const imgHeader = `5 0 obj<</Type/XObject/Subtype/Image/Width ${canvasW}/Height ${canvasH}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${imgLen}>>\nstream\n`;
  push(imgHeader);
  const imgData = new Uint8Array(imgLen);
  for (let i = 0; i < imgLen; i++) imgData[i] = imgBytes.charCodeAt(i);
  parts.push(imgData);
  byteLen += imgData.length;
  push(`\nendstream\nendobj\n`);

  const xrefOffset = byteLen;
  const xrefLines = offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
  push(`xref\n0 6\n0000000000 65535 f \n${xrefLines}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`);

  // Merge all parts
  const total = new Uint8Array(byteLen);
  let offset = 0;
  for (const part of parts) {
    const arr = typeof part === 'string' ? enc.encode(part) : part;
    total.set(arr, offset);
    offset += arr.length;
  }
  return total;
}

export function exportToPDF(
  entries: LeaderboardEntry[],
  roundName: string,
  eventName = 'HackClub Hackathon'
): void {
  const W = 820;
  const ROW_H = 48;
  const HEADER_H = 90;
  const TABLE_HEAD_H = 36;
  const FOOTER_H = 36;
  const H = HEADER_H + TABLE_HEAD_H + entries.length * ROW_H + FOOTER_H + 20;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = PDF_COLORS.bg;
  ctx.fillRect(0, 0, W, H);

  // Header
  ctx.fillStyle = PDF_COLORS.headerBg;
  ctx.fillRect(0, 0, W, HEADER_H);

  ctx.fillStyle = PDF_COLORS.gold;
  ctx.font = 'bold 24px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(eventName, W / 2, 34);

  ctx.fillStyle = PDF_COLORS.accent;
  ctx.font = 'bold 14px Georgia, serif';
  ctx.fillText(roundName, W / 2, 58);

  ctx.fillStyle = PDF_COLORS.subText;
  ctx.font = '12px monospace';
  ctx.fillText(`Exported: ${new Date().toLocaleString()}  ·  ${entries.length} teams`, W / 2, 78);

  // Separator line
  ctx.strokeStyle = PDF_COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, HEADER_H);
  ctx.lineTo(W - 30, HEADER_H);
  ctx.stroke();

  // Table header
  const COLS = { rank: 50, name: 200, games: 460, score: 680, pad: 30 };
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, HEADER_H, W, TABLE_HEAD_H);

  ctx.fillStyle = PDF_COLORS.subText;
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'left';

  const headers = [
    { label: 'RANK', x: COLS.pad },
    { label: 'TEAM', x: COLS.rank + 20 },
    { label: 'GAME BREAKDOWN', x: COLS.games - 220 },
    { label: 'TOTAL', x: COLS.score, align: 'center' as CanvasTextAlign },
  ];

  headers.forEach(h => {
    ctx.textAlign = h.align ?? 'left';
    ctx.fillText(h.label, h.x, HEADER_H + 22);
  });

  // Rows
  entries.forEach(({ rank, team, total, breakdown }, i) => {
    const y = HEADER_H + TABLE_HEAD_H + i * ROW_H;
    const rankColor = RANK_COLORS[rank] ?? PDF_COLORS.subText;

    ctx.fillStyle = i % 2 === 0 ? PDF_COLORS.rowEven : PDF_COLORS.rowOdd;
    ctx.fillRect(0, y, W, ROW_H);

    // Left accent bar for top 3
    if (rank <= 3) {
      ctx.fillStyle = rankColor;
      ctx.fillRect(0, y, 3, ROW_H);
    }

    const midY = y + ROW_H / 2 + 5;

    // Rank
    ctx.fillStyle = rankColor;
    ctx.font = `bold 14px Georgia, serif`;
    ctx.textAlign = 'left';
    ctx.fillText(rankLabel(rank), COLS.pad, midY);

    // Team name
    ctx.fillStyle = rank <= 3 ? rankColor : PDF_COLORS.text;
    ctx.font = 'bold 14px Georgia, serif';
    ctx.fillText(truncate(team.name, 20), COLS.rank + 20, midY);

    // Game breakdown — small colored dots + scores
    let gx = COLS.games - 220;
    breakdown.forEach(({ game, score }) => {
      ctx.fillStyle = game.color;
      ctx.font = 'bold 11px monospace';
      ctx.textAlign = 'left';
      const label = `${truncate(game.name, 10)}: ${score.toLocaleString()}`;
      ctx.fillText(label, gx, midY);
      gx += 148;
    });

    // Total score
    ctx.fillStyle = PDF_COLORS.scoreGreen;
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(total.toLocaleString(), COLS.score, midY);

    // Row separator
    ctx.strokeStyle = PDF_COLORS.border;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y + ROW_H);
    ctx.lineTo(W, y + ROW_H);
    ctx.stroke();
  });

  // Footer
  const footerY = HEADER_H + TABLE_HEAD_H + entries.length * ROW_H;
  ctx.fillStyle = '#0c1126';
  ctx.fillRect(0, footerY, W, FOOTER_H + 20);
  ctx.fillStyle = PDF_COLORS.subText;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(
    `${eventName} · ${roundName} · Admin Export · ${new Date().toLocaleDateString()}`,
    W / 2,
    footerY + 22
  );

  // Export canvas → JPEG → PDF
  canvas.toBlob(blob => {
    if (!blob) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      const pdfBytes = buildPDFFromPNG(base64, W, H);
      triggerDownload(
        new Blob([pdfBytes], { type: 'application/pdf' }),
        `${slugify(eventName)}_${slugify(roundName)}_results.pdf`
      );
    };
    reader.readAsDataURL(blob);
  }, 'image/jpeg', 0.95);
}
