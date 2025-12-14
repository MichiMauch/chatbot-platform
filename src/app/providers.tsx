"use client";

import { MantineProvider, createTheme } from "@mantine/core";
import "@mantine/core/styles.css";

const theme = createTheme({
  primaryColor: "cyan",
  colors: {
    cyan: [
      "#e6fafa",
      "#ccf5f5",
      "#b3f0f0",
      "#99ebeb",
      "#80e5e6",
      "#66e0e0",
      "#4FD1D3",
      "#3fb8ba",
      "#2f9fa1",
      "#1f8688",
    ],
  },
  fontFamily: "var(--font-geist-sans), sans-serif",
});

export function Providers({ children }: { children: React.ReactNode }) {
  return <MantineProvider theme={theme}>{children}</MantineProvider>;
}
