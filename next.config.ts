import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Зургийн эх сурвалж зөвшөөрөх (next/image ашиглах бол)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default nextConfig;
