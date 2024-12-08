import { createSecureServer } from "node:http2";
import mkcert from "mkcert";
import { createHonoServer } from "react-router-hono-server/node";
import { exampleMiddleware } from "./middleware";

console.log("loading server");

const getSSLConfig = async () => {
  const ca = await mkcert.createCA({
    organization: "Development CA",
    countryCode: "US",
    state: "California",
    locality: "San Francisco",
    validity: 365,
  });

  const cert = await mkcert.createCert({
    domains: ["127.0.0.1", "localhost"],
    validity: 365,
    ca: { key: ca.key, cert: ca.cert },
  });

  return { cert: cert.cert, key: cert.key };
};

const cert = await getSSLConfig();

export default await createHonoServer({
  configure(server) {
    server.use("*", exampleMiddleware());
  },
  listeningListener(info) {
    console.log(`Server is listening on https://localhost:${info.port}`);
  },
  customNodeServer: {
    createServer: createSecureServer,
    serverOptions: {
      cert: cert.cert,
      key: cert.key,
    },
  },
});
