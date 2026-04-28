const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
    // Re-enable static export for hosting compatibility
    ...(isProd && {
        output: "export",
        distDir: "out"
    }),
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
