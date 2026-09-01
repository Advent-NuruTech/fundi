"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { productShareText, truncateShareDescription } from "@/lib/product-share";

interface ProductShareButtonProps {
  name: string;
  description?: string;
  productUrl: string;
  imageUrl?: string;
  iconOnly?: boolean;
}

function shareFileName(name: string, mimeType: string): string {
  const safeName = name
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 50) || "product";
  const extension = mimeType.split("/")[1]?.split("+")[0] || "jpg";
  return `${safeName}.${extension}`;
}

export function ProductShareButton({
  name,
  description,
  productUrl,
  imageUrl,
  iconOnly = false,
}: ProductShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [preparingImage, setPreparingImage] = useState(false);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const summary = useMemo(() => truncateShareDescription(description), [description]);
  const text = useMemo(() => productShareText(name, description), [description, name]);
  const messageWithUrl = `${text}\n\n${productUrl}`;

  useEffect(() => {
    setNativeShareAvailable(typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!open || !imageUrl) return;

    const controller = new AbortController();
    setPreparingImage(true);
    setImageFile(null);

    void fetch(imageUrl, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Product image could not be downloaded");
        return response.blob();
      })
      .then((blob) => {
        if (!blob.type.startsWith("image/")) throw new Error("Invalid product image");
        setImageFile(new File([blob], shareFileName(name, blob.type), { type: blob.type }));
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        // The product photo is still supplied to social networks through the URL's OG metadata.
      })
      .finally(() => {
        if (!controller.signal.aborted) setPreparingImage(false);
      });

    return () => controller.abort();
  }, [imageUrl, name, open]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(productUrl);
      setCopied(true);
      toast.success("Product link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the product link");
    }
  }

  async function openNativeShare() {
    if (!navigator.share) return;

    let shareData: ShareData = { title: name, text, url: productUrl };
    if (imageFile) {
      const imageShareData: ShareData = { ...shareData, files: [imageFile] };
      if (navigator.canShare?.(imageShareData)) shareData = imageShareData;
    }

    try {
      await navigator.share(shareData);
      setOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not open sharing options");
    }
  }

  const socialLinks = [
    {
      label: "WhatsApp",
      href: `https://wa.me/?text=${encodeURIComponent(messageWithUrl)}`,
      icon: <MessageCircle className="h-5 w-5" />,
      iconClassName: "bg-emerald-500 text-white",
    },
    {
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(productUrl)}`,
      icon: <span className="text-base font-bold">f</span>,
      iconClassName: "bg-blue-600 text-white",
    },
    {
      label: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(productUrl)}`,
      icon: <span className="text-sm font-bold">X</span>,
      iconClassName: "bg-slate-950 text-white",
    },
    {
      label: "LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(productUrl)}`,
      icon: <span className="text-sm font-bold">in</span>,
      iconClassName: "bg-sky-700 text-white",
    },
  ];

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={iconOnly ? "icon" : "sm"}
        className="shrink-0 gap-2"
        onClick={() => setOpen(true)}
        aria-label={`Share ${name}`}
      >
        <Share2 className="h-4 w-4" />
        {!iconOnly && "Share"}
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Share product">
        <div className="space-y-5 p-5">
          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={name}
                width={72}
                height={72}
                className="h-18 w-18 shrink-0 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-18 w-18 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400">
                <Link2 className="h-6 w-6" />
              </div>
            )}
            <div className="min-w-0 py-0.5">
              <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
              {summary && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{summary}</p>}
              <p className="mt-1 truncate text-[11px] text-emerald-700">{productUrl}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex min-w-0 flex-col items-center gap-2 text-center"
                aria-label={`Share ${name} on ${social.label}`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full transition group-hover:scale-105 ${social.iconClassName}`}>
                  {social.icon}
                </span>
                <span className="w-full truncate text-xs text-slate-600">{social.label}</span>
              </a>
            ))}
          </div>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 gap-2" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            {nativeShareAvailable && (
              <Button
                type="button"
                className="flex-1 gap-2"
                onClick={openNativeShare}
                disabled={preparingImage}
              >
                {preparingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
                More apps
              </Button>
            )}
          </div>

          {imageUrl && (
            <p className="text-center text-[11px] leading-4 text-slate-400">
              The product photo is included in supported apps and social link previews.
            </p>
          )}
        </div>
      </Dialog>
    </>
  );
}
