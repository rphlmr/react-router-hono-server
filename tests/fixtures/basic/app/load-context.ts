import { createContext } from "react-router";

export type TestContext = {
  testValue: string;
};

export const testContext = createContext<TestContext>();
