import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { createServerPlugin } from './config/server-plugin'
import * as path from 'path'
import * as fs from 'fs'

export default defineConfig({
  plugins: [
    react(),
    createServerPlugin(),
    // Serve workflows directory
    {
      name: 'serve-workflows',
      configureServer(server) {
        server.middlewares.use('/workflows', (req, res, next) => {
          const workflowsPath = path.resolve(__dirname, '../workflows');
          const filePath = path.join(workflowsPath, req.url || '');
          
          if (req.url?.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          }
          
          if (fs.existsSync(filePath)) {
            res.end(fs.readFileSync(filePath));
          } else {
            next();
          }
        });
      }
    },
    // Serve test-suites directory
    {
      name: 'serve-test-suites',
      configureServer(server) {
        server.middlewares.use('/test-suites', (req, res, next) => {
          const testSuitesPath = path.resolve(__dirname, 'public/test-suites');
          const filePath = path.join(testSuitesPath, req.url || '');
          
          if (req.url?.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          }
          
          if (fs.existsSync(filePath)) {
            res.end(fs.readFileSync(filePath));
          } else {
            next();
          }
        });
      }
    },
    // Serve actors directory
    {
      name: 'serve-actors',
      configureServer(server) {
        server.middlewares.use('/actors', (req, res, next) => {
          const actorsPath = path.resolve(__dirname, 'public/actors');
          const filePath = path.join(actorsPath, req.url || '');
          
          if (req.url?.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json');
          }
          
          if (fs.existsSync(filePath)) {
            res.end(fs.readFileSync(filePath));
          } else {
            next();
          }
        });
      }
    }
  ],
  server: {
    port: 3003,
    open: true,
    fs: {
      // Allow serving files from parent directories
      allow: ['..']
    }
  },
  publicDir: '../data'
})
