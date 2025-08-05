export const VERSION = 1;

export async function getBuildInfo() {
  const module = await import("./config");
  return module.BUILD_INFO;
}
