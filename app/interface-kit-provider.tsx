"use client";

import { useEffect, useState, type ComponentType } from "react";

export function InterfaceKit() {
  const [InterfaceKitComponent, setInterfaceKitComponent] = useState<ComponentType | null>(null);

  useEffect(() => {
    let mounted = true;

    void import("interface-kit/react").then(module => {
      if (mounted) setInterfaceKitComponent(() => module.InterfaceKit);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return InterfaceKitComponent ? <InterfaceKitComponent /> : null;
}
