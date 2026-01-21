import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  env: {
    NEXT_PUBLIC_GROQ_API_KEY: process.env.NEXT_PUBLIC_GROQ_API_KEY,
    NEXT_PUBLIC_GROQ_API: process.env.NEXT_PUBLIC_GROQ_API,
  },
};

export default nextConfig;
