const isProd = process.env.NODE_ENV === "production";

const nextConfig = {
    // Re-enable static export for hosting compatibility
    ...(isProd && {
        output: "export"
    }),
    basePath: isProd ? "/educore" : "",
    trailingSlash: true,
    images: {
        unoptimized: true
    },
};

export default nextConfig;
