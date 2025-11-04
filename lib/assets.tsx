"use client";

import Image from "next/image";
import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";

// Common props for all logos
const logoSize = { width: 256, height: 256 };

export const MainLogoBlack = ({ className }: { className?: string }) => (
  <Image
    src="/pixelpilot-black.svg"
    alt="PixelPilot black logo"
    {...logoSize}
    className={className}
    priority
  />
);

export const MainLogoWhite = ({ className }: { className?: string }) => (
  <Image
    src="/pixelpilot-white.svg"
    alt="PixelPilot white logo"
    {...logoSize}
    className={className}
    priority
  />
);

export const MainLogoBlackWord = ({ className }: { className?: string }) => (
  <Image
    src="/pixelpilot-black-word.svg"
    alt="PixelPilot black wordmark logo"
    {...logoSize}
    className={className}
    priority
  />
);

export const MainLogoWhiteWord = ({ className }: { className?: string }) => (
  <Image
    src="/pixelpilot-white-word.svg"
    alt="PixelPilot white wordmark logo"
    {...logoSize}
    className={className}
    priority
  />
);

/* -------------------------------------------
   🔥 Auto Theme-Aware Logo Component
   - Handles dark/light mode switching
   - Avoids hydration mismatch by waiting until mounted
------------------------------------------- */
export const ThemedLogo = ({
  variant = "default",
  className,
}: {
  variant?: "default" | "word";
  className?: string;
}) => {
  const { theme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Ensure client-side theme availability before rendering
  useEffect(() => {
    const timer = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(timer); // cleanup
  }, []);

  if (!mounted) {
    // Prevent hydration mismatch
    return (
      <div style={{ width: logoSize.width / 4, height: logoSize.height / 4 }} />
    );
  }

  const currentTheme = theme === "system" ? systemTheme : theme;
  const isDark = currentTheme === "dark";

  if (variant === "word") {
    return isDark ? (
      <MainLogoWhiteWord className={className} />
    ) : (
      <MainLogoBlackWord className={className} />
    );
  }

  return isDark ? (
    <MainLogoWhite className={className} />
  ) : (
    <MainLogoBlack className={className} />
  );
};


