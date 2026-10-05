import { useGetAllSettings } from "@workspace/api-client-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export const SETTING_DEFAULTS: Record<string, string> = {
  hero_image: "",
  hero_images: "",
  hero_slide_interval: "5000",
  hero_title: "Wear the",
  hero_subtitle: "unwritten.",
  hero_description: "Clothing for a point of view in motion.",
  hero_cta_text: "Explore the collection",
  hero_middle_video: "",
  logo_url: "/imaginate-logo.png",
  logo_bg_color: "transparent",
  logo_opacity: "1",
  logo_blur: "0",
  logo_blend_mode: "normal",
  logo_padding: "0",
  logo_border_radius: "8",
  logo_brightness: "1",
  logo_contrast: "1",
  logo_height: "56",
  trust_1_icon: "",
  trust_1_title: "",
  trust_1_desc: "",
  trust_1_visible: "false",
  trust_2_icon: "",
  trust_2_title: "",
  trust_2_desc: "",
  trust_2_visible: "false",
  trust_3_icon: "",
  trust_3_title: "",
  trust_3_desc: "",
  trust_3_visible: "false",
  trust_4_icon: "",
  trust_4_title: "",
  trust_4_desc: "",
  trust_4_visible: "false",
  tiktok_section_title: "Follow Us on TikTok",
  tiktok_section_visible: "true",
  reviews_section_title: "What They Say",
  reviews_section_visible: "true",
  site_name: "IMAGINATE",
  site_tagline: "A UAE-based clothing and streetwear label.",
  footer_description: "A UAE-based clothing and streetwear label.",
  contact_email: "",
  contact_phone: "",
  contact_instagram: "",
  contact_tiktok: "",
  shipping_text: "Delivery is currently available within the UAE. Available options and costs are shown at checkout.",
  about_text: "IMAGINATE is a UAE-based clothing and streetwear label.",
  privacy_policy: "",
  terms_of_service: "",
  faq_text: "",
  primary_color: "#7c3aed",
  accent_color: "#a78bfa",
  whatsapp_number: "+971521142341",
  whatsapp_text: "Chat with Us",
  whatsapp_message: "Hello! I'm interested in one of your products.",
  whatsapp_color: "#25D366",
  whatsapp_visible: "true",
  tiktok_btn_text: "Follow on TikTok",
  tiktok_btn_color: "#000000",
  tiktok_btn_visible: "true",
  recommended_visible: "true",
  recommended_title: "You May Also Like",
  recommended_count: "6",
  recommended_mode: "auto",
  footer_copyright: "",
  footer_links: "",
  site_title: "IMAGINATE — UAE Streetwear",
  site_meta_description: "IMAGINATE is a UAE-based clothing and streetwear label.",
  site_og_image: "",
  maintenance_mode: "false",
  emergency_shutdown: "false",
  announcement_active: "false",
  announcement_text: "",
  announcement_color: "#7c3aed",
  live_event_enabled: "true",
  live_event_title: "IMAGINATE LIVE",
  live_event_date: "2026-10-27",
  live_event_time: "",
  live_event_timezone: "",
  live_event_description: "More details to come.",
  live_event_cta_text: "",
  live_event_cta_url: "",
  live_event_live_url: "",
  live_event_background: "",
  delivery_standard_price: "25",
  worldwide_shipping_enabled: "false",
};

export function isLegacyHeroImage(value: string): boolean {
  return /chamako-hero|first[\s_-]?pick|chamak-logo|62482b8e985bece3a221c174\.png/i.test(value);
}

export function cleanHeroImages(value: string | undefined): string {
  try {
    const parsed: unknown = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return "";
    return JSON.stringify(parsed.filter((image) => typeof image === "string" && !isLegacyHeroImage(image)));
  } catch { return ""; }
}

function normalizeSettings(input?: Record<string, string>): Record<string, string> {
  const resolved = { ...SETTING_DEFAULTS, ...(input ?? {}) };
  const hasLegacyBrand = (value: string | undefined) => /first[\s_-]?pick|chamak(?:os| street)?/i.test(value ?? "");
  for (const key of ["site_name", "site_tagline", "site_title", "site_meta_description", "footer_description", "footer_copyright", "about_text"]) {
    if (hasLegacyBrand(resolved[key])) resolved[key] = SETTING_DEFAULTS[key] ?? "";
  }
  if (!resolved.logo_url || hasLegacyBrand(resolved.logo_url) || /chamak-logo/i.test(resolved.logo_url)) {
    resolved.logo_url = SETTING_DEFAULTS.logo_url;
  }
  if (isLegacyHeroImage(resolved.hero_image)) resolved.hero_image = "";
  if ([resolved.hero_title, resolved.hero_subtitle, resolved.hero_description].some(hasLegacyBrand)) {
    for (const key of ["hero_title", "hero_subtitle", "hero_description"]) resolved[key] = SETTING_DEFAULTS[key];
  }
  resolved.hero_images = cleanHeroImages(resolved.hero_images);
  if (hasLegacyBrand(resolved.announcement_text)) {
    resolved.announcement_active = "false";
    resolved.announcement_text = "";
  }
  if (["#a78bfa", "#ffcc00"].includes((resolved.announcement_color ?? "").toLowerCase())) {
    resolved.announcement_color = SETTING_DEFAULTS.announcement_color;
  }
  resolved.worldwide_shipping_enabled = "false";
  if (["#a78bfa", "#ffcc00"].includes(resolved.primary_color.toLowerCase()) || ["#a78bfa", "#ffcc00"].includes((resolved.accent_color ?? "").toLowerCase())) {
    resolved.primary_color = SETTING_DEFAULTS.primary_color;
    resolved.accent_color = SETTING_DEFAULTS.accent_color;
  }
  resolved.footer_links = resolved.footer_links
    .split("\n")
    .filter((line) => !hasLegacyBrand(line))
    .map((line) => line.replace(/\bFP Basics\b/gi, "Basics"))
    .join("\n");
  return resolved;
}

export function useSetting(key: string): string {
  const { data: settings } = useGetAllSettings({ query: { staleTime: 30_000, queryKey: ["settings", "all"] } });
  return normalizeSettings(settings)?.[key] ?? SETTING_DEFAULTS[key] ?? "";
}

export function useSettings(): Record<string, string> {
  const { data: settings } = useGetAllSettings({ query: { staleTime: 30_000, queryKey: ["settings", "all"] } });
  return useMemo(() => normalizeSettings(settings), [settings]);
}

type OperationalSettings = {
  emergencyShutdown: boolean;
};

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export async function fetchOperationalSettings(): Promise<OperationalSettings> {
  const response = await fetch(`${BASE}/api/settings/operational`, { credentials: "include", cache: "no-store" });
  if (!response.ok) throw new Error("Could not load operational settings");
  return response.json();
}

export function useOperationalSettings() {
  const query = useQuery({
    queryKey: ["operational-settings"],
    queryFn: fetchOperationalSettings,
    staleTime: 0,
    refetchInterval: 5_000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  return {
    emergencyShutdown: query.data?.emergencyShutdown ?? false,
    isReady: query.isSuccess || query.isError,
  };
}
