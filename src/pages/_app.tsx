import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useTheme } from "../hooks/useTheme";

export default function App({ Component, pageProps }: AppProps) {
  // Apply theme on load; ensure client-only effect to avoid SSR mismatch
  useTheme();
  return <Component {...pageProps} />;
}
