/**
 * TouchListener class to handle touch and mouse events on a canvas element.
 * It supports pressure sensitivity and smooth drawing.
 * This code is based on https://github.com/shuding/apple-pencil-safari-api-test
 */

import { type Ref, ref } from 'vue';

class TouchListener {
    private canvasRef: Ref<HTMLCanvasElement | null> = ref(null);
    private forceRef: Ref<HTMLElement | null> = ref(null);
    private touchRef: Ref<HTMLElement | null> = ref(null);
    private ctx: CanvasRenderingContext2D | null = null;

    private lineWidth: number = 0;
    private isMouseDown: boolean = false;
    private points: Array<{ x: number; y: number; lineWidth?: number; color?: string }> = [];
    private strokeHistory: Array<Array<{ x: number; y: number; lineWidth?: number; color?: string }>> = [];

    constructor(canvasRef: Ref<HTMLCanvasElement | null>, forceRef: Ref<HTMLElement | null>, touchRef: Ref<HTMLElement | null>) {
        this.canvasRef = canvasRef;
        this.forceRef = forceRef;
        this.touchRef = touchRef;

        if (!this.canvasRef.value) { return; }
        console.log("Canvas found");
        this.canvasRef.value.width = window.innerWidth * 2;
        this.canvasRef.value.height = window.innerHeight * 2;

        this.ctx = this.canvasRef.value.getContext('2d');

        if (this.ctx && this.canvasRef.value) {
            this.initializeTouchEvents();
        }
    }

    public drawOnCanvas(stroke: Array<{ x: number; y: number; lineWidth?: number; color?: string }>): void {
        if (!this.canvasRef.value || !this.ctx) return;

        this.ctx.strokeStyle = 'black';
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        const l = stroke.length - 1;
        if (stroke.length >= 3) {
            const xc = (stroke[l].x + stroke[l - 1].x) / 2;
            const yc = (stroke[l].y + stroke[l - 1].y) / 2;

            this.ctx.lineWidth = stroke[l - 1].lineWidth || 1;
            this.ctx.quadraticCurveTo(stroke[l - 1].x, stroke[l - 1].y, xc, yc);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(xc, yc);
        } else if (stroke.length > 0) {
            const point = stroke[l];
            this.ctx.lineWidth = point.lineWidth || 1;
            this.ctx.strokeStyle = point.color || 'black';
            this.ctx.beginPath();
            this.ctx.moveTo(point.x, point.y);
            this.ctx.lineTo(point.x, point.y);
            this.ctx.stroke();
        }
    }

    public undoDraw() {
        if (!this.canvasRef.value || !this.ctx) return;
        this.strokeHistory.pop();

        this.ctx.clearRect(0, 0, this.canvasRef.value.width, this.canvasRef.value.height);

        this.strokeHistory.forEach(stroke => {
            if (stroke.length === 0) return;
            this.ctx!.beginPath();
            let strokePath: Array<{ x: number; y: number; lineWidth?: number; color?: string }> = [];
            stroke.forEach((point) => {
                strokePath.push(point);
                this.drawOnCanvas(strokePath);
            });
        });
    }

    private initializeTouchEvents() {
        if (!this.touchRef.value || !this.canvasRef.value || !this.ctx) return;
        const canvas = this.canvasRef.value;
        const forceElem = this.forceRef.value;
        const touchElem = this.touchRef.value;

        for (const ev of ["touchstart", "mousedown"]) {
            canvas.addEventListener(ev, (e: any) => {
                let pressure = 0.1;
                let x, y;
                if (e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined") {
                    if (e.touches[0]["force"] > 0) {
                        pressure = e.touches[0]["force"];
                    }
                    x = e.touches[0].pageX * 2;
                    y = e.touches[0].pageY * 2;
                } else {
                    pressure = 1.0;
                    x = e.pageX * 2;
                    y = e.pageY * 2;
                }

                this.isMouseDown = true;
                this.lineWidth = Math.log(pressure + 1) * 40;
                this.ctx!.lineWidth = this.lineWidth;

                this.points.push({ x, y, lineWidth: this.lineWidth });
                this.drawOnCanvas(this.points);
            });
        }

        for (const ev of ["touchmove", "mousemove"]) {
            canvas.addEventListener(ev, (e: any) => {
                if (!this.isMouseDown) return;
                e.preventDefault();

                let pressure = 0.1;
                let x, y;
                if (e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined") {
                    if (e.touches[0]["force"] > 0) {
                        pressure = e.touches[0]["force"];
                    }
                    x = e.touches[0].pageX * 2;
                    y = e.touches[0].pageY * 2;
                } else {
                    pressure = 1.0;
                    x = e.pageX * 2;
                    y = e.pageY * 2;
                }

                // smoothen line width
                this.lineWidth = (Math.log(pressure + 1) * 40 * 0.2 + this.lineWidth * 0.8);
                this.points.push({ x, y, lineWidth: this.lineWidth });

                this.drawOnCanvas(this.points);

                requestIdleCallback(() => {
                    if (forceElem) forceElem.textContent = 'force = ' + pressure;

                    const touch = e.touches ? e.touches[0] : null;
                    if (touch && touchElem) {
                        touchElem.innerHTML = `
          touchType = ${touch.touchType} ${touch.touchType === 'direct' ? '👆' : '✍️'} <br/>
          radiusX = ${touch.radiusX} <br/>
          radiusY = ${touch.radiusY} <br/>
          rotationAngle = ${touch.rotationAngle} <br/>
          altitudeAngle = ${touch.altitudeAngle} <br/>
          azimuthAngle = ${touch.azimuthAngle} <br/>
        `;
                    }
                });
            });
        }

        for (const ev of ["touchend", "touchleave", "mouseup"]) {
            canvas.addEventListener(ev, (e: any) => {
                let pressure = 0.1;
                let x, y;

                if (e.touches && e.touches[0] && typeof e.touches[0]["force"] !== "undefined") {
                    if (e.touches[0]["force"] > 0) {
                        pressure = e.touches[0]["force"];
                    }
                    x = e.touches[0].pageX * 2;
                    y = e.touches[0].pageY * 2;
                } else {
                    pressure = 1.0;
                    x = e.pageX * 2;
                    y = e.pageY * 2;
                }

                this.isMouseDown = false;

                requestIdleCallback(() => {
                    this.strokeHistory.push([...this.points]);
                    this.points = [];
                });

                this.lineWidth = 0;
            });
        }
    }
}

export default TouchListener;