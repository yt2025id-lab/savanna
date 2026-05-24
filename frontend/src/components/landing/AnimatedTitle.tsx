"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import clsx from "clsx";

interface AnimatedTitleProps {
  title: string;
  containerClass?: string;
}

export function AnimatedTitle({ title, containerClass }: AnimatedTitleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "100 bottom",
          end: "center bottom",
          toggleActions: "play none none reverse",
        },
      });

      tl.to(".anim-word", {
        opacity: 1,
        duration: 0.8,
        transform: "translate3d(0, 0, 0) rotateY(0deg) rotateX(0deg)",
        ease: "power2.inOut",
        stagger: 0.03,
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={containerRef} className={clsx("flex flex-col gap-1", containerClass)}>
      {title.split("<br />").map((line, lineIdx) => (
        <div
          key={lineIdx}
          className="flex flex-wrap justify-center gap-3 px-4 md:gap-4"
          style={{ perspective: "500px" }}
        >
          {line.split(" ").map((word, wordIdx) => (
            <span
              key={wordIdx}
              className="anim-word inline-block"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "clamp(2.5rem, 6vw, 5rem)",
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-0.02em",
                color: "var(--anim-title-color, #F5EDD6)",
                textTransform: "uppercase",
                opacity: 0,
                transform: "translate3d(10px, 40px, -60px) rotateY(60deg) rotateX(-40deg)",
                transformOrigin: "50% 50% -150px",
                willChange: "opacity, transform",
              }}
              dangerouslySetInnerHTML={{ __html: word }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
