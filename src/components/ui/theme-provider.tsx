"use client";

import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import type { ReactNode } from "react";

export const appTheme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#252422" },
    secondary: { main: "#eb5e28" },
    background: { default: "#fffcf2", paper: "#fffcf2" },
    text: { primary: "#252422", secondary: "#6e6b65" },
    divider: "#e9e6de",
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
    button: { textTransform: "none", fontWeight: 600, fontSize: 13 },
    h1: { fontSize: "2.2rem", fontWeight: 700, letterSpacing: "-.04em" },
    h2: { fontSize: "1.18rem", fontWeight: 650, letterSpacing: "-.025em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: "var(--app-bg)", color: "var(--ink)" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          minHeight: 36,
          padding: "8px 12px",
          boxShadow: "none",
          "&.MuiButton-contained": { backgroundColor: "var(--ink)", color: "var(--bg)" },
          "&.MuiButton-contained:hover": { backgroundColor: "var(--ink-hover)" },
          "&.MuiButton-outlined": { borderColor: "var(--line)", color: "var(--ink)", backgroundColor: "var(--surface)" },
          "&.MuiButton-outlined:hover": { borderColor: "var(--muted)", backgroundColor: "var(--sidebar-hover)" },
          "&.MuiButton-text": { color: "var(--ink)" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { borderRadius: 8, color: "var(--muted)", "&:hover": { backgroundColor: "var(--sidebar-hover)" } },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none", color: "var(--ink)", backgroundColor: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, boxShadow: "none" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { border: "1px solid var(--line)", borderRadius: 12, boxShadow: "none" },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: "var(--surface)",
          color: "var(--ink)",
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "var(--line)" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "var(--muted)" },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#eb5e28", borderWidth: 1 },
        },
        input: { padding: "10px 12px", fontSize: 14 },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { display: "block", fontWeight: 400, color: "var(--muted)", "&.Mui-focused": { color: "var(--ink)" } } } },
    MuiFormHelperText: { styleOverrides: { root: { color: "var(--muted)" } } },
    MuiChip: { styleOverrides: { root: { borderRadius: 6, backgroundColor: "var(--sidebar)", color: "var(--ink)", fontWeight: 600 } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          color: "var(--muted)",
          "&.Mui-selected, &.Mui-selected:hover, &:hover": { backgroundColor: "var(--sidebar-hover)", color: "var(--ink)" },
        },
      },
    },
  },
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return <ThemeProvider theme={appTheme}><CssBaseline />{children}</ThemeProvider>;
}
