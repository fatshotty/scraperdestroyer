const Services = require('./services');
const Logger = require('./logger');
const Slimbot = require('slimbot');
const FS = require('fs');
const Path = require('path');

const CronJob = require('cron').CronJob;



const FILE_PATH = Path.join( __dirname, 'last_post.dat');


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


const Telegram = new Slimbot(BOT_ID);

async function start() {

  let LAST_POST_ID = await readFile();
  if ( LAST_POST_ID ) {
    LAST_POST_ID = parseInt( LAST_POST_ID );
  } else {
    LAST_POST_ID = 0;
  }

  let articles = await Services.scrapeHome();

  let IDS = [];

  for ( let article of articles ) {
    let id = Number(article.id);

    if ( id <= LAST_POST_ID ) {
      Logger.log('article', article.id, 'already notified');
      continue;
    }

    IDS.push(id);

    let firstPage = await Services.readArticleOrComment(article);
    if ( firstPage ) {
      let secondPage = await Services.readArticleOrComment({thumb: article.thumb, link: `${article.link}/2/`});

      Logger.log('=====');
      Logger.log(article.thumb);
      Logger.log(firstPage.image);
      Logger.log(firstPage.subtitle);
      Logger.log('---');
      Logger.log(secondPage.image);
      Logger.log(secondPage.subtitle);
      Logger.log('');

      try {
        await notify(article, firstPage, secondPage);
      } catch (e) {
        Logger.warn('cannot notify on telegram');
        Logger.error(e);
      }

    }

  }

  IDS.sort();
  let lastID = IDS.pop();
  if ( lastID ) {
    await saveFile( lastID );
    Logger.log('last post id is', lastID);
  }


}


async function notify(article, firstPage, secondPage) {

  return new Promise( async (resolve, reject) => {

    let opts = {
      parse_mode: "html",
      disable_web_page_preview: false,
      disable_notification: false,
      // caption: [`${firstPage.subtitle || ''}`, `---`, `<i>${secondPage.subtitle || ''}</i>`].join('\n')
    };

    await Telegram.sendPhoto(CHAT_ID, article.thumb, opts);
    await Telegram.sendPhoto(CHAT_ID, firstPage.image, {...opts, caption: firstPage.subtitle});
    await Telegram.sendPhoto(CHAT_ID, secondPage.image, {...opts, caption: secondPage.subtitle});
    await Telegram.sendMessage(CHAT_ID, '➖➖➖➖➖➖➖➖➖');

    Logger.info('correctly notified on telegram');
    setTimeout(resolve, 2000);
  });
}


start();

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
