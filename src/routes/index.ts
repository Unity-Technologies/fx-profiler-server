/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import cors from '@koa/cors';

import { rootRoutes } from './root';
import { dockerFlowRoutes } from './dockerflow';
import { publishRoutes } from './publish';
import { cspReportRoutes } from './cspReport';
import { profileRoutes } from './profile';
import { shortenRoutes } from './shorten';

import { versioning } from '../middlewares';

import Koa from 'koa';
import serve from 'koa-static';

/**
 * This function adds the main endpoints for this app.
 * We pass the app directly instead of returning a router, because koa-router
 * won't execute middlewares if there's no matching route (see
 * https://github.com/koajs/router/issues/44) which is a problem for CORS
 * preflight requests. So we have to specify the CORS middleware directly on the
 * app object.
 *
 * For each router koa-router exposes 2 middlewares:
 * - the result of routes() returns the configured routes.
 * - the result of allowedMethods() configures the OPTIONS verb.
 * We need to add them both if we want that the OPTIONS verb works properly
 * (besides CORS).
 */
export function configureRoutes(app: Koa) {
  // Adding the main endpoints for this app.
  // koa-router exposes 2 middlewares:
  // - the result of routes() returns the configured routes.
  // - the result of allowedMethods() configures the OPTIONS verb.

  // The frontend static code; serve the static files if they're found
  // by URL, otherwise continue down. Ensure the static files have the
  // right content-type.
  app.use(serve('frontend'));

  // The generic dockerflow etc routes
  configureTechnicalRoutes(app);

  // Note we use the default configuration for cors, that is we allow all
  // origins and all methods.
  app.use(cors());

  // Versioning and CORS applies only to API routes, that's why we specify them
  // here. Also we specify the CORS middleware before the Versioning middleware
  // so that versioning doesn't apply to CORS preflight requests.
  app.use(versioning(1));

  configureUserFacingRoutes(app);

  // Technically this is the final catch-all which shouldn't even be a router
  // but whatever; it also doesn't need CORS.
  configureFinalRootRoutes(app);
}

function configureTechnicalRoutes(app: Koa) {
  const dockerFlow = dockerFlowRoutes();
  const cspReport = cspReportRoutes();

  app.use(dockerFlow.routes()).use(dockerFlow.allowedMethods());
  app.use(cspReport.routes()).use(cspReport.allowedMethods());
}

function configureUserFacingRoutes(app: Koa) {
  const publish = publishRoutes();
  const profile = profileRoutes();
  const shorten = shortenRoutes();

  app.use(publish.routes()).use(publish.allowedMethods());
  app.use(profile.routes()).use(profile.allowedMethods());
  app.use(shorten.routes()).use(shorten.allowedMethods());
}

function configureFinalRootRoutes(app: Koa) {
  const root = rootRoutes();

  app.use(root.routes()).use(root.allowedMethods());
}