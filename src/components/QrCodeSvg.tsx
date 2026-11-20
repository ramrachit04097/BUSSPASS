import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QrCodeSvgProps {
  payload: string;
  size?: number;
}

export function QrCodeSvg({ payload, size = 112 }: QrCodeSvgProps) {
  const [dataUrl, setDataUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(payload, {
      width: Math.max(size * 3, 320),
      margin: 2,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111C35',
        light: '#FFFFFF',
      },
    })
      .then((url) => {
        if (active) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (active) {
          setDataUrl('');
        }
      });
    return () => {
      active = false;
    };
  }, [payload, size]);

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[11px] text-slate-500"
      >
        Generating QR...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      alt="Digital Bus Pass Verification QR Code"
      className="block rounded-lg border border-slate-200 bg-white shrink-0"
    />
  );
}
