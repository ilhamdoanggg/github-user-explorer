import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from "path"

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/__test__/setup.ts',
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
})
