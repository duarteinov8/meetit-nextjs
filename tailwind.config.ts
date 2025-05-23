import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#0070f3",
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        light: {
          ...require("daisyui/src/theming/themes")["light"],
          primary: "#0070f3",
          "primary-focus": "#0051a2",
        },
        dark: {
          ...require("daisyui/src/theming/themes")["dark"],
          primary: "#0070f3",
          "primary-focus": "#0051a2",
        },
      },
    ],
    darkTheme: "dark",
  },
};

export default config;
