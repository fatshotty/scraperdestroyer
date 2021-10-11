const Insta = require('scraper-instagram');
const Logger = require('./logger');
const Path = require('path');
const FS = require('fs');
const Services = require('./services');
const CronJob = require('cron').CronJob;

const PROFILE = 'ilsignordistruggere';
const HASHTAG = 'pancinahot'

const FILE_PATH = Path.join( __dirname, 'last_post_insta.dat');

const InstaClient = new Insta();

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

  Logger.info('start reading instagram post')

  let LAST_POST_TS = await readFile();
  if ( LAST_POST_TS ) {
    LAST_POST_TS = Number( LAST_POST_TS );
  } else {
    LAST_POST_TS = 0;
  }

  let profile = null;
  try {
    profile = await InstaClient.getProfile(PROFILE);
  } catch(e) {
    Logger.warn('cannot get profile', e);
    return;
  }

  Logger.info('got profile and sorting posts');

  let lastPosts = profile.lastPosts;

  // lastPosts = LAST_POST;

  lastPosts.sort( (a, b) => {
    return a.timestamp > b.timestamp ? 1 : -1;
  });

  let lastTS = LAST_POST_TS;

  for ( let lpost of lastPosts ) {

    if ( LAST_POST_TS >= lpost.timestamp ) {
      Logger.info('post', lpost.shortcode, 'is too older');
      continue;
    }


    if ( lpost.caption.indexOf(`#${HASHTAG}`) > -1 ) {

      Logger.info('post', lpost.shortcode, 'is a', HASHTAG, 'post');

      // found post
      let post = null;
      try {
        post = await InstaClient.getPost( lpost.shortcode );
      } catch(e) {
        Logger.warn('cannot get post', e);
        break;
      }
      // let post = {
      //   "shortcode": "CUf9uqNjl-a",
      //   "author": {
      //     "id": "23443219",
      //     "username": "ilsignordistruggere",
      //     "name": "Vincenzo Maisto",
      //     "pic": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-19/s150x150/22351721_474761549571603_2158068663620468736_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_ohc=psqACfyJ20cAX9pcPA0&edm=AABBvjUBAAAA&ccb=7-4&oh=60bf4487802f7d8e9373bfb24b62cef1&oe=616B397A&_nc_sid=83d603",
      //     "verified": true,
      //     "link": "https://www.instagram.com//ilsignordistruggere"
      //   },
      //   "location": {
      //     "id": "213050058",
      //     "name": "Milan, Italy",
      //     "city": "Milan, Italy"
      //   },
      //   "contents": [{
      //     "type": "photo",
      //     "url": "https://instagram.flin1-1.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/243493814_453538419368226_4983405841242633805_n.jpg?_nc_ht=instagram.flin1-1.fna.fbcdn.net&_nc_cat=106&_nc_ohc=9Qg_hPkzYeoAX9CEYRv&edm=AABBvjUBAAAA&ccb=7-4&oh=92f42ee30142f0c403dbc42bf1869e45&oe=616AE3C9&_nc_sid=83d603"
      //   }, {
      //     "type": "photo",
      //     "url": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/244242411_403499504564332_4841054788436689117_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=104&_nc_ohc=n-z1t69KCj8AX9tAZTg&edm=AABBvjUBAAAA&ccb=7-4&oh=3bebbeb9a7891930846dde674656f870&oe=616BAFA9&_nc_sid=83d603"
      //   }],
      //   "tagged": [],
      //   "likes": 30553,
      //   "caption": "Grazie a questo #pancinahot qui a destra 👉🏻 possiamo apprendere ma tecnica della “sub”. 😱",
      //   "hashtags": ["#pancinahot"],
      //   "mentions": null,
      //   "edited": false,
      //   "comments": [{
      //     "id": "17955454630510492",
      //     "user": "dani.lo71",
      //     "content": "Mi sorge una sola domanda:”MA PERCHÉ???”",
      //     "timestamp": 1633935386,
      //     "hashtags": null,
      //     "mentions": null,
      //     "likes": 0
      //   }, {
      //     "id": "17904567335319003",
      //     "user": "lideachetimanca",
      //     "content": "Soffoconi qui...su rieducational channel",
      //     "timestamp": 1633959860,
      //     "hashtags": null,
      //     "mentions": null,
      //     "likes": 0
      //   }],
      //   "commentCount": 3097,
      //   "timestamp": 1633120152,
      //   "link": "https://www.instagram.com/p/CUf9uqNjl-a"
      // }

      let contents = post.contents;
      if ( contents ) {
        let media = contents.map( (item) => {
          return {
            type: 'photo',
            media: item.url
          }
        });
        media[0].caption = post.caption;

        try {
          await notify(media);
          lastTS = lpost.timestamp;
        } catch(e) {
          Logger.warn('cannot notify');
        }
        
      } else {
        Logger.warn('post', post.shortcode, 'has no contents');
      }

    }


  }

  await saveFile( lastTS );
  Logger.log('last insta post ts is', lastTS);

}


async function notify(media) {
  return new Promise( async (resolve, reject) => {

    let to = Services.between(2000, 6001);

    try {
      await Services.notifyChannel(media);
    } catch(e) {
      reject(e);
    }

    Logger.info('timeout: ', to);

    setTimeout(resolve, to);
  });
}


const LAST_POST = [{
    "shortcode": "CUz6rnHDnpA",
    "caption": "Ieri Orlando ha compiuto gli anni e questo quadro è stato il mio regalo di compleanno.\n\nIl quadro ritrae tutta la nostra famiglia.\nVe lo spiego: al centro sulle poltrone, ovviamente, io e Orlando.\n\nDavanti a noi i nostri gatti: Vamp, Brigida ed Ettore.\nVamp, definita “la parrucchiera”, è una Maine coon con la tendenza a leccare i capelli di chiunque. Ecco perché nel quadro ha una zampa su un asciugacapelli.\nBrigida è la randagina vaiassa napoletana che ho adottato l’anno scorso e che avete visto qui in mille foto.\nEttore è il primo gatto di Orlando, un altro Maine coon, con accanto la sua fidanzata. Cioè una pupazza di cui abusa abitualmente.\n\nAlle due estremità ci sono Sebastian e Rebecca, i nostri figli immaginari che in questi mesi ci divertivamo a mandarci via whatsapp combinando le nostre foto con un’app. I nomi in onore degli inesistenti figli di Pamela Prati e Mark Caltagirone.\n“Ma quindi volete figli?!”\n“No.”\n“Lo escludete anche per il futuro?”\n“Mah, magari a 70 anni adotteremo un brasiliano di 25.”\n\nIl quadro l’ho commissionato al mio illustratore di fiducia @endi78 . È lo stesso che anni fa realizzò la copertina di “mamme vegane contro l’invidia” e tutte le Illustrazioni presenti nel libro “le pancine d’amore”.\n\nDi seguito 👉🏻 il quadro, lo schizzo fantastico che inviai all’illustratore per fargli capire come doveva essere il quadro, le foto di Sebastian e Rebecca e quelle di Vamp ed Ettore.",
    "comments": 270,
    "likes": 13207,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/244663501_347318093808731_2664756071237097782_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=111&_nc_ohc=Ny7ter4oC2sAX-18tVT&edm=ABfd0MgBAAAA&ccb=7-4&oh=ad1b0e4339f1c1d3a76b7355071f74e1&oe=616BA7C7&_nc_sid=7bff83",
    "timestamp": 1633789643
  }, {
    "shortcode": "CUx_a3RDpS4",
    "caption": "Mi godo questo sashimi mentre voi vi godete questo #pancinahot qui a destra 👉🏻",
    "comments": 4000,
    "likes": 29420,
    "thumbnail": "https://instagram.flin1-1.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/244577013_296486138645946_2359584820558689958_n.jpg?_nc_ht=instagram.flin1-1.fna.fbcdn.net&_nc_cat=106&_nc_ohc=7bnStUBrCxQAX8MiQbF&edm=ABfd0MgBAAAA&ccb=7-4&oh=ce118168a1c00a0e822b23953148b63b&oe=616BE653&_nc_sid=7bff83",
    "timestamp": 1633725019
  }, {
    "shortcode": "CUxMJPdj6e1",
    "caption": "Ho approfittato di questo picnic di ortaggi fallici per stilare questo semplice vademecum di termini “pancini”. È infatti indispensabile, per comprendere al meglio i pancinahot, sapere cos’è “la gioia”, “la fiorella” e tutto il teatrino degli orrori associato.\n\nI riferimenti al sesso però non sono censurati solo nei gruppi sessuofobi delle mamme pancine, ma anche in tv, nei film, nelle serie e nei media in generale. Ad affrontare l’argomento su @primevideoit ci sarà da oggi #SEXUNCUT, un talk in collaborazione con Durex di dieci puntate tutto sul tema della sessualità con ginecologi, andrologi, psicoterapeuti, psicologi e tutto un mondo di personaggi social! #ad",
    "comments": 588,
    "likes": 16616,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/p1080x1080/245029026_243314064442063_4067812167104121035_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=107&_nc_ohc=rLD_t-khPKgAX__6HmM&edm=ABfd0MgBAAAA&ccb=7-4&oh=f3b71fe0865fed4c37ed1484b0203241&oe=616ABB21&_nc_sid=7bff83",
    "timestamp": 1633698135
  }, {
    "shortcode": "CUp_ewQjg6_",
    "caption": "Io e la mia damigella d’onore @giadafolcia siamo stati ospiti del @teatroarcimboldimilano per visitare i 17 nuovi camerini che, in occasione del #Fuorisalone2021, sono stati tutti interamente ridisegnati grazie al progetto #vietatolingresso che ha visto l’impegno di 19 studi di architettura e design.\nBellissimi.\n\nPh @ohrescjo \nMio outfit #suppliedby @tommyhilfiger \nMakeup Artist @gracho_mua",
    "comments": 45,
    "likes": 9278,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/p1080x1080/244618143_883139462407178_5039537471625848964_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=102&_nc_ohc=X7vH3Pq7JxwAX9Nm-Qf&edm=ABfd0MgBAAAA&ccb=7-4&oh=ab938bfa3a8ab0c4d8f7f99c741150a5&oe=616BA572&_nc_sid=7bff83",
    "timestamp": 1633456615
  }, {
    "shortcode": "CUf9uqNjl-a",
    "caption": "Grazie a questo #pancinahot qui a destra 👉🏻 possiamo apprendere ma tecnica della “sub”. 😱",
    "comments": 3097,
    "likes": 30553,
    "thumbnail": "https://instagram.flin1-1.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/243493814_453538419368226_4983405841242633805_n.jpg?_nc_ht=instagram.flin1-1.fna.fbcdn.net&_nc_cat=106&_nc_ohc=9Qg_hPkzYeoAX9CEYRv&edm=ABfd0MgBAAAA&ccb=7-4&oh=bc5104273377ac40bb0844792a559333&oe=616AE3C9&_nc_sid=7bff83",
    "timestamp": 1633120152
  }, {
    "shortcode": "CUaRCJuDHfk",
    "caption": "Ieri sera io e la mia damigella d’onore @giadafolcia siamo stati ospiti della prima di #PrettyWoman al @teatronazionale\n\nUna favola moderna con una morale importante: inizia con il fare la p, poi le cose miglioreranno!\n\nQuello del teatro è uno dei settori più colpiti dalla crisi dovuta alla pandemia. Andateci.\n\nPh @daniele_lista",
    "comments": 59,
    "likes": 7284,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/p1080x1080/243434778_234638301965036_3373233891226129304_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=108&_nc_ohc=DefALJJKocgAX-2X1ZN&edm=ABfd0MgBAAAA&ccb=7-4&oh=9ef0f1ce12283ee76b88f047a3421696&oe=616B3B2D&_nc_sid=7bff83",
    "timestamp": 1632928947
  }, {
    "shortcode": "CUARbQ1oU-6",
    "caption": "Tanti, tanti, tanti anni fa questa era una delle foto che utilizzavo sulle app di incontri. Oggi sarebbe una truffa in piena regola.\nCon questa seconda carrellata di chat chiudo il capitolo sulle MIE conversazioni prese da quelle app (non ne ho conservate altre e queste le ho ritrovate in galleria).\n\nSono arrivate tantissime vostre “esperienze”, nelle prossime settimane valuterò se portare avanti o meno questa rubrica. \n\nPs\nPer i casi umani convinti che io mi sia iscritto sulle app solo per sfottere, siete dei veri eb3ti. 1 perché negli screen si leggono le date e sono tutte vecchie, 2 perché non avrebbe senso condividere le chat “normali”, avute con persone sane di mente e con cui magari può anche esserci stato un incontro, 3 sono IMPEGNATO, tra 10 mesi mi sposo, sulle app di incontro non ci andrei manco per ridere.",
    "comments": 455,
    "likes": 26967,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/p1080x1080/242215766_386398329630971_2596332385102156289_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=111&_nc_ohc=UqbL3OQWbaYAX-SQk77&edm=ABfd0MgBAAAA&ccb=7-4&oh=def3bd5c12ecb2c3afe8ff25ebcfca8c&oe=616BB7CA&_nc_sid=7bff83",
    "timestamp": 1632056737
  }, {
    "shortcode": "CT76lXfoSXW",
    "caption": "Questi cupcake fattj oggi sono più audaci di questo #pancinahot qui a destra 👉🏻 😱",
    "comments": 2480,
    "likes": 32543,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/242092177_538925660552356_2295163044461937718_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=104&_nc_ohc=NZVHfWlcAYoAX-h4Tua&edm=ABfd0MgBAAAA&ccb=7-4&oh=f3af0f775bb1feb2f9a05764d506f765&oe=616B7067&_nc_sid=7bff83",
    "timestamp": 1631910544
  }, {
    "shortcode": "CTrvhu4DOmn",
    "caption": "Le relazioni stabili ci liberano anche dalle amenità delle app d’incontri.\n\nSì, la carrellata qui a destra è tutta mia, sono mie conversazioni passate.\n\nPotremmo creare una nuova rubrica da pubblicare nelle stories “il caso umano di Tinder”, non limitandoci solo a Tinder. Potrebbe essere interessante.\n\nInviate gli screen solo via email (l’indirizzo è nel profilo). No info private, no nomi, no foto p0rno, né foto riconoscibili, no minori.",
    "comments": 1182,
    "likes": 37127,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/p1080x1080/241762968_593940614966440_5173808331081493541_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=104&_nc_ohc=prQ2iA-sgkIAX_Yf_Ov&edm=ABfd0MgBAAAA&ccb=7-4&oh=355c87ce6c16578f330a5058902f97e5&oe=616ABDD0&_nc_sid=7bff83",
    "timestamp": 1631367876
  }, {
    "shortcode": "CTp5GR5D62D",
    "caption": "Un brindisi a questo #pancinahot !\nQui a destra 👉🏻",
    "comments": 1626,
    "likes": 25675,
    "thumbnail": "https://instagram.flin1-1.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/241557552_538136207457550_5595476766306225884_n.jpg?_nc_ht=instagram.flin1-1.fna.fbcdn.net&_nc_cat=110&_nc_ohc=P8g4tptZ560AX-3i2EA&edm=ABfd0MgBAAAA&ccb=7-4&oh=e23394e2f63ca0115abbabd870d57a2a&oe=616ACAD6&_nc_sid=7bff83",
    "timestamp": 1631305785
  }, {
    "shortcode": "CTmxaW8japh",
    "caption": "Prima riunione dal wedding planner.\nChi avrà mangiato tutti i confetti di @enzomiccio ?",
    "comments": 386,
    "likes": 28475,
    "thumbnail": "https://instagram.flin1-2.fna.fbcdn.net/v/t51.2885-15/e35/s1080x1080/241257939_880320502586824_204223378659103776_n.jpg?_nc_ht=instagram.flin1-2.fna.fbcdn.net&_nc_cat=104&_nc_ohc=s3VSyrWj1WEAX9Jej4o&edm=ABfd0MgBAAAA&ccb=7-4&oh=a372014d5eeeb5784a3dd43f6f3cc1df&oe=616C04C5&_nc_sid=7bff83",
    "timestamp": 1631201092
  }, {
    "shortcode": "CTj38Lxj4AK",
    "caption": "La mia bilancia elettronica mi dice che il 29 marzo pesavo 115,40kg, oggi peso 91,65kg, ho quindi perso in 4 mesi 23,75kg, nonostante i 10 critici giorni ad agosto in Puglia. Qual è il mio segreto? Resistere alle tentazioni. \nQual è il mio vero segreto? Beh, la palestra e la dieta. Quale dieta? Quella che non posso nominare altrimenti mi linciate (come è successo l’anno scorso). Quindi affidatevi al vostro dietologo (come del resto ho fatto io) e diffidate dagli improvvisati.\n\nAh, a colazione prendo solo un caffè e uno shaker di proteine.\n\nPs\nQualcuno me lo chiederà, i piatti li ho presi da Ginori #noadv \n\nPh @daniele_lista",
    "comments": 422,
    "likes": 17256,
    "thumbnail": "https://instagram.flin1-1.fna.fbcdn.net/v/t51.2885-15/e35/p1080x1080/241198468_569978107470925_3851950063001254607_n.jpg?_nc_ht=instagram.flin1-1.fna.fbcdn.net&_nc_cat=101&_nc_ohc=_b-t-VSwXTYAX_f4nJL&edm=ABfd0MgBAAAA&ccb=7-4&oh=e88675c3303160b68415f6efc37861bb&oe=616B69CF&_nc_sid=7bff83",
    "timestamp": 1631103851
  }]
// start();

const JOB = new CronJob('0 0 15/20 * * *', start, () => {
  Logger.log('Job completed');
}, false, 'Europe/Rome', null, true);

JOB.start();

Logger.log('Job ready for instagram');