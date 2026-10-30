/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  // seller product photos upload ke liye
  experimental: { serverActions: { bodySizeLimit: "10mb" } },
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
