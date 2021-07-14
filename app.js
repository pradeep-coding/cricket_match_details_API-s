const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

const playerDetailsDbToResponseDb = (dbObject) => {
  return {
    playerId: dbObject.player_id,
    playerName: dbObject.player_name,
  };
};

const matchDetailsDbToResponseDb = (dbObject) => {
  return {
    matchId: dbObject.match_id,
    match: dbObject.match,
    year: dbObject.year,
  };
};

const playerMatchScoreDbToResponseDb = (dbObject) => {
  return {
    playerMatchId: dbObject.player_match_id,
    playerId: dbObject.player_id,
    matchId: dbObject.match_id,
    score: dbObject.score,
    fours: dbObject.fours,
    sixes: dbObject.sixes,
  };
};

app.get("/players/", async (request, response) => {
  const getPlayersQuery = `SELECT *
                                FROM player_details;`;
  const playersArray = await database.all(getPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) => playerDetailsDbToResponseDb(eachPlayer))
  );
});

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT *
                            FROM player_details
                            WHERE player_id = ${playerId};`;
  const player = await database.get(getPlayerQuery);
  response.send(playerDetailsDbToResponseDb(player));
});

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const { playerName } = request.body;
  const updatePlayerQuery = `UPDATE player_details
                                SET player_name = '${playerName}'
                                WHERE player_id = ${playerId};`;
  await database.run(updatePlayerQuery);
  response.send("Player Details Updated");
});

app.get("/matches/:matchId", async (request, response) => {
  const { matchId } = request.params;
  const getMatchQuery = `SELECT *
                            FROM match_details
                            WHERE match_id = ${matchId};`;
  const match = await database.get(getMatchQuery);
  response.send(matchDetailsDbToResponseDb(match));
});

app.get("/players/:playerId/matches", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerQuery = `SELECT match_details.match_id,match,year
                        FROM match_details
                        INNER JOIN player_match_score ON player_match_score.match_id = match_details.match_id
                        INNER JOIN player_details ON player_details.player_id = player_match_score.player_id
                        WHERE player_details.player_id = ${playerId};`;
  const matchDetails = await database.all(getPlayerQuery);
  response.send(
    matchDetails.map((eachMatch) => matchDetailsDbToResponseDb(eachMatch))
  );
});

app.get("/matches/:matchId/players", async (request, response) => {
  const { matchId } = request.params;
  const getPlayersQuery = `SELECT player_details.player_id,player_details.player_name
                            FROM player_details
                            INNER JOIN player_match_score ON player_match_score.player_id = player_details.player_id
                            INNER JOIN match_details ON match_details.match_id = player_match_score.match_id
                            WHERE player_match_score.match_id = ${matchId};`;
  const playersArray = await database.all(getPlayersQuery);
  response.send(
    playersArray.map((eachPlayer) => playerDetailsDbToResponseDb(eachPlayer))
  );
});

app.get("/players/:playerId/playerScores", async (request, response) => {
  const { playerId } = request.params;
  const getPlayerStatsQuery = `SELECT player_details.player_id,player_name,SUM(score) AS totalScore,
                                            SUM(fours) AS totalFours, SUM(sixes) AS totalSixes
                                    FROM player_details
                                    INNER JOIN player_match_score ON player_details.player_id = player_match_score.player_id
                                    INNER JOIN match_details ON player_match_score.match_id = match_details.match_id
                                    WHERE player_details.player_id = ${playerId};`;
  const playerStats = await database.get(getPlayerStatsQuery);
  response.send({
    playerId: playerStats.player_id,
    playerName: playerStats.player_name,
    totalScore: playerStats.totalScore,
    totalFours: playerStats.totalFours,
    totalSixes: playerStats.totalSixes,
  });
});

module.exports = app;
