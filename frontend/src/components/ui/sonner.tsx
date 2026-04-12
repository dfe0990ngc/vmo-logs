"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      richColors
      position="top-right"
      closeButton
      front={true}
      theme={theme as ToasterProps["theme"]}
      className="group toaster"
      {...props}
    />
  );
};

export { Toaster };
