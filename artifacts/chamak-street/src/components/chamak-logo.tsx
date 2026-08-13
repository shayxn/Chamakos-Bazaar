/* @refresh reset */

interface ChamakLogoProps {
  className?: string;
  animate?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizes = {
  sm:  { height: 28 },
  md:  { height: 40 },
  lg:  { height: 56 },
  xl:  { height: 80 },
};

export function ChamakLogo({ className = "", size = "md" }: ChamakLogoProps) {
  const { height } = sizes[size];
  const fontSize = Math.round(height * 1.1);

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        height,
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      <span
        style={{
          fontSize,
          fontFamily: "'Arial Black','Impact','Franklin Gothic Heavy',sans-serif",
          fontWeight: 900,
          color: "#ffffff",
          letterSpacing: "-1.5px",
          lineHeight: 1,
        }}
      >
        FIRST
      </span>
      <span
        style={{
          fontSize,
          fontFamily: "'Arial Black','Impact','Franklin Gothic Heavy',sans-serif",
          fontWeight: 900,
          letterSpacing: "-1.5px",
          lineHeight: 1,
          background: "linear-gradient(180deg, #ff5200 0%, #ffb300 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        PICK
      </span>
    </div>
  );
}
