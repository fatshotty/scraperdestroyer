const { IgApiClient } = require('instagram-private-api');
const Logger = require('./logger');
const Inquirer = require('inquirer');


const ig = new IgApiClient();


async function login() {

  ig.state.generateDevice('fatshotty');
  await ig.simulate.preLoginFlow();

  Logger.log('login')
  let loggedInUser = null;

  try {
    loggedInUser = await ig.account.login('fatshotty', 'fatinstagram');
  } catch(e) {
    Logger.log(ig.state.checkpoint); // Checkpoint info here
    if (!ig.state.checkpoint) {
      Logger.log('check is nul');
      Logger.log(e);
      Logger.log('state');
      Logger.log(await ig.challenge.state())
      Logger.log('challenge auto');
      await ig.challenge.auto(true) // Requesting sms-code or click "It was me" button
    } else {
      Logger.log('send code');
      await ig.challenge.selectVerifyMethod(1, false); //1. Email 0. SMS  send code OTP
    }

    Logger.log('checkpoint');
    Logger.log(ig.state.checkpoint); // Challenge info here
    const { code } = await Inquirer.prompt([
      {
        type: 'input',
        name: 'code',
        message: 'Enter code',
      },
    ]);
    Logger.log('try login');
    try {
      loggedInUser = await ig.challenge.sendSecurityCode(code);
      Logger.info('LOGIN OK');
    } catch(e) {
      Logger.error(e);
      throw e;
    }
  }

}

async function getUserPosts(username) {
  const ilsig = await ig.user.getIdByUsername(username);

  const sigFeed = ig.feed.user(ilsig);
  return await sigFeed.items();
}

module.exports = {login, getUserPosts};
