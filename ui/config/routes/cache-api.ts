/**
 * Cache API Router
 * 
 * Routes cache-related requests to appropriate handlers
 */

import { IncomingMessage, ServerResponse } from 'http';
import {
  handleGetManifest,
  handleGetCachedImage,
  handleCheckExists,
  handlePrefetch,
  handleInvalidate,
  handleClearActor,
  handleClearAll
} from './cache/index';

export function createCacheApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // GET /api/cache/manifest
    if (url === '/api/cache/manifest' && req.method === 'GET') {
      handleGetManifest(req, res, projectRoot);
      return;
    }

    // GET /api/cache/image?path=...
    if (url?.startsWith('/api/cache/image') && req.method === 'GET') {
      handleGetCachedImage(req, res, projectRoot);
      return;
    }

    // GET /api/cache/exists?path=...
    if (url?.startsWith('/api/cache/exists') && req.method === 'GET') {
      handleCheckExists(req, res, projectRoot);
      return;
    }

    // POST /api/cache/prefetch
    if (url === '/api/cache/prefetch' && req.method === 'POST') {
      handlePrefetch(req, res, projectRoot);
      return;
    }

    // POST /api/cache/invalidate
    if (url === '/api/cache/invalidate' && req.method === 'POST') {
      handleInvalidate(req, res, projectRoot);
      return;
    }

    // POST /api/cache/clear/:actorId
    if (url?.startsWith('/api/cache/clear/') && req.method === 'POST') {
      const match = url.match(/\/api\/cache\/clear\/([^/]+)$/);
      if (match && match[1] !== 'all') {
        handleClearActor(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/cache/clear-all
    if (url === '/api/cache/clear-all' && req.method === 'POST') {
      handleClearAll(req, res, projectRoot);
      return;
    }

    // GET /api/cache/test-download?url=... (for debugging)
    if (url?.startsWith('/api/cache/test-download') && req.method === 'GET') {
      const urlObj = new URL(req.url || '', `http://${req.headers.host}`);
      const testUrl = urlObj.searchParams.get('url');
      
      if (!testUrl) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing url parameter' }));
        return;
      }

      // Test download without caching
      const https = require('https');
      const http = require('http');
      const protocol = testUrl.startsWith('https') ? https : http;
      
      protocol.get(testUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (response: any) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          statusCode: response.statusCode,
          statusMessage: response.statusMessage,
          headers: response.headers,
          url: testUrl
        }));
      }).on('error', (err: Error) => {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: err.message,
          url: testUrl
        }));
      });
      return;
    }

    next();
  };
}
