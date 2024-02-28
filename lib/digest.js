/**
 * @see https://www.npmjs.com/package/urllib/v/2.41.0
 */
const { request } = require("urllib");
const md5 = require('md5');
const auth = require("http-auth");
const { device } = require("./settings");

const calculateDigestHeader = ({
  proxyRes,
  login,
  password,
}) => {

  // console.log('proxyRes', proxyRes);
  // console.log('xxx', proxyRes.req);
  // console.log('path / url', `${proxyRes.req.path} / ${proxyRes.req.url} / ${proxyRes.req.originalUrl}`);

  const authHeaders = proxyRes.headers["www-authenticate"];
  console.log("authHeaders", authHeaders);

  /* NOTE: authHeaders should be formatted like Digest realm="AXIS_ACCC8EA6B250", nonce="F2NAAVy9BQA=33f008c70fa60054cdefb4706a60ec74d7ca0323", algorithm=MD5, qop="auth"
   *       in that order. But just in case, we should individually regex match each part of the digest response in case
   *       a device has a bad digest auth implementation and they're out of order
   */

  // Regex match the realm
  const realm = authHeaders.match(/realm="?(?<realm>[^",]+)"?/)?.groups?.realm;
  console.log('realm', realm);

  // if (!realm) {
  //   if (defaults.debug.model) {
  //     self.logger.warn(
  //       { requestOptions, authHeaders },
  //       "getDigestHeaders: failed to regex match realm from authHeaders"
  //     );
  //   }
  //   return [
  //     new Error("getDigestHeaders: error finding realm in authHeaders"),
  //     null,
  //   ];
  // }

  // Regex match the nonce
  const nonce = authHeaders.match(/nonce="?(?<nonce>[^",]+)"?/)?.groups?.nonce;
  console.log('nonce', nonce);

  // if (!nonce) {
  //   if (defaults.debug.model) {
  //     self.logger.warn(
  //       { requestOptions, authHeaders },
  //       "getDigestHeaders: failed to regex match nonce from authHeaders"
  //     );
  //   }
  //   return [
  //     new Error("getDigestHeaders: error finding nonce in authHeaders"),
  //     null,
  //   ];
  // }

  // Regex match the algorithm (may be unspecified)
  const algorithm = authHeaders.match(/algorithm="?(?<algorithm>[^",]+)"?/)
    ?.groups.algorithm;
  console.log('algo', algorithm);

  // Regex match the qop (may be unspecified)
  const qop = authHeaders.match(/qop="?(?<qop>[^",]+)"?/)?.groups?.qop;
  console.log('qop', qop);
  // if (qop && qop.toLowerCase() === "auth-int") {
  //   // TODO: support auth-int qop type
  //   self.logger.warn(
  //     { requestOptions, authHeaders, qop },
  //     "getDigestHeaders: qop type is not supported"
  //   );
  //   return [new Error("getDigestHeaders: qop.type is not supported"), null];
  // }

  // Generate a cnonce and nc
  const cnonce = `${md5(String(Date.now()))}`.slice(0, 16);
  const nc = "00000001";

  // Extract the path from the url
  // const uri = new URL(requestOptions.url).pathname;
  const uri = proxyRes.req.path;
  console.log('uri', uri);
  const method = proxyRes.req.method;
  console.log('method', method);

  // Build the digest response (https://en.wikipedia.org/wiki/Digest_access_authentication)
  let HA1;
  if (algorithm === "MD5-sess") {
    HA1 = md5(
      `${md5(`${login}:${realm}:${password}`)}:${nonce}:${cnonce}`
    );
    console.log('...1', HA1);
  } else {
    const str = `${login}:${realm}:${password}`;
    HA1 = md5(str);
    console.log('...2', str, HA1);
  }

  const str = `${method}:${uri}`;
  console.log('str', str);
  const HA2 = md5(str);
  console.log('HA2', HA2);

  let digestResponse;
  if (!qop) {
    digestResponse = md5(`${HA1}:${nonce}:${HA2}`);
  } else {
    const qopStr = `${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`;
    console.log('qopStr', qopStr);
    digestResponse = md5(qopStr);
  }

  const build = [
    `Digest username="${login}"`,
    `realm="${realm}"`,
    `nonce="${nonce}"`,
    `uri="${uri}"`,
  ];

  if (algorithm) {
    build.push(`algorithm=${algorithm}`);
  }
  build.push(`response="${digestResponse}"`);

  if (qop) {
    build.push(`qop=${qop}`, `nc=${nc}`, `cnonce="${cnonce}"`);
  }

  return build.join(', ');

  // return {
  //   authorization: build.join(', '),
  // };

};

const responseIsDigestChallenge = ({ headers, statusCode }) =>
  headers["www-authenticate"] && statusCode === 401 ? true : false;

/**
 * Returns a new response stream
 */
const handleDigestRequest = async ({ proxyRes, req, res }) => {
  // const fullUrl = proxyRes.req.res.responseUrl;
  // console.log('proxyRes', proxyRes);
  // console.log('proxyRes.req.path', proxyRes.req.path);

  const digestHeader = await calculateDigestHeader({
    proxyRes,
    login: device.username,
    password: device.password,
  });
  console.log("digestHeader", digestHeader);

  res.setHeader('Authorization', digestHeader);

  return;

  const fullUrl = `${device.protocol}://${device.ip}${proxyRes.req.path}`;

  // console.log('fullUrl', fullUrl);

  const options = {
    method: req.method,
    headers: {
      ...req.headers,
    },
    digestAuth: `${device.username}:${device.password}`,
    timeout: 30000,
    streaming: true,
    rejectUnauthorized: false,
    followRedirect: true,
    keepHeaderCase: true,
    // contentType: '',
    /**
     * Object - Data to be sent. Will be stringify automatically.
     */
    data: req.body,
    /**
     * content String | Buffer - Manually set the content of payload. If set, data will be ignored.
     */
    // content: req.body,
    /**
     * stream.Readable - Stream to be pipe to the remote. If set, data and content will be ignored.
     */
    // stream
  };

  delete options.headers.host;
  delete options.headers["content-length"];

  console.log("digest response options", options);

  const newResponse = await request(fullUrl, options);

  // console.log('responding to digest request', JSON.stringify({
  //   fullUrl,
  //   options,
  //   response: {
  //     statusCode: newResponse.res.statusCode,
  //   }
  // }, null, 2));

  const { res: targetResult } = newResponse;

  return targetResult;
};

module.exports = {
  handleDigestRequest,
  responseIsDigestChallenge,
};
