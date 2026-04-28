const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
    // Temporarily disabled static export for dynamic pages
    // ...(isProd && { output: "export" }),
    basePath: isProd ? "/educore" : "",
    trailingSlash: true,
    images: {
        unoptimized: true
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
