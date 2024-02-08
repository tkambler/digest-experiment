module.exports = {
  port: 7035,
  device: {
    ip: "192.168.97.4",
    protocol: "https",
  },
  creds: {
    login: process.env.USER,
    password: process.env.PASS,
  },
};
