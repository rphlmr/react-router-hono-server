/** Whether React Router is rendering a request as part of its build. */
export function isReactRouterBuildRequest() {
  return process.env.IS_RR_BUILD_REQUEST === "yes";
}
