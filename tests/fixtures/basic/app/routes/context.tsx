import { testContext } from "../load-context";

export function loader({
  context,
}: {
  context: { get: (key: typeof testContext) => { testValue: string } };
}) {
  return context.get(testContext);
}

export default function ContextRoute({ loaderData }: { loaderData: { testValue: string } }) {
  return <h1>{loaderData.testValue}</h1>;
}
