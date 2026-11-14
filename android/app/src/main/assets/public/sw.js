/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-afac4cd2'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "48ebea025f397f25bf8b920001db4b22"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6189b2bf710ccbc8fcf4e4d2dc0eacfb"
  }, {
    "url": "pwa-192x192.png",
    "revision": "52d878124c5612b05ae52107ef6b68bd"
  }, {
    "url": "index.html",
    "revision": "013a0be513d9880c0569a3adaf744ad0"
  }, {
    "url": "favicon.svg",
    "revision": "45eb015fd69761787a031966fcc28577"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2ab06f54fc338e51403271d4d6c9d2c4"
  }, {
    "url": "assets/index-BlnQocdw.css",
    "revision": null
  }, {
    "url": "assets/index-B5XG8tQy.js",
    "revision": null
  }, {
    "url": "assets/aistudio/Insta_Cleaner_Unfollow_Dashboard_7da8caea.png",
    "revision": null
  }, {
    "url": "apple-touch-icon.png",
    "revision": "2ab06f54fc338e51403271d4d6c9d2c4"
  }, {
    "url": "favicon.svg",
    "revision": "45eb015fd69761787a031966fcc28577"
  }, {
    "url": "pwa-192x192.png",
    "revision": "52d878124c5612b05ae52107ef6b68bd"
  }, {
    "url": "pwa-512x512.png",
    "revision": "6189b2bf710ccbc8fcf4e4d2dc0eacfb"
  }, {
    "url": "pwa-maskable-512x512.png",
    "revision": "48ebea025f397f25bf8b920001db4b22"
  }, {
    "url": "manifest.webmanifest",
    "revision": "7a72c2952be247b8d2d645f72feca700"
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));
  workbox.registerRoute(/^https:\/\/fonts\.googleapis\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "google-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');
  workbox.registerRoute(/^https:\/\/fonts\.gstatic\.com\/.*/i, new workbox.CacheFirst({
    "cacheName": "gstatic-fonts-cache",
    plugins: [new workbox.ExpirationPlugin({
      maxEntries: 10,
      maxAgeSeconds: 31536000
    }), new workbox.CacheableResponsePlugin({
      statuses: [0, 200]
    })]
  }), 'GET');

}));
