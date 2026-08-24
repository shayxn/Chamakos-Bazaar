export type StudioElement = {
  id: string;
  type: string;
  text?: string;
  url?: string;
  href?: string;
  imageUrl?: string;
  label?: string;
  productId?: string | number;
  animation?: {
    preset?: string;
    duration?: number;
    delay?: number;
    strength?: number;
    direction?: "up" | "down" | "left" | "right";
    phase?: "in" | "out" | "loop" | "scroll";
    textMode?: "none" | "word" | "line" | "character" | "type";
  };
  scrollAnimation?: {
    enabled?: boolean;
    start?: number;
    end?: number;
    from?: { x?: number; y?: number; scale?: number; rotate?: number; opacity?: number; blur?: number };
    to?: { x?: number; y?: number; scale?: number; rotate?: number; opacity?: number; blur?: number };
  };
  responsive?: Record<string, { hidden?: boolean; width?: string; align?: "left" | "center" | "right" }>;
};

export type StudioSection = {
  id: string;
  type: string;
  label?: string;
  hidden?: boolean;
  elements?: StudioElement[];
  motion?: any;
};

export type PageContent = {
  sections: StudioSection[];
  events?: StudioEvent[];
};

export type StudioAction = {
  type: "show-notification" | "navigate" | "open-product" | "play-sound" | "trigger-animation";
  message?: string;
  href?: string;
  productId?: number;
  soundUrl?: string;
  targetId?: string;
};

export type StudioEvent = {
  id: string;
  trigger: "page-open" | "button-click" | "product-click" | "product-added" | "scroll-to-section" | "element-enters" | "admin-page-open";
  targetId?: string;
  enabled?: boolean;
  actions: StudioAction[];
};

export type ToolboxItem = {
  id: string;
  title: string;
  section: StudioSection;
};

export type Page = {
  id: number;
  title: string;
  slug: string;
  pageType: string;
  status: "draft" | "published" | "hidden";
  content: PageContent;
  publishedContent: any;
  permissions: any;
  version: number;
  updatedAt: string;
};

export type Access = {
  canAccess: boolean;
  isOwner: boolean;
  ownerId: number | null;
  grantedAdminIds: number[];
};

export type Admin = { id: number; username: string; email?: string };
export type Version = { version: number; content: any; createdAt: string };
export type Sound = { url: string; enabled: boolean; volume: number };
