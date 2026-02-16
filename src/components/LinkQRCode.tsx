"use client";

import QRCode from "qrcode";
import { useEffect, useMemo, useState } from "react";

type LinkQRCodeProps = {
  value: string;
  slug: string;
  size?: number;
  className?: string;
  showActions?: boolean;
};

export function LinkQRCode({ value, slug, size = 128, className = "", showActions = false }: LinkQRCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    let cancelled = false;

    QRCode.toDataURL(value, {
      width: size,
      margin: 1,
      color: {
        dark: "#cba6f7",
        light: "#1e1e2e",
      },
    })
      .then((url) => {
        if (!cancelled) setDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setDataUrl(null);
      });

    return () => {
      cancelled = true;
    };
  }, [size, value]);

  const fileName = useMemo(() => `${slug}-target-qr.png`, [slug]);
  const canCopyImage =
    typeof navigator !== "undefined" &&
    !!navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined";

  const handleDownload = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const handleCopyImage = async () => {
    if (!dataUrl || !canCopyImage) return;

    try {
      const blob = await fetch(dataUrl).then((res) => res.blob());
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopyState("ok");
    } catch {
      setCopyState("fail");
    } finally {
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  return (
    <div className={className}>
      <div
        className="rounded-lg border border-ctp-surface0 bg-ctp-base overflow-hidden"
        style={{ width: size, height: size }}
      >
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`QR code for ${slug}`} width={size} height={size} className="block" />
        ) : (
          <div className="w-full h-full text-xs text-ctp-overlay0 grid place-items-center">QR unavailable</div>
        )}
      </div>

      {showActions && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="px-3 py-1.5 rounded-md border border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text hover:border-ctp-subtext0 disabled:opacity-50 transition-colors"
          >
            Download PNG
          </button>

          {canCopyImage && (
            <button
              onClick={handleCopyImage}
              disabled={!dataUrl}
              className="px-3 py-1.5 rounded-md border border-ctp-surface1 text-ctp-subtext1 hover:text-ctp-text hover:border-ctp-subtext0 disabled:opacity-50 transition-colors"
            >
              Copy image
            </button>
          )}

          {copyState === "ok" && <span className="text-green-400">Copied</span>}
          {copyState === "fail" && <span className="text-red-400">Copy failed</span>}
        </div>
      )}
    </div>
  );
}
