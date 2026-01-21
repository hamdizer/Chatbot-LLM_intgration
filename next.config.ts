import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    REACT_APP_OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY,
  },
};

export default nextConfig;
