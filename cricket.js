const EventEmitter = require('events');
const http = require('http');
const { ObjectId } = require('mongodb');
const axios = require('axios');
const { Session } = require('./lib/cricket');
const { transporter, mailOptions } = require('./nodemailer.config');

const subscribers = ['http://139.59.18.212/api/market/session-resolve-event'];

async function getData(url) {
  const promise = new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = [];

      res.on('data', chunk => data.push(chunk));
      res.on('end', async () => {
        if (res.statusCode === 200) {
          try {
            if (data.length) {
              const response = JSON.parse(Buffer.concat(data));
              if (typeof response === 'object')
                resolve(response);
              else {
                reject(new Error(response));
              }
            } else {
              reject(new Error('Empty response'));
            }
          } catch (e) {
            reject(e);
          }
        } else {
          reject(new Error(res.statusMessage));
        }
      });
    }).on('error', err => {
      reject(err);
    });
  });

  return await promise.catch(err => err);
}

class Cricket {

  constructor(server) {
    this.eventEmitter = new EventEmitter();
    this.marketEmitter = new EventEmitter();
    this.competitionEmitter = new EventEmitter();
    this.competitions = [];
    this.events = new Object();
    this.sessions = new Object();
    this.eventIntervals = new Object();
    this.marketIntervals = new Object();
    this.sessionResultIntervals = new Object();

    // Handler to listen http request
    server.get('/cricket/get-session-result', this.getSessionResult);
    server.get('/cricket/validate-session', this.validateSession);
    server.get('/cricket/get-unresolved-sessions', this.getUnResolvedSession);
    server.post('/cricket/resolve-session', this.resolveSession);
    server.get('/notify', this.notify);
  }

  async sendEventToSubscribers(session) {
    const promises = subscribers.map(endpoint => {
      const payload = {
        eventId: session.eventId,
        marketId: session.marketId,
        selectionId: session.selectionId,
        marketName: session.mname,
        result: session.result
      };
      return axios.post(endpoint, payload).catch(err => console.error(err));
    });

    Promise.all(promises).catch(err => console.error(err));
  }

  getSessionResult = async (req, res) => {
    const { eventId, marketId, selectionId } = req.query;

    if (!eventId || !marketId || !selectionId) {
      res.status(400).end();
    } else {
      const collection = global.DB.collection('sessions');

      const response = await collection.findOne({ eventId: Number(eventId), marketId: Number(marketId), selectionId: Number(selectionId) }).catch(err => err);

      if (response instanceof Error) {
        res.status(500).send(response.message);
      } else if (response === null) {
        res.status(204).end();
      } else {
        res.status(200).send(response);
      }
    }
  };

  validateSession = async (req, res) => {
    const { eventId, marketId, selectionId } = req.query;

    console.debug('Validate Session Query: ', JSON.stringify(req.query));

    if (!eventId || !marketId || !selectionId) {
      res.status(400).end();
    } else {
      const collection = global.DB.collection('sessions');

      const response = await collection.findOne({ eventId: Number(eventId), marketId: Number(marketId), selectionId: Number(selectionId), status: { $ne: 1 } }).catch(err => err);

      if (response instanceof Error) {
        res.status(500).send(response.message);
      } else if (response === null) {
        res.status(204).end();
      } else {
        res.status(200).send(true);
      }
    }
  };

  getUnResolvedSession = async (req, res) => {
    const { search, offset, limit } = req.query;

    const collection = global.DB.collection('sessions');

    const response = await collection.find({ status: { $nin: [0, 1] }, session: { $regex: new RegExp(search, 'i') || '' } }).skip(Number(offset) || 0).limit(Number(limit) || 10).toArray().catch(err => err);

    if (response instanceof Error) {
      res.status(500).send(response.message);
    } else if (response === null) {
      res.status(200).send({ sessions: [], counts: 0 });
    } else {
      const counts = await collection.aggregate([
        { $match: { status: { $nin: [0, 1] } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]).toArray().catch(err => err);

      if (counts instanceof Error) {
        res.status(500).send(counts.message);
        return;
      }

      res.status(200).send({ sessions: response, counts });
    }
  };

  resolveSession = async (req, res) => {
    const { _id, result } = req.body;

    if (_id && result && /^[0-9]+$/.test(result)) {
      const collection = global.DB.collection('sessions');

      const response = await collection.findOneAndUpdate(
        { _id: ObjectId(_id) },
        {
          $set: { status: 1, result }
        },
        {
          returnDocument: 'after'
        }
      ).catch(err => err);

      if (response instanceof Error) {
        res.status(500).send(response.message);
        return;
      }

      this.sendEventToSubscribers(response.value);
      res.status(200).send({ message: 'Success' });
    } else {
      res.status(400).send({ error: 'Bad request' });
    }
  };

  notify = async (req, res) => {
    const collection = global.DB.collection('sessions');

    const response = await collection.aggregate([
      { $match: { status: { $nin: [0, 1] } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]).toArray().catch(err => err);

    if (response instanceof Error) {
      res.status(500).send(response.message);
      return;
    }

    const statistics = {
      '-1': 0,
      '-2': 0,
      '-3': 0,
      '-4': 0,
    };

    let total = 0;

    response.forEach(element => {
      total += element.count;
      statistics[element._id] = element.count;
    });

    const subject = 'Notification! Statistics of awaiting session to get resolved';
    const mailBody = `Hey! Here is the current statistics of awaiting session to get resolved quickly.<br/>
      - NOT_AVAILABLE     : ${statistics['-1']} <br/> 
      - NOT_HANDLED       : ${statistics['-2']} <br/>    
      - NOT_PROCESSABLE   : ${statistics['-3']} <br/>
      - UNEXPECTED_RESULT : ${statistics['-4']} <br/>
      <br/>
      - TOTAL : ${total} <br/>
      <br/>
      Please go the admin panel and resolve all these awaiting sessions. <br/>
      <br/>
      Thanks
    `;

    transporter.sendMail(mailOptions(process.env.NOTIFY_EMAIL, subject, mailBody), (err) => {
      if (err) {
        console.error(err);
        res.status(500).send(err.message);
      } else {
        res.status(200).end();
      }
    });
  };

  async updateMarketStartTime(marketId, startTime) {
    const collection = global.DB.collection('sessions');

    const queryResponse = await collection.updateMany(
      { marketId: Number(marketId) },
      {
        $set: { startTime }
      }
    ).catch(err => err);

    if (queryResponse instanceof Error) {
      console.error(queryResponse);
    }
  }

  handleShutDownMarketInterval(competitionId, eventId, marketCatalogue) {
    if (marketCatalogue && marketCatalogue instanceof Array && marketCatalogue[0].status === 'CLOSED') {
      clearInterval(this.marketIntervals[competitionId][eventId]);
      delete this.marketIntervals[competitionId][eventId];
    }
  }

  async competitionHandler() {
    const response = await getData(`${process.env.CRICKET_COMPETITIONS_ENDPOINT}?sportid=4`);
    if (response instanceof Error) {
      return;
    }

    const competitions = response.data;

    if (competitions instanceof Array) {
      const prevCompetitions = [...this.competitions];
      const currCompetitions = competitions.map(c => c.competition.id);
      const newCompetitions = competitions.filter(c => prevCompetitions.indexOf(c.competition.id) === -1).map(c => c.competition.id);

      this.competitions = [...prevCompetitions.filter(c => currCompetitions.indexOf(c) !== -1), ...newCompetitions];

      for (const [competitionId] of Object.entries(this.eventIntervals)) {
        if (currCompetitions.indexOf(competitionId) === -1) {
          if (this.marketIntervals[competitionId]) {
            for (const [, interval] of Object.entries(this.marketIntervals[competitionId])) {
              clearInterval(interval);
            }
          }
          clearInterval(this.eventIntervals[competitionId]);
          delete this.eventIntervals[competitionId];
          delete this.marketIntervals[competitionId];
        }
      }

      if (newCompetitions.length) {
        this.competitionEmitter.emit('data', newCompetitions);
      }
    }
  }

  async eventHandler(competitionId) {
    const response = await getData(`${process.env.CRICKET_EVENTS_ENDPOINT}?competitionid=${competitionId}`);
    if (response instanceof Error) {
      return;
    }

    const eventById = new Object();
    response.data.filter(e => e.marketName === 'Match Odds').forEach(e => eventById[e.event.id] = e);

    const events = Object.values(eventById);

    if (events instanceof Array) {
      if (!this.events[competitionId]) {
        this.events[competitionId] = [];
      }

      events.forEach(e => eventById[e.event.id] = e);
      events.forEach(e => this.updateMarketStartTime(e.marketId, e.marketStartTime));

      const prevEvents = [...this.events[competitionId]];
      const currEvents = events.map(e => e.event.id);
      const newEvents = events.filter(e => prevEvents.indexOf(e.event.id) === -1).map(e => e.event.id);

      this.events[competitionId] = [...prevEvents.filter(e => currEvents.indexOf(e) !== -1), ...newEvents];

      if (!this.marketIntervals[competitionId]) {
        this.marketIntervals[competitionId] = new Object();
      }

      const marketIntervals = this.marketIntervals[competitionId];

      for (const [eventId] of Object.entries(marketIntervals)) {
        if (currEvents.indexOf(eventId) === -1) {
          clearInterval(marketIntervals[eventId]);
          delete marketIntervals[eventId];
        }
      }

      if (newEvents.length) {
        this.eventEmitter.emit('data', competitionId, newEvents.map(id => ({ eventId: id, marketId: eventById[id].marketId, marketStartTime: eventById[id].marketStartTime })));
      }
    }
  }

  async marketHandler(competitionId, eventId, marketId, starttime) {
    const response = await getData(`${process.env.CRICKET_MARKET_ENDPOINT}?eventId=${eventId}`);

    if (response instanceof Error || response.success !== true || response.msg !== 'success' || response.status !== 200 || !(response.data instanceof Array)) {
      return;
    }

    const marketCatalogue = response.data;

    this.handleShutDownMarketInterval(competitionId, eventId, marketCatalogue);

    if (!this.sessions[competitionId]) {
      this.sessions[competitionId] = new Object();
    }

    if (!this.sessions[competitionId][eventId]) {
      this.sessions[competitionId][eventId] = [];
    }

    let sessions = [];

    const fancyMarkets = marketCatalogue.filter(m => m.gtype === 'fancy');

    if (fancyMarkets.length === 1) {
      sessions = [...fancyMarkets[0].section.map(i => ({ ...i, mname: fancyMarkets[0].mname }))];
    } else if (fancyMarkets.length >= 2) {
      const _fancyMarkets = fancyMarkets.map(m => ({ ...m, section: m.section.map(i => ({ ...i, mname: m.mname })) }));
      _fancyMarkets.forEach(m => sessions.push(...m.section));
    }

    const prevSessions = [...this.sessions[competitionId][eventId]];
    const currSessions = sessions.map(s => s.sid);
    const newSessions = currSessions.filter(s => prevSessions.indexOf(s) === -1);

    this.sessions[competitionId][eventId] = [...prevSessions.filter(s => currSessions.indexOf(s) !== -1), ...newSessions];

    const sessionByID = new Object();

    sessions.forEach(session => sessionByID[session.sid] = session);

    if (newSessions.length) {
      const collection = global.DB.collection('sessions');

      const session = new Session(Number(eventId));

      newSessions.map(async (sid) => {
        const doc = {
          competitionId: Number(competitionId),
          eventId: Number(eventId),
          marketId: Number(marketId),
          selectionId: Number(sid),
          session: sessionByID[sid].nat
        };

        const response = await collection.findOne(doc).catch(err => err);

        if (response instanceof Error) {
          console.error(response);
          return;
        } else if (response === null) {
          if (session.isSessionProcessable(doc.session)) {
            doc.status = 0;
          } else {
            console.warn(`Handler not found for session "${doc.session}"`);
            doc.status = -2;
          }

          const queryResponse = await collection.insertOne({
            ...doc,
            mname: sessionByID[sid].mname,
            startTime: starttime,
            result: null
          }).catch(err => err);

          if (queryResponse instanceof Error) {
            console.error(queryResponse);
            return;
          }
        }
      });
    }
  }

  async sessionResultHandler(_session) {
    try {

      const session = new Session(_session.eventId);
      const response = await session.getSessionResult(_session.session);

      if (response instanceof Error) {
        console.warn(`Getting Error while processing "${_session.session}"`);
        console.error(response);
      } else if (response) {
        console.debug(`Response for session "${_session.session}" :`, response);

        if (response.status === 'CLOSED' || response.status === 'NOT_PROCESSABLE' || response.status === 'NOT_AVAILABLE') {
          const fields = {};

          switch (response.status) {
            case 'CLOSED':
              if (response.data !== null && response.data !== undefined && !isNaN(Number(response.data))) {
                fields.result = Number(response.data);
                fields.status = 1;
              } else {
                fields.status = -4;
                fields.error = `Unexpected response : ${typeof response.data === 'object' ? JSON.stringify(response.data) : response.data}`;
              }
              break;
            case 'NOT_PROCESSABLE':
              fields.status = -3;
              fields.error = response.message;
              break;
            case 'NOT_AVAILABLE':
              fields.status = -1;
              fields.error = response.message;
              break;
            default:
              break;
          }

          const collection = global.DB.collection('sessions');

          const queryResponse = await collection.updateOne(
            { _id: _session._id },
            {
              $set: fields
            }
          ).catch(err => err);

          if (queryResponse instanceof Error) {
            console.error(queryResponse);
            return;
          }

          console.debug(`Session "${_session.session}" resolved with "${response.status}" status...`);

          clearInterval(this.sessionResultIntervals[_session.competitionId][_session.eventId][_session._id]);
          delete this.sessionResultIntervals[_session.competitionId][_session.eventId][_session._id];
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async bindSessionHandler(session) {
    if (!this.sessionResultIntervals[session.competitionId]) {
      this.sessionResultIntervals[session.competitionId] = {};
    }

    if (!this.sessionResultIntervals[session.competitionId][session.eventId]) {
      this.sessionResultIntervals[session.competitionId][session.eventId] = {};
    }

    if (!this.sessionResultIntervals[session.competitionId][session.eventId][session._id]) {
      this.sessionResultHandler(session);
      this.sessionResultIntervals[session.competitionId][session.eventId][session._id] = setInterval(() => this.sessionResultHandler(session), 30000);
    }
  }

  async initScheduledSessions() {
    const collection = global.DB.collection('sessions');
    const response = await collection.find({ status: 0, eventId:  32124044 }).toArray().catch(err => err);


    response.forEach(session => {
      this.bindSessionHandler(session);
    });
  }

  async init() {

    this.competitionEmitter.on('data', (competitions) => {
      competitions.forEach(competitionId => {
        if (!this.eventIntervals[competitionId]) {
          this.eventHandler(competitionId);
          this.eventIntervals[competitionId] = setInterval(() => this.eventHandler(competitionId), 300000);
        }
      });
    });

    this.eventEmitter.on('data', (competitionId, events) => {
      if (!this.marketIntervals[competitionId]) {
        this.marketIntervals[competitionId] = new Object();
      }

      events.forEach(e => {
        if (!this.marketIntervals[competitionId][e.eventId]) {
          this.marketHandler(competitionId, e.eventId, e.marketId, e.marketStartTime);
          this.marketIntervals[competitionId][e.eventId] = setInterval(() => this.marketHandler(competitionId, e.eventId, e.marketId, e.marketStartTime), 300000);
        }
      });
    });

    this.initScheduledSessions();
    this.competitionHandler();

    // setInterval(() => this.competitionHandler(), 300000);
    setInterval(() => this.initScheduledSessions(), 300000);
  }
}

module.exports = Cricket;
