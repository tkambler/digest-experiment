const settings = {
  port: 7035,
  activeDevice: 'M3044',
  devices: [
    {
      name: 'M3044',
      ip: '192.168.97.4',
      protocol: 'http',
      username: 'root',
      password: 'pTrA2A4Q-IJ*',
    },
    {
      name: 'Q3505',
      ip: '192.168.97.21',
      protocol: 'http',
      username: 'root',
      password: ',fV"Q:1U;/J;',
    }
  ],
};

const getDevice = () => settings.devices.find(d => d.name === settings.activeDevice);

module.exports = {
  ...settings,
  device: getDevice(),
  getDevice,
};
