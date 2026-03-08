import { Team, Game } from '../context/TournamentContext';

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

function escapeXML(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + '…' : str;
}

function rankLabel(rank: number): string {
  const s: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
  return `${rank}${s[rank] ?? 'th'}`;
}

const PDF_COLORS = {
  bg: '#080c1a',
  headerBg: '#0d1226',
  rowEven: '#0d1224',
  rowOdd: '#0a0f1e',
  gold: '#FFD700',
  silver: '#C0C0C0',
  bronze: '#CD7F32',
  scoreGreen: '#5be8a8',
  text: '#dde4f5',
  subText: '#6a7a9f',
  border: '#1e2845',
};

const RANK_COLORS: Record<number, string> = {
  1: PDF_COLORS.gold,
  2: PDF_COLORS.silver,
  3: PDF_COLORS.bronze,
};

// ── Canvas → PDF ─────────────────────────────────────────────────────────────

function buildPDFFromCanvas(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const imgBytes = atob(base64);
        const imgLen = imgBytes.length;
        const W = canvas.width, H = canvas.height;
        const ptW = 595;
        const ptH = Math.round((H / W) * ptW);
        const enc = new TextEncoder();
        const parts: Uint8Array[] = [];
        const offsets: number[] = [];
        let byteLen = 0;

        const push = (s: string) => { const b = enc.encode(s); parts.push(b); byteLen += b.length; };
        const pushBytes = (b: Uint8Array) => { parts.push(b); byteLen += b.length; };

        push('%PDF-1.4\n');
        offsets.push(byteLen); push(`1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n`);
        offsets.push(byteLen); push(`2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n`);
        offsets.push(byteLen); push(`3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 ${ptW} ${ptH}]/Contents 4 0 R/Resources<</XObject<</I 5 0 R>>>>>>endobj\n`);
        const content = `q ${ptW} 0 0 ${ptH} 0 0 cm /I Do Q`;
        offsets.push(byteLen); push(`4 0 obj<</Length ${content.length}>>\nstream\n${content}\nendstream\nendobj\n`);
        offsets.push(byteLen);
        push(`5 0 obj<</Type/XObject/Subtype/Image/Width ${W}/Height ${H}/ColorSpace/DeviceRGB/BitsPerComponent 8/Filter/DCTDecode/Length ${imgLen}>>\nstream\n`);
        const imgData = new Uint8Array(imgLen);
        for (let i = 0; i < imgLen; i++) imgData[i] = imgBytes.charCodeAt(i);
        pushBytes(imgData);
        push(`\nendstream\nendobj\n`);

        const xrefOffset = byteLen;
        const xrefLines = offsets.map(o => String(o).padStart(10, '0') + ' 00000 n \n').join('');
        push(`xref\n0 6\n0000000000 65535 f \n${xrefLines}trailer<</Size 6/Root 1 0 R>>\nstartxref\n${xrefOffset}\n%%EOF`);

        const total = new Uint8Array(byteLen);
        let off = 0;
        for (const p of parts) { total.set(p, off); off += p.length; }
        resolve(total);
      };
      reader.readAsDataURL(blob);
    }, 'image/jpeg', 0.95);
  });
}

function drawHeader(ctx: CanvasRenderingContext2D, W: number, title: string, subtitle: string, accent: string, teamCount: number) {
  ctx.fillStyle = PDF_COLORS.headerBg;
  ctx.fillRect(0, 0, W, 90);
  ctx.fillStyle = accent;
  ctx.font = 'bold 22px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, W / 2, 32);
  ctx.fillStyle = '#9CA3AF';
  ctx.font = 'bold 12px Georgia, serif';
  ctx.fillText(subtitle, W / 2, 54);
  ctx.fillStyle = PDF_COLORS.subText;
  ctx.font = '11px monospace';
  ctx.fillText(`Exported: ${new Date().toLocaleString()}  ·  ${teamCount} teams`, W / 2, 74);
  ctx.strokeStyle = PDF_COLORS.border;
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(30, 90); ctx.lineTo(W - 30, 90); ctx.stroke();
}

function drawFooter(ctx: CanvasRenderingContext2D, W: number, footerY: number, text: string) {
  ctx.fillStyle = '#0c1126';
  ctx.fillRect(0, footerY, W, 40);
  ctx.fillStyle = PDF_COLORS.subText;
  ctx.font = '11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(text, W / 2, footerY + 24);
}

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW — all rounds combined
// ══════════════════════════════════════════════════════════════════════════════

export type OverviewAllRoundsEntry = {
  team: Team;
  roundTotals: { roundName: string; total: number }[];
  grandTotal: number;
};

export function exportOverviewXML(entries: OverviewAllRoundsEntry[], eventName = 'FASTATHON'): void {
  const sorted = [...entries].sort((a, b) => b.grandTotal - a.grandTotal);

  const teamNodes = sorted.map((e, i) => {
    const roundNodes = e.roundTotals
      .map(r => `      <round name="${escapeXML(r.roundName)}" total="${r.total}" />`)
      .join('\n');
    return `  <team rank="${i + 1}" id="${escapeXML(e.team.id)}">
    <n>${escapeXML(e.team.name)}</n>
    <grandTotal>${e.grandTotal}</grandTotal>
    <rounds>\n${roundNodes}\n    </rounds>
  </team>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<leaderboard event="${escapeXML(eventName)}" type="overview" exportedAt="${new Date().toISOString()}" totalTeams="${entries.length}">
${teamNodes}
</leaderboard>`;

  triggerDownload(new Blob([xml], { type: 'application/xml;charset=utf-8' }), `${slugify(eventName)}_overview_all_rounds.xml`);
}

export async function exportOverviewPDF(entries: OverviewAllRoundsEntry[], eventName = 'FASTATHON'): Promise<void> {
  const sorted = [...entries].sort((a, b) => b.grandTotal - a.grandTotal);
  const roundNames = entries[0]?.roundTotals.map(r => r.roundName) ?? [];

  const W = 860, ROW_H = 50, HEADER_H = 90, TABLE_HEAD_H = 36, FOOTER_H = 40;
  const H = HEADER_H + TABLE_HEAD_H + sorted.length * ROW_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = PDF_COLORS.bg; ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, W, eventName, 'GLOBAL RANKINGS — ALL ROUNDS', PDF_COLORS.gold, sorted.length);

  ctx.fillStyle = '#111827'; ctx.fillRect(0, HEADER_H, W, TABLE_HEAD_H);
  ctx.fillStyle = PDF_COLORS.subText; ctx.font = 'bold 11px monospace';

  const colRank = 30, colName = 90, colRounds = 290, colTotal = 790;
  const roundColW = (colTotal - colRounds - 40) / roundNames.length;

  ctx.textAlign = 'left';
  ctx.fillText('RANK', colRank, HEADER_H + 22);
  ctx.fillText('TEAM', colName, HEADER_H + 22);
  roundNames.forEach((rn, i) => {
    ctx.textAlign = 'center';
    ctx.fillText(rn.toUpperCase(), colRounds + i * roundColW + roundColW / 2, HEADER_H + 22);
  });
  ctx.textAlign = 'center';
  ctx.fillText('GRAND TOTAL', colTotal, HEADER_H + 22);

  sorted.forEach(({ team, roundTotals, grandTotal }, i) => {
    const rank = i + 1;
    const y = HEADER_H + TABLE_HEAD_H + i * ROW_H;
    const rankColor = RANK_COLORS[rank] ?? PDF_COLORS.subText;
    const midY = y + ROW_H / 2 + 5;

    ctx.fillStyle = i % 2 === 0 ? PDF_COLORS.rowEven : PDF_COLORS.rowOdd;
    ctx.fillRect(0, y, W, ROW_H);
    if (rank <= 3) { ctx.fillStyle = rankColor; ctx.fillRect(0, y, 3, ROW_H); }

    ctx.fillStyle = rankColor; ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(rankLabel(rank), colRank, midY);

    ctx.fillStyle = rank <= 3 ? rankColor : PDF_COLORS.text; ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(truncate(team.name, 18), colName, midY);

    roundTotals.forEach((rt, ri) => {
      ctx.fillStyle = '#a78bfa'; ctx.font = '13px monospace'; ctx.textAlign = 'center';
      ctx.fillText(rt.total.toLocaleString(), colRounds + ri * roundColW + roundColW / 2, midY);
    });

    ctx.fillStyle = PDF_COLORS.scoreGreen; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
    ctx.fillText(grandTotal.toLocaleString(), colTotal, midY);

    ctx.strokeStyle = PDF_COLORS.border; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke();
  });

  drawFooter(ctx, W, HEADER_H + TABLE_HEAD_H + sorted.length * ROW_H, `${eventName} · Overview · All Rounds · ${new Date().toLocaleDateString()}`);

  const pdfBytes = await buildPDFFromCanvas(canvas);
  triggerDownload(new Blob([pdfBytes], { type: 'application/pdf' }), `${slugify(eventName)}_overview_all_rounds.pdf`);
}

// ══════════════════════════════════════════════════════════════════════════════
// GAME — specific game, all rounds
// ══════════════════════════════════════════════════════════════════════════════

export type GameAllRoundsEntry = {
  team: Team;
  roundScores: { roundName: string; score: number }[];
  total: number;
};

export function exportGameXML(entries: GameAllRoundsEntry[], game: Game, eventName = 'FASTATHON'): void {
  const sorted = [...entries].sort((a, b) => b.total - a.total);

  const teamNodes = sorted.map((e, i) => {
    const roundNodes = e.roundScores
      .map(r => `      <round name="${escapeXML(r.roundName)}" score="${r.score}" />`)
      .join('\n');
    return `  <team rank="${i + 1}" id="${escapeXML(e.team.id)}">
    <n>${escapeXML(e.team.name)}</n>
    <totalScore>${e.total}</totalScore>
    <rounds>\n${roundNodes}\n    </rounds>
  </team>`;
  }).join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<leaderboard event="${escapeXML(eventName)}" game="${escapeXML(game.name)}" type="game" exportedAt="${new Date().toISOString()}" totalTeams="${entries.length}">
${teamNodes}
</leaderboard>`;

  triggerDownload(new Blob([xml], { type: 'application/xml;charset=utf-8' }), `${slugify(eventName)}_${slugify(game.name)}_all_rounds.xml`);
}

export async function exportGamePDF(entries: GameAllRoundsEntry[], game: Game, eventName = 'FASTATHON'): Promise<void> {
  const sorted = [...entries].sort((a, b) => b.total - a.total);
  const roundNames = entries[0]?.roundScores.map(r => r.roundName) ?? [];

  const W = 800, ROW_H = 50, HEADER_H = 90, TABLE_HEAD_H = 36, FOOTER_H = 40;
  const H = HEADER_H + TABLE_HEAD_H + sorted.length * ROW_H + FOOTER_H;

  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = PDF_COLORS.bg; ctx.fillRect(0, 0, W, H);
  drawHeader(ctx, W, `${eventName} · ${game.name}`, 'INDIVIDUAL EVENT RANKINGS — ALL ROUNDS', game.color, sorted.length);

  ctx.fillStyle = '#111827'; ctx.fillRect(0, HEADER_H, W, TABLE_HEAD_H);
  ctx.fillStyle = PDF_COLORS.subText; ctx.font = 'bold 11px monospace';

  const colRank = 30, colName = 90, colRounds = 270, colTotal = 720;
  const roundColW = (colTotal - colRounds - 40) / roundNames.length;

  ctx.textAlign = 'left';
  ctx.fillText('RANK', colRank, HEADER_H + 22);
  ctx.fillText('TEAM', colName, HEADER_H + 22);
  roundNames.forEach((rn, i) => {
    ctx.textAlign = 'center';
    ctx.fillText(rn.toUpperCase(), colRounds + i * roundColW + roundColW / 2, HEADER_H + 22);
  });
  ctx.textAlign = 'center';
  ctx.fillText('TOTAL', colTotal, HEADER_H + 22);

  sorted.forEach(({ team, roundScores, total }, i) => {
    const rank = i + 1;
    const y = HEADER_H + TABLE_HEAD_H + i * ROW_H;
    const rankColor = RANK_COLORS[rank] ?? PDF_COLORS.subText;
    const midY = y + ROW_H / 2 + 5;

    ctx.fillStyle = i % 2 === 0 ? PDF_COLORS.rowEven : PDF_COLORS.rowOdd;
    ctx.fillRect(0, y, W, ROW_H);
    if (rank <= 3) { ctx.fillStyle = rankColor; ctx.fillRect(0, y, 3, ROW_H); }

    ctx.fillStyle = rankColor; ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText(rankLabel(rank), colRank, midY);

    ctx.fillStyle = rank <= 3 ? rankColor : PDF_COLORS.text; ctx.font = 'bold 13px Georgia, serif';
    ctx.fillText(truncate(team.name, 18), colName, midY);

    roundScores.forEach((rs, ri) => {
      ctx.fillStyle = game.color; ctx.font = '13px monospace'; ctx.textAlign = 'center';
      ctx.fillText(rs.score.toLocaleString(), colRounds + ri * roundColW + roundColW / 2, midY);
    });

    ctx.fillStyle = PDF_COLORS.scoreGreen; ctx.font = 'bold 15px monospace'; ctx.textAlign = 'center';
    ctx.fillText(total.toLocaleString(), colTotal, midY);

    ctx.strokeStyle = PDF_COLORS.border; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(W, y + ROW_H); ctx.stroke();
  });

  drawFooter(ctx, W, HEADER_H + TABLE_HEAD_H + sorted.length * ROW_H, `${eventName} · ${game.name} · All Rounds · ${new Date().toLocaleDateString()}`);

  const pdfBytes = await buildPDFFromCanvas(canvas);
  triggerDownload(new Blob([pdfBytes], { type: 'application/pdf' }), `${slugify(eventName)}_${slugify(game.name)}_all_rounds.pdf`);
}
