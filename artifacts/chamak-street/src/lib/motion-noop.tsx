/**
 * No-op shim for framer-motion — all animation props are stripped,
 * motion.* elements render as plain HTML elements.
 */
import React from "react";

function isMotionValue(val: unknown): boolean {
  return (
    typeof val === "object" &&
    val !== null &&
    typeof (val as Record<string, unknown>).get === "function" &&
    typeof (val as Record<string, unknown>).set === "function"
  );
}

const ANIMATION_PROPS = new Set([
  "initial", "animate", "exit", "whileHover", "whileTap", "whileFocus",
  "whileInView", "whileDrag", "variants", "transition", "layout", "layoutId",
  "drag", "dragConstraints", "dragElastic", "dragMomentum", "dragListener",
  "onDrag", "onDragStart", "onDragEnd", "onAnimationStart", "onAnimationComplete",
  "onHoverStart", "onHoverEnd", "viewport", "custom", "transformTemplate",
  "layoutDependency", "layoutScroll", "layoutRoot", "onLayoutAnimationStart",
  "onLayoutAnimationComplete", "onMeasureDragConstraints",
]);

function cleanProps(props: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (ANIMATION_PROPS.has(k)) continue;
    if (k === "style" && v && typeof v === "object") {
      const style: Record<string, unknown> = {};
      for (const [sk, sv] of Object.entries(v as Record<string, unknown>)) {
        if (!isMotionValue(sv)) style[sk] = sv;
      }
      clean.style = style;
      continue;
    }
    clean[k] = v;
  }
  return clean;
}

const cache: Record<string, React.ForwardRefExoticComponent<React.PropsWithoutRef<Record<string, unknown>> & React.RefAttributes<unknown>>> = {};

const motionHandler: ProxyHandler<object> = {
  get(_target, tag: string | symbol) {
    if (typeof tag === "symbol") return undefined;
    if (!(tag in cache)) {
      const t = tag;
      const Comp = React.forwardRef<unknown, Record<string, unknown>>((props, ref) => {
        return React.createElement(t, { ...cleanProps(props), ref });
      });
      Comp.displayName = `motion.${t}`;
      cache[t] = Comp as typeof cache[string];
    }
    return cache[tag];
  },
};

export const motion = new Proxy({} as Record<string, unknown>, motionHandler) as typeof import("framer-motion").motion;

export function AnimatePresence({ children }: { children?: React.ReactNode }) {
  return React.createElement(React.Fragment, null, children);
}

function makeMotionValue(initial: unknown) {
  let _val = initial;
  return {
    get: () => _val,
    set: (v: unknown) => { _val = v; },
    getVelocity: () => 0,
    subscribe: () => () => {},
    on: () => () => {},
    destroy: () => {},
  };
}

export const useMotionValue = (initial: unknown) => makeMotionValue(initial);
export const useSpring = (val: unknown) => (isMotionValue(val) ? val : makeMotionValue(val));
export const useTransform = (_val?: unknown, _from?: unknown, _to?: unknown) => makeMotionValue(0);
export const useScroll = () => ({
  scrollY: makeMotionValue(0),
  scrollYProgress: makeMotionValue(0),
  scrollX: makeMotionValue(0),
  scrollXProgress: makeMotionValue(0),
});
export const useInView = (_ref: unknown, _options?: unknown): boolean => true;
export const useAnimate = () => [React.createRef(), () => Promise.resolve()];
export const useDragControls = () => ({ start: () => {} });
export const useAnimation = () => ({ start: () => Promise.resolve(), stop: () => {}, set: () => {} });
export const MotionConfig = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);
export const LazyMotion = ({ children }: { children?: React.ReactNode }) =>
  React.createElement(React.Fragment, null, children);
export const domAnimation = {};
export const domMax = {};
export const m = motion;

export type { Variants, Transition, MotionProps, TargetAndTransition } from "framer-motion";
