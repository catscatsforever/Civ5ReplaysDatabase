/*	using:
		sql.js
		plotly
		codemirror
*/
let inputsElm = document.getElementById('inputs');

let execBtn = document.getElementById("execute");
let outputElm = document.getElementById('output');
let errorElm = document.getElementById('error');
let commandsElm = document.getElementById('commands');
let savedbElm = document.getElementById('savedb');

let tab1Rad = document.getElementById("tab1");
let tab2Rad = document.getElementById("tab2");
let tab3Rad = document.getElementById("tab3");

let plotAllGamesBtn = document.getElementById("plotAllGames");
let plotAllPlayersBtn = document.getElementById("plotAllPlayers");
let beliefsTimeBtn = document.getElementById("beliefs-time");
let policiesTimeBtn = document.getElementById("policies-time");
let techsTimeBtn = document.getElementById("techs-time");

let BeliefAverageBtn = document.getElementById('BeliefsAverage');
let BeliefMedianBtn = document.getElementById('BeliefsMedian');
let BeliefMinimumBtn = document.getElementById('BeliefsMinimum');
let BeliefCountBtn = document.getElementById('BeliefsTimes');
let PolicyAverageBtn = document.getElementById('PoliciesAverage');
let PolicyMedianBtn = document.getElementById('PoliciesMedian');
let PolicyMinimumBtn = document.getElementById('PoliciesMinimum');
let PolicyCountBtn = document.getElementById('PoliciesTimes');
let TechnologyAverageBtn = document.getElementById('TechnologiesAverage');
let TechnologyMedianBtn = document.getElementById('TechnologiesMedian');
let TechnologyMinimumBtn = document.getElementById('TechnologiesMinimum');

let gameSel = document.getElementById('gameID-select');
let datasetSel = document.getElementById('dataset-select');
let playerSel = document.getElementById('playerID-select');
let dataset2Sel = document.getElementById('dataset-select2');

let dbsizeLbl = document.getElementById('dbsize');

// Start the worker in which sql.js will run
let worker = new Worker("worker.sql-wasm.js");
worker.onerror = error;

// Open a database
worker.postMessage({ action: 'open' });


// Connect to the HTML element we 'print' to
function print(text) {
	outputElm.innerHTML = text.replace(/\n/g, '<br>');
}
function error(e) {
	console.log(e);
	errorElm.style.height = '2em';
	errorElm.textContent = e.message;
}

function noerror() {
	errorElm.style.height = '0';
}

// Run a command in the database
function execute(commands) {
	tic();
	worker.onmessage = function (event) {
		let results = event.data.results;
		let id = event.data.id;
		toc("Executing SQL");
		if (!results) {
			error({message: event.data.error});
			return;
		}
		if (results.length === 0) {
			error({message: `No results found!`});
			return;
		}

		tic();
		// plot data
		if (id === 0) {
			console.log('res', results);

			let t = results[0].columns.indexOf('TraceName');
			let x = results[0].columns.indexOf('Turn');
			let y = results[0].columns.indexOf('Value');
			let end = results[0].columns.indexOf('EndTurn');
			let rank = results[0].columns.indexOf('Standing');
			let data = [];
			let traces = [...new Set(results[0].values.map((el) => { return el[0] }))];
			let arrX = Array.from({length: traces.length}, e => Array()),
				arrY = Array.from({length: traces.length}, e => Array());
			if (y >= 0) {
				// distribution plot

				results[0].values.forEach((el) => {
					let i = traces.indexOf(el[t]);
					arrX[i].push(el[x]);
					arrY[i].push(el[y]);
				});
				console.log('arrX', arrX);
				console.log('arrY', arrY);
				for (let i = 0; i < traces.length; i++) {
					data.push({
						x: arrX[i],
						y: arrY[i],
						type: 'bar',
						showlegend: true,
						name: traces[i]
					});
				}
			}
			// scatter plot
			else {
				if (y === -1) y = results[0].columns.indexOf('Delta');
				let playerQuitTurn = new Array(traces.length);
				let playerEndTurn = new Array(traces.length);
				let playerRank = new Array(traces.length);
				let curX = new Array(traces.length).fill(0), curY = new Array(traces.length).fill(0);
				results[0].values.forEach((el) => {
					let endTurn = el[end] || results[0].values.at(-1)[1];
					let i = traces.indexOf(el[0]);
					let quitTurn = el[3] || endTurn;
					playerQuitTurn[i] = playerQuitTurn[i] || quitTurn;
					playerEndTurn[i] = playerEndTurn[i] || endTurn;
					playerRank[i] = playerRank[i] || el[rank];
					if ((el[1] < quitTurn) && (i !== -1)) {
						// fill gaps
						while (el[1] > (curX[i] + 1)) {
							// increment turn while value stays the same
							curX[i]++;
							arrX[i].push(curX[i]);
							arrY[i].push(curY[i]);
						}
						arrX[i].push(el[1]);
						arrY[i].push(el[2]);
						curX[i] = el[1];
						curY[i] = el[2];
					}
				});
				// fill data for yet alive players
				for (let i = 0; i < traces.length; i++) {
					let curX = arrX[i].at(-1), curY = arrY[i].at(-1);
					while (arrX[i].length < Math.min(playerQuitTurn[i], playerEndTurn[i])) {
						// increment turn while value stays the same
						curX++;
						arrX[i].push(curX);
						arrY[i].push(curY);
					}
				}
				console.log('arrX', arrX);
				console.log('arrY', arrY);
				console.log('rank', playerRank);
				for (let i = 0; i < traces.length; i++) {
					data.push({
						x: arrX[i],
						y: arrY[i],
						mode: 'lines',
						type: 'scatter',
						line: {shape: 'spline'},
						legendgroup: `group${i}`,
						showlegend: true,
						name: traces[i]
					});
					// mark winner
					if (playerRank[i] === 1) {
						data.push({
							x: [arrX[i].at(-1)],
							y: [arrY[i].at(-1)],
							mode: 'markers',
							type: 'scatter',
							marker: {
								size: 12,
								color: Plotly.PlotSchema.get().layout.layoutAttributes.colorway.dflt[(data.length - 1) % 10],
								symbol: 'star'
							},
							legendgroup: `group${i}`,
							showlegend: false,
							hoverinfo: 'skip'
						})
					}
					// add X marker when player "dies"
					else {
						data.push({
							x: [arrX[i].at(-1)],
							y: [arrY[i].at(-1)],
							mode: 'markers',
							type: 'scatter',
							marker: {
								size: 12,
								color: Plotly.PlotSchema.get().layout.layoutAttributes.colorway.dflt[(data.length - 1) % 10],
								symbol: 'x-dot'
							},
							legendgroup: `group${i}`,
							showlegend: false,
							hoverinfo: 'skip'
						})
					}
				}
			}
			let layout = {
				hovermode: "x unified",
				barmode: 'relative',
				xaxis: {
					title: 'Turn'
				},
				yaxis: {
					title: `${tab1Rad.checked ? datasetSel.options[datasetSel.selectedIndex].text :
						tab2Rad.checked ? dataset2Sel.options[dataset2Sel.selectedIndex].text : 'TODO'}`
				},
				legend: {
					orientation: "h",
					bgcolor: '#E2E2E2',
					bordercolor: '#FFFFFF',
					borderwidth: 2,
					y: 1.15
				}
			};
			let config = {
				responsive: true,
				toImageButtonOptions: {
					format: 'png', // one of png, svg, jpeg, webp
					filename: `Game${gameSel.selectedIndex}${datasetSel.options[datasetSel.selectedIndex].text}`,
					height: 2160,
					width: 3840,
					scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
				}
			};
			Plotly.newPlot('plotOut', data, layout, config);
		}
		// fill games select
		else if (id === 1) {
			for (let i = 0; i < results[0].values.length; i++) {
				const opt = document.createElement("option");
				opt.value = results[0].values[i][0];
				opt.text = results[0].values[i][0];
				gameSel.add(opt);
			}
		}
		// fill datasets select
		else if (id === 2) {
			for (let i = 0; i < results[0].values.length; i++) {
				datasetSel.add(new Option(results[0].values[i][1], results[0].values[i][0]));
				dataset2Sel.add(new Option(results[0].values[i][1], results[0].values[i][0]));
			}
		}
		// fill player select
		else if (id === 3) {
			for (let i = 0; i < results[0].values.length; i++) {
				const opt = document.createElement("option");
				opt.value = i;
				opt.text = results[0].values[i][0];
				playerSel.add(opt);
			}
		}
		else {
			outputElm.innerHTML = "";
			console.log('results:', results);
			for (let i = 0; i < results.length; i++) {
				outputElm.appendChild(tableCreate(results[i].columns, results[i].values));
			}
		}
		toc("Displaying results");
	};
	worker.postMessage({ action: 'exec', sql: commands });
	outputElm.textContent = "Fetching results...";
}

function fillSelects() {
	worker.postMessage({ action: 'exec', id: 1, sql: `
	SELECT GameID from GameSeeds JOIN BeliefsChanges ON BeliefsChanges.GameSeed = GameSeeds.GameSeed
	GROUP BY GameID ORDER BY GameID;` });
	worker.postMessage({ action: 'exec', id: 2, sql: `Select * from ReplayDataSetKeys` });
	worker.postMessage({ action: 'exec', id: 3, sql: `
	SELECT Player from GameSeeds JOIN BeliefsChanges ON BeliefsChanges.GameSeed = GameSeeds.GameSeed
	JOIN Games ON Games.GameID = GameSeeds.GameID
	GROUP BY Player ORDER BY Player` });
}

// Create an HTML table
let tableCreate = function () {
	function valconcat(vals, tagName) {
		if (vals.length === 0) return '';
		let open = '<' + tagName + '>', close = '</' + tagName + '>';
		return open + vals.join(close + open) + close;
	}
	return function (columns, values) {
		let tbl = document.createElement('table');
		let html = '<thead>' + valconcat(columns, 'th') + '</thead>';
		let rows = values.map(function (v) { return valconcat(v, 'td'); });
		html += '<tbody>' + valconcat(rows, 'tr') + '</tbody>';
		tbl.innerHTML = html;
		return tbl;
	}
}();

// Execute the commands when the button is clicked
function execEditorContents() {
	noerror();
	execute(editor.getValue() + ';');
}
execBtn.addEventListener("click", execEditorContents, true);

// Performance measurement functions
let tictime;
if (!window.performance || !performance.now) { window.performance = { now: Date.now } }
function tic() { tictime = performance.now() }
function toc(msg) {
	let dt = performance.now() - tictime;
	console.log((msg || 'toc') + ": " + dt + "ms");
}

// Add syntax highlighting to the textarea
let editor = CodeMirror.fromTextArea(commandsElm, {
	mode: 'text/x-mysql',
	viewportMargin: Infinity,
	indentWithTabs: true,
	smartIndent: true,
	lineNumbers: true,
	matchBrackets: true,
	autofocus: true,
	extraKeys: {
		"Ctrl-Enter": execEditorContents,
		"Ctrl-S": savedb,
	}
});

// Load a db from URL
function fetchdb() {
	let r = new XMLHttpRequest();
	r.open('GET', 'sample.db', true);
	r.responseType = 'arraybuffer';
	r.onload = function () {
		inputsElm.style.display = 'block';
		const uInt8Array = new Uint8Array(r.response);
		let b = uInt8Array.length;
		dbsizeLbl.textContent = `DB size is ${(b/Math.pow(1024,~~(Math.log2(b)/10))).toFixed(2)} 
			${("KMGTPEZY"[~~(Math.log2(b)/10)-1]||"") + "B"}`;
		worker.onmessage = function () {
			toc("Loading database from file");
			editor.setValue(`\tANALYZE main;\n\tSELECT tbl AS Name, stat AS Rows FROM sqlite_stat1 ORDER BY Name;`);
			execEditorContents();
			fillSelects();
			doPlot();
		};
		tic();
		try {
			worker.postMessage({ action: 'open', buffer: uInt8Array }, [uInt8Array]);
		}
		catch (exception) {
			worker.postMessage({ action: 'open', buffer: uInt8Array });
		}
	};
	r.send();
}
fetchdb();

// Save the db to a file
function savedb() {
	worker.onmessage = function (event) {
		toc("Exporting the database");
		let arraybuff = event.data.buffer;
		let blob = new Blob([arraybuff]);
		let a = document.createElement("a");
		document.body.appendChild(a);
		a.href = window.URL.createObjectURL(blob);
		a.download = "sql.db";
		a.onclick = function () {
			setTimeout(function () {
				window.URL.revokeObjectURL(a.href);
			}, 1500);
		};
		a.click();
	};
	tic();
	worker.postMessage({ action: 'export' });
}
savedbElm.addEventListener("click", savedb, true);

function doPlot(e) {
	noerror();
	let gameID = gameSel.options.length > 0 ? gameSel.options[gameSel.selectedIndex].value : 1;
	let datasetID = datasetSel.options.length > 0 ? datasetSel.options[datasetSel.selectedIndex].value : 1;
	let playerName = playerSel.options.length > 0 ? playerSel.options[playerSel.selectedIndex].text : '12g';
	let dataset2ID = dataset2Sel.options.length > 0 ? dataset2Sel.options[dataset2Sel.selectedIndex].value : 1;
	let msg = '';
	if (tab1Rad.checked) {
		msg = `
			SELECT Games.Player AS TraceName, Turn, 
    		sum(ReplayDataSetsChanges.Value) OVER (PARTITION by Games.GameID, Games.Player ORDER BY Turn) Delta,
    		PlayerQuitTurn.Value AS QuitTurn, GameSeeds.EndTurn, Games.Standing
			
			FROM DataSets
			JOIN ReplayDataSetsChanges ON ReplayDataSetsChanges.DataSetID = DataSets.DataSetID
			JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
			JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
			JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
			JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
    		LEFT JOIN PlayerQuitTurn ON Games.Player = PlayerQuitTurn.Player AND Games.PlayerGameNumber = PlayerQuitTurn.PlayerGameNumber
			WHERE Games.GameID = ${gameID} AND ReplayDataSetKeys.ReplayDataSetID = ${datasetID} 
			ORDER BY Turn
			;
		`}
	else if (tab2Rad.checked) {
		msg = `
			SELECT 'Game ' || Games.PlayerGameNumber || ' (' || Games.Civilization || ')' AS TraceName, Turn,
			sum(ReplayDataSetsChanges.Value) OVER (PARTITION by Games.GameID, Games.Player ORDER BY Turn) Delta,
			PlayerQuitTurn.Value AS QuitTurn, GameSeeds.EndTurn, Games.Standing
			
			FROM DataSets
			JOIN ReplayDataSetsChanges ON ReplayDataSetsChanges.DataSetID = DataSets.DataSetID
			JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
			JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
			JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
			JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
			LEFT JOIN PlayerQuitTurn ON Games.Player = PlayerQuitTurn.Player AND Games.PlayerGameNumber = PlayerQuitTurn.PlayerGameNumber
			WHERE Games.Player = '${playerName}' AND ReplayDataSetKeys.ReplayDataSetID = ${dataset2ID}
			ORDER BY Turn
			;
		`}
	else if (tab3Rad.checked) {
		msg = `
			SELECT BeliefTypes.BeliefType AS TraceName, Turn,
			sum(BeliefsChanges.Value) AS Value
			
			FROM DataSets
			JOIN BeliefsChanges ON BeliefsChanges.DataSetID = DataSets.DataSetID
			JOIN BeliefKeys ON BeliefKeys.BeliefID = BeliefsChanges.BeliefID
			JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
			JOIN CivKeys ON CivKeys.CivID = BeliefsChanges.CivID
			JOIN GameSeeds ON GameSeeds.GameSeed = BeliefsChanges.GameSeed
			JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
			WHERE BeliefsChanges.Value = 1
			GROUP BY TraceName, Turn
			ORDER BY Turn
			;
		`}
	console.log('msg', msg);
	worker.postMessage({ action: 'exec', id: 0, sql: msg });
}

gameSel.addEventListener("change", doPlot, true);
datasetSel.addEventListener("change", doPlot, true);
playerSel.addEventListener("change", doPlot, true);
dataset2Sel.addEventListener("change", doPlot, true);
tab1Rad.addEventListener("click", doPlot, true);
tab2Rad.addEventListener("click", doPlot, true);
tab3Rad.addEventListener("click", doPlot, true);
plotAllGamesBtn.addEventListener("click", () => worker.postMessage({ action: 'exec', id: 0, sql: `
	SELECT Games.Player || ' Game ' || Games.PlayerGameNumber || ' (' || Games.Civilization || ')' AS TraceName, Turn,
	sum(ReplayDataSetsChanges.Value) OVER (PARTITION by Games.GameID, Games.Player ORDER BY Turn) Delta,
	PlayerQuitTurn.Value AS QuitTurn, GameSeeds.EndTurn, Games.Standing
	
	FROM DataSets
	JOIN ReplayDataSetsChanges ON ReplayDataSetsChanges.DataSetID = DataSets.DataSetID
	JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
	JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	LEFT JOIN PlayerQuitTurn ON Games.Player = PlayerQuitTurn.Player AND Games.PlayerGameNumber = PlayerQuitTurn.PlayerGameNumber
	WHERE ReplayDataSetKeys.ReplayDataSetID = ${dataset2Sel.options[dataset2Sel.selectedIndex].value}
	ORDER BY Turn
	;
`}), true);
plotAllPlayersBtn.addEventListener("click", () => worker.postMessage({ action: 'exec', id: 0, sql: `
	SELECT Games.Player || ' Game ' || Games.PlayerGameNumber || ' (' || Games.Civilization || ')' AS TraceName, Turn,
	sum(ReplayDataSetsChanges.Value) OVER (PARTITION by Games.GameID, Games.Player ORDER BY Turn) Delta,
	PlayerQuitTurn.Value AS QuitTurn, GameSeeds.EndTurn, Games.Standing
	
	FROM DataSets
	JOIN ReplayDataSetsChanges ON ReplayDataSetsChanges.DataSetID = DataSets.DataSetID
	JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
	JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	LEFT JOIN PlayerQuitTurn ON Games.Player = PlayerQuitTurn.Player AND Games.PlayerGameNumber = PlayerQuitTurn.PlayerGameNumber
	WHERE ReplayDataSetKeys.ReplayDataSetID = ${dataset2Sel.options[dataset2Sel.selectedIndex].value}
	ORDER BY Turn
	;
`}), true);
beliefsTimeBtn.addEventListener("click", () => worker.postMessage({ action: 'exec', id: 0, sql: `
	SELECT BeliefTypes.BeliefType AS TraceName, Turn,
	sum(BeliefsChanges.Value) AS Value
	
	FROM DataSets
	JOIN BeliefsChanges ON BeliefsChanges.DataSetID = DataSets.DataSetID
	JOIN BeliefKeys ON BeliefKeys.BeliefID = BeliefsChanges.BeliefID
	JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
	JOIN CivKeys ON CivKeys.CivID = BeliefsChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = BeliefsChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	WHERE BeliefsChanges.Value = 1
	GROUP BY TraceName, Turn
	ORDER BY Turn
	;
`}), true);
policiesTimeBtn.addEventListener("click", () => worker.postMessage({ action: 'exec', id: 0, sql: `
	SELECT PolicyBranches.PolicyBranch AS TraceName, Turn,
	sum(PoliciesChanges.Value) AS Value
	
	FROM DataSets
	JOIN PoliciesChanges ON PoliciesChanges.DataSetID = DataSets.DataSetID
	JOIN PolicyKeys ON PolicyKeys.PolicyID = PoliciesChanges.PolicyID
	JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
	JOIN CivKeys ON CivKeys.CivID = PoliciesChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = PoliciesChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	WHERE PoliciesChanges.Value = 1
	GROUP BY TraceName, Turn
	ORDER BY Turn
	;
`}), true);
techsTimeBtn.addEventListener("click", () => worker.postMessage({ action: 'exec', id: 0, sql: `
	SELECT TechnologyKeys.TechnologyKey AS TraceName, Turn,
	sum(TechnologiesChanges.Value) AS Value
	
	FROM DataSets
	JOIN TechnologiesChanges ON TechnologiesChanges.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = TechnologiesChanges.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = TechnologiesChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = TechnologiesChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	WHERE TechnologiesChanges.Value = 1
	GROUP BY TraceName, Turn
	ORDER BY Turn
`}), true);

/*BuildingClassesBtn.addEventListener("click", () => { noerror(); let r = `
	SELECT Player, Civilization, Standing, Games.GameID, BuildingClassKey AS BuildingClass, Turn
	--SELECT *

	FROM DataSets
	JOIN BuildingClassesChanges ON BuildingClassesChanges.DataSetID = DataSets.DataSetID
	JOIN BuildingClassKeys ON BuildingClassKeys.BuildingClassID = BuildingClassesChanges.BuildingClassID
	JOIN CivKeys ON CivKeys.CivID = BuildingClassesChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = BuildingClassesChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	WHERE BuildingClassKey = "Barn" OR BuildingClassKey = "Granary"
	;
	`; execute(r); editor.setValue(r); }, true);
PoliciesBtn.addEventListener("click", () => { noerror(); let r = `
	SELECT Player, Civilization, Games.GameID, Standing, PolicyKey AS Policy, Games.GameID,
	AVG(Turn)

	FROM DataSets
	JOIN PoliciesChanges ON PoliciesChanges.DataSetID = DataSets.DataSetID
	JOIN PolicyKeys ON PolicyKeys.PolicyID = PoliciesChanges.PolicyID
	JOIN CivKeys ON CivKeys.CivID = PoliciesChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = PoliciesChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	--WHERE Value = 1 AND PolicyKey IN ("Tradition Finisher", "Liberty Finisher")
	WHERE Value = 1 AND PolicyKey IN ("Secularism", "Humanism", "Free Thought")
	GROUP BY Policy
	;
	`; execute(r); editor.setValue(r); }, true);
ReplayDataSetsBtn.addEventListener("click", () => { noerror(); let r = `
	SELECT Player, Civilization, Standing, Games.GameID, ReplayDataSetKey AS ReplayDataSet, sum(Value) AS SUM_Value, Max(Turn),
	(SELECT Value FROM PlayerQuitTurn WHERE PlayerQuitTurn.Player = Games.Player AND PlayerQuitTurn.PlayerGameNumber = Games.PlayerGameNumber) AS QuitTurn
	--SELECT *
	
	FROM DataSets
	JOIN ReplayDataSetsChanges ON ReplayDataSetsChanges.DataSetID = DataSets.DataSetID
	JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
	JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	WHERE ReplayDataSetKeys.ReplayDataSetID = 71
	AND Turn < 
	CASE WHEN (SELECT Value FROM PlayerQuitTurn WHERE PlayerQuitTurn.Player = Games.Player AND PlayerQuitTurn.PlayerGameNumber = Games.PlayerGameNumber) IS NOT NULL THEN
		(SELECT Value FROM PlayerQuitTurn WHERE PlayerQuitTurn.Player = Games.Player AND PlayerQuitTurn.PlayerGameNumber = Games.PlayerGameNumber)
	ELSE
		330
	END
	--WHERE ReplayDataSetKey = "Born Scientists"-- AND Player = "Edward Gromyako"
	--WHERE ReplayDataSetKeys.ReplayDataSetID = 6
	GROUP BY Games.GameID, Civilization
	HAVING SUM_Value > 0
	ORDER BY Games.GameID, Player/*, sum(Value) DESC
	;
	`; execute(r); editor.setValue(r); }, true);
TechnologiesBtn.addEventListener("click", () => { noerror(); let r = `
	SELECT Player, Civilization, Standing, Games.GameID, TechnologyKey AS Technology, AVG(Turn)

	FROM DataSets
	JOIN TechnologiesChanges ON TechnologiesChanges.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = TechnologiesChanges.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = TechnologiesChanges.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = TechnologiesChanges.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	WHERE Value = 1 AND (TechnologyKey = "Plastics")
	ORDER BY Turn
	;
	`; execute(r); editor.setValue(r); }, true);
QuitTurnBtn.addEventListener("click", () => { noerror(); let r = `
	CREATE TABLE If not EXISTS PlayerQuitTurn (
		"Player" TEXT,
		"PlayerGameNumber" INTEGER,
		"Value" INTEGER NOT NULL
	)
	;
	
	DELETE FROM PlayerQuitTurn
	;
	
	REPLACE INTO PlayerQuitTurn
		SELECT Player, PlayerGameNumber, Turn
	
		FROM ReplayDataSetsChanges
		JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
		JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
		JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
		WHERE ReplayDataSetID = 6 AND Value < 0
	;
	SELECT * FROM PlayerQuitTurn
	;
	`; execute(r); editor.setValue(r); }, true);*/
BeliefAverageBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BeliefID order by Turn) as rnk
	, count(*) over (PARTITION by BeliefID) as cnt
	
	FROM BeliefsChanges
	WHERE Value = 1
	)

	SELECT BeliefType as "Belief Type", BeliefKey AS Belief, round(avg(Turn), 1) as "Average Turn"

	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN BeliefKeys ON BeliefKeys.BeliefID = RankedTable.BeliefID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
	GROUP BY RankedTable.BeliefID
	ORDER BY BeliefKeys.TypeID, "Average Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
BeliefMedianBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BeliefID order by Turn) as rnk
	, count(*) over (PARTITION by BeliefID) as cnt
	
	FROM BeliefsChanges
	WHERE Value = 1
	)
	
	SELECT BeliefType as "Belief Type", BeliefKey AS Belief, avg(Turn) OVER (PARTITION by BeliefKeys.BeliefID) as "Median Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN BeliefKeys ON BeliefKeys.BeliefID = RankedTable.BeliefID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
	WHERE Value = 1 and 2*rnk - 1 = cnt or 2*rnk = cnt or 2*rnk - 2 = cnt
	GROUP BY RankedTable.BeliefID
	ORDER BY BeliefKeys.TypeID, "Median Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
BeliefMinimumBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BeliefID order by Turn) as rnk
	, count(*) over (PARTITION by BeliefID) as cnt
	
	FROM BeliefsChanges
	WHERE Value = 1
	)
	
	SELECT BeliefType as "Belief Type", BeliefKey AS Belief, min(Turn) as "Minimum Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN BeliefKeys ON BeliefKeys.BeliefID = RankedTable.BeliefID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
	GROUP BY RankedTable.BeliefID
	ORDER BY BeliefKeys.TypeID, "Minimum Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
BeliefCountBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BeliefID order by Turn) as rnk
	, count(*) over (PARTITION by BeliefID) as cnt
	
	FROM BeliefsChanges
	WHERE Value = 1
	)
	
	SELECT BeliefType as "Belief Type", BeliefKey AS Belief, count(Turn) as "Count"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN BeliefKeys ON BeliefKeys.BeliefID = RankedTable.BeliefID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN BeliefTypes ON BeliefTypes.TypeID = BeliefKeys.TypeID
	GROUP BY RankedTable.BeliefID
	ORDER BY BeliefKeys.TypeID, "Count" DESC
	;
	`; execute(r); editor.setValue(r); }, true);
PolicyAverageBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by PolicyID order by Turn) as rnk
	, count(*) over (PARTITION by PolicyID) as cnt
	
	FROM PoliciesChanges
	WHERE Value = 1
	)
	
	SELECT PolicyBranch as "Policy Branch", PolicyKey AS Policy, Round(avg(Turn), 1) as "Average Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN PolicyKeys ON PolicyKeys.PolicyID = RankedTable.PolicyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
	GROUP BY RankedTable.PolicyID
	ORDER BY PolicyKeys.BranchID, "Average Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
PolicyMedianBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by PolicyID order by Turn) as rnk
	, count(*) over (PARTITION by PolicyID) as cnt
	
	FROM PoliciesChanges
	WHERE Value = 1
	)
	
	SELECT PolicyBranch as "Policy Branch", PolicyKey AS Policy, avg(Turn) OVER (PARTITION by PolicyKeys.PolicyID) as "Median Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN PolicyKeys ON PolicyKeys.PolicyID = RankedTable.PolicyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
	WHERE Value = 1 and 2*rnk - 1 = cnt or 2*rnk = cnt or 2*rnk - 2 = cnt
	GROUP BY RankedTable.PolicyID
	ORDER BY PolicyKeys.BranchID, "Median Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
PolicyMinimumBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by PolicyID order by Turn) as rnk
	, count(*) over (PARTITION by PolicyID) as cnt
	
	FROM PoliciesChanges
	WHERE Value = 1
	)
	
	SELECT PolicyBranch as "Policy Branch", PolicyKey AS Policy, min(Turn) as "Minimum Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN PolicyKeys ON PolicyKeys.PolicyID = RankedTable.PolicyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
	GROUP BY RankedTable.PolicyID
	ORDER BY PolicyKeys.BranchID, "Minimum Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
PolicyCountBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by PolicyID order by Turn) as rnk
	, count(*) over (PARTITION by PolicyID) as cnt
	
	FROM PoliciesChanges
	WHERE Value = 1
	)
	
	SELECT PolicyBranch as "Policy Branch", PolicyKey AS Policy, count(Turn) as "Count"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN PolicyKeys ON PolicyKeys.PolicyID = RankedTable.PolicyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN PolicyBranches ON PolicyBranches.BranchID = PolicyKeys.BranchID
	GROUP BY RankedTable.PolicyID
	ORDER BY PolicyKeys.BranchID, "Count" DESC
	;
	`; execute(r); editor.setValue(r); }, true);
TechnologyAverageBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by TechnologyID order by Turn) as rnk
	, count(*) over (PARTITION by TechnologyID) as cnt
	
	FROM TechnologiesChanges
	WHERE Value = 1
	)
	
	SELECT TechnologyKey AS Technology, round(avg(Turn), 1) as "Average Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = RankedTable.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	GROUP BY RankedTable.TechnologyID
	ORDER BY "Average Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
TechnologyMedianBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by TechnologyID order by Turn) as rnk
	, count(*) over (PARTITION by TechnologyID) as cnt
	
	FROM TechnologiesChanges
	WHERE Value = 1
	)
	
	SELECT TechnologyKey AS Technology, avg(Turn) OVER (PARTITION by TechnologyKeys.TechnologyID) as "Median Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = RankedTable.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	WHERE Value = 1 and 2*rnk - 1 = cnt or 2*rnk = cnt or 2*rnk - 2 = cnt
	GROUP BY RankedTable.TechnologyID
	ORDER BY "Median Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
TechnologyMinimumBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by TechnologyID order by Turn) as rnk
	, count(*) over (PARTITION by TechnologyID) as cnt
	
	FROM TechnologiesChanges
	WHERE Value = 1
	)
	
	SELECT TechnologyKey AS Technology, min(Turn) as "Minimum Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = RankedTable.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	GROUP BY RankedTable.TechnologyID
	ORDER BY TechnologyKeys.TechnologyID, "Minimum Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
