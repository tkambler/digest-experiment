const express = require("express");
const bodyParser = require('body-parser');
const ReadableStreamClone = require("readable-stream-clone");
const proxyMiddleware = require('./middleware/proxy');

const app = express();

// app.use(async (req, res, next) => {

//   const contentLength = req.headers['content-length'] ? parseInt(req.headers['content-length'], 10) : 0;

//   const req2 = new ReadableStreamClone(req);

//   if (contentLength > 0) {
//     console.log('reading raw request body for:', req.url);
//     await new Promise((resolve, reject) => {
//       req.setEncoding('utf8');
//       req.rawBody = '';
//       req2.on('data', function(chunk) {
//         req.rawBody += chunk;
//       });
//       req2.on('end', function() {
//         return resolve(req.rawBody);
//       });
//     });
//     console.log('received raw request body for:', req.url, req.rawBody);

//     return next();

//   } else {
//     return next();
//   }


//   // if (req.url.includes('param.cgi')) {
//   //   console.log('XXX', req);

//   //   await new Promise((resolve, reject) => {
//   //     req.setEncoding('utf8');
//   //     req.rawBody = '';
//   //     req.on('data', function(chunk) {
//   //       req.rawBody += chunk;
//   //     });
//   //     req.on('end', function(){
//   //       return resolve(req.rawBody);
//   //     });
//   //   });

//   //   console.log('rawBody', req.rawBody);

//   //   return next();

//   // } else {
//   //   return next();
//   // }
// });

app.use(bodyParser.raw({
  type: '*/*',
}));

app.use((req, res, next) => {
  console.log('req.url', req.url, req.body, req.body?.toString('utf-8'), req.headers['content-type']);
  return next();  
});

// app.use(bodyParser.text({
//   type: 'text/plain',
// }));
// app.use(bodyParser.json({
//   type: 'application/json',
// }));
app.use(proxyMiddleware);

module.exports = app;
