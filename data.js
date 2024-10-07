
const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
  "#fffe35", "#a83651", "#d53aff", "#6ec388", "#d6a989"];
const winColors = {
  anyWin: 'rgba(223,207,36,0.5)',
  0: 'rgba(0,0,0,0.2)',
  1: 'rgba(132,87,45,0.5)',
  2: 'rgba(0,137,173,0.5)',
  3: 'rgba(190,22,0,0.5)',
  4: 'rgba(173,0,123,0.5)',
  5: 'rgba(126,115,211,0.5)',
};
const colorscaleViridis = ['rgba(253,231,37,0.8)', 'rgba(132,212,75,0.8)', 'rgba(40,174,128,0.8)',
  'rgba(38,130,142,0.8)', 'rgba(59,82,139,0.8)', 'rgba(72,24,106,0.8  )'];
const IconMarkups = {
  ICON_ALPHA: 'Civ5Icon.Alpha.png',
  ICON_BLOCKADED: 'Civ5Icon.Blockaded.png',
  ICON_BULLET: 'Civ5Icon.Bullet.png',
  ICON_CAPITAL: 'Civ5Icon.Capital.png',
  ICON_CITIZEN: 'Civ5Icon.Citizen.png',
  ICON_CITY_STATE: 'Civ5Icon.CityState.png',
  ICON_CONNECTED: 'Civ5Icon.Connected.png',
  ICON_CULTURE: 'Civ5Icon.Culture.png',
  ICON_DENOUNCE: 'Civ5Icon.Denounce.png',
  ICON_FLOWER: 'Civ5Icon.Flower.png',
  ICON_FOOD: 'Civ5Icon.Food.png',
  ICON_GOLD: 'Civ5Icon.Gold.png',
  ICON_GOLDEN_AGE: 'Civ5Icon.GoldenAge.png',
  ICON_GREAT_PEOPLE: 'Civ5Icon.GreatPeople.png',
  ICON_HAPPINESS_1: 'Civ5Icon.Happiness1.png',
  ICON_HAPPINESS_2: 'Civ5Icon.Happiness2.png',
  ICON_HAPPINESS_3: 'Civ5Icon.Happiness3.png',
  ICON_HAPPINESS_4: 'Civ5Icon.Happiness4.png',
  ICON_IDEOLOGY_AUTOCRACY: 'Civ5Icon.IdeologyAutocracy.png',
  ICON_IDEOLOGY_FREEDOM: 'Civ5Icon.IdeologyFreedom.png',
  ICON_IDEOLOGY_ORDER: 'Civ5Icon.IdeologyOrder.png',
  ICON_INFLUENCE: 'Civ5Icon.Influence.png',
  ICON_INQUISITOR: 'Civ5Icon.Inquisitor.png',
  ICON_INVEST: 'Civ5Icon.Invest.png',
  ICON_LOCKED: 'Civ5Icon.Locked.png',
  ICON_MINUS: 'Civ5Icon.Minus.png',
  ICON_MISSIONARY: 'Civ5Icon.Missionary.png',
  ICON_MOVES: 'Civ5Icon.Moves.png',
  ICON_MUSHROOM: 'Civ5Icon.Mushroom.png',
  ICON_OCCUPIED: 'Civ5Icon.Occupied.png',
  ICON_OMEGA: 'Civ5Icon.Omega.png',
  ICON_PEACE: 'Civ5Icon.Peace.png',
  ICON_PIRATE: 'Civ5Icon.Pirate.png',
  ICON_PLUS: 'Civ5Icon.Plus.png',
  ICON_PRODUCTION: 'Civ5Icon.Production.png',
  ICON_PROPHET: 'Civ5Icon.Prophet.png',
  ICON_PUPPET: 'Civ5Icon.Puppet.png',
  ICON_RANGE_STRENGTH: 'Civ5Icon.RangeStrength.png',
  ICON_RAZING: 'Civ5Icon.Razing.png',
  ICON_RELIGION: 'Civ5Icon.Religion.png',
  ICON_RELIGION_BUDDHISM: 'Civ5Icon.ReligionBuddhism.png',
  ICON_RELIGION_CHRISTIANITY: 'Civ5Icon.ReligionChristianity.png',
  ICON_RELIGION_CONFUCIANISM: 'Civ5Icon.ReligionConfucianism.png',
  ICON_RELIGION_HINDUISM: 'Civ5Icon.ReligionHinduism.png',
  ICON_RELIGION_ISLAM: 'Civ5Icon.ReligionIslam.png',
  ICON_RELIGION_JUDAISM: 'Civ5Icon.ReligionJudaism.png',
  ICON_RELIGION_ORTHODOX: 'Civ5Icon.ReligionOrthodox.png',
  ICON_RELIGION_PANTHEON: 'Civ5Icon.ReligionPantheon.png',
  ICON_RELIGION_PROTESTANT: 'Civ5Icon.ReligionProtestant.png',
  ICON_RELIGION_SHINTO: 'Civ5Icon.ReligionShinto.png',
  ICON_RELIGION_SIKHISM: 'Civ5Icon.ReligionSikhism.png',
  ICON_RELIGION_TAOISM: 'Civ5Icon.ReligionTaoism.png',
  ICON_RELIGION_TENGRIISM: 'Civ5Icon.ReligionTengriism.png',
  ICON_RELIGION_ZOROASTRIANISM: 'Civ5Icon.ReligionZoroastrianism.png',
  ICON_RES_ALUMINUM: 'Civ5Icon.ResAluminum.png',
  ICON_RES_BANANA: 'Civ5Icon.ResBanana.png',
  ICON_RES_CITRUS: 'Civ5Icon.ResCitrus.png',
  ICON_RES_COAL: 'Civ5Icon.ResCoal.png',
  ICON_RES_COPPER: 'Civ5Icon.ResCopper.png',
  ICON_RES_COTTON: 'Civ5Icon.ResCotton.png',
  ICON_RES_COW: 'Civ5Icon.ResCow.png',
  ICON_RES_CRAB: 'Civ5Icon.ResCrab.png',
  ICON_RES_DEER: 'Civ5Icon.ResDeer.png',
  ICON_RES_DYE: 'Civ5Icon.ResDye.png',
  ICON_RES_FISH: 'Civ5Icon.ResFish.png',
  ICON_RES_FUR: 'Civ5Icon.ResFur.png',
  ICON_RES_GEMS: 'Civ5Icon.ResGems.png',
  ICON_RES_GOLD: 'Civ5Icon.ResGold.png',
  ICON_RES_HORSE: 'Civ5Icon.ResHorse.png',
  ICON_RES_INCENSE: 'Civ5Icon.ResIncense.png',
  ICON_RES_IRON: 'Civ5Icon.ResIron.png',
  ICON_RES_IVORY: 'Civ5Icon.ResIvory.png',
  ICON_RES_JEWELRY: 'Civ5Icon.ResJewelry.png',
  ICON_RES_MARBLE: 'Civ5Icon.ResMarble.png',
  ICON_RES_OIL: 'Civ5Icon.ResOil.png',
  ICON_RES_PEARLS: 'Civ5Icon.ResPearls.png',
  ICON_RES_PORCELAIN: 'Civ5Icon.ResPorcelain.png',
  ICON_RES_SALT: 'Civ5Icon.ResSalt.png',
  ICON_RES_SHEEP: 'Civ5Icon.ResSheep.png',
  ICON_RES_SILK: 'Civ5Icon.ResSilk.png',
  ICON_RES_SILVER: 'Civ5Icon.ResSilver.png',
  ICON_RES_SPICES: 'Civ5Icon.ResSpices.png',
  ICON_RES_STONE: 'Civ5Icon.ResStone.png',
  ICON_RES_SUGAR: 'Civ5Icon.ResSugar.png',
  ICON_RES_TRUFFLES: 'Civ5Icon.ResTruffles.png',
  ICON_RES_URANIUM: 'Civ5Icon.ResUranium.png',
  ICON_RES_WHALE: 'Civ5Icon.ResWhale.png',
  ICON_RES_WHEAT: 'Civ5Icon.ResWheat.png',
  ICON_RES_WINE: 'Civ5Icon.ResWine.png',
  ICON_RESEARCH: 'Civ5Icon.Research.png',
  ICON_RESISTANCE: 'Civ5Icon.Resistance.png',
  ICON_SPY: 'Civ5Icon.Spy.png',
  ICON_STAR: 'Civ5Icon.Star.png',
  ICON_STRENGTH: 'Civ5Icon.Strength.png',
  ICON_TEAM_1: 'Civ5Icon.Team1.png',
  ICON_TEAM_10: 'Civ5Icon.Team10.png',
  ICON_TEAM_11: 'Civ5Icon.Team11.png',
  ICON_TEAM_2: 'Civ5Icon.Team2.png',
  ICON_TEAM_3: 'Civ5Icon.Team3.png',
  ICON_TEAM_4: 'Civ5Icon.Team4.png',
  ICON_TEAM_5: 'Civ5Icon.Team5.png',
  ICON_TEAM_6: 'Civ5Icon.Team6.png',
  ICON_TEAM_7: 'Civ5Icon.Team7.png',
  ICON_TEAM_8: 'Civ5Icon.Team8.png',
  ICON_TEAM_9: 'Civ5Icon.Team9.png',
  ICON_TEAM_USA: 'Civ5Icon.TeamUsa.png',
  ICON_TRADE: 'Civ5Icon.Trade.png',
  ICON_TRADE_WHITE: 'Civ5Icon.TradeWhite.png',
  ICON_VIEW_CITY: 'Civ5Icon.ViewCity.png',
  ICON_WAR: 'Civ5Icon.War.png',
  ICON_WORKER: 'Civ5Icon.Worker.png',
  ICON_WTF1: 'Civ5Icon.Wtf1.png',
  ICON_WTF2: 'Civ5Icon.Wtf2.png',
  ICON_GREAT_ENGINEER: 'Civ5Icon.GreatEngineer.png',
  ICON_GREAT_GENERAL: 'Civ5Icon.GreatGeneral.png',
  ICON_GREAT_SCIENTIST: 'Civ5Icon.GreatScientist.png',
  ICON_GREAT_MERCHANT: 'Civ5Icon.GreatMerchant.png',
  ICON_GREAT_ARTIST: 'Civ5Icon.GreatArtist.png',
  ICON_GREAT_MUSICIAN: 'Civ5Icon.GreatMusician.png',
  ICON_GREAT_WRITER: 'Civ5Icon.GreatWriter.png',
  ICON_GREAT_ADMIRAL: 'Civ5Icon.GreatAdmiral.png',
  ICON_TOURISM: 'Civ5Icon.Tourism.png'
};
const civColorsDict = {
  Lose: 'rgba(0,0,0,0.8)',
  Time: 'rgba(132,87,45,0.8)',
  Science: 'rgba(0,137,173,0.8)',
  Domination: 'rgba(190,22,0,0.8)',
  Cultural: 'rgba(173,0,123,0.8)',
  Diplomatic: 'rgba(126,115,211,0.8)',
}
const sqlQueries = {
    v1: {
        ["plot-games-victories"]: `
            WITH T2 AS (
                SELECT WinID, IFNULL(BranchID, -1) AS BranchID
                FROM Games
                JOIN GameSeeds USING(GameID)
                LEFT JOIN (
                    SELECT GameID AS gid, Player AS plr, MAX(Turn) AS mt, BranchID
                    FROM PoliciesChanges
                    JOIN GameSeeds USING(GameSeed)
                    JOIN Games USING(GameID)
                    JOIN PolicyKeys USING(PolicyID)
                    WHERE BranchID IN (9,10,11) AND WinID > 0
                    GROUP BY gid, plr
                ) ON gid = GameID AND plr = Player
                WHERE WinID > 0
                GROUP BY GameID
            )
            SELECT
            REPLACE(PRINTF("[%s,%s]", wt, GROUP_CONCAT(QUOTE(PolicyBranch))), '''', '"') AS "labels",
            REPLACE(PRINTF("[%s,%s]", wt, GROUP_CONCAT(QUOTE(id))), '''', '"') AS "ids",
            REPLACE(PRINTF("[%s,%s]", root, GROUP_CONCAT(QUOTE(WinType))), '''', '"') AS "parents",
            PRINTF("[%s,%s]", gsum, GROUP_CONCAT(QUOTE("sum"))) AS "values"
            FROM (
                SELECT PRINTF("%s-%s", WinType, IIF(BranchID != -1, PolicyBranch, "No Ideology")) AS id, WinType,
                IIF(BranchID != -1, PolicyBranch, "No Ideology") AS PolicyBranch, COUNT(WinID) AS "sum"
                FROM T2
                JOIN WinTypes USING(WinID)
                LEFT JOIN PolicyBranches USING(BranchID)
                GROUP BY WinID, BranchID
            )
            LEFT JOIN (
                SELECT GROUP_CONCAT(QUOTE('')) AS root, GROUP_CONCAT(QUOTE(wintype)) AS wt, GROUP_CONCAT(wsum) AS gsum FROM (
                    SELECT WinType, COUNT(BranchID) AS wsum
                    FROM T2
                    JOIN WinTypes USING(WinID)
                    GROUP BY WinID
                )
            );
            
            SELECT Civilization,
            COUNT(*),
            ROUND(AVG(Standing), 2),
            COUNT(CASE WHEN Standing = 1 THEN Civilization END) AS '1st Place',
            COUNT(CASE WHEN Standing = 2 THEN Civilization END) AS '2nd Place',
            COUNT(CASE WHEN Standing = 3 THEN Civilization END) AS '3rd Place',
            COUNT(CASE WHEN Standing = 4 THEN Civilization END) AS '4th Place',
            COUNT(CASE WHEN Standing = 5 THEN Civilization END) AS '5th Place',
            COUNT(CASE WHEN Standing = 6 THEN Civilization END) AS '6th Place'
            FROM Games
            JOIN GameSeeds USING(GameID)
            GROUP BY Civilization
            ORDER BY "1st Place"*1.0/COUNT(*), "2nd Place"*1.0/COUNT(*), "3rd Place"*1.0/COUNT(*),
            "4th Place"*1.0/COUNT(*), "5th Place"*1.0/COUNT(*), "6th Place"*1.0/COUNT(*);
            
            WITH ngames AS (
                SELECT COUNT(DISTINCT Player) AS ng FROM Games
            )
            SELECT 'Game '||PlayerGameNumber,
            ROUND(COUNT(*) * 100.0 / ng, 2) || '%' AS "% Games Played"
            FROM Games
            JOIN ngames
            WHERE PlayerGameNumber <= 5
            GROUP BY PlayerGameNumber;
        `,
    },
  ["plot-games-victories"]: `
    WITH T2 AS (
      SELECT WinID, IFNULL(BranchID, -1) AS BranchID
      FROM Games
      JOIN GameSeeds USING(GameID)
      LEFT JOIN (
          SELECT GameID AS gid, Player AS plr, MAX(Turn) AS mt, BranchID
          FROM ReplayEvents
          JOIN GameSeeds USING(GameSeed)
          JOIN Games USING(GameID, PlayerID)
          JOIN PolicyKeys ON PolicyID = Num2
          WHERE ReplayEventType = 61 AND BranchID IN (9,10,11) AND WinID > 0
          GROUP BY gid, plr
      ) ON gid = GameID AND plr = Player
      WHERE WinID > 0 AND GameSeed NOT NULL
      GROUP BY GameID
    )
    SELECT
    REPLACE(PRINTF("[%s,%s]", wt, GROUP_CONCAT(QUOTE(PolicyBranch))), '''', '"') AS "labels",
    REPLACE(PRINTF("[%s,%s]", wt, GROUP_CONCAT(QUOTE(id))), '''', '"') AS "ids",
    REPLACE(PRINTF("[%s,%s]", root, GROUP_CONCAT(QUOTE(WinType))), '''', '"') AS "parents",
    PRINTF("[%s,%s]", gsum, GROUP_CONCAT(QUOTE("sum"))) AS "values"
    FROM (
        SELECT PRINTF("%s-%s", WinType, IIF(BranchID != -1, PolicyBranch, "No Ideology")) AS id, WinType,
        IIF(BranchID != -1, PolicyBranch, "No Ideology") AS PolicyBranch, COUNT(WinID) AS "sum"
        FROM T2
        JOIN WinTypes USING(WinID)
        LEFT JOIN PolicyBranches USING(BranchID)
        GROUP BY WinID, BranchID
    )
    LEFT JOIN (
        SELECT GROUP_CONCAT(QUOTE('')) AS root, GROUP_CONCAT(QUOTE(wintype)) AS wt, GROUP_CONCAT(wsum) AS gsum FROM (
            SELECT WinType, COUNT(BranchID) AS wsum
            FROM T2
            JOIN WinTypes USING(WinID)
            GROUP BY WinID
        )
    );
    
    SELECT CivKey AS Civilization,
    COUNT(*),
    ROUND(AVG(Standing), 2),
    COUNT(CASE WHEN Standing = 1 THEN CivID END) AS '1st Place',
    COUNT(CASE WHEN Standing = 2 THEN CivID END) AS '2nd Place',
    COUNT(CASE WHEN Standing = 3 THEN CivID END) AS '3rd Place',
    COUNT(CASE WHEN Standing = 4 THEN CivID END) AS '4th Place',
    COUNT(CASE WHEN Standing = 5 THEN CivID END) AS '5th Place',
    COUNT(CASE WHEN Standing = 6 THEN CivID END) AS '6th Place'
    FROM Games
    JOIN GameSeeds USING(GameID)
    JOIN Players USING(GameSeed, PlayerID)
    JOIN CivKeys USING(CivID)
    WHERE Standing NOT NULL
    GROUP BY CivID
    ORDER BY "1st Place"*1.0/COUNT(*), "2nd Place"*1.0/COUNT(*), "3rd Place"*1.0/COUNT(*),
    "4th Place"*1.0/COUNT(*), "5th Place"*1.0/COUNT(*), "6th Place"*1.0/COUNT(*);
    
    WITH ngames AS (
        SELECT COUNT(DISTINCT Player) AS ng FROM Games
    )
    SELECT 'Game '||PlayerGameNumber,
    ROUND(COUNT(*) * 100.0 / ng, 2) || '%' AS "% Games Played"
    FROM Games
    JOIN ngames
    WHERE PlayerGameNumber <= 5
    GROUP BY PlayerGameNumber;
  `,
  ["fillSelects"]: `
	SELECT GameSeeds.GameID||'	('||GROUP_CONCAT(Player, ', ')||')', GameSeeds.GameID FROM Games
	JOIN GameSeeds ON GameSeeds.GameID = Games.GameID
	WHERE GameSeeds.EndTurn > 0
	GROUP BY Games.GameID
	ORDER BY GameSeeds.GameID;
	SELECT Player from GameSeeds
	JOIN Games ON Games.GameID = GameSeeds.GameID
	GROUP BY Player ORDER BY Player;
	VALUES('Generic', 'groupSeparator'),
		('Winners', '{"group":"generic","id":0}'),
		('Playoff Players', '{"group":"generic","id":1}'),
		('Final Game Players', '{"group":"generic","id":2}'),
		('Civilizations', 'groupSeparator')
	UNION ALL
	SELECT * FROM (
		SELECT CivKey, '{"group":"civs","id":'||CivID||'}'
    	FROM Players
    	JOIN CivKeys USING(CivID)
    	WHERE PlayerID <= 21
    	GROUP BY CivID
		ORDER BY CivKey
	)
	UNION ALL
	VALUES('Players', 'groupSeparator')
	UNION ALL
	SELECT * FROM (
		SELECT Player, '{"group":"players","id":"'||Player||'"}' from GameSeeds
		JOIN Games ON Games.GameID = GameSeeds.GameID
		GROUP BY Player ORDER BY Player
	)
	UNION ALL
	VALUES('Wonder Builders', 'groupSeparator')
	UNION ALL
	SELECT * FROM (
		SELECT BuildingClassKey, '{"group":"wonders","id":"'||BuildingClassKey||'"}' FROM BuildingClassKeys WHERE TypeID = 2
		ORDER BY BuildingClassKey
	);
	SELECT ReplayDataSetKey, ReplayDataSetID FROM ReplayDataSetKeys
	WHERE ReplayDataSetKey > ''
	ORDER BY ReplayDataSetKey;
  `,
  ["plot-bar-beliefs-time"]: `
    WITH config(Key,Value) AS (
    	VALUES('type','bar'),
    		('mode', 'lines'),
    		('xaxis','Turn'),
    		('yaxis','Occurrences')
    )
    SELECT * FROM config
    ;
    
    SELECT BeliefType FROM BeliefTypes
    ;
    
    SELECT BeliefType, Turn, COUNT(*) FROM (
    	SELECT Turn, ReplayEventType, Num1 AS Value FROM ReplayEvents
    	WHERE ReplayEventType = 17
    	UNION
    	SELECT Turn, ReplayEventType, Num2 FROM ReplayEvents
    	WHERE ReplayEventType = 18
    	UNION
    	SELECT Turn, ReplayEventType, Num3 FROM ReplayEvents
    	WHERE ReplayEventType = 18
    	UNION
    	SELECT Turn, ReplayEventType, Num4 FROM ReplayEvents
    	WHERE ReplayEventType = 18
    	UNION
    	SELECT Turn, ReplayEventType, Num5 FROM ReplayEvents
    	WHERE ReplayEventType = 18
    	UNION
    	SELECT Turn, ReplayEventType, Num2 FROM ReplayEvents
    	WHERE ReplayEventType = 19
    	UNION
    	SELECT Turn, ReplayEventType, Num3 FROM ReplayEvents
    	WHERE ReplayEventType = 19
    )
    JOIN BeliefKeys ON BeliefID = Value
    JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
    GROUP BY Turn, BeliefKeys.TypeID
    ;
  `,
  ["plot-bar-policies-time"]: `
	WITH config(Key,Value) AS (
		VALUES('type','bar'),
			('mode', 'lines'),
			('xaxis','Turn'),
			('yaxis','Occurrences')
	)
	SELECT * FROM config
	;
	
	SELECT PolicyBranch FROM PolicyBranches
	;
	
	SELECT PolicyBranch, Turn, COUNT(*) FROM (
	SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
	WHERE ReplayEventType = 61
	)
    JOIN PolicyKeys ON PolicyID = Value
    JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
    GROUP BY Turn, PolicyBranches.BranchID
	;
  `,
  ["plot-bar-techs-time"]: `
	WITH config(Key,Value) AS (
		VALUES('type','bar'),
			('mode', 'lines'),
			('xaxis','Turn'),
			('yaxis','Occurrences')
	)
	SELECT * FROM config
	;
	
	SELECT TechnologyKey FROM TechnologyKeys
	;
	
	SELECT TechnologyKey, Turn, COUNT(*) FROM (
	SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
	WHERE ReplayEventType = 91
	)
	JOIN TechnologyKeys ON TechnologyID = Value
	GROUP BY Turn, TechnologyKeys.TechnologyID
	;
  `,
  ["plot-bar-wonders-time"]: `
    WITH config(Key,Value) AS (
        VALUES('type','bar'),
            ('mode', 'lines'),
            ('xaxis','Turn'),
            ('yaxis','Occurrences')
    )
    SELECT * FROM config
    ;
    
    SELECT BuildingKey FROM BuildingKeys
    WHERE TypeID = 2
    ;
    
    SELECT BuildingKey, Turn, COUNT(*) FROM (
    SELECT Turn, ReplayEventType, Num2 AS Value FROM ReplayEvents
    WHERE ReplayEventType = 78
    )
    JOIN BuildingKeys ON BuildingID = Value
    WHERE TypeID = 2
    GROUP BY Turn, BuildingKeys.BuildingID
    ;
  `,
  ["table-hall-of-fame"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Greatest Wonder Builders'),
		('Demographics Screen Lovers'),
        ('Prominent City Governors'),
		('Total Turns Spent In-Game'),
		('Global Replay Records'),
		('Single Turn Replay Records')
	)
	SELECT * FROM config;
	
	SELECT DISTINCT T1.Player, IFNULL(T2.Wonders, 0) AS Wonders, Games FROM Games AS T1
	LEFT JOIN (
		SELECT Games.Player AS Player, COUNT(*) AS Wonders FROM ReplayEvents
		JOIN BuildingKeys ON BuildingKeys.BuildingID = Num2
		JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
		JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
		WHERE ReplayEvents.ReplayEventType = 78 AND TypeID = 2
		GROUP BY Games.Player
	) AS T2 ON T1.Player = T2.Player
    LEFT JOIN (
      SELECT COUNT(*) AS Games, Player FROM Games GROUP BY Player
    ) AS T3 ON T3.Player = T1.Player
	ORDER BY IFNULL(Wonders, 0) DESC
    LIMIT 15
	;
	
	SELECT Player, IFNULL(F9, 0) AS 'Times F9 Pressed', IFNULL(Games,0) AS Games FROM (
      SELECT *, Count(*) AS Games FROM (SELECT Games.Player FROM Games) AS T1
      LEFT JOIN (
        SELECT Player, SUM(F9) AS F9 FROM (
          SELECT Games.GameID, Games.Player, sum(ReplayDataSetsChanges.Value) AS F9
          FROM ReplayDataSetsChanges
          JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
          JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
          JOIN Games ON Games.PlayerID = ReplayDataSetsChanges.PlayerID AND Games.GameID = GameSeeds.GameID
          WHERE ReplayDataSetsChanges.ReplayDataSetID = 68 AND ReplayDataSetsChanges.Value > 0
          GROUP BY Games.Player
        )
        GROUP BY Player
      ) AS T2 ON T1.Player = T2.Player
    LEFT JOIN (
      SELECT COUNT(*) AS Games, Player FROM Games GROUP BY Player
    ) AS T3 ON T3.Player = T1.Player
      GROUP BY T1.Player
    )
    ORDER BY IFNULL(F9, 0) DESC
    LIMIT 15
    ;
    
    SELECT Player, IFNULL(CS, 0) AS 'Times Entered City', IFNULL(Games,0) AS Games FROM (
      SELECT *, Count(*) AS Games FROM (SELECT Games.Player FROM Games) AS T1
      LEFT JOIN (
        SELECT Player, SUM(CS) AS CS FROM (
          SELECT Games.GameID, Games.Player, sum(ReplayDataSetsChanges.Value) AS CS
          FROM ReplayDataSetsChanges
          JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
          JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
          JOIN Games ON Games.PlayerID = ReplayDataSetsChanges.PlayerID AND Games.GameID = GameSeeds.GameID
          WHERE ReplayDataSetsChanges.ReplayDataSetID = 79 AND ReplayDataSetsChanges.Value > 0
          GROUP BY Games.Player
        )
        GROUP BY Player
      ) AS T2 ON T1.Player = T2.Player
    LEFT JOIN (
      SELECT COUNT(*) AS Games, Player FROM Games GROUP BY Player
    ) AS T3 ON T3.Player = T1.Player
      GROUP BY T1.Player
    )
    ORDER BY IFNULL(CS, 0) DESC
    LIMIT 15
    ;
	
	SELECT Games.Player AS Player, IFNULL(SUM(IFNULL(PlayerQuitTurn, EndTurn)), 0) AS Turns, COUNT(*) AS Games
	FROM Games
	LEFT JOIN GameSeeds ON GameSeeds.GameID = Games.GameID
	GROUP BY Games.Player
	ORDER BY SUM(IFNULL(PlayerQuitTurn, EndTurn)) DESC
    LIMIT 15
	;
	
	DROP TABLE IF EXISTS T2;
    
    CREATE TEMPORARY TABLE T2 AS 
    SELECT *,
    SUM(Value) OVER (PARTITION BY DataSetID, GameSeed, PlayerID ORDER BY Turn) AS rsum
    FROM ReplayDataSetsChanges
    JOIN GameSeeds USING(GameSeed)
    JOIN Games USING(GameID, PlayerID)
    JOIN ReplayDataSetKeys USING(ReplayDataSetID)
    WHERE Turn <= IFNULL(PlayerQuitTurn, EndTurn)
    ;
    
    SELECT ReplayDataSetKey AS "Replay Category",
    MAX(rsum)||' ('||Player||', Game #'||GameID||', Turn '||Turn||')' AS "Highest Value ever recorded"
    FROM T2
    GROUP BY ReplayDataSetID;
    
    SELECT ReplayDataSetKey AS "Replay Category",
    MAX(Value)||' ('||Player||', Game #'||GameID||', Turn '||Turn||')' AS "Max Change per Turn"
    FROM T2
    GROUP BY ReplayDataSetID;
    
    DROP TABLE T2;
  `,
  ["table-belief-adoption"]: `
    WITH config(tableName) AS (
		VALUES('config'),
		('Average Turn of Belief Adoption'),
		('Median Turn of Belief Adoption'),
		('Minimum Turn of Belief Adoption'),
		('Number Times of Belief Adoption')
	)
	SELECT * FROM config;
	
	DROP TABLE IF EXISTS T2;
	
	CREATE TEMPORARY TABLE T2 AS SELECT * FROM (
		SELECT *,
        ROW_NUMBER() OVER (PARTITION BY Value ORDER BY Turn) AS Rnk,
        COUNT(*) OVER (PARTITION BY BeliefID) AS Cnt
    	FROM (
    	    SELECT *, Num1 AS Value FROM ReplayEvents
    	    WHERE ReplayEventType = 17
    	    UNION
    	    SELECT *, Num2 FROM ReplayEvents
    	    WHERE ReplayEventType = 18
    	    UNION
    	    SELECT *, Num3 FROM ReplayEvents
    	    WHERE ReplayEventType = 18
    	    UNION
    	    SELECT *, Num4 FROM ReplayEvents
    	    WHERE ReplayEventType = 18
    	    UNION
    	    SELECT *, Num5 FROM ReplayEvents
    	    WHERE ReplayEventType = 18
    	    UNION
    	    SELECT *, Num2 FROM ReplayEvents
    	    WHERE ReplayEventType = 19
    	    UNION
    	    SELECT *, Num3 FROM ReplayEvents
    	    WHERE ReplayEventType = 19
    	) AS T1
    	JOIN BeliefKeys ON BeliefID = Value
    	JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
    	JOIN GameSeeds ON GameSeeds.GameSeed = T1.GameSeed
    	JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = T1.PlayerID
    	JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = T1.PlayerID
    	JOIN CivKeys ON CivKeys.CivID = Players.CivID
	);
	
	SELECT BeliefType AS "Belief Type", BeliefKey AS "Belief",
	ROUND(AVG(Turn), 1) AS "Average Turn"
	FROM T2
    GROUP BY BeliefID
    ORDER BY "Average Turn";
	
	SELECT BeliefType AS "Belief Type", BeliefKey AS "Belief",
    Median AS "Median Turn"
	FROM T2
	JOIN (
	  	SELECT BeliefID AS BID, Turn AS Median
		FROM T2
		WHERE T2.Rnk = T2.Cnt / 2 + 1
	) AS T3 ON T3.BID = BeliefID
    GROUP BY BeliefID
    ORDER BY "Median Turn";
	
	SELECT BeliefType AS "Belief Type", BeliefKey AS "Belief",
    MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn"
	FROM T2
    GROUP BY BeliefID
    ORDER BY MIN(Turn);
	
	SELECT BeliefType AS "Belief Type", BeliefKey AS "Belief",
	COUNT(*) AS "Total Times Adopted"
	FROM T2
    GROUP BY BeliefID
    ORDER BY COUNT(*) DESC;
	
	DROP TABLE T2;
  `,
  ["table-policy-adoption"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Average Turn of Policy Adoption'),
		('Median Turn of Policy Adoption'),
		('Minimum Turn of Policy Adoption'),
		('Number Times of Policy Adoption')
	)
	SELECT * FROM config;
  
  DROP TABLE IF EXISTS T2;
  DROP TABLE IF EXISTS T3;
  DROP TABLE IF EXISTS T4;
  
  CREATE TEMPORARY TABLE T2 AS SELECT * FROM (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY Value ORDER BY Turn) AS Rnk,
        COUNT(*) OVER (PARTITION BY PolicyID) AS Cnt
        FROM (
            SELECT *, Num2 AS Value FROM ReplayEvents
            WHERE ReplayEventType = 61
        ) AS T1
        JOIN PolicyKeys ON PolicyID = Value
        JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
        JOIN GameSeeds ON GameSeeds.GameSeed = T1.GameSeed
        JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = T1.PlayerID
        JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = T1.PlayerID
        JOIN CivKeys ON CivKeys.CivID = Players.CivID
  );
  CREATE TEMPORARY TABLE T3 AS SELECT * FROM (
    SELECT *,
        ROW_NUMBER() OVER (PARTITION BY Value ORDER BY Turn) AS Rnk,
        COUNT(*) OVER (PARTITION BY BranchID) AS Cnt
        FROM (
            SELECT *, Num2 AS Value FROM ReplayEvents
            WHERE ReplayEventType = 75
        ) AS T1
        JOIN PolicyBranches ON BranchID = Value
        JOIN GameSeeds ON GameSeeds.GameSeed = T1.GameSeed
        JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = T1.PlayerID
        JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = T1.PlayerID
        JOIN CivKeys ON CivKeys.CivID = Players.CivID
  );
  CREATE TEMPORARY TABLE T4 AS SELECT * FROM (
  		SELECT *
  		FROM (
			SELECT *, COUNT(Num2) AS "Cnt_2", MAX(Turn)
			FROM T2
			GROUP BY GameSeed, PlayerID, BranchID
		)
  		WHERE Cnt_2 = 5 AND BranchID < 9
  );
  
  SELECT "Policy Branch", "Policy", "Average Turn"
  FROM (
  	SELECT BranchID, PolicyID, PolicyBranch AS "Policy Branch", PolicyKey AS "Policy",
  	ROUND(AVG(Turn), 1) AS "Average Turn"
  	FROM T2
    	GROUP BY PolicyID
  	UNION
  	SELECT BranchID, -1 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch AS "Policy",
  	ROUND(AVG(Turn), 1) AS "Average Turn"
  	FROM T3
    	GROUP BY BranchID
  	UNION
  	SELECT BranchID, 111 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch||' Finisher' AS "Policy",
  	ROUND(AVG(Turn), 1) AS "Average Turn"
  	FROM T4
    	GROUP BY BranchID
    	ORDER BY BranchID
	);
	
	SELECT "Policy Branch", "Policy", "Median Turn"
	FROM (
		SELECT BranchID, PolicyID, PolicyBranch AS "Policy Branch", PolicyKey AS "Policy",
    	Median AS "Median Turn"
		FROM T2
		JOIN (
	  		SELECT PolicyID AS PID, Turn AS Median
			FROM T2
			WHERE T2.Rnk = T2.Cnt / 2 + 1
		) AS T5 ON T5.PID = PolicyID
    	GROUP BY PolicyID
  	UNION
  	SELECT BranchID, -1 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch AS "Policy",
    	Median AS "Median Turn"
  	FROM T3
  	JOIN (
    	  SELECT BranchID AS PID, Turn AS Median
    	FROM T3
    	WHERE T3.Rnk = T3.Cnt / 2 + 1
  	) AS T5 ON T5.PID = BranchID
    	GROUP BY BranchID
  	UNION
  	SELECT BranchID, 111 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch||' Finisher' AS "Policy",
  		Median AS "Median Turn"
  	FROM T4
  	JOIN (
    	  SELECT BranchID AS PID, Turn AS Median
    	FROM T4
    	WHERE T4.Rnk = T4.Cnt / 2 + 1
  	) AS T5 ON T5.PID = BranchID
    	GROUP BY BranchID
    	ORDER BY BranchID
  );
	
  SELECT "Policy Branch", "Policy", "Minimum Turn"
  FROM (
		SELECT BranchID, PolicyID, PolicyBranch AS "Policy Branch", PolicyKey AS "Policy",
    	MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn"
		FROM T2
    	GROUP BY PolicyID
  	UNION
  	SELECT BranchID, -1 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch AS "Policy",
    	MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn"
	  FROM T3
  	  GROUP BY BranchID
  	UNION
  	SELECT BranchID, 111 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch||' Finisher' AS "Policy",
  		MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn"
  	FROM T4
    	GROUP BY BranchID
    	ORDER BY BranchID
  );
	
  SELECT "Policy Branch", "Policy", "Total Times Adopted"
  FROM (
		SELECT BranchID, PolicyID, PolicyBranch AS "Policy Branch", PolicyKey AS "Policy",
		COUNT(*) AS "Total Times Adopted"
		FROM T2
    	GROUP BY PolicyID
  	UNION
  	SELECT BranchID, -1 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch AS "Policy",
  	COUNT(*) AS "Total Times Adopted"
  	FROM T3
    	GROUP BY BranchID
  	UNION
  	SELECT BranchID, 111 AS "PolicyID", PolicyBranch AS "Policy Branch", PolicyBranch||' Finisher' AS "Policy",
  	COUNT(*) AS "Total Times Adopted"
  	FROM T4
    	GROUP BY BranchID
    	ORDER BY BranchID
  );
  `,
  ["table-tech-research"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Average Turn of Technology Research'),
		('Median Turn of Technology Research'),
		('Minimum Turn of Technology Research'),
  		('Number Times of Technology Research')
	)
	SELECT * FROM config;
	
	DROP TABLE IF EXISTS T2;
	
	CREATE TEMPORARY TABLE T2 AS SELECT * FROM (
		SELECT *,
        ROW_NUMBER() OVER (PARTITION BY Value ORDER BY Turn) AS Rnk,
        COUNT(*) OVER (PARTITION BY TechnologyID) AS Cnt
    	FROM (
        	SELECT *, Num2 AS Value FROM ReplayEvents
        	WHERE ReplayEventType = 91
    	) AS T1
		JOIN TechnologyKeys ON TechnologyID = Value
		JOIN TechnologyEras ON TechnologyEras.EraID = TechnologyKeys.EraID
    	JOIN GameSeeds ON GameSeeds.GameSeed = T1.GameSeed
    	JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = T1.PlayerID
    	JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = T1.PlayerID
    	JOIN CivKeys ON CivKeys.CivID = Players.CivID
	);
	
	SELECT EraKey AS "Era", TechnologyKey AS "Technology",
	ROUND(AVG(Turn), 1) AS "Average Turn"
	FROM T2
    GROUP BY TechnologyID
    ORDER BY EraID;
	
	SELECT EraKey AS "Era", TechnologyKey AS "Technology",
    Median AS "Median Turn"
	FROM T2
	JOIN (
	  	SELECT TechnologyID AS TID, Turn AS Median
		FROM T2
		WHERE T2.Rnk = T2.Cnt / 2 + 1
	) AS T3 ON T3.TID = TechnologyID
    GROUP BY TechnologyID
    ORDER BY EraID;
	
	SELECT EraKey AS "Era", TechnologyKey AS "Technology",
    MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn"
	FROM T2
    GROUP BY TechnologyID
    ORDER BY EraID;
	
	SELECT EraKey AS "Era", TechnologyKey AS "Technology",
	COUNT(*) AS "Total Times Researched"
	FROM T2
    GROUP BY TechnologyID
    ORDER BY EraID;
  `,
  ["table-wonder-construction"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Wonder Winrate'),
		('Average Turn of Wonder Construction'),
		('Median Turn of Wonder Construction'),
		('Minimum Turn of Wonder Construction'),
		('Number Times of Wonder Construction')
	)
	SELECT * FROM config;
	
	WITH tmp AS (
		SELECT COUNT(*) AS ngames FROM GameSeeds
        WHERE GameSeed NOT NULL
	)
	SELECT BuildingKey AS Wonder, IFNULL(ROUND(COUNT(*)*100.0/ngames, 2), 0)||'%' AS Winrate
	FROM BuildingKeys
	LEFT JOIN ReplayEvents ON ReplayEvents.Num2 = BuildingKeys.BuildingID
	JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
	JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
	JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = Games.PlayerID
	JOIN CivKeys ON CivKeys.CivID = Players.CivID
	JOIN tmp 
	WHERE ReplayEventType = 78 AND Standing = 1 AND TypeID = 2
	GROUP BY BuildingID
	ORDER BY ROUND(COUNT(*)*100.0/ngames, 2) DESC;
	
	DROP TABLE IF EXISTS T2;
	
	CREATE TEMPORARY TABLE T2 AS SELECT * FROM (
		SELECT *,
        ROW_NUMBER() OVER (PARTITION BY Value ORDER BY Turn) AS Rnk,
        COUNT(*) OVER (PARTITION BY BuildingClassKeys.BuildingClassID) AS Cnt
    	FROM (
        	SELECT *, Num2 AS Value FROM ReplayEvents
        	WHERE ReplayEventType = 78
    	) AS T1
		JOIN BuildingKeys ON BuildingID = Value
		JOIN BuildingClassKeys ON BuildingClassKeys.BuildingClassID = BuildingKeys.BuildingClassID
	  	JOIN BuildingClassTypes ON BuildingClassTypes.TypeID = BuildingKeys.TypeID
    	JOIN GameSeeds ON GameSeeds.GameSeed = T1.GameSeed
    	JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = T1.PlayerID
    	JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = T1.PlayerID
    	JOIN CivKeys ON CivKeys.CivID = Players.CivID
	);
	
	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS "Building",
	ROUND(AVG(Turn), 1) AS "Average Turn"
	FROM T2
	WHERE TypeID IN (1,2)
    GROUP BY BuildingClassID
    ORDER BY TypeID, "Average Turn";
	
	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS "Building",
    Median AS "Median Turn"
	FROM T2
	JOIN (
	  	SELECT BuildingID AS BID, Turn AS Median
		FROM T2
		WHERE T2.Rnk = T2.Cnt / 2 + 1
	) AS T3 ON T3.BID = BuildingID
	WHERE TypeID IN (1,2)
    GROUP BY BuildingClassID
    ORDER BY TypeID, Median;
	
	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS "Building",
    MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn"
	FROM T2
	WHERE TypeID IN (1,2)
    GROUP BY BuildingClassID
    ORDER BY TypeID, MIN(Turn);
	
	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS "Building",
	COUNT(*) AS "Total Times Constructed"
	FROM T2
	WHERE TypeID IN (1,2)
    GROUP BY BuildingClassID
    ORDER BY TypeID, COUNT(*);
  `,
};