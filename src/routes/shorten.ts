/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

// This router implements the url shortening functionality, using bitly.

import Router from '@koa/router';
import body from 'koa-json-body';

import { config } from '../config';
import { create as gcsStorageCreate } from '../logic/gcs';
import { shortenUrl, expandUrl } from '../logic/shorten-url';
import { shortenUrlGcs, expandUrlGcs } from '../logic/shorten-url-gcs';
import { getLogger } from '../log';
import { BadRequestError } from '../utils/errors';

const VALIDATE_URLS = false;

export function shortenRoutes() {
  const log = getLogger('routes.shorten');
  const router = new Router();

  router.post('/shorten', body(), async (ctx) => {
    log.verbose('/shorten');

    if (!ctx.request.body) {
      // Send a "Bad Request" error if the body could not be parsed.
      throw new BadRequestError(`The body couldn't be parsed as JSON.`);
    }

    const { longUrl } = ctx.request.body;
    if (!longUrl) {
      throw new BadRequestError(`The property 'longUrl' is missing.`);
    }

    log.info('longUrl', longUrl);
    if (VALIDATE_URLS && !longUrl.startsWith('https://profiler.firefox.com/')) {
      throw new BadRequestError(
        `Only profiler URLs are allowed by this service.`
      );
    }

    let shortUrl;
    if (config.gcsShortening) {
      log.info('gcs', 'shortening using gcs');
      const storage = gcsStorageCreate(config);
      shortUrl = await shortenUrlGcs(storage, longUrl);
    } else {
      log.info('gcs', 'shortening using regular');
      shortUrl = await shortenUrl(longUrl);
    }

    ctx.body = { shortUrl };
  });

  router.post('/expand', body(), async (ctx) => {
    log.verbose('/expand');
    if (!ctx.request.body) {
      // Send a "Bad Request" error if the body could not be parsed.
      throw new BadRequestError(`The body couldn't be parsed as JSON.`);
    }

    const { shortUrl } = ctx.request.body;
    if (!shortUrl) {
      throw new BadRequestError(`The property 'shortUrl' is missing.`);
    }

    let longUrl;
    if (config.gcsShortening) {
      const storage = gcsStorageCreate(config);
      longUrl = await expandUrlGcs(storage, shortUrl);
    } else {
      longUrl = await expandUrl(shortUrl);
    }

    // The backend call has been made already, but still we want to discourage
    // malicious users from using this API to expand any URL.
    if (VALIDATE_URLS && !longUrl.startsWith('https://profiler.firefox.com/')) {
      throw new BadRequestError(
        `Only profiler URLs are allowed by this service.`
      );
    }

    ctx.body = { longUrl };
  });

  router.get(new RegExp('/s/([a-z][0-9])*'), async (ctx) => {
    log.verbose('s', ctx.request.url);
    const storage = gcsStorageCreate(config);
    const shortUrl = ctx.request.url;
    const longUrl = await expandUrlGcs(storage, shortUrl);
    ctx.redirect(longUrl);
  });

  return router;
}
