import { IncomingMessage, ServerResponse } from 'http';

/**
 * Common handler function type
 */
export type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string
) => void;

/**
 * Handler with additional filename parameter
 */
export type FileRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string,
  actorId: string,
  filename: string
) => void;

/**
 * Handler without actorId parameter
 */
export type GeneralRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  projectRoot: string
) => void;
