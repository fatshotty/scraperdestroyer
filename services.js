const {request} = require('./request');
const Logger = require('./logger');
const {JSDOM} = require('jsdom');


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


  const data = [];

  const DOM = new JSDOM( html );
  const {window} = DOM;
  const {document} = window;

  let articles = [...document.querySelectorAll('article[data-post-id]')];

  for ( let article of articles ) {
    let art = {id: article.dataset.postId};
    const a = article.querySelector('a');
    if ( a ) {
      const img = a.querySelector('img');

      if ( img ) {
        art.thumb = img.src;
      }

      art.link = a.href;

      data.push(art);

    }

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
    data.image = img.dataset.origFile;
  } else {
    Logger.warn('episode text non found');
    return;
  }


  return data;

}


module.exports = {scrapeHome, readArticleOrComment}
