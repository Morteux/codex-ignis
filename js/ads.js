import { adsConfig } from "./ads-config.js";

/** Activa unidades manuales únicamente cuando la configuración está completa. */
export function initializeAds() {
  const { enabled, publisherId, slots } = adsConfig;

  if (!enabled || !publisherId || !slots.indexFooter) {
    return;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  script.crossOrigin = "anonymous";
  document.head.append(script);

  document.querySelectorAll("[data-ad-slot]").forEach((host) => {
    const slotName = host.dataset.adSlot === "index-footer" ? "indexFooter" : "articleInline";
    const slot = slots[slotName];
    if (!slot) return;

    host.hidden = false;
    const ad = document.createElement("ins");
    ad.className = "adsbygoogle";
    ad.style.display = "block";
    ad.dataset.adClient = publisherId;
    ad.dataset.adSlot = slot;
    ad.dataset.adFormat = "auto";
    ad.dataset.fullWidthResponsive = "true";
    host.append(ad);

    script.addEventListener("load", () => {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    }, { once: true });
  });
}
