import { useEffect, useState } from "react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type ContentPage = {
  slug: string;
  title: string;
  content: string;
  updatedAt: string | null;
};

function renderContent(content: string) {
  return content.replace(/first[\s_-]?pick/gi, "IMAGINATE").split(/\n{2,}/).map((block, index) => {
    const trimmed = block.trim();
    if (trimmed.startsWith("## ")) {
      return (
        <h2 key={index} className="text-2xl font-black text-foreground uppercase mb-3 mt-8">
          {trimmed.replace(/^##\s+/, "")}
        </h2>
      );
    }
    if (trimmed.includes("\n- ")) {
      const [intro, ...items] = trimmed.split("\n");
      return (
        <div key={index}>
          {intro && <p>{intro}</p>}
          <ul className="list-disc pl-6 mt-3 space-y-2">
            {items.map((item, itemIndex) => (
              <li key={itemIndex}>{item.replace(/^-\s+/, "")}</li>
            ))}
          </ul>
        </div>
      );
    }
    return <p key={index}>{trimmed}</p>;
  });
}

export default function Terms() {
  const [page, setPage] = useState<ContentPage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/content/terms`, { credentials: "include" })
      .then((response) => response.json())
      .then((data: ContentPage) => setPage(data))
      .catch(() => setPage(null))
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <div className="mb-10">
        <p className="text-primary font-bold uppercase tracking-[0.3em] text-sm mb-3">
          IMAGINATE
        </p>
        <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tight">
          {page?.title ?? "Terms of Service"}
        </h1>
      </div>

      <div className="space-y-5 text-muted-foreground leading-7">
        {isLoading
          ? <p>Loading policy...</p>
          : page?.content?.trim()
          ? renderContent(page.content)
          : <p>Terms of service have not been published yet. Please contact <a href={`${BASE}/support`} className="underline underline-offset-4">Support</a> with questions.</p>}
      </div>
    </div>
  );
}
