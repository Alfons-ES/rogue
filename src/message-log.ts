import { Display } from 'rot-js';
import { Colors } from './colors';

export class Message {
    count: number;
    timestamp: Date;

    constructor(public plainText: string, public fg: Colors) {
        this.count = 1;
        this.timestamp = new Date(); // Used only for rendering, not .fullText
    }

    get fullText(): string {
        return this.count > 1
            ? `${this.plainText} (x${this.count})`
            : this.plainText;
    }
}

export class MessageLog {
    messages: Message[];

    constructor() {
        this.messages = [];
    }

    addMessage(text: string, fg: Colors = Colors.White, stack: boolean = true) {
        if (
            stack &&
            this.messages.length > 0 &&
            this.messages[this.messages.length - 1].plainText === text
        ) {
            this.messages[this.messages.length - 1].count++;
        } else {
            this.messages.push(new Message(text, fg));
        }
    } // do we want to stack messages? 

    renderMessages(
        display: Display,
        x: number,
        y: number,
        width: number,
        height: number,
        messages: Message[],
    ) {
        const visibleMessages = messages.slice(-height); // Only last N messages

        for (let i = 0; i < visibleMessages.length; i++) {
            const msg = visibleMessages[i];

            const ageIndex = visibleMessages.length - 1 - i;
            const fadeFactor = 1 - ageIndex / height;
            const fadedColor = this.fadeColor(msg.fg, fadeFactor);

            const timestamp = msg.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            const renderedText = `%c{${fadedColor}}[${timestamp}] ${msg.fullText}`;
            display.drawText(x, y + i, renderedText, width);
        }
    }
    private fadeColor(hex: string, factor: number): string {
        const clamped = Math.max(0, Math.min(factor, 1));
        const r = Math.round(parseInt(hex.slice(1, 3), 16) * clamped);
        const g = Math.round(parseInt(hex.slice(3, 5), 16) * clamped);
        const b = Math.round(parseInt(hex.slice(5, 7), 16) * clamped);
        return `rgb(${r},${g},${b})`;
    }
    render(
        display: Display,
        x: number,
        y: number,
        width: number,
        height: number,
    ) {
        this.renderMessages(display, x, y, width, height, this.messages);
    }
}

function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
    hex = hex.replace(/^#/, '');
    if (hex.length !== 6) return null;

    const bigint = parseInt(hex, 16);
    return {
        r: (bigint >> 16) & 255,
        g: (bigint >> 8) & 255,
        b: bigint & 255
    };
}

function rgbToHex(r: number, g: number, b: number): string {
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}