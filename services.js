const {request} = require('./request');
const Logger = require('./logger');
const {JSDOM} = require('jsdom');

const { Telegraf } = require('telegraf');

const BOT_ID = process.env.BOT_ID;
const CHAT_ID = process.env.CHAT_ID;

const BOT = new Telegraf(BOT_ID)


async function scrapeHome() {

  let html = null;

  try {
    html = await request();
  } catch(e) {
    Logger.warn('cannot get homepage');
  }

  if ( !html ) {
    Logger.warn('no html for homepage');
    return;
  }


  const data = await parseArticles(html);


  return data;

}


async function parseArticles(html) {
  const DOM = new JSDOM( html );
  const {window} = DOM;
  const {document} = window;

  let data = [];

  let articles = [...document.querySelectorAll('article[data-post-id]')];

  for ( let article of articles ) {
    let art = {id: Number(article.dataset.postId)};
    const a = article.querySelector('a');
    if ( a ) {
      const img = a.querySelector('img');

      if ( img ) {
        art.thumb = img.src;
      }

      art.link = a.href;

    }

    data.push(art);

  }

  return data;
}



async function readArticleOrComment({thumb, link}) {

  let html = null;
  try {
    html = await request(link);
  } catch(e) {
    Logger.warn('cannot load article');
    return;
  }

  const DOM = new JSDOM( html );
  const {window} = DOM;
  const {document} = window;

  let content = document.querySelector('div.entry-content');
  if ( !content ) {
    Logger.warn('cannot get content element');
    return;
  }

  const data = {};

  let parag = content.querySelector('p');
  let img = content.querySelector('figure img');

  if ( parag ) {
    data.subtitle = parag.textContent;
  }
  if ( img ) {
    data.image = img.dataset.origFile || img.src;
  } else {
    Logger.warn('episode text non found');
    return;
  }


  return data;

}


async function scrapeSingleOlder(url, last_post_id) {

  Logger.info('getting older post');
  let text = await request(url);
  let data = null;

  try {
    data = JSON.parse(text);
  } catch( e ) {
    Logger.warn('cannot get previous posts');
    Logger.log( text );
    Logger.log('');
    return;
  }


  if ( data.ids.length <= 0 ) {
    Logger.warn('no older articles');
    return false;
  }

  let res = [];

  let  ids = data.ids;

  for ( let [index, id] of ids.entries() ) {
    if ( id <= last_post_id ) {
      Logger.info('some post have been already notified, index:', index);
      data.items = data.items.slice(0, index);
      data.ids = data.ids.slice(0, index);
      break;
    }
  }

  Logger.log('total article to scrape', data.items.length);

  for  ( let rawArticle of data.items) {
    let html = rawArticle.html;
    res = res.concat( await parseArticles(html) );
  }

  Logger.log('descending sort items');
  res.sort( (a, b) => {
    return a.id > b.id ? 1 : -1;
  });


  return {data: res};
}


async function scrapeOlder(last_post_id) {

  Logger.info('scraping older post');

  let url = 'https://ilsignordistruggere.com/wp-json/newspack-blocks/v1/articles?className=is-style-default&imageShape=uncropped&moreButton=1&showAuthor=0&postLayout=grid&columns=2&postsToShow=500&showExcerpt=1&excerptLength=55&showReadMore=0&readMoreLabel=Keep%20reading&showDate=1&showImage=1&showCaption=0&minHeight=0&moreButtonText&showAvatar=1&showCategory=0&mediaPosition=top&&&&&&&typeScale=4&imageScale=3&mobileStack=0&sectionHeader&specificMode=0&textColor&customTextColor&singleMode=0&showSubtitle=0&postType%5B0%5D=post&exclude_ids=&page=';
  let tot = [];

  let page = 0;

  while( true ) {
    Logger.info('try scraping', ++page, 'page');
    let res = await scrapeSingleOlder( `${url}${page}`, last_post_id );
    
    if  ( res === false ) {
      Logger.info('No next page. stop scraping');
      break;
    }

    tot = tot.concat(res.data);
  }

  Logger.info('found', tot.length, 'articles');

  return tot;
}


async function notifyChannel(media) {

  async function noty() {
    return new Promise( async (resolve, reject) => {
      try {
        // Logger.log('notifying', media);
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
    throw e;
  }

}


function between(min, max) {
  return Math.floor(
    Math.random() * (max - min) + min
  )
}


module.exports = {scrapeHome, readArticleOrComment, scrapeOlder, notifyChannel, between}
