import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'
import viteCompression from 'vite-plugin-compression'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    // Production build optimizations
    build: {
      outDir: 'dist',
      sourcemap: mode === 'development',
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: mode === 'production',
          drop_debugger: mode === 'production',
          pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : []
        }
      },
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            mapbox: ['mapbox-gl'],
            charts: ['recharts'],
            utils: ['axios', 'localforage'],
            ui: ['lucide-react']
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]'
        }
      },
      chunkSizeWarningLimit: 1000,
      reportCompressedSize: false
    },
    
    
    // Development server configuration
    server: {
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      }
    },
    
    // Resolve aliases for cleaner imports
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@components': path.resolve(__dirname, './src/components'),
        '@services': path.resolve(__dirname, './src/services'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@hooks': path.resolve(__dirname, './src/hooks')
      }
    },
    
    // Define global constants
    define: {
      __APP_ENV__: JSON.stringify(env.NODE_ENV || 'development')
    },
    
    // Performance optimizations
    optimizeDeps: {
      include: ['react', 'react-dom', 'mapbox-gl'],
      exclude: ['@vitejs/plugin-react']
    },
    
    // Plugins - simplified for Vercel compatibility
    plugins: [
      react(),
      mode === 'analyze' && visualizer({
        filename: 'bundle-analysis.html',
        open: true,
        gzipSize: true,
        brotliSize: true
      }),
      mode === 'production' && viteCompression({
        algorithm: 'gzip',
        ext: '.gz',
        deleteOriginFile: false
      })
    ].filter(Boolean)
  }
})