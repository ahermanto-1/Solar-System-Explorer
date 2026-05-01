export class Sparkline {
  canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private values: number[] = [];
  private max = 64;
  color: string;

  constructor(color = "#5EE7E0") {
    this.canvas = document.createElement("canvas");
    this.canvas.width = 240;
    this.canvas.height = 38;
    this.ctx = this.canvas.getContext("2d")!;
    this.color = color;
  }

  push(v: number) {
    this.values.push(v);
    if (this.values.length > this.max) this.values.shift();
    this.draw();
  }

  private draw() {
    const { ctx, canvas, values } = this;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (values.length < 2) return;
    let lo = Infinity, hi = -Infinity;
    for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
    if (hi === lo) { hi = lo + 1; }
    ctx.beginPath();
    for (let i = 0; i < values.length; i++) {
      const x = (i / (this.max - 1)) * w;
      const y = h - ((values[i] - lo) / (hi - lo)) * (h - 4) - 2;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Fill under
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, this.color + "40");
    grad.addColorStop(1, this.color + "00");
    ctx.fillStyle = grad;
    ctx.fill();
  }
}
