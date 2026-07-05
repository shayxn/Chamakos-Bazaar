import { useState } from "react";
import { cn } from "@/lib/utils";

interface ImgWithSkeletonProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
}

export function ImgWithSkeleton({ src, alt, className, containerClassName, ...props }: ImgWithSkeletonProps) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={cn("relative w-full h-full", containerClassName)}>
      {!loaded && (
        <div className="absolute inset-0 img-skeleton rounded-inherit" />
      )}
      <img
        src={src}
        alt={alt}
        className={cn(
          "w-full h-full object-cover object-center transition-opacity duration-400",
          loaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={() => setLoaded(true)}
        {...props}
      />
    </div>
  );
}
