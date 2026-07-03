import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  MotionValue,
} from "framer-motion";

const SPRING = { stiffness: 55, damping: 20, restDelta: 0.001 };

function useSmooth(mv: MotionValue<number>) {
  return useSpring(mv, SPRING);
}

interface FloatItemProps {
  src: string;
  alt: string;
  label: string;
  sub: string;
  enterAt: number;
  peakAt: number;
  exitAt: number;
  spinDir?: 1 | -1;
  xOffset?: string;
}

function FloatItem({
  src,
  label,
  sub,
  enterAt,
  peakAt,
  exitAt,
  spinDir = 1,
  xOffset = "0px",
}: FloatItemProps) {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const raw = scrollYProgress;

  const opacity = useTransform(
    raw,
    [enterAt, enterAt + 0.08, exitAt - 0.08, exitAt],
    [0, 1, 1, 0],
  );

  const y = useTransform(
    raw,
    [enterAt, peakAt, exitAt],
    [120, -20, -160],
  );

  const rotateY = useTransform(
    raw,
    [enterAt, peakAt],
    [0, 360 * spinDir],
  );

  const rotateZ = useTransform(
    raw,
    [enterAt, enterAt + 0.1, peakAt - 0.05, peakAt],
    [spinDir * -18, spinDir * 8, spinDir * -4, 0],
  );

  const scale = useTransform(
    raw,
    [enterAt, enterAt + 0.12, peakAt, exitAt],
    [0.5, 1.1, 1, 0.75],
  );

  const shadowScaleX = useTransform(raw, [enterAt, peakAt, exitAt], [0.3, 1, 0.3]);
  const shadowOpacity = useTransform(raw, [enterAt, peakAt - 0.05, peakAt + 0.05, exitAt], [0, 0.6, 0.6, 0]);
  const shadowY = useTransform(raw, [enterAt, peakAt, exitAt], [20, 0, -20]);

  const labelOpacity = useTransform(raw, [peakAt - 0.12, peakAt - 0.04, exitAt - 0.08, exitAt], [0, 1, 1, 0]);
  const labelX = useTransform(raw, [peakAt - 0.12, peakAt - 0.04], [-24, 0]);

  const sY = useSmooth(y);
  const sRY = useSmooth(rotateY);
  const sRZ = useSmooth(rotateZ);
  const sScale = useSmooth(scale);
  const sShadowSX = useSmooth(shadowScaleX);
  const sShadowY = useSmooth(shadowY);

  return (
    <div
      ref={ref}
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ perspective: "900px" }}
    >
      <div className="relative flex items-center" style={{ transform: `translateX(${xOffset})` }}>
        <motion.div style={{ y: sY, opacity, scale: sScale }} className="relative">
          <motion.div
            style={{
              rotateY: sRY,
              rotateZ: sRZ,
              transformStyle: "preserve-3d",
              filter: "drop-shadow(0 30px 60px rgba(255,102,0,0.55)) drop-shadow(0 8px 16px rgba(0,0,0,0.7))",
            }}
          >
            <img
              src={src}
              alt=""
              className="w-52 h-52 md:w-72 md:h-72 object-contain select-none"
              draggable={false}
            />
          </motion.div>

          <motion.div
            className="absolute left-1/2 -translate-x-1/2 w-36 h-6 rounded-full"
            style={{
              bottom: "-18px",
              background: "radial-gradient(ellipse, rgba(255,102,0,0.5) 0%, transparent 70%)",
              filter: "blur(8px)",
              scaleX: sShadowSX,
              opacity: shadowOpacity,
              y: sShadowY,
            }}
          />
        </motion.div>

        <motion.div
          className="absolute left-[calc(50%+110px)] md:left-[calc(50%+150px)] top-1/2 -translate-y-1/2 w-40"
          style={{ opacity: labelOpacity, x: labelX }}
        >
          <div className="h-px w-8 bg-primary/60 mb-3" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary mb-1">{sub}</p>
          <p className="text-xl md:text-2xl font-black uppercase tracking-tight text-white leading-tight">{label}</p>
        </motion.div>
      </div>
    </div>
  );
}

export function ScrollFloatObject() {
  const sectionRef = useRef<HTMLDivElement>(null);

  const items: FloatItemProps[] = [
    {
      src: "/product-sneakers.png",
      alt: "Sneakers",
      label: "Fresh Kicks",
      sub: "New Drop",
      enterAt: 0.05,
      peakAt: 0.38,
      exitAt: 0.58,
      spinDir: 1,
      xOffset: "-30px",
    },
    {
      src: "/product-hoodie.png",
      alt: "Hoodie",
      label: "Chamak Hoodie",
      sub: "Limited Edition",
      enterAt: 0.5,
      peakAt: 0.75,
      exitAt: 0.94,
      spinDir: -1,
      xOffset: "30px",
    },
  ];

  return (
    <div
      ref={sectionRef}
      className="relative w-full pointer-events-none"
      style={{ height: "250vh" }}
      aria-hidden="true"
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(255,102,0,0.6) 39px, rgba(255,102,0,0.6) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(255,102,0,0.6) 39px, rgba(255,102,0,0.6) 40px)",
            }}
          />
        </div>

        <div className="relative h-full w-full">
          {items.map((item) => (
            <FloatItem key={item.alt} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
}
