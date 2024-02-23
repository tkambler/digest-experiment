/**
 * @see https://www.npmjs.com/package/urllib/v/2.41.0
 */
const { request } = require("urllib");
const { device } = require('./settings');

const isDigestRequest = ({
  headers,
  statusCode
}) => (headers['www-authenticate'] && statusCode === 401) ? true : false;

/**
 * Returns a new response stream
 */
const handleDigestRequest = async ({ proxyRes, req }) => {

  // const fullUrl = proxyRes.req.res.responseUrl;
  // console.log('proxyRes', proxyRes);
  // console.log('proxyRes.req.path', proxyRes.req.path);

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
  delete options.headers['content-length'];

  // console.log('options', options);

  const newResponse = await request(
    fullUrl,
    options,
  );

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
  isDigestRequest,
};
