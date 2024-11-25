const envs = ["test", "development", "production"] as const;
type NodeEnv = (typeof envs)[number];

export function getMode() {
  const NODE_ENV = process.env.NODE_ENV?.toLowerCase() as NodeEnv | undefined;

  if (!NODE_ENV || !envs.includes(NODE_ENV)) {
    throw new Error(
      `NODE_ENV is not set or is not valid: ${NODE_ENV}. Please set it to one of the following: ${envs.join(", ")}`
    );
  }

  return NODE_ENV;
}

export type MetaEnv<T> = {
  [K in keyof T as `import.meta.env.${string & K}`]: T[K];
};
