// Content stores local images relative to the site root.
export function assetPath(path: string): string {
  return path.startsWith('/') && !path.startsWith('//')
    ? `${import.meta.env.BASE_URL}${path.slice(1)}`
    : path;
}
