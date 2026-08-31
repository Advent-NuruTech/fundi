"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Link2, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

interface StoreShareButtonProps {
  storeName: string;
  storeUrl: string;
  description?: string;
  className?: string;
}

export function StoreShareButton({
  storeName,
  storeUrl,
  description,
  className,
}: StoreShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [nativeShareAvailable, setNativeShareAvailable] = useState(false);
  const text = description?.trim()
    ? `Shop ${storeName}\n\n${description.trim()}`
    : `Shop ${storeName} on Global Sell`;
  const messageWithUrl = `${text}\n\n${storeUrl}`;

  useEffect(() => {
    setNativeShareAvailable(typeof navigator.share === "function");
  }, []);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Store link copied");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy the store link");
    }
  }

  async function openNativeShare() {
    if (!navigator.share) return;
    try {
      await navigator.share({ title: storeName, text, url: storeUrl });
      setOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not open sharing options");
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={className ?? "gap-2"}
        onClick={() => setOpen(true)}
        aria-label={`Share ${storeName}`}
      >
        <Share2 className="h-4 w-4" />
        Share Store
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Share your store">
        <div className="space-y-5 p-5">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-semibold text-slate-900">{storeName}</p>
            {description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{description}</p>}
            <p className="mt-2 flex items-center gap-1.5 truncate text-[11px] text-emerald-700">
              <Link2 className="h-3.5 w-3.5 shrink-0" /> {storeUrl}
            </p>
          </div>

          <a
            href={`https://wa.me/?text=${encodeURIComponent(messageWithUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-medium text-white transition hover:bg-emerald-600"
          >
            <MessageCircle className="h-4 w-4" /> Share on WhatsApp
          </a>

          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1 gap-2" onClick={copyLink}>
              {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            {nativeShareAvailable && (
              <Button type="button" className="flex-1 gap-2" onClick={openNativeShare}>
                <ExternalLink className="h-4 w-4" /> More apps
              </Button>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
