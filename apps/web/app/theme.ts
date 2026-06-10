import {
    createSystem,
    defaultConfig,
    defineConfig,
  } from "@chakra-ui/react";
  
  const config = defineConfig({
    theme: {
      tokens: {
        colors: {
          brand: {
            50: { value: "#f5f3ff" },
            100: { value: "#ede9fe" },
            200: { value: "#ddd6fe" },
            300: { value: "#c4b5fd" },
            400: { value: "#a78bfa" },
            500: { value: "#8b5cf6" },
            600: { value: "#7c3aed" },
            700: { value: "#6d28d9" },
            800: { value: "#5b21b6" },
            900: { value: "#4c1d95" },
          },
        },
      },
  
      semanticTokens: {
        colors: {
          bg: {
            value: "#FAFAFA",
          },
      
          surface: {
            value: "#FFFFFF",
          },
      
          elevated: {
            value: "#F8FAFC",
          },
      
          border: {
            value: "#E4E4E7",
          },
      
          text: {
            value: "#18181B",
          },
      
          secondaryText: {
            value: "#52525B",
          },
      
          muted: {
            value: "#71717A",
          },
      
          primary: {
            value: "#8B5CF6",
          },
      
          primaryHover: {
            value: "#7C3AED",
          },
      
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
  
  export const system = createSystem(
    defaultConfig,
    config
  );