const settings = {
  port: 7035,
  activeDevice: 'derp',
  devices: [
    {
      name: 'bar',
      ip: '192.168.97.8',
      protocol: 'http',
      username: 'root',
      password: 'pass',
    },
    {
      name: 'foo',
      ip: '192.168.104.13',
      protocol: 'http',
      username: 'root',
      password: 'password',
    },
    {
      name: 'M3044',
      ip: '192.168.97.4',
      protocol: 'https',
      username: 'root',
      password: 'BeV-4aRY2k=!',
    },
    {
      name: 'Q3505',
      ip: '192.168.97.21',
      protocol: 'http',
      username: 'root',
      password: 'F)I4:r@KI@2!',
    },
    {
      name: 'derp',
      ip: '192.168.97.2',
      protocol: 'https',
      username: 'root',
      password: '!AWGBX<PMy-"',
    },
  ],
};

const getDevice = () => settings.devices.find(d => d.name === settings.activeDevice);

module.exports = {
  ...settings,
  device: getDevice(),
  getDevice,
};
