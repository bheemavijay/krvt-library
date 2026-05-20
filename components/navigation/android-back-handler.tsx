"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

export function AndroidBackHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    let removed = false;
    let removeListener: (() => void) | undefined;

    void App.addListener("backButton", ({ canGoBack }) => {
      const url = new URL(window.location.href);
      const isHome = url.pathname === "/" && url.search === "";
      const isHomeView = url.pathname === "/" && !url.searchParams.get("view") && !url.searchParams.get("q");

      if (canGoBack || (!isHome && !isHomeView)) {
        router.back();
        return;
      }

      void App.exitApp();
    }).then((handle) => {
      if (removed) {
        void handle.remove();
        return;
      }
      removeListener = () => {
        void handle.remove();
      };
    });

    return () => {
      removed = true;
      removeListener?.();
    };
  }, [router]);

  return null;
}
