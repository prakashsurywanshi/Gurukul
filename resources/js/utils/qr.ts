import QRCode from 'qrcode-generator';

export function qrSvgToken(value: string, size = 88): string {
    const qr = QRCode(0, 'M');
    qr.addData(value);
    qr.make();

    const svg = qr.createSvgTag({ cellSize: 4, margin: 2 });

    return svg.replace(/width="[^"]*"/, `width="${size}"`).replace(/height="[^"]*"/, `height="${size}"`);
}
