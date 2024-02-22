const { app, proxy } = require('./lib/server');
const { port, getDevice } = require('./lib/settings');

const device = getDevice();

const server = app.listen(port, () => {
  console.log(`server is running: http://127.0.0.1:${port}`);
});

server.on("error", err => {
  console.log('error', err);
});

server.on('error', (err) => {
  console.log('err', err);
});

server.on('upgrade', (req, socket, head) => {
  
  console.log('upgrade', {
    digest_auth_status: req.digest_auth_status,
  });

  // console.log('req', req);
  // console.log('socket', socket);
  // console.log('head', head);



  const target = `ws://${device.username}:${device.password}@${device.ip}${req.url}`;
  console.log('target', target);

  req.on('error', err => {
    console.log('req error', err);
  });

  socket.on('error', err => {
    console.log('socket error', err);
  });

  console.log('upgrading', JSON.stringify({
    'req.url': req.url,
    'req.head': req.head,
    'req.method': req.method,
    head: head,
  }, null, 2));

  proxy.ws(req, socket, head, {
    target,
    secure: false,
    ws: true,
    changeOrigin: true,
    followRedirects: true,
    selfHandleResponse: true,
    ejectPlugins: true,
  }, err => {
    console.log('proxy err', err);
  });

});

// server.on("upgrade", function (req, socket, head) {
//   console.log("upgrade", req.url, req.headers, req.protocol);

//   const target = `ws://${device.ip}${req.url}`;

//   console.log('target', target);

  // proxy.ws(req, socket, head, {
  //   target,
  //   secure: false,
  //   ws: true,
  //   changeOrigin: true,
  //   followRedirects: true,
  //   selfHandleResponse: true,
  //   ejectPlugins: true,
  // }, err => {
  //   console.log('proxy err', err);
  // });
// });
