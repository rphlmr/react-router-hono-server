export type MetaEnv<T> = {
  [K in keyof T as `import.meta.env.${string & K}`]: T[K];
};
