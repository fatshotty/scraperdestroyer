require('dotenv').config();

const Services = require('./services');
const Logger = require('./logger');
const FS = require('fs');
const Path = require('path');
const Request = require('./request');

const CronJob = require('cron').CronJob;

const { Telegraf } = require('telegraf');
const { resolveSrv } = require('dns');


const BOT_ID = process.env.BOT_ID;
const CHAT_ID = process.env.CHAT_ID;

const FILE_PATH = Path.join( __dirname, 'last_post.dat');

const BOT = new Telegraf(BOT_ID)


async function saveFile(data) {
  FS.writeFileSync( FILE_PATH, `${data}`, 'utf-8');
}
async function readFile() {
  if ( FS.existsSync( FILE_PATH ) ) {
    let data = FS.readFileSync( FILE_PATH, {encoding: 'utf-8'});
    return data.replace('\n', '');
  }
  return '0';
}


async function start() {

  Logger.log('Start scraping');

  let LAST_POST_ID = await readFile();
  if ( LAST_POST_ID ) {
    LAST_POST_ID = parseInt( LAST_POST_ID );
  } else {
    LAST_POST_ID = 0;
  }

  let articles = await Services.scrapeHome();
  articles.sort( (a, b) => {
    return a.id > b.id ? 1 : -1;
  });


  await loopArticles(articles, LAST_POST_ID);


}


async function loopArticles(articles, LAST_POST_ID) {
  let IDS = [];

  for ( let article of articles ) {

    let notified = await manageSingleArticle(article, LAST_POST_ID);
    if ( notified ) {
      IDS.push( Number(article.id) );
    }

    if ( IDS.length > 0 && IDS.length % 10 == 0 ) {
      Logger.info('current article:', article.id);
    }
  }

  IDS.sort();
  let lastID = IDS.pop();
  if ( lastID ) {
    await saveFile( lastID );
    Logger.log('last post id is', lastID);
  }
}


async function manageSingleArticle(article, LAST_POST_ID) {

  let id = Number(article.id);

  if ( id <= LAST_POST_ID ) {
    Logger.log('article', article.id, 'already notified');
    return false;
  }

  let firstPage = await Services.readArticleOrComment(article);
  if ( firstPage ) {
    let secondPage = await Services.readArticleOrComment({thumb: article.thumb, link: `${article.link}/2/`});

    Logger.log('=====', article.id ,'=====');
    Logger.log(article.thumb);
    Logger.log(firstPage.image);
    Logger.log(firstPage.subtitle);
    Logger.log('---');
    Logger.log(secondPage.image);
    Logger.log(secondPage.subtitle);
    Logger.log('->', article.link);
    Logger.log('');

    try {
      await notify(article, firstPage, secondPage);
    } catch (e) {
      Logger.warn('cannot notify on telegram');
      Logger.error(e);
    }

  }

  return true;


}


async function notify(article, firstPage, secondPage) {

  return new Promise( async (resolve, reject) => {

    let link = `<a href="${article.link}" >qui ↗️</a>`;

    function getDescr(str) {
      let allow = parseInt( (1024 / 2) - (link.length / 2) );
      if ( str && str.length > allow ) {
        str = str.substring(0, allow - 2) + '...';
      }
      return str || '';
    }

    if ( firstPage.subtitle == secondPage.subtitle ) {
      secondPage.subtitle = '';
    }

    let media = [
      {type: 'photo', media: article.thumb, caption: [
        getDescr(firstPage.subtitle),
        '---',
        getDescr(secondPage.subtitle),
        `<a href="${article.link}" >qui ↗️</a>`
      ].join('\n'),
      parse_mode: "html",
      disable_web_page_preview: false},
      {type: 'photo', media: firstPage.image},
      {type: 'photo', media: secondPage.image}
    ].filter( (item) => {
      return !!item.media 
    });

    let to = between(2000, 6001);

    await notifyChannel(media);

    Logger.info('timeout: ', to);
    
    setTimeout(resolve, to);
  });
}

function between(min, max) {
  return Math.floor(
    Math.random() * (max - min) + min
  )
}

async function notifyChannel(media) {

  async function noty() {
    return new Promise( async (resolve, reject) => {
      try {
        await BOT.telegram.sendMediaGroup(CHAT_ID, media);
        resolve(true);
      } catch (e) {
        let rsp = e.response;
        if ( rsp ) {
          let timeout = null;
          if ( e.code == 429 ) {
            let parm = rsp.parameters;
            if ( parm.retry_after ) {
              timeout = parm.retry_after;
            }
          } else if ( e.code == 400 && rsp.description == 'Bad Request: group send failed' ) {
            timeout = 30;
          }
          if ( timeout ) {
            setTimeout( () => {
              resolve(false);
            }, (timeout + 1) * 1000);
            Logger.log('wait for', timeout, 'secs');
            return;
          }
        }
        reject(e);
      }
    });
  }

  try {
    let res = await noty();
    if ( res === false ) {
      await noty();
    }
  } catch(e) {
    Logger.warn('error notifying', e);
    Logger.warn( JSON.stringify(media) );
  }

}


// notify(

//   {thumb: 'https://i2.wp.com/ilsignordistruggere.com/wp-content/uploads/2021/09/POST497.jpg?fit=740%2C410&ssl=1', link: ''},
//   {subtitle: 'Eccoci dinanzi a un segreto vecchio come il mondo, ma sempre attuale. In realtà, più del banale segreto a me hanno fatto sorridere alcuni dettagli della vicenda. Vediamo se li individuate anche voi.', image: 'https://i2.wp.com/ilsignordistruggere.com/wp-content/uploads/2021/09/curiosita.jpg?fit=1248%2C1157&ssl=1'},
//   {subtitle: 'I commenti mi fanno morire. Questa volta anche spietati, “se non l’hanno chiamato fino ad ora non lo chiameranno più”, della serie “stai serena”', image: 'https://i1.wp.com/ilsignordistruggere.com/wp-content/uploads/2021/09/commenti-curiosita.jpg?fit=984%2C1190&ssl=1'}

// )

const JOB = new CronJob('0 0 16/21 * * *', start, () => {
  Logger.log('Job completed');
}, false, 'Europe/Rome', null, true);

JOB.start();

Logger.log('Job ready');




// async function scrapeOlder() {

//   let LAST_POST_ID = await readFile();
//   if ( LAST_POST_ID ) {
//     LAST_POST_ID = parseInt( LAST_POST_ID );
//   } else {
//     LAST_POST_ID = 0;
//   }

//   let articles = await Services.scrapeOlder(LAST_POST_ID);

//   articles.sort( (a, b) => {
//     return a.id > b.id ? 1 : -1;
//   });

//   await loopArticles(articles, LAST_POST_ID);

// }

// scrapeOlder()
