import QRCode from 'qrcode';
export const DEFAULT_URL = 'https://lu.ma/unwind-chennai';
export function validEventUrl(value: string): string | null {
  try { const u = new URL(value); if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || value.length > 700) return null; return u.href; } catch { return null; }
}
export function generateQRMatrix(url: string) {
  if (!validEventUrl(url)) throw new Error('Enter a complete http or https event link (up to 700 characters).');
  const automatic = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const qr = automatic.modules.size < 33 ? QRCode.create(url, { errorCorrectionLevel: 'H', version: 4 }) : automatic;
  return {size: qr.modules.size, data: Array.from(qr.modules.data)};
}
export function isFinder(x: number, y: number, n: number) { return (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7); }
export function drawQR(canvas: HTMLCanvasElement, url: string, width = 1024) {
  const {size, data} = generateQRMatrix(url); const unit = Math.floor(width / (size + 8));
  canvas.width = canvas.height = unit * (size + 8); const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) if(data[y*size+x]) { ctx.fillStyle = isFinder(x,y,size) ? '#263c80' : '#651d3d'; ctx.fillRect((x+4)*unit,(y+4)*unit,unit,unit); }
  return canvas;
}
