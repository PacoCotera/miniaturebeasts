// Where the studio lives: the site serves it under /studio, and vite.config.ts builds with base '/studio/' to match, so the app, its assets and its API are all under one prefix.
// api.ts, events.ts, checks.ts and casUrl all take it from here. The server strips an optional leading /studio, so the same build also answers locally.
export const PREFIX = '/studio'
export const apiPath = (path: string): string => PREFIX + path
