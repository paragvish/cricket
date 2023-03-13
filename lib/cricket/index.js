const axios = require("axios");
const { indexOf } = require("lodash");

class Session {
  constructor(eventId) {
    this.eventId = eventId;
    this.status = {
      NA: "NOT_AVAILABLE",
      NH: "NOT_HANDLED",
      NP: "NOT_PROCESSABLE",
      IP: "IN_PLAY",
      CL: "CLOSED",
    };
  }

  getTeamShortName(teamName) {
    const parts = teamName.split(" ");
    if (parts.length === 1) {
      return parts[0].slice(0, 3).toUpperCase();
    } else {
      return parts
        .map((s) => s.slice(0, 1))
        .join("")
        .toUpperCase();
    }
  }

  getRun(str) {
    if (!isNaN(Number(str))) {
      return Number(str);
    } else {
      const run = str.match(/\d/);
      if (run) {
        return Number(run[0]);
      } else {
        return 0;
      }
    }
  }

  isBall(str) {
    if (!isNaN(Number(str))) {
      return 1;
    } else {
      if (/^\dw|n$/i.test(str)) {
        return 0;
      } else {
        return 1;
      }
    }
  }

  isPlayerNameMatched(playerName, timelinePlayerName) {
    if (playerName.toLowerCase() === timelinePlayerName.toLowerCase()) {
      return true;
    }

    const timelinePlayerNameParts = timelinePlayerName
      .split(" ")
      .filter((i) => i.length);

    if (timelinePlayerNameParts.length > 1) {
      let timelinePlayerModifiedName = "";

      for (let i = 0; i < timelinePlayerNameParts.length - 1; i++) {
        timelinePlayerModifiedName += timelinePlayerNameParts[i].slice(0, 1);
        timelinePlayerModifiedName += " ";
      }

      timelinePlayerModifiedName +=
        timelinePlayerNameParts[timelinePlayerNameParts.length - 1];

      if (
        playerName.toLowerCase() === timelinePlayerModifiedName.toLowerCase()
      ) {
        return true;
      }
    }

    return false;
  }

  isTeamNameMatched(session, teamName) {
    const teamShortName = this.getTeamShortName(teamName);
    if (session.indexOf(teamShortName) !== -1) {
      return true;
    }

    if (
      teamShortName.indexOf("T") === 0 &&
      session.indexOf(teamShortName.slice(1)) !== -1
    ) {
      return true;
    }

    return false;
  }

  getWicketDescription(fallOfwickets, wicket) {
    while (wicket <= fallOfwickets.length) {
      if (fallOfwickets[Number(wicket) - 1].match(/\d+\/\d+/g)) {
        return fallOfwickets[Number(wicket) - 1];
      } else {
        wicket++;
      }
    }
  }

  filterSessionString(session) {
    session = session.replace(/(\s*[.])$/g, "");
    session = session.replace(/(\s+\d)$/g, "");
    session = session.replace(/\s*adv(\s+\d+)?$/g, "");
    session = session.replace(/\s+bhav/g, " ");
    session = session.replace(/\(\s*[A-Z]+\s+vs\s+[A-Z]+\s*\)/g, "");
    return session;
  }

  sendResponse(status, data, message) {
    return {
      status,
      data: data || data == 0 ? data : null,
      message: message ? message : null,
    };
  }

  getSessionHandler(_session) {
    // console.log("<<<<<>>>>>>>",_session)

    switch (true) {
      case /^(match\s+\d+[a-z]+\s+over\s+(?:run|runs))(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchNthOverRun.name;
      case /^(total\s+match\s+fifties)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalFifties.name;
      case /^(total\s+match\s+bowled)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalBowledWkt.name;
      case /^(total\s+match\s+caught\s+outs)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalCaughtWkt.name;
      case /^(total\s+match\s+lbw)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalLBWWkt.name;
      case /^(total\s+match\s+extras)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalExtras.name;
      case /^(total\s+match\s+wides)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalWides.name;
      case /^(total\s+match\s+wkts)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalWkts.name;
      case /^(total\s+match\s+(?:fours|boundaries))(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalBoundaries.name;
      case /^(total\s+match\s+sixes)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTotalSixes.name;
      case /^(highest\s+scoring\s+over\s+in\s+match)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchHighestScoringOver.name;
      case /^(top\s+batsman\s+(?:run|runs)\s+in\s+match)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTopBatsmanRuns.name;
      case /^(\d+\s+wkt\s+or\s+more\s+by\s+bowler\s+in\s+match)(\s+bhav)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchTopBowlerWkts.name;
      case /^(\d+[a-z]+\s+(?:inning|innings)\s+(?:run|runs))(\s+bhav)?(?:\s+[a-z]+|\s+[a-z]+\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getMatchInningRuns.name;
      case /^((only\s+)?(?:\d+[.]\d|\d+)\s+over\s+(?:run|runs))(\s+bhav)?(?:\s+[a-z]+|\s+[a-z]+\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getTeamOverRun.name;
      case /^(\d+\s+run)(\s+bhav)?(?:\s+[a-z]+|\s+[a-z]+\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getTeamRun.name;
      case /^(fall\s+of\s+\d+[a-z]+\s+wkt)(\s+(?:run|runs))?(\s+bhav)?(?:\s+[a-z]+|\s+[a-z]+\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getTeamNthWktRun.name;
      case /^(\d+[.]\d\s+ball\s+(?:run|runs))(\s+bhav)?(?:\s+[a-z]+|\s+[a-z]+\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getTeamNthBallRun.name;
      case /^(\d+[a-z]+\s+wkt\s+pship\s+boundaries)(\s+bhav)?(?:\s+[a-z]+|\s+[a-z]+\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getTeamNthWktBoundaries.name;
      case /^([a-z\s,.'-]+\s+(?:run|runs))(\s+bhav)?(\s+[a-z]+)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getPlayerRun.name;
      case /^(how\s+many\s+balls\s+face\s+by\s+[a-z\s,.'-]+)(\s+bhav)?(\s+[a-z]+)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getPlayerFacedBallsCount.name;
      case /^([a-z\s,.'-]+\s+boundaries)(\s+bhav)?(\s+[a-z]+)?(\s*\(\s*[a-z]+\s+vs\s+[a-z]+\s*\))?(\s*adv)?(\s+\d+)?(\s*[.])?$/i.test(
        _session
      ):
        return this.getPlayerBoundaries.name;
      default:
        console.log("--------------- Not found ------------", _session);
        return null;
    }
  }

  isSessionProcessable(_session) {
    if (this.getSessionHandler(_session)) {
      return true;
    } else {
      return false;
    }
  }

  async getSessionResult(_session) {
    try {
      const handler = this.getSessionHandler(_session);
      console.log("2");
      if (handler) {
        return this[handler](_session);
      } else {
        return null;
      }
    } catch (err) {
      return err;
    }
  }

  async fetchTimelineData(x) {
    try {
      let x = this.eventId;
      const fetchScoreUrlResponse = await axios.get(
        `${process.env.CRICKET_TIMELINE_ENDPOINT}/${this.eventId}`
      );
      console.log("fetchScoreUrlResponse.data.score");
      if (
        fetchScoreUrlResponse.status === 200 ||
        fetchScoreUrlResponse.data.score
      ) {
        //const response = await axios.get(fetchScoreUrlResponse.data.score);  //.score
        const response = await axios.get(
          `https://lt-fn-cdn001.akamaized.net/techablesoftware/en/Etc:UTC/gismo/match_timeline/36517755`
        );
        //   console.log(response.data.doc[0].data);

        if (response.status === 200) {
          if (
            response.data.doc instanceof Array &&
            response.data.doc[0] &&
            response.data.doc[0].data
            //&&
            //response.data.doc[0].data.response_code === "OK"
          ) {
            // console.log("hello",response.data.doc[0].data);
            return response.data.doc[0].data;
          } else {
            return null;
          }
        } else {
          return null;
        }
      } else {
        return "null";
      }
    } catch (err) {
      console.error(err);
      return err;
    }
  }

  //UNABLE TO PERFORM ANY CHANGE
  //HOLD SINCE catch under as "WICKET" value
  /*source:https://lt-fn-cdn001.akamaized.net/techablesoftware/en/Etc:UTC/gismo/match_timeline/37494679  events[10] enent[48]
  https://stories.t20worldcup.com/games/61271-20230214-Australia-Women-vs-Bangladesh.html (3 video) (6)*/

  //UNABLE TO PERFORM ANY CHANGE
  // Handler to resolve session
  // - Total match caught outs
  async getMatchTotalCaughtWkt() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== 4) {
        return this.sendResponse(this.status.IP);
      }

      let totalCaught = 0;

      for (let i = 0; i < timelineData.innings.length; i++) {
        const batsmenList = timelineData.innings[i].batsmen;
        for (let k = 0; k < batsmenList.length; k++) {
          if (
            !batsmenList[k].didNotBat &&
            batsmenList[k].description &&
            batsmenList[k].description.indexOf("Catch") !== -1
          ) {
            totalCaught++;
          }
        }
      }

      return this.sendResponse(this.status.CL, totalCaught);
    } catch (err) {
      return err;
    }
  }
  //UNABLE TO PERFORM ANY CHANGE
  // Handler to resolve session
  // - Total match LBW
  async getMatchTotalLBWWkt() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== 4) {
        return this.sendResponse(this.status.IP);
      }

      let totalLBW = 0;

      for (let i = 0; i < timelineData.innings.length; i++) {
        const batsmenList = timelineData.innings[i].batsmen;
        for (let k = 0; k < batsmenList.length; k++) {
          if (
            !batsmenList[k].didNotBat &&
            batsmenList[k].description === "LBW"
          ) {
            totalLBW++;
          }
        }
      }

      return this.sendResponse(this.status.CL, totalLBW);
    } catch (err) {
      return err;
    }
  }

  //RESOLVED +!
  // Handler to resolve session
  // - Total match wides
  async getMatchTotalWides() {
    this.eventId = 37494679;
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }
      let totalWides = 0;

      for (let i = 0; i < timelineData.events.length; i++) {
        let xy = timelineData.events[i].bowling;
        if (xy == undefined) {
          continue;
        } else if (xy.extrasConcededType == "WD") {
          totalWides += xy.extrasConceded;
        }
      }

      return this.sendResponse(this.status.CL, totalWides);
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // extrasConceded and extra
  // Handler to resolve session
  // - Total match extras
  async getMatchTotalExtras() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }

      let totalExtras = 0;
      for (let i = 0; i < timelineData.events.length; i++) {
        let xy = timelineData.events[i].bowling;
        if (xy == undefined) {
          continue;
        } else if (xy.extrasConcededType) {
          totalExtras += xy.extrasConceded;
        }
      }
      return this.sendResponse(this.status.CL, totalExtras);
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // Handler to resolve session
  // - Total match Fifties
  async getMatchTotalFifties() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);

      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }

      let batsmen = {};
      for (let i = 0; i < timelineData.events.length; i++) {
        if (timelineData.events[i].batting == undefined) {
          continue;
        } else {
          let xy = timelineData.events[i].batting.striker;
          batsmen[xy.name] = xy.runs;
        }
      }

      let totalFifties = 0;

      for (let x in batsmen) {
        if (batsmen[x] >= 50) {
          totalFifties++;
        }
      }

      return this.sendResponse(this.status.CL, totalFifties);
    } catch (err) {
      return err;
    }
  }
  overstoball(x) {
    if (x % 1 != 0) {
      let y = JSON.stringify(x);
      return parseInt(x) * 6 + parseInt(y[y.length - 1]);
    }

    return x * 6;
  }
  //RESOLVED +
  // Handler to resolve session
  // - Total match bowled
  async getMatchTotalBowledWkt() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }

      let totalBowled = 0;

      for (
        let i = 0;
        i < Object.values(timelineData.match.resultinfo.innings).length;
        i++
      ) {
        let arr = Object.values(timelineData.match.resultinfo.innings);
        totalBowled += this.overstoball(arr[i].overs);
      }

      return this.sendResponse(this.status.CL, totalBowled);
    } catch (err) {
      return err;
    }
  }
  //RESOLVED
  // Handler to resolve session
  // - x run XXX
  async getTeamRun(session) {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      const targetInning =       session.match(/\d$/g)
        ? Number(session.match(/\d$/g)[0])
        : 0;

      if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session inning"
        );
      }

      session = this.filterSessionString(session);
      session = session.trim();

      const targetRun =session.match(/\d+/g);

      if (!targetRun) {
        return this.sendResponse(this.status.NP, null, "Invalid session run");
      }

      const currentInning = Object.values(
        timelineData.match.resultinfo.innings
      ).length;

      for (let i = targetInning; i < currentInning; i++) {
        const team = timelineData.match.resultinfo.innings[i].team;
        const teamName = timelineData.match.teams[team].name;

        if (this.isTeamNameMatched(session, teamName)) {
          console.log(teamName);
          if (
            timelineData.match.status.name === "Ended"
            // timelineData.events[timelineData.events.length - 1].status.name !==
            //   "In Progress"
          ) {
            return this.sendResponse(
              this.status.CL,
              timelineData.match.resultinfo.innings[i].runs
            );
          } else {
            return this.sendResponse(this.status.IP);
          }
        }
      }

      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        return this.sendResponse(this.status.IP);
      } else {
        return this.sendResponse(this.status.NP, null, "Team name not found");
      }
    } catch (err) {
      return err;
    }
  }
  //RESOLVED
  // Handler to resolve session
  // - x.x ball run XXX
  async getTeamNthBallRun(session) {
    this.eventId = 37494679;
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }
      const targetInning = session.match(/\d$/g)
        ? Number(session.match(/\d$/g)[0])
        : 0;

      if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session inning"
        );
      }

      session = this.filterSessionString(session);
      session = session.trim();

      const [targetOver] = session.match(/^\d+[.]\d/g);

      if (!targetOver) {
        return this.sendResponse(this.status.NP, null, "Invalid session ball");
      }

      const [over, balls] = targetOver.split(".");
      let [Over, Balls] = [parseInt(over), parseInt(balls)];

      if (isNaN(Number(over)) || isNaN(Number(balls))) {
        return this.sendResponse(this.status.NP, null, "Invalid session ball");
      }

      const currentInning = Object.values(
        timelineData.match.resultinfo.innings
      ).length;

      for (let i = targetInning; i < currentInning; i++) {
        const team = timelineData.match.resultinfo.innings[i].team;
        const teamName = timelineData.match.teams[team].name;

        if (this.isTeamNameMatched(session, teamName)) {
          const currentOver = Object.values(
            timelineData.match.resultinfo.innings
          )[i].overs;
          if (targetOver <= currentOver) {
            let new_obj = await this.oversummary();
            let score = 0;
            for (let i = 1; i <= Over; i++) {
              new_obj[1][i].forEach((x) => {
                score += x;
              });
            }
            for (let k = 0; k < Balls; k++) {
              score += new_obj[1][Over + 1][k];
            }

            return this.sendResponse(this.status.CL, score);
          } else {
            return this.sendResponse(this.status.IP);
          }
        }
      }

      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        return this.sendResponse(this.status.IP);
      } else {
        return this.sendResponse(this.status.NP, null, "Team name not found");
      }
    } catch (err) {
      return err;
    }
  }

  //RESOLVED
  // Handler to resolve session
  // - Total match wkts
  async getMatchTotalWkts() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== 4) {
        return this.sendResponse(this.status.IP);
      }

      let totalWickets = 0;
      let wckT = Object.values(timelineData.match.resultinfo.innings);
      for (let i = 0; i < wckT.length; i++) {
        totalWickets += wckT[i].wickets;
      }

      return this.sendResponse(this.status.CL, totalWickets);
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // Handler to resolve session
  // - Total match boundaries
  async getMatchTotalBoundaries() {
    this.eventId = 37494679;
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }

      // let batsmenlist = {};
      let totalBoundaries = 0;
      let boundry = timelineData.events;

      for (let i = 0; i < boundry.length; i++) {
        if (boundry[i].type == "boundary") {
          totalBoundaries++;
        }
        //   continue;
        // } else {
        //   let xy = boundry[i].batting.striker;
        //   if (xy._playerid && xy.fours) {
        //     batsmenlist[xy.name] = xy.fours;
        //   }
        //   console.log(batsmenlist);
        // }
      }
      // console.log(batsmenlist);
      //  Object.values(batsmenlist).forEach((x) => (totalBoundaries += x));

      return this.sendResponse(this.status.CL, totalBoundaries);
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // Handler to resolve session
  // - Total match sixes
  async getMatchTotalSixes() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }

      //  let batsmenlist = {};
      let totalSixes = 0;
      let boundry = timelineData.events;

      for (let i = 0; i < boundry.length; i++) {
        if (boundry[i].type == "sixer") {
          totalSixes++;
          //  continue;
        }
        // } else {
        //   let xy = boundry[i].batting.striker;
        //   if (xy.name && xy.sixes) {
        //     batsmenlist[xy.name] = xy.sixes;
        //   }
        // }
      }
      // Object.values(batsmenlist).forEach((x) => (totalSixes += x));
      return this.sendResponse(this.status.CL, totalSixes);
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // Handler to resolve session
  // - {Player Name} boundaries
  async getPlayerBoundaries(session) {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      const targetInning = 1;
      session.match(/\d$/g) ? Number(session.match(/\d$/g)[0]) : 0;

      if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session inning"
        );
      }

      session = this.filterSessionString(session);
      session = session.replace(/\s+boundaries/gi, " boundaries");
      session = session.trim();

      const playerName = session
        .match(/^([a-z\s,.'-]+\s+boundaries)/gi)[0]
        .split(" boundaries")[0];

      const currentInning = Object.values(
        timelineData.match.resultinfo.innings
      ).length;
      for (let i = targetInning; i < currentInning; i++) {
        let batsmenlist = {};
        let boundry = timelineData.events;
        for (let j = 0; j < boundry.length; j++) {
          if (boundry[j].batting == undefined) {
            continue;
          } else if (boundry[j].inning === 1) {
            console.log(i);
            let xy = boundry[j].batting.striker;
            if (xy._playerid && xy.fours) {
              batsmenlist[xy.name] = xy.fours;
            }
          }
        }

        for (let player_Name in batsmenlist) {
          if (this.isPlayerNameMatched(playerName.trim(), player_Name.trim())) {
            if (
              //!batsmenlist[k].didNotBat && !batsmenlist[k].active) ||
              timelineData.match.status.name === "Ended" //||
              // timelineData.innings[i].conclusion !== "In Progress"
            ) {
              return this.sendResponse(
                this.status.CL,
                batsmenlist[player_Name]
              );
            } else {
              return this.sendResponse(this.status.IP);
            }
          }
        }
      }

      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        return this.sendResponse(this.status.IP);
      } else {
        return this.sendResponse(this.status.NP, null, "Player name not found");
      }
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // Handler to resolve session
  // - x inning run
  async getMatchInningRuns(session) {
    const timelineData = await this.fetchTimelineData(this.eventId);
    if (timelineData instanceof Error || !timelineData) {
      return null;
    }
    session = this.filterSessionString(session);
    session = session.trim();

    const [targetInning] = session.match(/\d+/g);

    if (!targetInning) {
      return this.sendResponse(this.status.NP, null, "Invalid session inning");
    }
    const currentInning = Object.values(
      timelineData.match.resultinfo.innings
    ).length;
    // let targetInning = 4;

    if (targetInning <= currentInning) {
      if (timelineData.match.status.name === "Ended") {
        return this.sendResponse(
          this.status.CL,
          timelineData.match.resultinfo.innings[targetInning].runs
        );
      }
      return this.sendResponse(this.status.IP);
    } else if (targetInning >= currentInning) {
      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }
    }
    return this.sendResponse(this.status.NP, null, "Invalid session inning");
  }

  //RESOLVED +1
  // Handler to resolve session
  // - Top batsman runs in match
  async getMatchTopBatsmanRuns() {
    try {
      this.eventId = 37494679;
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }

      let batsmenlist = {};
      for (let i = 0; i < timelineData.events.length; i++) {
        if (timelineData.events[i].batting == undefined) {
          continue;
        } else {
          let xy = timelineData.events[i].batting.striker;
          if (xy.name && xy.runs) {
            batsmenlist[xy.name] = xy.runs;
          }
        }
      }

      let playerHighestRuns = 0;
      let playerName;

      for (let player_Name in batsmenlist) {
        if (batsmenlist[player_Name] > playerHighestRuns) {
          playerHighestRuns = batsmenlist[player_Name];
          playerName = player_Name;
        }
      }

      return this.sendResponse(
        this.status.CL,
        `${playerName} runs:${playerHighestRuns}`
      );
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // Handler to resolve session
  // - {Player Name} run
  async getPlayerRun(session) {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      const targetInning = 1;
      // session.match(/\d$/g)
      //   ? Number(session.match(/\d$/g)[0])
      //   : 0;

      // if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
      //   return this.sendResponse(
      //     this.status.NP,
      //     null,
      //     "Invalid session inning"
      //   );
      // }

      // session = this.filterSessionString(session);
      // session = session.trim();

      const playerName = session
        .match(/^([a-z\s,.'-]+\s+run)/gi)[0]
        .split(" run")[0];

      const currentInning = timelineData.match.resultinfo.innings;
      let currInning = Object.values(currentInning).length;

      let batsmenlist = {};
      for (let i = 0; i < timelineData.events.length; i++) {
        if (timelineData.events[i].batting == undefined) {
          continue;
        } else {
          let xy = timelineData.events[i].batting.striker;
          if (xy.name && xy.runs) {
            batsmenlist[xy.name] = xy.runs;
          }
        }
      }

      for (let i = targetInning; i < currInning; i++) {
        // const batsmen = timelineData.events;
        // let batsmenList = [];
        // for (let j = 0; j < batsmen.length; j++) {
        //   if (batsmen[j].batting == undefined) {
        //     continue;
        //   } else if (
        //     batsmen[j].batting.striker.name &&
        //     batsmen[j].inning == i
        //   ) {
        //     if (batsmenList.indexOf(batsmen[j].batting.striker.name) == -1) {
        //       batsmenList.push(batsmen[j].batting.striker.name);
        //     }
        //   }
        // }
        for (let name in batsmenlist) {
          if (
            this.isPlayerNameMatched(
              playerName.trim(),
              batsmenlist[name].trim()
            )
          ) {
            if (timelineData.match.status.name === "Ended") {
              return this.sendResponse(
                this.status.CL,
                batsmenlist[`${batsmenList[k]}`]
              );
            } else {
              return this.sendResponse(this.status.IP);
            }
          }
          // if (name == playerName) {
          //   return batsmenlist[name];
          // }
        }
        // for (let k = 0; k < batsmenList.length; k++) {
        //   if (
        //     this.isPlayerNameMatched(playerName.trim(), batsmenList[k].trim())
        //   ) {
        //     if (timelineData.match.status.name === 'Ended') {
        //       return this.sendResponse(
        //         this.status.CL,
        //         batsmenlist[`${batsmenList[k]}`]
        //       );
        //     } else {
        //       return this.sendResponse(this.status.IP);
        //     }
        //   }
        // }
      }

      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        return this.sendResponse(this.status.IP);
      } else {
        return this.sendResponse(this.status.NP, null, "Player name not found");
      }
    } catch (err) {
      return err;
    }
  }
  //RESOLVED +1
  // Handler to resolve session
  // - 2 wkt or more by bowler in match
  async getMatchTopBowlerWkts() {
    try {
      this.eventId = 37494679;
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }

      //fetching data from all bowlers
      let bowlerlist = [];
      for (let i = 0; i < timelineData.events.length; i++) {
        if (timelineData.events[i].batting == undefined) {
          continue;
        } else {
          let xy = timelineData.events[i].bowling.bowler;
          if (xy.name && xy.wickets) {
            bowlerlist.push(xy.wickets);
            //  bowlerlist[xy.name] = {over:xy.overs, wickets:xy.wickets, inning:timelineData.events[i].inning }
          }
        }
      }

      // let bowlerHighestWkts = 0;
      // for (var key in data) {
      //   var obj = data[key];

      //   if(bowlerHighestWkts < obj.wickets ){
      //     bowlerHighestWkts = obj.wickets
      //   }
      //   console.log(obj.wickets)

      // }

      return this.sendResponse(this.status.CL, Math.max(...bowlerlist));
    } catch (err) {
      return err;
    }
  }

  //RESOLVED +1
  // Handler to resolve session
  // - Highest scoring over in match
  async getMatchHighestScoringOver() {
    this.eventId = 37494679;
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      if (timelineData.match.status.name !== "Ended") {
        return this.sendResponse(this.status.IP);
      }
      let xy = await this.oversummary(timelineData);

      let highestScoringOver = 0;
      let nameofover = 0;
      let inning_no = -1;
      for (let key in xy) {
        if (Object.keys(xy[key]).length != 0 && isNaN(parseInt(xy[key]))) {
          for (let ele in xy[key]) {
            let maxrun = xy[key][ele].reduce((acc, curr) => {
              return acc + curr;
            });
            console.log(ele, maxrun, key);
            if (highestScoringOver < maxrun) {
              highestScoringOver = maxrun;
              nameofover = ele;
              inning_no = key;
            }
          }
        }
      }

      console.log(nameofover, "+", highestScoringOver, inning_no);
      return this.sendResponse(
        this.status.CL,
        `${inning_no}:inning ${highestScoringOver}run in ${nameofover} over`
      );
    } catch (err) {
      return err;
    }
  }

  //RESOLVED +1
  // Handler to resolve session
  // - How many balls face by {Player Name}
  async getPlayerFacedBallsCount(session) {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      const targetInning = session.match(/\d$/g)
        ? Number(session.match(/\d$/g)[0])
        : 0;

      if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session inning"
        );
      }

      session = this.filterSessionString(session);
      session = session.trim();

      const playerName = session
        .match(/\s+by\s+([a-z\s,.'-]+)$/gi)[0]
        .split(" by ")[1];

      const currentInning = Object.values(
        timelineData.match.resultinfo.innings
      ).length;

      //   for (let i = 0; i < timelineData.events.length; i++) {
      //     if (timelineData.events[i].batting === undefined) {
      //       console.log(i, j);
      //       continue;
      //     } else {
      //       i = {
      //         inning: j,
      //         name: batsmenlist[timelineData.events[i].batting.striker.name],
      //         // runs: timelineData.events[i].batting.striker.runs,
      //         balls: timelineData.events[i].batting.striker.balls,
      //       };
      //     }
      //   }
      // }

      // console.log(">>>>>>", batsmenlist);

      // return false;
      let played_balls = 0;
      for (let i = targetInning; i <= currentInning; i++) {
        let player_found = false;
        for (let p = timelineData.events.length - 1; p >= 0; p--) {
          if (timelineData.events[p].inning == undefined) {
            continue;
          } else if (
            timelineData.events[p].inning === i &&
            this.isPlayerNameMatched(
              playerName.trim(),
              timelineData.events[p].batting.striker.name.trim()
            )
          ) {
            if (timelineData.match.status.name == "Ended") {
              played_balls = timelineData.events[p].batting.striker.balls;
              return this.sendResponse(this.status.CL, played_balls);
            } else {
              return this.sendResponse(this.status.IP);
            }
          }
        }

        // const batsmenList = timelineData.innings[i].batsmen;
        // for (let k = 0; k < batsmenList.length; k++) {
        //   if (
        //     this.isPlayerNameMatched(
        //       playerName.trim(),
        //       batsmenList[k].batsmanName.trim()
        //     )
        //   ) {
        //     if (
        //       // (!batsmenList[k].didNotBat && !batsmenList[k].active) ||
        //       timelineData.match.status.name === "Ended"
        //     ) {
        //       return this.sendResponse(this.status.CL, batsmenList[k].balls);}
        if (!player_found) {
          return this.sendResponse(
            this.status.NP,
            null,
            "Player name not found"
          );
        }
      }

      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        return this.sendResponse(this.status.IP);
      }
    } catch (err) {
      return err;
    }
  }

  //RESOLVED
  //to show run for team at point of fall wicket X
  // Handler to resolve session
  // - Fall of x wkt XXX
  async getTeamNthWktRun(session) {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      const targetInning = session.match(/\d$/g)
        ? Number(session.match(/\d$/g)[0])
        : 0;

      if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session inning"
        );
      }

      session = this.filterSessionString(session);
      session = session.trim();
      // let session = "AUS";
      const targetWicket =session.match(/\d+/g);

      if (
        !targetWicket ||
        isNaN(Number(targetWicket)) ||
        Number(targetWicket) > 10
      ) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session wicket"
        );
      }

      const currentInning = Object.keys(
        timelineData.match.resultinfo.innings
      ).length;

      let sum = 0;
      let _wicket = 0;
      for (let i = targetInning; i < currentInning; i++) {
        const team = timelineData.match.resultinfo.innings[i].team;
        const teamName = timelineData.match.teams[team].name;

        if (this.isTeamNameMatched(session, teamName)) {
          let currentWickets = timelineData.match.resultinfo.innings[i].wickets;

          if (targetWicket <= currentWickets) {
            for (let p = 0; p < timelineData.events.length; p++) {
              let xy = timelineData.events[p].batting;
              if (xy == undefined) continue;
              else if (timelineData.events[p].inning == i) {
                sum =
                  sum +
                  timelineData.events[p].bowling.extrasConceded +
                  xy.runsScored;
                if (timelineData.events[p].type == "wicket") {
                  _wicket++;
                }
              }
              if (_wicket == targetWicket) {
                return this.sendResponse(this.status.CL, sum);
              }
            }
          }

          //     let currentWickets = timelineData.innings[i].wickets;
          //     if (targetWicket <= currentWickets) {
          //       const fallOfwickets = timelineData.innings[i].fallOfwickets
          //         .split(", ")
          //         .filter((i) => i.length);
          //       const wicketDescription = this.getWicketDescription(
          //         fallOfwickets,
          //         targetWicket
          //       );
          //       const [teamScoreOnWicket] = wicketDescription.match(/\d+\/\d+/g);
          //       const [teamRun] = teamScoreOnWicket.split("/");
          //       return this.sendResponse(this.status.CL, teamRun);
          //     }
          else {
            return this.sendResponse(this.status.IP);
          }
        }
      }

      // for (let i = targetInning; i <= currentInning; i++) {
      //   for (let p = 0; p < timelineData.events.length; p++) {
      //     let xy = timelineData.events[p].batting;
      //     if (xy == undefined) continue;
      //     else if (timelineData.events[p].inning == i) {
      //       sum =
      //         sum +
      //         timelineData.events[p].bowling.extrasConceded +
      //         xy.runsScored;
      //       if (timelineData.events[p].type == "wicket") {
      //         _wicket++;
      //       }
      //     }
      //     if (_wicket == targetWicket) {
      //       return this.sendResponse(this.status.CL, sum);
      //     }
      //   }
      // }

      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        if (timelineData.match.status.name != "Ended") {
          return this.sendResponse(this.status.IP);
        } else {
          return this.sendResponse(this.status.NP, null, "Fetching Error");
        }
      } else {
        return this.sendResponse(this.status.NA, null, "NA");
      }
    } catch (err) {
      return err;
    }
  }

  // RESOLVED
  //Handler to resolve session
  //-Match x over run
  async getMatchNthOverRun(session) {
    this.eventId = 37494679;
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);

      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      session = this.filterSessionString(session);
      session = session.trim();

      const [targetOver] = session.match(/^(?:\d+[.]\d)|\d+/g);

      if (!targetOver) {
        return this.sendResponse(this.status.NP, null, "Invalid session over");
      }

      const currentInning = timelineData.match.resultinfo.innings;
      const currentOver =
        currentInning[Object.keys(currentInning).length].overs;

      if (targetOver <= currentOver) {
        //   const overSummaries = timelineData.ballByBallSummaries;
        //   const eachBallRun =
        //     overSummaries[targetOver - 1]["firstInnings"].split(",");
        //   const totalBalls = eachBallRun.length;
        //   const maxOverBallsToTraverse = 6;

        //   let score = 0;
        //   let counterOfBall = 0;

        //   for (let k = 0; k < totalBalls; k++) {
        //     if (counterOfBall <= maxOverBallsToTraverse) {
        //       const element = eachBallRun[k];

        //       score += this.getRun(element);
        //       counterOfBall += this.isBall(element);
        //     }
        //   }
        //   return this.sendResponse(this.status.CL, score);

        let new_obj = await this.oversummary();
        let score = 0;
        for (let i = 1; i <= targetOver; i++) {
          new_obj[1][i].forEach((x) => {
            score += x;
          });
        }
        return this.sendResponse(this.status.CL, score);
      } else if (timelineData.match.status.name === "Ended") {
        return this.sendResponse(this.status.CL);
      } else {
        return this.sendResponse(this.status.IP);
      }
    } catch (err) {
      return err;
    }
  }

  // RESOLVED
  // - Only x over run XXX
  // - x over run XXX
  // - x.x over run XXX
  async getTeamOverRun(session) {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }
      let isOverOnly = false;
      if (session.match(/^(only\s+)/gi)) {
        isOverOnly = true;
      }
      const targetInning = session.match(/\d$/g)
        ? Number(session.match(/\d$/g)[0])
        : 0;

      if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session inning"
        );
      }
      session = this.filterSessionString(session);
      session = session.replace(/^(only\s+)/gi, "");
      session = session.trim();
      const [targetOver] = session.match(/^(?:\d+[.]\d)|\d+/g);

      if (!targetOver) {
        return this.sendResponse(this.status.NP, null, "Invalid session over");
      }
      const [over, balls] = targetOver.split(".");
      let [Over, Balls] = [parseInt(over), parseInt(balls)];

      if (isNaN(Number(over)) || (balls && isNaN(Number(balls)))) {
        return this.sendResponse(this.status.NP, null, "Invalid session over");
      }
      const currentInning = Object.keys(
        timelineData.match.resultinfo.innings
      ).length;

      for (let i = targetInning; i < currentInning; i++) {
        const team = timelineData.match.resultinfo.innings[i].team;
        const teamName = timelineData.match.teams[team].name;

        const currentOver =
          timelineData.match.resultinfo.innings[currentInning].overs;

        if (this.isTeamNameMatched(session, teamName)) {
          if (targetOver <= currentOver) {
            let score = 0;

            if (isOverOnly) {
              // const eachBallRun =
              //   overSummaries[balls ? over : over - 1][inning].split(",");
              // const totalBalls = eachBallRun.length;
              // const maxOverBallsToTraverse = balls ? Number(balls) : 6;

              // let batsmenlisterOfBall = 0;

              // for (let k = 0; k < totalBalls; k++) {
              //   if (counterOfBall <= maxOverBallsToTraverse) {
              //     const element = eachBallRun[k];

              //     score += this.getRun(element);
              //     counterOfBall += this.isBall(element);
              //   }
              // }
              let new_obj = await this.oversummary();
              let score = 0;
              for (let i = 1; i <= Over; i++) {
                new_obj[1][i].forEach((x) => {
                  score += x;
                });
              }
            } else {
              let new_obj = await this.oversummary();
              let score = 0;
              for (let i = 1; i <= Over; i++) {
                new_obj[1][i].forEach((x) => {
                  score += x;
                });
              }
              for (let k = 0; k < Balls; k++) {
                score += new_obj[1][Over + 1][k];
              }
            }
            return this.sendResponse(this.status.CL, score);
          } else if (timelineData.match.status.name == "Ended") {
            return this.sendResponse(
              this.status.CL,
              timelineData.match.resultinfo.innings[i].runs
            );
          } else {
            return this.sendResponse(this.status.IP);
          }
        }
      }
      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        return this.sendResponse(this.status.IP);
      } else {
        return this.sendResponse(this.status.NP, null, "Team name not found");
      }
    } catch (err) {
      return err;
    }
  }

  //RESOLVED
  // Handler to resolve session
  // - x wkt pship boundaries XXX
  async getTeamNthWktBoundaries(session) {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      const targetInning = session.match(/\d$/g)
        ? Number(session.match(/\d$/g)[0])
        : 0;

      if (isNaN(targetInning) || (targetInning !== 0 && targetInning !== 2)) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session inning"
        );
      }

      session = this.filterSessionString(session);
      session = session.trim();

      const [targetWicket] = session.match(/^\d+/g);

      if (
        !targetWicket ||
        isNaN(Number(targetWicket)) ||
        Number(targetWicket) > 10
      ) {
        return this.sendResponse(
          this.status.NP,
          null,
          "Invalid session wicket"
        );
      }

      let indx_previous;
      let indx_target;

      // let targetWicket = 1;
      // let targetInning = 1;
      let previous_wicket = targetWicket - 1;
      const currentInning = Object.keys(
        timelineData.match.resultinfo.innings
      ).length;
      let totalBoundaries = 0;

      for (let i = targetInning; i < currentInning; i++) {
        const team = timelineData.match.resultinfo.innings[i].team;
        const teamName = timelineData.match.teams[team].name;

        if (this.isTeamNameMatched(session, teamName)) {
          const currentWickets =
            timelineData.match.resultinfo.innings[i].wickets;

          if (Number(targetWicket) <= currentWickets) {
            console.log("hello world", currentInning);
            let wicket_count = 0;
            if (targetWicket == 1) {
              for (let k = 0; k < timelineData.events.length; k++) {
                if (
                  timelineData.events[k].type == "wicket" &&
                  timelineData.events[k].inning == targetInning
                ) {
                  return this.sendResponse(this.status.CL, totalBoundaries);
                }
                if (
                  timelineData.events[k].type == "boundary" &&
                  timelineData.events[k].inning == targetInning
                ) {
                  //  console.log(k);
                  totalBoundaries++;
                }
              }
            } else {
              wicket_count = 1;
              // console.log("j", previous_wicket, targetWicket, wicket_count);
              for (let j = 0; j < timelineData.events.length; j++) {
                if (previous_wicket == wicket_count) {
                  indx_previous = j;
                }
                if (targetWicket == wicket_count) {
                  indx_target = j;
                }

                if (
                  timelineData.events[j].type == "wicket" &&
                  timelineData.events[j].inning == targetInning
                ) {
                  wicket_count++;
                }
                // for (let k = 0; k < totalBalls; k++) {
                //   if (j === prevWicketOver && k < prevWicketBall) {
                //     continue;
                //   }

                //   if (j === targetWicketOver && k > targetWicketBall) {
                //     continue;
                //   }

                //   if (counterOfBall <= 6) {
                //     const element = eachBallRun[k];
                //     if (this.getRun(element) === 4) {
                //       totalBoundaries++;
                //     }
                //     counterOfBall += this.isBall(element);
                //   }
                // }

                //   if (
                //     timelineData.events[i].type == "boundary" &&
                //     timelineData.events[i].inning == targetInning
                //   ) {
                //     totalBoundaries++;
                //   }
              }
              console.log(wicket_count, "count", indx_previous, indx_target);
              // return this.sendResponse(this.status.CL, totalBoundaries);
            }
          } else {
            return this.sendResponse(this.status.IP);
          }
        } else {
          return this.sendResponse(this.status.NP, null, "Team name not found");
        }
      }
      for (let i = indx_previous; i <= indx_target; i++) {
        if (timelineData.events[i].type == undefined) {
          continue;
        } else if (timelineData.events[i].type == "boundary") {
          totalBoundaries++;
        }
      }
      // console.log(totalBoundaries);
      if (totalBoundaries) {
        return this.sendResponse(this.status.CL, totalBoundaries);
      }

      if (
        (targetInning === 0 && currentInning < 2) ||
        (targetInning === 2 && currentInning < 4)
      ) {
        return this.sendResponse(this.status.IP);
      }
      return this.sendResponse(this.status.NA);
    } catch (err) {
      return err;
    }
  }

  //ADDITIONAL RESOLVED
  async oversummary() {
    try {
      const timelineData = await this.fetchTimelineData(this.eventId);
      // console.log(this.eventId)
      if (timelineData instanceof Error || !timelineData) {
        return null;
      }

      let scoresinOvers = {
        1: {},
        2: {},
        3: {},
        4: {},
        5: {},
        6: {},
      };

      for (let i = 0; i < timelineData.events.length; i++) {
        let xy = timelineData.events[i];
        let innings = scoresinOvers[xy.inning];
        if (xy.inning === undefined) {
          continue;
        } else if (xy.over in innings) {
          let checkforextra = xy.bowling.extrasConceded;
          if (checkforextra) {
            scoresinOvers[xy.inning][xy.over].push(checkforextra);
          } else {
            scoresinOvers[xy.inning][xy.over].push(xy.batting.runsScored);
          }
        } else {
          if (xy.bowling.extrasConceded) {
            scoresinOvers[xy.inning][xy.over] = [xy.bowling.extrasConceded];
          } else {
            scoresinOvers[xy.inning][xy.over] = [xy.batting.runsScored];
          }
        }
      }

      // console.log(scoresinOvers);

      return scoresinOvers;
    } catch (err) {
      return err;
    }
  }
}
module.exports = { Session };
