const data = 'username:pass:word';

const userpass = (() => {

  let username = '';
  let password = '';
  let hasUsername = false;

  for (let i = 0; i < data.length; i++) {
    const char = data.substring(i, i + 1);
    if (!hasUsername) {
      if (char === ':') {
        hasUsername = true;
        continue;
      } else {
        username += char;
      }
    } else {
      password += char;
    }
  }

  return [username, password];

})();

console.log(userpass);
