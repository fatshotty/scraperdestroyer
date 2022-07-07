const { IgApiClient } = require('instagram-private-api');
const inquirer = require('inquirer');

const ig = new IgApiClient();

console.log('device');
// ig.state.generateDevice('fatshotty');

;(async () => {
  // // Execute all requests prior to authorization in the real Android application
  // // Not required but recommended
  // console.log('prelogin')
  // await ig.simulate.preLoginFlow();

  // console.log('login')
  // let loggedInUser = null;
  // try { 
  //   loggedInUser = await ig.account.login('fatshotty', 'fatinstagram');
  // } catch(e) {
  //   console.log(ig.state.checkpoint); // Checkpoint info here
  //   if (!ig.state.checkpoint) {
  //     console.log('check is nul');
  //     console.log(e);
  //     console.log('state');
  //     console.log(await ig.challenge.state())
  //     console.log('challenge auto');
  //     await ig.challenge.auto(true) // Requesting sms-code or click "It was me" button
  //   } else {
  //     console.log('send code');
  //     await ig.challenge.selectVerifyMethod(1, false); //1. Email 0. SMS  send code OTP
  //   }

  //   console.log('checkpoint');
  //   console.log(ig.state.checkpoint); // Challenge info here
  //   const { code } = await inquirer.prompt([
  //     {
  //       type: 'input',
  //       name: 'code',
  //       message: 'Enter code',
  //     },
  //   ]);
  //   console.log('try login');
  //   loggedInUser = await ig.challenge.sendSecurityCode(code);
  //   console.log(loggedInUser);
  // }

  // // The same as preLoginFlow()
  // // Optionally wrap it to process.nextTick so we dont need to wait ending of this bunch of requests
  // // console.log('postlogin')
  // // await ig.simulate.postLoginFlow()

  // // Create UserFeed instance to get loggedInUser's posts
  // console.log('user');
  // const userFeed = ig.feed.user(loggedInUser.pk);
  // const myPostsFirstPage = await userFeed.items();

  // console.log(userFeed, myPostsFirstPage.length);

  // const ilsig = await ig.user.getIdByUsername('ilsignordistruggere')
  // console.log(ilsig);

  // const sigFeed = ig.feed.user(ilsig);
  // console.log('user feeds', sigFeed);
  // let count = 0;
  // while(count < 10) {
  //   const sigPostsFirstPage = await sigFeed.items();
  //   console.log(count, sigPostsFirstPage.length, sigPostsFirstPage[0].pk);

  //   for(let a of sigPostsFirstPage) {
  //     console.log(a.pk, a.carousel_media_count);
  //   }

  //   const fil = sigPostsFirstPage.filter(i => (!i.carousel_media_count || i.carousel_media_count < 2));
  //   if ( fil.length > 0 ) {
  //     console.log('sigPostsFirstPage', JSON.stringify(fil, null, 2) );
  //     break;
  //   }
  //   count++;
  // }


})();
