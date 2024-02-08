/**
 * @see https://www.npmjs.com/package/urllib/v/2.41.0
 */
const { request } = require("urllib");
const { creds } = require('./settings');

const isDigestRequest = ({
  headers,
  statusCode
}) => headers['www-authenticate'] && statusCode === 401;

/**
 * Returns a new response stream
 */
const handleDigestRequest = async ({ proxyRes, req }) => {

  const fullUrl = proxyRes.req.res.responseUrl;

  const options = {
    method: req.method,
    headers: {
      ...req.headers,
    },
    digestAuth: `${creds.login}:${creds.password}`,
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

  const newResponse = await request(
    fullUrl,
    options,
  );

  const { res: targetResult } = newResponse;

  return targetResult;

};

module.exports = {
  handleDigestRequest,
  isDigestRequest,
};
