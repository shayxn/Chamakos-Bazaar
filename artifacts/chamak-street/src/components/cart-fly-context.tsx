import { createContext, useContext, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

type FlyState = {
  id: number;
  imageUrl: string;
  startX: number;
  startY: number;
  startSize: number;
  endX: number;
  endY: number;
};

type CartFlyCtx = {
  triggerFly: (imageUrl: string, fromEl: Element) => void;
  cartBounceKey: number;
};

const CartFlyContext = createContext<CartFlyCtx>({ triggerFly: () => {}, cartBounceKey: 0 });

export function CartFlyProvider({ children }: { children: React.ReactNode }) {
  const [fly, setFly] = useState<FlyState | null>(null);
  const [cartBounceKey, setCartBounceKey] = useState(0);
  const idRef = useRef(0);

  const triggerFly = useCallback((imageUrl: string, fromEl: Element) => {
    const fromRect = fromEl.getBoundingClientRect();
    const cartEl = document.getElementById("nav-cart-btn");
    if (!cartEl) return;
    const toRect = cartEl.getBoundingClientRect();

    idRef.current++;
    const size = Math.min(fromRect.width, fromRect.height, 100);

    setFly({
      id: idRef.current,
      imageUrl,
      startX: fromRect.left + fromRect.width / 2 - size / 2,
      startY: fromRect.top + fromRect.height / 2 - size / 2,
      startSize: size,
      endX: toRect.left + toRect.width / 2 - 16,
      endY: toRect.top + toRect.height / 2 - 16,
    });

    setTimeout(() => {
      setFly(null);
      setCartBounceKey((k) => k + 1);
    }, 700);
  }, []);

  return (
    <CartFlyContext.Provider value={{ triggerFly, cartBounceKey }}>
      {children}
      {fly !== null &&
        typeof document !== "undefined" &&
        createPortal(<FlyingImage key={fly.id} {...fly} />, document.body)}
    </CartFlyContext.Provider>
  );
}

function FlyingImage({ imageUrl, startX, startY, startSize, endX, endY }: Omit<FlyState, "id">) {
  return (
    <motion.img
      src={imageUrl}
      alt=""
      initial={{
        x: startX,
        y: startY,
        width: startSize,
        height: startSize,
        opacity: 1,
        borderRadius: 10,
        scale: 1,
      }}
      animate={{
        x: endX,
        y: endY,
        width: 32,
        height: 32,
        opacity: 0,
        borderRadius: 50,
        scale: 0.6,
      }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        pointerEvents: "none",
        objectFit: "cover",
        willChange: "transform, opacity",
        boxShadow: "0 4px 24px rgba(255,102,0,0.5)",
      }}
    />
  );
}

export function useCartFly() {
  return useContext(CartFlyContext);
}
