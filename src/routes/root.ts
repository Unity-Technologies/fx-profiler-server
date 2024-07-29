/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This router implements a very simple route for /, so that we can more easily
// test the server through tools like the Mozilla Observatory.

import Router from '@koa/router';
import { getLogger } from '../log';
import { config } from '../config';
import { create as gcsStorageCreate } from '../logic/gcs';
import { expandUrlGcs } from '../logic/shorten-url-gcs';
import send from 'koa-send';

export function rootRoutes() {
  const log = getLogger('routes.root');
  const router = new Router();

  // anything else, just serve the frontend index.html; this is so that 
  // even before the service worker is installed, we can still use a from-url or
  // whatever front end route
  router.get(new RegExp('/.*'), async (ctx, next) => {
    log.verbose("catch-all", ctx.URL.toString());

    await send(ctx, "frontend/index.html");
  });

  return router;
}
