"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { PaletteMode } from "@mui/material";
import { useEffect, useMemo, useState, type ReactNode } from "react";

const systemFont = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

export function createAppTheme(mode: PaletteMode) {
  const dark = mode === "dark";
  const colors = dark ? {
    background: "#16181c", paper: "#202329", subtle: "#282c33", text: "#f5f6f8",
    secondary: "#b4bac5", divider: "#383d46", primary: "#8ab8ff", hover: "#343943",
  } : {
    background: "#f6f7f9", paper: "#ffffff", subtle: "#eef1f5", text: "#20242b",
    secondary: "#59616e", divider: "#dce1e8", primary: "#245fa6", hover: "#e7ecf3",
  };

  return createTheme({
    palette: {
      mode,
      primary: { main: colors.primary, contrastText: dark ? "#101a29" : "#ffffff" },
      secondary: { main: dark ? "#c4b5fd" : "#6652a3" },
      success: { main: dark ? "#71d3a4" : "#207454" },
      warning: { main: dark ? "#f0c277" : "#94600c" },
      error: { main: dark ? "#ff9b9b" : "#ba3b42" },
      info: { main: colors.primary },
      background: { default: colors.background, paper: colors.paper },
      text: { primary: colors.text, secondary: colors.secondary },
      divider: colors.divider,
      action: { hover: colors.hover, selected: colors.subtle, disabled: dark ? "#7b8390" : "#89919e" },
    },
    shape: { borderRadius: 12 },
    spacing: 8,
    typography: {
      fontFamily: systemFont,
      h1: { fontSize: "clamp(1.85rem, 3vw, 2.5rem)", fontWeight: 650, letterSpacing: "-.035em", lineHeight: 1.15 },
      h2: { fontSize: "1.4rem", fontWeight: 600, letterSpacing: "-.025em" },
      h3: { fontSize: "1.1rem", fontWeight: 600, letterSpacing: "-.015em" },
      body1: { lineHeight: 1.6 },
      body2: { lineHeight: 1.5 },
      button: { textTransform: "none", fontWeight: 600, letterSpacing: 0 },
    },
    transitions: { duration: { shortest: 120, shorter: 160, short: 200, standard: 240 } },
    components: {
      MuiCssBaseline: { styleOverrides: {
        body: { backgroundColor: colors.background, color: colors.text },
        "*:focus-visible": { outline: `2px solid ${colors.primary}`, outlineOffset: 2 },
        "@media (prefers-reduced-motion: reduce)": { "*, *::before, *::after": { animationDuration: "0.01ms !important", transitionDuration: "0.01ms !important" } },
      } },
      MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: {
        root: { minHeight: 44, borderRadius: 10, paddingInline: 16 },
        contained: { boxShadow: "none", "&:hover": { boxShadow: "none" } },
        outlined: { borderColor: colors.divider, "&:hover": { borderColor: colors.primary, backgroundColor: colors.hover } },
      } },
      MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44, borderRadius: 10 } } },
      MuiPaper: { defaultProps: { elevation: 0 }, styleOverrides: { root: { backgroundImage: "none" }, outlined: { borderColor: colors.divider } } },
      MuiCard: { defaultProps: { variant: "outlined" }, styleOverrides: { root: { borderColor: colors.divider, boxShadow: "none" } } },
      MuiDialog: { defaultProps: { fullWidth: true, maxWidth: "sm" }, styleOverrides: { paper: { borderRadius: 16, border: `1px solid ${colors.divider}` } } },
      MuiTextField: { defaultProps: { variant: "outlined", size: "small" } },
      MuiFormControl: { defaultProps: { size: "small" } },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: 10, backgroundColor: colors.paper, minHeight: 44 } } },
      MuiInputLabel: { styleOverrides: { root: { color: colors.secondary } } },
      MuiChip: { styleOverrides: { root: { borderRadius: 8, fontWeight: 600 } } },
      MuiListItemButton: { styleOverrides: { root: { borderRadius: 10, minHeight: 44, "&.Mui-selected": { backgroundColor: colors.subtle }, "&.Mui-selected:hover": { backgroundColor: colors.hover } } } },
      MuiAlert: { styleOverrides: { root: { borderRadius: 10 } } },
      MuiSkeleton: { defaultProps: { animation: "wave" } },
      MuiTooltip: { styleOverrides: { tooltip: { borderRadius: 8 } } },
    },
  });
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<PaletteMode>("light");
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const preference = document.documentElement.dataset.theme;
      setMode(preference === "dark" || (preference !== "light" && media.matches) ? "dark" : "light");
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    media.addEventListener("change", update);
    return () => { observer.disconnect(); media.removeEventListener("change", update); };
  }, []);
  const theme = useMemo(() => createAppTheme(mode), [mode]);
  return <ThemeProvider theme={theme}><CssBaseline />{children}</ThemeProvider>;
}
