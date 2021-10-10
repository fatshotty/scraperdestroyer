const GOT = require('got');


const DOMAIN = "https://ilsignordistruggere.com/";


async function request(path) {

  const response = await GOT( `${path || DOMAIN}`);
  return response.body

}



module.exports = {request}
