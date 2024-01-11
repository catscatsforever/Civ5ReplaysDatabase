
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
  ICON_GREAT_ADMIRAL: 'Civ5Icon.GreatAdmiral.png'
};
const sqlQueries = {
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
		SELECT CivKey, '{"group":"civs","id":'||CivID||'}' FROM CivKeys
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
  ["table-hall-of-fame"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Greatest Wonder Builders'),
		('Demographics Screen Lovers'),
        ('Prominent City Governors'),
		('Total Turns Spent In-Game')
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
    ;
	
	SELECT Games.Player AS Player, IFNULL(SUM(IFNULL(PlayerQuitTurn, EndTurn)), 0) AS Turns, COUNT(*) AS Games
	FROM Games
	LEFT JOIN GameSeeds ON GameSeeds.GameID = Games.GameID
	GROUP BY Games.Player
	ORDER BY SUM(IFNULL(PlayerQuitTurn, EndTurn)) DESC
	;
  `,
  ["table-belief-adoption"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Belief Adoption')
	)
	SELECT * FROM config;
	
	WITH T2 AS (
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
	)
	SELECT BeliefType AS "Belief Type", BeliefKey AS "Belief",
	ROUND(AVG(Turn), 1) AS "Average Turn",
    Median AS "Median Turn",
    MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn",
	COUNT(*) AS "Total Times Adopted"
	FROM T2
	JOIN (
	  	SELECT BeliefID AS BID, Turn AS Median
		FROM T2
		WHERE T2.Rnk = T2.Cnt / 2 + 1
	) AS T3 ON T3.BID = BeliefID
    GROUP BY BeliefID
    ORDER BY COUNT(*) DESC
    ;
  `,
  ["table-policy-adoption"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Policy Adoption')
	)
	SELECT * FROM config;
	
	WITH T2 AS (
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
	)
	SELECT PolicyBranch AS "Policy Branch", PolicyKey AS "Policy",
	ROUND(AVG(Turn), 1) AS "Average Turn",
    Median AS "Median Turn",
    MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn",
	COUNT(*) AS "Total Times Adopted"
	FROM T2
	JOIN (
	  	SELECT PolicyID AS PID, Turn AS Median
		FROM T2
		WHERE T2.Rnk = T2.Cnt / 2 + 1
	) AS T3 ON T3.PID = PolicyID
    GROUP BY PolicyID
    ORDER BY BranchID
    ;
  `,
  ["table-tech-research"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Technology Research')
	)
	SELECT * FROM config;
	
	WITH T2 AS (
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
	)
	SELECT EraKey AS "Era", TechnologyKey AS "Technology",
	ROUND(AVG(Turn), 1) AS "Average Turn",
    Median AS "Median Turn",
    MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn",
	COUNT(*) AS "Total Times Researched"
	FROM T2
	JOIN (
	  	SELECT TechnologyID AS TID, Turn AS Median
		FROM T2
		WHERE T2.Rnk = T2.Cnt / 2 + 1
	) AS T3 ON T3.TID = TechnologyID
    GROUP BY TechnologyID
    ORDER BY EraID
    ;
  `,
  ["table-wonder-construction"]: `
	WITH config(tableName) AS (
		VALUES('config'),
		('Wonder Winrate'),
		('Wonder Construction')
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
	ORDER BY ROUND(COUNT(*)*100.0/ngames, 2) DESC
	;
	
	WITH T2 AS (
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
	)
	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS "Building",
	ROUND(AVG(Turn), 1) AS "Average Turn",
    Median AS "Median Turn",
    MIN(Turn)||' ('||Player||', '||CivKey||')' AS "Minimum Turn",
	COUNT(*) AS "Total Times Constructed"
	FROM T2
	JOIN (
	  	SELECT BuildingID AS BID, Turn AS Median
		FROM T2
		WHERE T2.Rnk = T2.Cnt / 2 + 1
	) AS T3 ON T3.BID = BuildingID
	WHERE TypeID IN (1,2)
    GROUP BY BuildingClassID
    ORDER BY TypeID, Median
    ;
  `,
};