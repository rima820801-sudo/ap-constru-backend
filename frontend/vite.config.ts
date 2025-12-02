import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig(({ mode }) => {
    const isUsbMode = mode === 'usb';

    return {
        plugins: [
            react(),
            isUsbMode && viteSingleFile()
        ].filter(Boolean),
        base: isUsbMode ? './' : '/',
        build: {
            outDir: isUsbMode ? 'dist_usb' : 'dist',
            assetsInlineLimit: isUsbMode ? 100000000 : 4096,
            cssCodeSplit: !isUsbMode,
            rollupOptions: {
                output: {
                    inlineDynamicImports: isUsbMode,
                },
            },
        },
        server: {
            port: 3000,
        },
        preview: {
            port: 3000,
        },
    };
});
