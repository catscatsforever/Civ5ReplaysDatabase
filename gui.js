/*	using:
		sql.js
		plotly
		codemirror
*/

const colors = ["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf"];
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
let sankeyPoliciesBtn = document.getElementById("sankey-policies");
let sankeyTechsBtn = document.getElementById("sankey-techs");

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
let WonderAverageBtn = document.getElementById('WondersAverage');
let WonderMedianBtn = document.getElementById('WondersMedian');
let WonderMinimumBtn = document.getElementById('WondersMinimum');

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
		console.log("e", event);
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
			//console.log('res', results);

			let conf = Object.assign(...results[0].values.map(([k, v]) => ({ [k]: v })));
			//console.log('conf', conf);
			let data = [];
			if (conf.type === 'bar') {
				// distribution plot
				let tracesData = results[1].values.map(([k, v]) => (k));
				console.log('tracesData', tracesData);
				let arrX = Object.assign(...Object.values(tracesData).map((v) => ({ [v]: [] }))),
					arrY = Object.assign(...Object.values(tracesData).map((v) => ({ [v]: [] })));
				for (let i = 0; i < results[2].values.length; i++) {
					arrX[results[2].values[i][0]].push(results[2].values[i][1]);
					arrY[results[2].values[i][0]].push(results[2].values[i][2]);
				}
				console.log('arrX', arrX);
				console.log('arrY', arrY);
				tracesData.forEach((i, n) => {
					data.push({
						x: arrX[i],
						y: arrY[i],
						type: 'bar',
						showlegend: true,
						name: i
					});
				});
				console.log('data', data)
			}
			// sankey plot
			else if (conf.type === 'sankey') {
				let keysData = Object.assign(...results[1].values.map((k) => ({ [k[0]]: k[1] }))),
					s = {},
					t = {},
					v = {},
					arrX = [],
					arrL = [],
					nextId = 0,
					mask = new Array(conf.numEntries - 1);
				results[2].values.forEach((el) => {
					let arr = JSON.parse(el);
					for (let i = 0; i < arr.length; i++) {
						if (!mask[i]) mask[i] = {};
						if (i === arr.length - 1) {
							if (mask[i][arr[i]] === undefined) {
								mask[i][arr[i]] = nextId;
								arrX.push(i);
								arrL.push(keysData[arr[i]]);
								nextId++;
							}
							continue;
						}
						if (s[i] === undefined) {
							s[i] = [];
							t[i] = [];
							v[i] = [];
						}
						let fg = false;
						for (let j = 0; j < s[i].length; j++) {
							if (s[i][j] === arr[i] && t[i][j] === arr[i + 1]) {
								fg = true;
								v[i][j]++;
								break;
							}
						}
						if (fg === false) {
							if (mask[i][arr[i]] === undefined) {
								mask[i][arr[i]] = nextId;
								arrX.push(i);
								arrL.push(keysData[arr[i]]);
								nextId++;
							}
							s[i].push(arr[i]);
							t[i].push(arr[i + 1]);
							v[i].push(1);
						}
					}
				});
				let arrS = [], arrT = [], arrV = [];
				for (let k in s) {
					s[k].forEach((el, i) => {s[k][i] = mask[k][el]});
					arrS.push(...s[k]);
				}
				for (let k in t) {
					t[k].forEach((el, i) => {t[k][i] = mask[(parseInt(k) + 1).toString()][el]});
					arrT.push(...t[k]);
				}
				for (let k in v)
					arrV.push(...v[k]);
				arrX = arrX.map((x) =>  (x) / (Object.keys(s).length));
				let setL = [...new Set(arrL)];
				let data1 = {
					type: "sankey",
					domain: {
						x: [0,1],
						y: [0,1]
					},
					orientation: "h",
					arrangement: "freeform",
					node: {
						pad: 35,
						thickness: 30,
						line: {
							color: "black",
							width: 0.5
						},
						label: arrL,
						x: arrX,
						color: arrL.map((el, i) => colors[setL.indexOf(el) % colors.length])
					},
					link: {
						source: arrS,
						target: arrT,
						value: arrV
					},
					textfont: {
						size: 12
					}
				};

				data = [data1];
				let layout1 = {
					title: conf.title,
					font: {
						size: 10
					}
				};
				Plotly.newPlot('plotOut', data, layout1);
				return;
			}
			// scatter plot
			else if (conf.type === 'scatter') {
				let gamesData = Object.assign(...results[1].values.map(([k, v]) => ({ [k]: v })));
				Object.entries(gamesData).forEach(([k, v]) => {
					if (!v) v = 330;
				});
				//console.log('gamesData', gamesData);
				let tracesData = Object.assign(...results[2].values.map((k, v) => {
						return { [k[1]]: Object.assign(...k.map((d,i) => {
								return { [results[2].columns[i]]: d }
							})) }
					}
				));
				let nTraces = Object.keys(tracesData).length;
				Object.values(tracesData).forEach((v) => {
					if (!v.QuitTurn) {
						v.QuitTurn = gamesData[v.GameID];
					}
				});
				let arrX = Object.assign(...Object.values(tracesData).map((v) => ({ [v.rowid]: [] }))),
					arrY = Object.assign(...Object.values(tracesData).map((v) => ({ [v.rowid]: [] })));
				let curX = Object.assign(...Object.values(tracesData).map((v) => ({ [v.rowid]: 0 }))),
					curY = Object.assign(...Object.values(tracesData).map((v) => ({ [v.rowid]: 0 })));
				for (let i = 0; i < results[3].values.length; i++) {
					let lastTurn = tracesData[results[3].values[i][0]].QuitTurn ?? gamesData[tracesData[results[3].values[i][0]].GameID];
					if (results[3].values[i][1] < lastTurn) {
						// fill gaps
						while (results[3].values[i][1] > (curX[results[3].values[i][0]] + 1)) {
							// increment turn while value stays the same
							curX[results[3].values[i][0]]++;
							arrX[results[3].values[i][0]].push(curX[results[3].values[i][0]]);
							arrY[results[3].values[i][0]].push(curY[results[3].values[i][0]]);
						}
						curX[results[3].values[i][0]] = results[3].values[i][1];
						curY[results[3].values[i][0]] = results[3].values[i][2];
						arrX[results[3].values[i][0]].push(results[3].values[i][1]);
						arrY[results[3].values[i][0]].push(results[3].values[i][2]);
					}
				}
				//console.log('arrX', arrX);
				//console.log('arrY', arrY);
				Object.keys(tracesData).forEach((i, n) => {
					// fill data for yet alive players
					let curX = arrX[i].at(-1), curY = arrY[i].at(-1);
					let lastTurn = tracesData[i].QuitTurn ?? gamesData[tracesData[i].GameID];
					while (curX < lastTurn) {
						// increment turn while value stays the same
						curX++;
						arrX[i].push(curX);
						arrY[i].push(curY);
					}
					data.push({
						x: arrX[i],
						y: arrY[i],
						mode: conf.mode,
						type: conf.type,
						line: {
							shape: 'spline',
							color: colors[n % 10],
						},
						legendgroup: `group${i}`,
						showlegend: true,
						name: tracesData[i].TraceName
					});
					if (tracesData[i].Standing) {
						// mark winner
						if (tracesData[i].Standing === 1) {
							data.push({
								x: [arrX[i].at(-1)],
								y: [arrY[i].at(-1)],
								mode: 'markers',
								type: conf.type,
								marker: {
									size: 12,
									color: colors[n % 10],
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
								type: conf.type,
								marker: {
									size: 12,
									color: colors[n % 10],
									symbol: 'x-dot'
								},
								legendgroup: `group${i}`,
								showlegend: false,
								hoverinfo: 'skip'
							})
						}
					}
				})
			}
			let layout = {
				hovermode: "x unified",
				barmode: 'relative',
				xaxis: {
					title: conf.xaxis
				},
				yaxis: {
					title: conf.yaxis ?? 'TODO'
				},
				legend: {
					orientation: "v",
					bgcolor: '#E2E2E2',
					bordercolor: '#FFFFFF',
					borderwidth: 2
				},
				//plot_bgcolor: 'black',
				//paper_bgcolor: 'black'
			};
			let config = {
				responsive: true,
				toImageButtonOptions: {
					format: 'png', // one of png, svg, jpeg, webp
					filename: `Game${gameSel.selectedIndex}${datasetSel.options[datasetSel.selectedIndex].text}`,
					height: 2160,
					width: 3840,
					scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
				},
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
			for (let i = 0; i < results[1].values.length; i++) {
				datasetSel.add(new Option(results[1].values[i][1], results[1].values[i][0]));
				dataset2Sel.add(new Option(results[1].values[i][1], results[1].values[i][0]));
			}
			for (let i = 0; i < results[2].values.length; i++) {
				const opt = document.createElement("option");
				opt.value = i;
				opt.text = results[2].values[i][0];
				playerSel.add(opt);
			}
		}
		else {
			outputElm.innerHTML = "";
			console.log('results:', results);
			for (let i = 0; i < results.length; i++) {
				outputElm.appendChild(tableCreate(results[i].columns, results[i].values));
			}
			const allTables = document.querySelectorAll("table");

			for (const table of allTables) {
				const tBody = table.tBodies[0];
				const rows = Array.from(tBody.rows);
				const headerCells = table.tHead.rows[0].cells;

				for (const th of headerCells) {
					const cellIndex = th.cellIndex;

					th.addEventListener("click", () => {
						rows.sort((tr1, tr2) => {
							const tr1Text = tr1.cells[cellIndex].textContent;
							const tr2Text = tr2.cells[cellIndex].textContent;
							return tr1Text.localeCompare(tr2Text, undefined, { numeric: true });
						});

						tBody.append(...rows);
					});
				}
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
		GROUP BY GameID ORDER BY GameID;
		SELECT * FROM ReplayDataSetKeys;
		SELECT Player from GameSeeds JOIN BeliefsChanges ON BeliefsChanges.GameSeed = GameSeeds.GameSeed
		JOIN Games ON Games.GameID = GameSeeds.GameID
		GROUP BY Player ORDER BY Player;
	`});
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
const resizeWatcher = new ResizeObserver(entries => {
	for (const entry of entries){
		if (entry.contentRect.width !== 0) {
			editor.refresh();
		}
	}
});
resizeWatcher.observe(document.getElementById("sqlBox"));

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
	tic();
	noerror();
	let gameID = gameSel.options.length > 0 ? gameSel.options[gameSel.selectedIndex].value : 1;
	let dataset = datasetSel.options.length > 0 ? datasetSel.options[datasetSel.selectedIndex] : {value:1, text:'Score'};
	let playerName = playerSel.options.length > 0 ? playerSel.options[playerSel.selectedIndex].text : '12g';
	let dataset2 = dataset2Sel.options.length > 0 ? dataset2Sel.options[dataset2Sel.selectedIndex] : {value:1, text:'Score'};
	let condition1 = `Games.GameID = 1`;
	let condition2 = `ReplayDataSetKeys.ReplayDataSetID = 1`;
	let traceName = `Games.Player`;
	let yaxisName = ``;
	if (e?.target === plotAllGamesBtn) {
		condition1 = '';
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset.value}`;
		traceName = `Games.Player || ' (' || Games.PlayerGameNumber || ')'`;
		yaxisName = dataset.text;
	}
	else if (e?.target === plotAllPlayersBtn) {
		condition1 = '';
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset2.value}`;
		traceName = `Games.Player || ' ' || Games.PlayerGameNumber || ': ' || Games.Civilization`;
		yaxisName = dataset2.text;
	}
	else if (tab1Rad.checked) {
		condition1 = `Games.GameID = ${gameID}`;
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset.value}`;
		traceName = `Games.Player||' ('||Games.Civilization||')'`;
		yaxisName = dataset.text;
	}
	else if (tab2Rad.checked) {
		condition1 = `Games.Player = '${playerName.replace(/'/g, "''")}'`;
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset2.value}`;
		traceName = `Games.PlayerGameNumber || ': ' || Games.Civilization`;
		yaxisName = dataset2.text;
	}
	else if (tab3Rad.checked) {
		doBarPlot(e);
		return;
	}
	let msg = `
		WITH
  			config(Key,Value) AS (
    			VALUES('type','scatter'),
          			('mode', 'lines'),
					('xaxis','Turn'),
					('yaxis','${yaxisName}')
  			)
		SELECT * FROM config
		;

		WITH
  			gamesData AS (
    			SELECT GameSeeds.GameID, GameSeeds.EndTurn FROM GameSeeds
					JOIN Games ON Games.GameID = GameSeeds.GameID
    				${condition1 ? `WHERE ${condition1}` : ''}
    				GROUP BY Games.GameID
  			)
		SELECT * FROM gamesData
		;

		WITH
  			tracesData AS (
				SELECT GameID, Games.rowid, ${traceName} AS TraceName, Standing, Value AS QuitTurn
				FROM Games
				LEFT JOIN PlayerQuitTurn ON Games.Player = PlayerQuitTurn.Player AND Games.PlayerGameNumber = PlayerQuitTurn.PlayerGameNumber
				${condition1 ? `WHERE ${condition1}` : ''}
  			)
		SELECT * FROM tracesData
		;
	
		SELECT Games.rowid, Turn AS x, 
    	sum(ReplayDataSetsChanges.Value) OVER (PARTITION by Games.GameID, Games.Player ORDER BY Turn) y
		
		FROM DataSets
		JOIN ReplayDataSetsChanges ON ReplayDataSetsChanges.DataSetID = DataSets.DataSetID
		JOIN ReplayDataSetKeys ON ReplayDataSetKeys.ReplayDataSetID = ReplayDataSetsChanges.ReplayDataSetID
		JOIN CivKeys ON CivKeys.CivID = ReplayDataSetsChanges.CivID
		JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
		JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
    	LEFT JOIN PlayerQuitTurn ON Games.Player = PlayerQuitTurn.Player AND Games.PlayerGameNumber = PlayerQuitTurn.PlayerGameNumber
		WHERE ${condition1 ? condition1 : ''} ${condition2 ? (condition1 ? `AND ${condition2}` : condition2) : ''}
		;
	`;
	console.log('msg', msg);
	worker.postMessage({ action: 'exec', id: 0, sql: msg });
}
function doBarPlot(e) {
	noerror();
	let traceName = '';
	let table1, table2, table3, field1, field2, field3;
	if (e?.target === policiesTimeBtn) {
		table1 = 'PoliciesChanges';
		table2 = 'PolicyKeys';
		table3 = 'PolicyBranches';
		field1 = 'PolicyID';
		field2 = 'BranchID';
		field3 = 'PolicyBranch';
	}
	else if (e?.target === techsTimeBtn) {
		table1 = 'TechnologiesChanges';
		table2 = 'TechnologyKeys';
		field1 = 'TechnologyID';
		field2 = 'TechnologyKey';
	}
	else if (tab3Rad.checked || e?.target === beliefsTimeBtn) {
		table1 = 'BeliefsChanges';
		table2 = 'BeliefKeys';
		table3 = 'BeliefTypes';
		field1 = 'BeliefID';
		field2 = 'TypeID';
		field3 = 'BeliefType';
	}
	msg = `
		WITH
  			config(Key,Value) AS (
    			VALUES('type','bar'),
          			('mode', 'lines'),
					('xaxis','Turn'),
					('yaxis','Occurrences')
  			)
		SELECT * FROM config
		;
		
		SELECT ${field3 ? `${field3} FROM ${table3}` : `${field2} FROM ${table2}`}
		;
		
		SELECT ${table3 ? `${table3}.${field3}` : `${table2}.${field2}`}, Turn,
		sum(${table1}.Value) AS Value
		
		FROM DataSets
		JOIN ${table1} ON ${table1}.DataSetID = DataSets.DataSetID
		JOIN ${table2} ON ${table2}.${field1} = ${table1}.${field1}
		${table3 ? `JOIN ${table3} ON ${table3}.${field2} = ${table2}.${field2}` : ''}
		WHERE ${table1}.Value = 1
		GROUP BY Turn, ${table2}.${field2}
		ORDER BY Turn
		;
	`;
	console.log('msg', msg);
	worker.postMessage({ action: 'exec', id: 0, sql: msg });
}


function doSankeyPlot(e) {
	let msg = '';
	let pols, title, numEntries = 7;
	if (e?.target === sankeyPoliciesBtn) {
		msg = `
			WITH
			config(Key,Value) AS (
				VALUES('type','sankey'),
					('title', 'Policy Branches Flow'),
					('numEntries', 9)
			)
			SELECT * FROM config
			;
			SELECT * FROM PolicyBranches
			;
			WITH
				data AS (
					SELECT *
					FROM PoliciesChanges
					JOIN PolicyKeys ON PolicyKeys.PolicyID = PoliciesChanges.PolicyID
					WHERE ((PoliciesChanges.PolicyID IN (0,6,12,18,24,30,36,49,56)) OR (PoliciesChanges.PolicyID > 62)) AND value = 1
					GROUP BY GameSeed, PoliciesChanges.CivID, BranchID
					ORDER BY GameSeed, PoliciesChanges.CivID
     		)
     		SELECT '['||Arr||']' AS seq FROM (
     			SELECT *, GROUP_CONCAT(BranchID)
     			OVER (PARTITION BY GameSeed,CivID ORDER BY Turn ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
     			FROM data
     		)
     		GROUP BY GameSeed, CivID
     		HAVING COUNT(*) > 1
			;

		`;
		worker.postMessage({ action: 'exec', id: 0, sql: msg });
		return;
	}
	else if (e?.target === sankeyTechsBtn) {
		msg = `
			WITH
			config(Key,Value) AS (
				VALUES('type','sankey'),
					('title', 'Technologies Flow'),
					('numEntries', 13)
			)
			SELECT * FROM config
			;
			SELECT * FROM TechnologyKeys
			;
			WITH
				data AS (
					SELECT *
					FROM TechnologiesChanges
					WHERE TechnologyID IN (0,24,26,32,33,34,42,43,45,47,53,54,62) AND value = 1
					GROUP BY GameSeed, CivID, Turn
					ORDER BY GameSeed, CivID
			)
			SELECT '['||Arr||']' AS seq FROM (
				SELECT *, GROUP_CONCAT(TechnologyID)
				OVER (PARTITION BY GameSeed,CivID ORDER BY Turn ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
				FROM data
			)
			GROUP BY GameSeed, CivID
			HAVING COUNT(*) > 1
			;
		`;
		worker.postMessage({ action: 'exec', id: 0, sql: msg });
		return;
	}
	else if (e?.target.id === 'sankey-tradition') {
		pols = '6,7,8,9,10,11,42'
	}
	else if (e?.target.id === 'sankey-liberty') {
		pols = '0,1,2,3,4,5,43'
	}
	else if (e?.target.id === 'sankey-honor') {
		pols = '12,13,14,15,16,17,44'
	}
	else if (e?.target.id === 'sankey-piety') {
		pols = '18,19,20,21,22,23,45'
	}
	else if (e?.target.id === 'sankey-patronage') {
		pols = '24,25,26,27,28,29,46'
	}
	else if (e?.target.id === 'sankey-aesthetics') {
		pols = '49,50,51,52,53,54,55'
	}
	else if (e?.target.id === 'sankey-commerce') {
		pols = '30,31,32,33,34,35,47'
	}
	else if (e?.target.id === 'sankey-exploration') {
		pols = '56,57,58,59,60,61,62'
	}
	else if (e?.target.id === 'sankey-rationalism') {
		pols = '36,37,38,39,40,41,48'
	}
	else if (e?.target.id === 'sankey-freedom') {
		pols = '63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,108';
		numEntries = 16;
	}
	else if (e?.target.id === 'sankey-order') {
		pols = '78,79,80,81,82,83,84,85,86,87,89,90,91,92,109';
		numEntries = 15;
	}
	else if (e?.target.id === 'sankey-autocracy') {
		pols = '93,94,95,96,97,98,99,100,101,102,103,104,105,106,110';
		numEntries = 15;
	}
	msg = `
		WITH
		config(Key,Value) AS (
			VALUES('type','sankey'),
				('title', '${e?.target.textContent.replace(/'/g, "''")}'),
				('numEntries', ${numEntries})
		)
		SELECT * FROM config
		;
		SELECT * FROM PolicyKeys
		;
		WITH
			data AS (
				SELECT *
				FROM PoliciesChanges
				WHERE PolicyID IN (${pols}) AND value = 1
				GROUP BY GameSeed, CivID, Turn, PolicyID
				ORDER BY GameSeed, CivID
		)
		SELECT '['||Arr||']' AS seq FROM (
			SELECT *, GROUP_CONCAT(PolicyID)
			OVER (PARTITION BY GameSeed,CivID ORDER BY Turn ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
			FROM data
		)
		GROUP BY GameSeed, CivID
		HAVING COUNT(*) > 1
		;
	`;
	worker.postMessage({ action: 'exec', id: 0, sql: msg });
}
sankeyPoliciesBtn.addEventListener("click", doSankeyPlot, true);
sankeyTechsBtn.addEventListener("click", doSankeyPlot, true);

document.querySelectorAll(".plot-sel").forEach(el => {
	el.addEventListener("change", doPlot, true);
});
document.querySelectorAll(".plot-clk").forEach(el => {
	el.addEventListener("click", doPlot, true);
});
document.querySelectorAll(".sankey-clk").forEach(el => {
	el.addEventListener("click", doSankeyPlot, true);
});
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
	
	SELECT BeliefType as "Belief Type", BeliefKey AS Belief, min(Turn) as "Minimum Turn", Player, CivKey
	
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
	
	SELECT PolicyBranch as "Policy Branch", PolicyKey AS Policy, min(Turn) as "Minimum Turn", Player, CivKey
	
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
	
	SELECT TechnologyKey AS Technology, min(Turn) as "Minimum Turn", Player, CivKey
	
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
WonderAverageBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BuildingClassID order by Turn) as rnk
	, count(*) over (PARTITION by BuildingClassID) as cnt
	 
	FROM BuildingClassesChanges as BuildingClassesChangesOut
	WHERE Value = 1 and Turn = (
		SELECT min(sub.Turn)
		FROM BuildingClassesChanges as sub
		WHERE sub.Value = 1 and BuildingClassesChangesOut.BuildingClassID = sub.BuildingClassID and BuildingClassesChangesOut.GameSeed = sub.GameSeed
		)
	)

	SELECT BuildingClassType, BuildingClassKey AS Building, round(avg(Turn),1) as "Average Turn"

	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN BuildingClassKeys ON BuildingClassKeys.BuildingClassID = RankedTable.BuildingClassID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN BuildingClassTypes ON BuildingClassTypes.TypeID = BuildingClassKeys.TypeID
	GROUP BY RankedTable.BuildingClassID
	HAVING BuildingClassKeys.TypeID in (1,2)
	ORDER BY BuildingClassKeys.TypeID, "Average Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
WonderMedianBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BuildingClassID order by Turn) as rnk
	, count(*) over (PARTITION by BuildingClassID) as cnt
	 
	FROM BuildingClassesChanges as BuildingClassesChangesOut
	WHERE Value = 1 and Turn = (
		SELECT min(sub.Turn)
		FROM BuildingClassesChanges as sub
		WHERE sub.Value = 1 and BuildingClassesChangesOut.BuildingClassID = sub.BuildingClassID and BuildingClassesChangesOut.GameSeed = sub.GameSeed
		)
	)

	SELECT BuildingClassType, BuildingClassKey AS Building, avg(Turn) as "Median Turn"

	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN BuildingClassKeys ON BuildingClassKeys.BuildingClassID = RankedTable.BuildingClassID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN BuildingClassTypes ON BuildingClassTypes.TypeID = BuildingClassKeys.TypeID
	WHERE 2*rnk - 1 = cnt or 2*rnk = cnt or 2*rnk - 2 = cnt
	GROUP BY RankedTable.BuildingClassID
	HAVING BuildingClassKeys.TypeID in (1,2)
	ORDER BY BuildingClassKeys.TypeID, "Median Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
WonderMinimumBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BuildingClassID order by Turn) as rnk
	, count(*) over (PARTITION by BuildingClassID) as cnt
	 
	FROM BuildingClassesChanges as BuildingClassesChangesOut
	WHERE Value = 1 and Turn = (
		SELECT min(sub.Turn)
		FROM BuildingClassesChanges as sub
		WHERE sub.Value = 1 and BuildingClassesChangesOut.BuildingClassID = sub.BuildingClassID and BuildingClassesChangesOut.GameSeed = sub.GameSeed
		)
	)

	SELECT BuildingClassType, BuildingClassKey AS Building, min(Turn) as "Minimum Turn", Player, CivKey

	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN BuildingClassKeys ON BuildingClassKeys.BuildingClassID = RankedTable.BuildingClassID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN BuildingClassTypes ON BuildingClassTypes.TypeID = BuildingClassKeys.TypeID
	GROUP BY RankedTable.BuildingClassID
	HAVING BuildingClassKeys.TypeID in (1,2)
	ORDER BY BuildingClassKeys.TypeID, "Minimum Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
