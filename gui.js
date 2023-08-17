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

let BuildingClassesBtn = document.getElementById('BuildingClasses');
let PoliciesBtn = document.getElementById('Policies');
let ReplayDataSetsBtn = document.getElementById('ReplayDataSets');
let TechnologiesBtn = document.getElementById('Technologies');
let QuitTurnBtn = document.getElementById('QuitTurn');

let gameSel = document.getElementById('gameID-select');
let datasetSel = document.getElementById('dataset-select');

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
		// fill games select
		if (id === 1) {
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
				const opt = document.createElement("option");
				opt.value = results[0].values[i][0];
				opt.text = results[0].values[i][1];
				datasetSel.add(opt);
			}
		}
		// plot data
		else if (id === 3) {
			let data = [];
			let players = [...new Set(results[0].values.map((el) => { return el[0] }))];
			for (let i = 0; i < players.length; i++) {
				let curX = 0, curY = 0;
				let arrX = [], arrY = [];
				results[0].values.forEach((el) => {
					if (el[0] === players[i]) {
						// fill gaps
						while (el[1] > curX + 1) {
							// increment turn while value stays the same
							curX++;
							arrX.push(curX);
							arrY.push(curY);
						}
						arrX.push(el[1]);
						arrY.push(el[2]);
						curY = el[2];
					}
				});
				data[i] = {
					x: arrX,
					y: arrY,
					mode: 'lines',
					type: 'scatter',
					line: {shape: 'spline'},
					//connectgaps: true,
					name: players[i]
				}
			}
			let layout = {
				hovermode: "x unified",
				xaxis: {
					title: 'Turn'
				},
				yaxis: {
					title: `${datasetSel.options[datasetSel.selectedIndex].text}`
				}
			};
			let config = {
				toImageButtonOptions: {
					format: 'png', // one of png, svg, jpeg, webp
					filename: `Game${gameSel.selectedIndex}${datasetSel.options[datasetSel.selectedIndex].text}`,
					height: 2160,
					width: 3840,
					scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
				}
			};
			console.log(data);
			Plotly.newPlot('plotOut', data, layout, config);
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
	worker.postMessage({ action: 'exec', id: 1, sql: `Select GameID from Games Group by GameID` });
	worker.postMessage({ action: 'exec', id: 2, sql: `Select * from ReplayDataSetKeys` });
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

// Add syntax highlihjting to the textarea
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
			editor.setValue(`\tSELECT \`name\`, \`sql\`\n\t\tFROM \`sqlite_master\`\n\t\tWHERE type='table';`);
			execEditorContents();
			fillSelects();
			doPlot(null, 1, 1);
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

function doPlot(e, gameID, datasetID) {
	Plotly.purge('plotOut');
	noerror();
	gameID = gameID || gameSel.value;
	datasetID = datasetID || datasetSel.value;
	worker.postMessage({ action: 'exec', id: 3, sql: `
		SELECT Player, Turn, 
    	sum(value) over (partition by Games.GameID, Player order by Turn) Rsum
		
		FROM DataSets
		JOIN ReplayDataSetsChanges ON ReplayDataSetsChanges.DataSetID = DataSets.DataSetID
		JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
		JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
		JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
		JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
		WHERE Games.GameID = ${gameID} AND ReplayDataSetKeys.ReplayDataSetID = ${datasetID} 
		ORDER by Turn
		;
	` });
}
gameSel.addEventListener("change", doPlot, true);
datasetSel.addEventListener("change", doPlot, true);

BuildingClassesBtn.addEventListener("click", () => { noerror(); let r = `
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
	ORDER BY Games.GameID, Player/*, sum(Value) DESC*/
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
	`; execute(r); editor.setValue(r); }, true);
