const getFullUrl = req => req.protocol + '://' + req.get('host') + req.originalUrl;

const getRequestBody = (req) => {

  return new Promise((resolve, reject) => {
    req.setEncoding('utf8');
    req.rawBody = '';
    req.on('data', function(chunk) {
      req.rawBody += chunk;
    });
    req.on('end', function(){
      return resolve(req.rawBody);
    });
  });

};

module.exports = {
  getFullUrl,
  getRequestBody,
};
