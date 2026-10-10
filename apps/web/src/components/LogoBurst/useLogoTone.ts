"use client";

import { useEffect, useState } from "react";
import { decodeLogo, logoTone, type CropRect, type FlowLogo, type LogoTone } from "@/lib/image";

/** Average lightness of the (cropped) logo's visible pixels, to pick a backdrop it reads on. */
export function useLogoTone(logo: FlowLogo, crop?: CropRect): LogoTone | undefined {
  const [tone, setTone] = useState<LogoTone>();
  useEffect(() => {
    let active = true;
    decodeLogo(logo, { maxSize: 48, crop })
      .then(({ data }) => {
        if (active) setTone(logoTone(data));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [logo, crop]);
  return tone;
}
