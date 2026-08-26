/**
 * Bridges the Tauri updater to a *private* GitHub repo.
 *
 * tauri-plugin-updater does a plain unauthenticated HTTPS GET against its
 * configured endpoint. That works fine against public-repo release assets,
 * but a private repo's release assets 404 without a GitHub token — so this
 * worker holds that token server-side and re-exposes just two things:
 *
 *   GET /latest.json        -> the latest release's `latest.json` asset,
 *                              with every platform's `url` rewritten to
 *                              point back at this worker's own /download
 *                              route (so the client never needs its own
 *                              GitHub credentials).
 *   GET /download/:filename -> streams that named asset's real bytes,
 *                              fetched from GitHub with the token attached.
 *
 * `/repos/{owner}/{repo}/releases/latest` only ever returns the newest
 * *published* (non-draft, non-prerelease) release — so release.yml's
 * `releaseDraft: true` review step still works exactly as before: nothing
 * here is visible to users until you click "Publish release" on GitHub.
 */

export interface Env {
  GITHUB_TOKEN: string;
  GITHUB_OWNER: string;
  GITHUB_REPO: string;
}

interface GitHubAsset {
  id: number;
  name: string;
  url: string; // API asset URL — NOT browser_download_url (that one 404s without auth on a private repo)
}

interface GitHubRelease {
  tag_name: string;
  assets: GitHubAsset[];
}

interface UpdaterManifest {
  version: string;
  notes?: string;
  pub_date?: string;
  platforms: Record<string, { signature: string; url: string }>;
}

const GITHUB_API = 'https://api.github.com';

function ghHeaders(env: Env, accept = 'application/vnd.github+json'): HeadersInit {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: accept,
    'User-Agent': 'ytmd-updater-worker',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function getLatestRelease(env: Env): Promise<GitHubRelease> {
  const res = await fetch(
    `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/releases/latest`,
    { headers: ghHeaders(env) },
  );
  if (!res.ok) {
    throw new Error(`GET releases/latest failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

async function fetchAssetText(env: Env, assetApiUrl: string): Promise<string> {
  const res = await fetch(assetApiUrl, { headers: ghHeaders(env, 'application/octet-stream') });
  if (!res.ok) {
    throw new Error(`GET asset failed: ${res.status}`);
  }
  return res.text();
}

async function handleLatestJson(env: Env, workerOrigin: string): Promise<Response> {
  const release = await getLatestRelease(env);
  const manifestAsset = release.assets.find((a) => a.name === 'latest.json');
  if (!manifestAsset) {
    return new Response('Latest release has no latest.json asset', { status: 404 });
  }

  const manifest: UpdaterManifest = JSON.parse(await fetchAssetText(env, manifestAsset.url));

  for (const info of Object.values(manifest.platforms)) {
    const filename = new URL(info.url).pathname.split('/').pop();
    if (filename) {
      info.url = `${workerOrigin}/download/${encodeURIComponent(filename)}`;
    }
  }

  return new Response(JSON.stringify(manifest), {
    headers: {
      'Content-Type': 'application/json',
      // Short cache: long enough to absorb a burst of update checks after a
      // release goes out, short enough that a freshly published release is
      // picked up quickly.
      'Cache-Control': 'public, max-age=120',
    },
  });
}

async function handleDownload(env: Env, filename: string): Promise<Response> {
  const release = await getLatestRelease(env);
  const asset = release.assets.find((a) => a.name === filename);
  if (!asset) {
    return new Response(`Asset not found on latest release: ${filename}`, { status: 404 });
  }

  // The Workers runtime's fetch() follows redirects by default, so this one
  // call also transparently follows GitHub's 302 to the actual signed
  // download URL — no manual redirect handling needed.
  const assetRes = await fetch(asset.url, { headers: ghHeaders(env, 'application/octet-stream') });
  if (!assetRes.ok || !assetRes.body) {
    return new Response(`Failed to fetch asset from GitHub: ${assetRes.status}`, { status: 502 });
  }

  return new Response(assetRes.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    try {
      if (url.pathname === '/latest.json') {
        return await handleLatestJson(env, url.origin);
      }

      const downloadMatch = url.pathname.match(/^\/download\/(.+)$/);
      if (downloadMatch) {
        return await handleDownload(env, decodeURIComponent(downloadMatch[1]));
      }

      return new Response('Not found', { status: 404 });
    } catch (err) {
      return new Response(`Worker error: ${(err as Error).message}`, { status: 500 });
    }
  },
};
