import { IncomingMessage, ServerResponse } from 'http';
import {
  handleGetTrainingPrompts,
  handleGetTrainingData,
  handleDeleteTrainingImage,
  handleDeleteAllTrainingData,
  handleToggleTrainingImageGood
} from './training-data.handlers';
import {
  handleSyncFromS3,
  handleSyncToS3
} from './s3-sync.handlers';
import {
  handleGenerateTrainingImages,
  handleGenerateAllPromptImages,
  handleGenerateSingleTrainingImage,
  handleRegeneratePosterFrame
} from './image-generation.handlers';
import {
  handleGetAllActors,
  handleToggleGood,
  handleMarkGood,
  handleGetPromptUsage,
  handleGetPresetTrainingPrompts,
  handleGetActorTrainingVersions,
  handleSaveActorTrainingVersions
} from './actor-management.handlers';

/**
 * API routes for actor training data management
 */
export function createActorsApi(projectRoot: string) {
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    const url = req.url;

    // GET /api/actors - Get all actors
    if (url === '/api/actors' && req.method === 'GET') {
      handleGetAllActors(req, res, projectRoot);
      return;
    }

    // GET /api/actors/:actorId/training-data/prompts
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/prompts') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/prompts$/);
      if (match) {
        handleGetTrainingPrompts(req, res, projectRoot, match[1]);
        return;
      }
    }

    // GET /api/actors/:actorId/training-data
    if (url?.startsWith('/api/actors/') && url.includes('/training-data') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data$/);
      if (match) {
        handleGetTrainingData(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/sync-from-s3
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/sync-from-s3') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/sync-from-s3/);
      if (match) {
        handleSyncFromS3(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/sync-to-s3
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/sync-to-s3') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/sync-to-s3/);
      if (match) {
        handleSyncToS3(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/generate-all-prompts (MUST come before /generate)
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/generate-all-prompts') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/generate-all-prompts$/);
      if (match) {
        handleGenerateAllPromptImages(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/generate-single (MUST come before /generate)
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/generate-single') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/generate-single$/);
      if (match) {
        handleGenerateSingleTrainingImage(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/generate
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/generate') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/generate$/);
      if (match) {
        handleGenerateTrainingImages(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/delete
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/delete') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/delete$/);
      if (match) {
        handleDeleteTrainingImage(req, res, projectRoot, match[1]);
        return;
      }
    }

    // GET /api/actors/:actorId/training-prompts
    if (url?.startsWith('/api/actors/') && url.includes('/training-prompts') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-prompts$/);
      if (match) {
        handleGetPresetTrainingPrompts(req, res, projectRoot, match[1]);
        return;
      }
    }

    // GET /api/actors/:actorId/prompt-usage
    if (url?.startsWith('/api/actors/') && url.includes('/prompt-usage') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/prompt-usage$/);
      if (match) {
        handleGetPromptUsage(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/toggle-good
    if (url?.startsWith('/api/actors/') && url.includes('/toggle-good') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/toggle-good$/);
      if (match) {
        handleToggleGood(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/mark-good
    if (url?.startsWith('/api/actors/') && url.includes('/mark-good') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/mark-good$/);
      if (match) {
        handleMarkGood(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/:filename/toggle-good
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/') && url.includes('/toggle-good') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/([^/]+)\/toggle-good$/);
      if (match) {
        handleToggleTrainingImageGood(req, res, projectRoot, match[1], match[2]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-data/delete-all
    if (url?.startsWith('/api/actors/') && url.includes('/training-data/delete-all') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-data\/delete-all/);
      if (match) {
        handleDeleteAllTrainingData(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/regenerate-poster-frame
    if (url?.startsWith('/api/actors/') && url.includes('/regenerate-poster-frame') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/regenerate-poster-frame$/);
      if (match) {
        handleRegeneratePosterFrame(req, res, projectRoot, match[1]);
        return;
      }
    }

    // GET /api/actors/:actorId/training-versions
    if (url?.startsWith('/api/actors/') && url.includes('/training-versions') && req.method === 'GET') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-versions$/);
      if (match) {
        handleGetActorTrainingVersions(req, res, projectRoot, match[1]);
        return;
      }
    }

    // POST /api/actors/:actorId/training-versions
    if (url?.startsWith('/api/actors/') && url.includes('/training-versions') && req.method === 'POST') {
      const match = url.match(/\/api\/actors\/([^/]+)\/training-versions$/);
      if (match) {
        handleSaveActorTrainingVersions(req, res, projectRoot, match[1]);
        return;
      }
    }

    next();
  };
}
