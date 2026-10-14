const baseUrl = import.meta.env.BASE_URL;
const basePath = baseUrl.replace(/\/$/, "");

export function withBasePath(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${basePath}${normalizedPath}`;
}

export function publicAsset(path: string) {
  return withBasePath(path);
}

export function stripBasePath(pathname: string) {
  if (!basePath || basePath === "/" || !pathname.startsWith(basePath)) {
    return pathname;
  }

  return pathname.slice(basePath.length) || "/";
}
