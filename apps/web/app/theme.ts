import {
  createSystem,
  defaultConfig,
  defineConfig,
  defineStyle,
} from "@chakra-ui/react";

export const ringCss = defineStyle({
  outlineWidth: "2px",
  outlineColor: "brand.500",
  outlineOffset: "2px",
  outlineStyle: "solid",
});

const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        brand: {
          50: { value: "#F5F3FF" },
          100: { value: "#EDE9FE" },
          200: { value: "#DDD6FE" },
          300: { value: "#C4B5FD" },
          400: { value: "#A78BFA" },
          500: { value: "#8B5CF6" },
          600: { value: "#7C3AED" },
          700: { value: "#6D28D9" },
          800: { value: "#5B21B6" },
          900: { value: "#4C1D95" },
        },
      },

      shadows: {
        card: {
          value: "0 1px 3px rgba(15, 23, 42, 0.06)",
        },

        "card-hover": {
          value: "0 12px 24px rgba(15, 23, 42, 0.10)",
        },

        dropdown: {
          value: "0 8px 24px rgba(15,23,42,0.08)",
        },
      },

      radii: {
        card: {
          value: "20px",
        },

        panel: {
          value: "24px",
        },
      },
    },

    semanticTokens: {
      colors: {
        /*
        |--------------------------------------------------------------------------
        | Backgrounds
        |--------------------------------------------------------------------------
        */

        "bg.page": {
          value: "#FAFAFA",
        },

        "bg.surface": {
          value: "#FFFFFF",
        },

        "bg.panel": {
          value: "#FFFFFF",
        },

        "bg.subtle": {
          value: "#F8FAFC",
        },

        "bg.muted": {
          value: "#F4F4F5",
        },

        "bg.hover": {
          value: "#F8FAFC",
        },

        "bg.selected": {
          value: "#EDE9FE",
        },

        /*
        |--------------------------------------------------------------------------
        | Sidebar
        |--------------------------------------------------------------------------
        */

        "sidebar.bg": {
          value: "#FFFFFF",
        },

        "sidebar.hover": {
          value: "#F4F4F5",
        },

        "sidebar.active": {
          value: "#EDE9FE",
        },

        "sidebar.border": {
          value: "#E4E4E7",
        },

        "sidebar.text": {
          value: "#18181B",
        },

        /*
        |--------------------------------------------------------------------------
        | Borders
        |--------------------------------------------------------------------------
        */

        border: {
          value: "#E4E4E7",
        },

        "border.subtle": {
          value: "#F1F5F9",
        },

        "border.hover": {
          value: "#D4D4D8",
        },

        /*
        |--------------------------------------------------------------------------
        | Text
        |--------------------------------------------------------------------------
        */

        text: {
          value: "#18181B",
        },

        "text.secondary": {
          value: "#52525B",
        },

        "text.tertiary": {
          value: "#71717A",
        },

        "text.inverse": {
          value: "#FFFFFF",
        },

        /*
        |--------------------------------------------------------------------------
        | Brand
        |--------------------------------------------------------------------------
        */

        primary: {
          value: "{colors.brand.500}",
        },

        "primary.hover": {
          value: "{colors.brand.600}",
        },

        /*
        |--------------------------------------------------------------------------
        | Status
        |--------------------------------------------------------------------------
        */

        success: {
          value: "#22C55E",
        },

        warning: {
          value: "#F59E0B",
        },

        danger: {
          value: "#EF4444",
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);
