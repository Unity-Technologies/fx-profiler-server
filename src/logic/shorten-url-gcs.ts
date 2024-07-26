/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

import fetch, { Response } from 'node-fetch';
import crypto from 'crypto';

import { promisify } from 'util';
import { GcsStorage } from './gcs';

import { config } from '../config';
import { getLogger } from '../log';

import { encode as toBase32 } from '../utils/base32';

const randomBytes = promisify(crypto.randomBytes);

// Copied from publish.ts; same reasoning applies
async function generateTokenForProfile(): Promise<string> {
  // We're especially interested in avoiding collision, but also interested that
  // we can't easily find a random profile by exhaustively crawling the token
  // space. That's why we use the number of 24 bytes (192
  // bits).
  // * This should be more then enough to avoid collisions, according to the Wikipedia page about UUID:
  //   https://en.wikipedia.org/wiki/Universally_unique_identifier#Collisions
  // * This should be also enough for crawlers, even if 32 bytes is usually
  //   recommended, because we'll expire the data soon, most uploaded profiles
  //   are sanitized by default, and only a fraction have useful information for
  //   an attacker.
  const randomBuffer = await randomBytes(24);
  return toBase32(randomBuffer);
}

export async function shortenUrlGcs(storage: GcsStorage, longUrl: string): Promise<string> {
  const log = getLogger('logic.shorten_url_gcs.shorten_url');
  log.info('shorten', `request for ${longUrl}`);

  const token = await generateTokenForProfile();
  const filename = `${token}.url`;

  const googleStorageStream = storage.getWriteStreamForFile(filename, false);
  googleStorageStream.write(longUrl);
  googleStorageStream.end();

  // the shortUrl
  const shortUrl = `https://profiler-dot-unity-eng-arch-dev.uw.r.appspot.com/s/${token}`;
  log.info('shorten', `shortened to ${shortUrl}`);
  return shortUrl;
}

export async function expandUrlGcs(storage: GcsStorage, urlToExpand: string): Promise<string> {
  const log = getLogger('logic.shorten_url_gcs.expand_url');

  const token = urlToExpand.split('/').pop();
  if (token === undefined || token.length != 39) {
    throw new Error('Invalid URL "' + token + '" ' + token.length);
  }
  const filename = `${token}.url`;
  const file = await storage.readFile(filename);
  const longUrl = file.toString();
  log.info('expand', `expanded ${urlToExpand} to ${longUrl}`);
  return longUrl;
}