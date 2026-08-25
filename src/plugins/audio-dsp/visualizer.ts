import { AudioEngine } from './engine';

export class AudioVisualizer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animationId: number | null = null;
  private isRunning = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot get 2d context for visualizer canvas');
    this.ctx = context;
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.render();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private render = (): void => {
    if (!this.isRunning) return;

    const data = AudioEngine.getInstance().getFrequencyData();
    const width = this.canvas.width;
    const height = this.canvas.height;

    this.ctx.clearRect(0, 0, width, height);

    if (data && data.length > 0) {
      const barCount = 32;
      const barWidth = Math.floor(width / barCount) - 2;
      const step = Math.floor(data.length / barCount);

      for (let i = 0; i < barCount; i++) {
        const val = data[i * step] || 0;
        const barHeight = Math.max(2, (val / 255) * height);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Clean anti-slop high contrast red accent
        this.ctx.fillStyle = '#dc2626';
        this.ctx.fillRect(x, y, barWidth, barHeight);
      }
    }

    this.animationId = requestAnimationFrame(this.render);
  };
}
