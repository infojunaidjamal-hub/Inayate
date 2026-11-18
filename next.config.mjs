/** @type {import('next').NextConfig} */
const dev = process.env.NODE_ENV !== "production";

const nextConfig = {
  poweredByHeader: false,
  // mobile / VS Code port forwarding se test karne ke liye (sirf development mein)
  allowedDevOrigins: dev ? ["192.168.1.44", "*.devtunnels.ms", "*.*.devtunnels.ms"] : [],
  // seller product photos upload ke liye
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      // VS Code tunnel origin ko localhost:3000 bana deta hai, isliye wo bhi allow (sirf development mein)
      allowedOrigins: dev ? ["localhost:3000", "192.168.1.44:3000", "*.devtunnels.ms", "*.*.devtunnels.ms"] : [],
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Safety headers (Razorpay checkout ke saath tested design: CSP jaanbujhkar nahi lagaya)
  async headers() {
    const h = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "SAMEORIGIN" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    ];
    if (process.env.NODE_ENV === "production") h.push({ key: "Strict-Transport-Security", value: "max-age=31536000" });
    return [{ source: "/(.*)", headers: h }];
  },
};

export default nextConfig;