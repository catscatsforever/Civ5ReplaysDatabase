/*	using:
		sql.js
		plotly
		codemirror
		codemirror-theme-vars
		fflate
*/
let plotlyUserSettings = {
	'yaxis.type': 'linear'
};
let DBConfig;

let inputsElm = document.getElementById('inputs');

let execBtn = document.getElementById("execute");
let loadingElm = document.getElementById('loading');
let SQLLoadingElm = document.getElementById('sql-status');
let outputElm = document.getElementById('output');
let errorElm = document.getElementById('error');
let commandsElm = document.getElementById('commands');
let savedbElm = document.getElementById('savedb');

let tab0Rad = document.getElementById("tab0");
let tab1Rad = document.getElementById("tab1");
let tab2Rad = document.getElementById("tab2");
let tab3Rad = document.getElementById("tab3");
let tab4Rad = document.getElementById("tab4");
let tab5Rad = document.getElementById("tab5");
let tab6Rad = document.getElementById("tab6");

let tableHallOfFameBtn = document.getElementById('tableHallOfFame');
let tableBeliefAdoptionBtn = document.getElementById('tableBeliefAdoption');
let tablePolicyAdoptionBtn = document.getElementById('tablePolicyAdoption');
let tableTechResearchBtn = document.getElementById('tableTechResearch');
let tableWonderConstructionBtn = document.getElementById('tableWonderConstruction');

let gameSelHead = document.getElementById('gameID-select-head');
let datasetSelHead = document.getElementById('dataset-select-head');
let playerSelHead = document.getElementById('playerID-select-head');
let datasetSelHead2 = document.getElementById('dataset-select-head-2');
let compareSelHead = document.getElementById('compare-group-select-head');
let datasetSelHead3 = document.getElementById('dataset-select-head-3');

let compareGroupArithmeticMeanRad = document.getElementById('compare-group-arithmeticMean');
let compareGroupWinsorizedMeanRad = document.getElementById('compare-group-winsorizedMean');
let compareGroupMedianRad = document.getElementById('compare-group-median');

let sankeyGroups1Rad = document.getElementById('sankey-groups1');
let sankeyGroups2Rad = document.getElementById('sankey-groups2');
let sankeyGroups3Rad = document.getElementById('sankey-groups3');

let treeRoot = document.getElementById('tree-root');

let dbsizeLbl = document.getElementById('dbsize');

const btn = document.querySelector("#darkThemeToggle");
const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");

const currentTheme = localStorage.getItem("theme");
if (currentTheme === "dark") {
	document.body.classList.toggle("dark-theme");
} else if (currentTheme === "light") {
	document.body.classList.toggle("light-theme");
}

btn.addEventListener("click", function () {
	let theme;
	if (prefersDarkScheme.matches) {
		document.body.classList.toggle("light-theme");
		theme = document.body.classList.contains("light-theme")
			? "light"
			: "dark";
	}
	else {
		document.body.classList.toggle("dark-theme");
		theme = document.body.classList.contains("dark-theme")
			? "dark"
			: "light";
	}
	localStorage.setItem("theme", theme);
});

// Start the worker in which sql.js will run
let worker = new Worker("worker.sql-wasm.js");
let worker2 = new Worker("worker.sql-wasm.js");  // extra worker for tables
worker.onerror = error;
worker2.onerror = error;
worker.onmessage = function (event) {
	console.log("e", event);
	// on db load
	if (event.data.ready === true) {
		toc("Loading database from file");
		loadingElm.innerHTML = '';
		fillSelects();
		doPlot();
		tableHallOfFameBtn.click();
	}
	else {
		onWorkerMessage(event);
	}
}
worker2.onmessage = function (event) {
	console.log("e2", event);
	onWorkerMessage(event);
}

function onWorkerMessage(event) {
	let results = event.data.results;
	let id = event.data.id;
	if (event.data.ready === true) {
		return;
	}
	// export db
	if (event.data?.buffer?.length) {
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
		return;
	}
	if (event?.data?.error?.length)
	{
		SQLLoadingElm.textContent = `${event.data.error}`;
		error({message: `${event.data.error}`});
		return;
	}
	if (!results) {
		error({message: event.data.error || 'No data!'});
		return;
	}
	if (results.length === 0) {
		SQLLoadingElm.textContent = `No results found!`;
		error({message: `No results found!`});
		return;
	}
	toc("Executing SQL");
	tic();
	// plot data
	if (id === 0) {
		let conf = Object.assign(...results[0].values.map(([k, v]) => ({ [k]: v })));
		let data = [];
		// bar plot
		if (conf.type === 'bar') {
			let tracesData = results[1].values.map(([k, _]) => (k));
			console.log('tracesData', tracesData);
			let arrX = Object.assign(...Object.values(tracesData).map((v) => ({ [v]: [] }))),
				arrY = Object.assign(...Object.values(tracesData).map((v) => ({ [v]: [] })));
			for (let i = 0; i < results[2].values.length; i++) {
				arrX[results[2].values[i][0]].push(results[2].values[i][1]);
				arrY[results[2].values[i][0]].push(results[2].values[i][2]);
			}
			tracesData.forEach((i, n) => {
				data.push({
					x: arrX[i],
					y: arrY[i],
					type: 'bar',
					showlegend: true,
					name: i,
					color: colors[n % colors.length]
				});
			});
		}
		// sankey plot
		else if (conf.type === 'sankey') {
			let keysData = Object.assign(...results[1].values.map((k) => ({ [k[0]]: k[1] }))),
				blob = { s: {}, t: {}, v: {} },
				arrL = [], arrLL = [], mask = new Array(conf.numEntries - 1),
				nextId = 0, groupLabels = (conf.groups > 1) ? JSON.parse(conf.labels) : [' '];
			results[2].values.forEach((el) => {
				let arr = JSON.parse(el[0]);
				let winID = (conf.groups > 1) ? el[1] : 0;
				for (let i = 0; i < arr.length; i++) {
					if (mask[i] === undefined) mask[i] = {};
					if (i === arr.length - 1) {
						if (!mask[i][arr[i]]) {
							mask[i][arr[i]] = nextId++;
							arrL.push(keysData[arr[i]]);
						}
						continue;
					}
					if (blob.s[i] === undefined) {
						blob.s[i] = Array.from({length: conf.groups}, _=>[]);
						blob.t[i] = Array.from({length: conf.groups}, _=>[]);
						blob.v[i] = Array.from({length: conf.groups}, _=>[]);
					}
					let fg = false;
					for (let j = 0; j < blob.s[i][winID].length; j++) {
						if (blob.s[i][winID][j] === arr[i] && blob.t[i][winID][j] === arr[i + 1]) {
							fg = true;
							blob.v[i][winID][j]++;
							break;
						}
					}
					if (!fg) {
						if (mask[i][arr[i]] === undefined) {
							mask[i][arr[i]] = nextId++;
							arrL.push(keysData[arr[i]]);
						}
						blob.s[i][winID].push(arr[i]);
						blob.t[i][winID].push(arr[i + 1]);
						blob.v[i][winID].push(1);
					}
				}
			});
			let arrS = [], arrT = [], arrV = [], arrCl = [];
			for (let k in blob.s) {
				Object.keys(blob.v[k]).forEach((el) => {
					blob.s[k][el].forEach((el2, i2) => {blob.s[k][el][i2] = mask[k][el2]});
					blob.t[k][el].forEach((el2, i2) => {blob.t[k][el][i2] = mask[(parseInt(k) + 1).toString()][el2]});
					arrS.push(...blob.s[k][el]);
					arrT.push(...blob.t[k][el]);
					arrV.push(...blob.v[k][el]);
					blob.v[k][el].forEach((_) => {
						arrCl.push(conf.groups === 2 ? (el > 0 ? winColors.anyWin : winColors[el]) : winColors[el]);
						arrLL.push(groupLabels[el]);
					});
				});
			}
			// fix wrong x node coords for incomplete branches
			// ref. https://community.plotly.com/t/sankey-avoid-placing-incomplete-branches-to-the-right/44873
			let dummyId = nextId++;
			for (let k in blob.t) {
				if (!blob.s[(parseInt(k) + 1).toString()]) continue;
				let a = new Set(Object.values(blob.s[(parseInt(k) + 1).toString()]).flat());
				let b = new Set(Object.values(blob.t[k]).flat());
				// select nodes with no outgoing links
				let res = [...new Set([...b].filter(x => !a.has(x)))];
				// create a dummy node that continues all incomplete branches and make it invisible
				arrS.push(...res);
				arrT.push(...res.map(_ => dummyId));
				arrV.push(...res.map(_ => 0.001));
				arrCl.push(...res.map(_ => 'rgba(0,0,0,0)'));
				arrLL.push(...res.map(_ => ''));
			}

			data = [{
				type: "sankey",
				arrangement: "freeform",
				node: {
					pad: 35,
					thickness: 30,
					line: { width: 0 },
					label: arrL,
					color: arrL.map((el) => colors[[...new Set(arrL)].indexOf(el) % colors.length]).concat('rgba(0,0,0,0)')
				},
				link: {
					source: arrS,
					target: arrT,
					value: arrV,
					color: arrCl,
					customdata: Array.from({length: arrLL.length}, (el,i)=>{return {extra:(arrV[i] / results[2].values.length * 100).toFixed(1) + '%', value: arrV[i], label: arrLL[i]}}),
					hovertemplate: `<b>%{customdata.label}</b><br><br>source: %{source.label}<br>target: %{target.label}<extra>%{customdata.value}<br>%{customdata.extra}</extra>`
				},
				textfont: { size: 12 }
			}];
			Plotly.newPlot('plotOut', data, { title: conf.title, font: { size: 25 } });
			toc("Displaying results");
			return;
		}
		// scatter plot
		else if (conf.type === 'scatter') {
			let gamesData = Object.assign(...results[1].values.map(([k, v]) => ({ [k]: v })));
			Object.entries(gamesData).forEach(([k, v]) => {
				if (!v) gamesData[k] = 330;
			});
			let tracesData = Object.assign(...results[2].values.map((k) => {
					return { [k[1]]: Object.assign(...k.map((d,i) => {
							return { [results[2].columns[i]]: d }
						})) }
				}
			));
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
			let blob = Array.from({length: 3}, _=>[]);
			if (conf.aggregate) {
				conf.aggregate = JSON.parse(conf.aggregate);
			}
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
				if (conf.aggregate) {
					let groupId;
					if (conf.aggregate.group === 'generic') {
						if (conf.aggregate.id === 0) {
							conf.aggregate.name = 'Winners';
							groupId = tracesData[i].Standing === 1 ? 0 : 1;
						}
						else if (conf.aggregate.id === 1) {
							conf.aggregate.name = 'Playoff Players';
							groupId = [101, 102, 103, 201, 202, 203].includes(tracesData[i].GameID) ? 0 : 1;
						}
						else if (conf.aggregate.id === 2) {
							conf.aggregate.name = 'Final Game Players';
							groupId = (tracesData[i].GameID === 301) ? 0 : 1;
						}
					}
					else if (conf.aggregate.group === 'civs') {
						conf.aggregate.name = conf.aggregate.id;
						groupId = tracesData[i].TraceName === conf.aggregate.id ? 0 : 1;
					}
					else if (conf.aggregate.group === 'players') {
						conf.aggregate.name = conf.aggregate.id;
						groupId = tracesData[i].TraceName === conf.aggregate.id ? 0 : 1;
					}
					else if (conf.aggregate.group === 'wonders') {
						conf.aggregate.name = conf.aggregate.id + ' builders';
						groupId = tracesData[i].GroupID;
					}
					arrY[i].forEach((j,k)=>{
						if (blob[groupId][k] === undefined)
							blob[groupId][k] = [k, []];
						blob[groupId][k][1].push(j);
						if (blob[2][k] === undefined)
							blob[2][k] = [k, []];
						blob[2][k][1].push(j);
					})
				}
				else {
					data.push({
						x: arrX[i],
						y: arrY[i],
						mode: conf.mode,
						type: conf.type,
						line: {
							shape: 'spline',
							color: colors[n % colors.length]
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
									color: colors[n % colors.length],
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
									color: colors[n % colors.length],
									symbol: 'x-dot'
								},
								legendgroup: `group${i}`,
								showlegend: false,
								hoverinfo: 'skip'
							})
						}
					}
				}
			});
			if (conf.aggregate) {
				//console.log('blob', blob);
				blob.forEach((group, n)=>{
					if (conf.aggregate.method === 0) {  // Arithmetic mean
						arrY = Array.from({length: group.length}, (el, i)=>blob[n][i][1].reduce((acc,it)=>acc+it,0)/blob[n][i][1].length);
					}
					else if (conf.aggregate.method === 1) {  // 20% winsorized mean
						arrY = Array.from({length: group.length}, (el, i) => {
							let s = [...blob[n][i][1]].sort((a,b)=>a-b);
							let LBound = Math.trunc(s.length * 0.2);
							let UBound = s.length - LBound - 1;
							return s.reduce((acc,it,wi,arr) => {
								let r = (wi < LBound) ? arr[LBound] : ((wi > UBound) ? arr[UBound] : it);
								return acc + r;
							})/s.length;
						});
					}
					else if (conf.aggregate.method === 2) {  // Median
						arrY = Array.from({length: group.length}, (el, i) => {
							let s = [...blob[n][i][1]].sort((a,b)=>a-b);
							return (s[Math.floor((s.length - 1) / 2)] + s[Math.ceil((s.length - 1) / 2)]) / 2;
						});
					}
					data.push({
						x: Array.from({length: group.length}, (el, i)=>blob[n][i][0]),
						y: arrY,
						mode: conf.mode,
						type: conf.type,
						line: {
							shape: 'spline',
							color: colors[n % colors.length]
						},
						showlegend: true,
						name: Array(`${conf.aggregate.name} average`, `All except ${conf.aggregate.name}`, 'All average')[n]
					});
				});
			}
		}
		let layout = {
			hovermode: "x unified",
			barmode: 'relative',
			xaxis: {
				title: conf.xaxis
			},
			yaxis: {
				title: conf.yaxis ?? 'TODO',
				type: plotlyUserSettings['yaxis.type']
			},
			legend: {
				orientation: "v",
				bgcolor: '#E2E2E2',
				bordercolor: '#FFFFFF',
				borderwidth: 2
			},
			updatemenus: [{
				y: 1.1,
				xanchor: 'auto',
				active: plotlyUserSettings['yaxis.type'] === 'linear' ? 0 : 1,
				buttons: [
					{
						label: 'Linear Scale',
						method: 'relayout',
						args: [{'yaxis.type': 'linear'}]
					},
					{
						label: 'Log Scale',
						method: 'relayout',
						args: [{'yaxis.type': 'log'}]
					}
				]
			}]
		};
		let config = {
			responsive: true,
			toImageButtonOptions: {
				format: 'png', // one of png, svg, jpeg, webp
				filename: `TODO`,
				height: 2160,
				width: 3840,
				scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
			},
		};
		Plotly.newPlot('plotOut', data, layout, config).then(
			document.querySelector("#plotOut").on('plotly_relayout', (e)=>{
				if (e['yaxis.type']) {  // save user preference on linear/log scale change
					plotlyUserSettings['yaxis.type'] = e['yaxis.type'];
				}
			})
		);
	}
	// fill games select
	else if (id === 1) {
		[gameSelHead, playerSelHead, compareSelHead, datasetSelHead, datasetSelHead2, datasetSelHead3].forEach((el, n)=>{
			n = (n > 2) ? 3 : n;  // all dataset dropdowns utilize the same data
			for (let i = 0; i < results[n].values.length; i++) {
				if (results[n].values[i][1] === 'groupSeparator') {
					const b = document.createElement("b");
					b.innerHTML = results[n].values[i][0];
					b.classList.add('sp');
					b.tabIndex = -1;
					el.nextElementSibling.appendChild(b);
				}
				else {
					let sp = document.createElement("span");
					sp.value = results[n].values[i][1];
					sp.innerHTML = `${results[n].values[i][0].replace(/\[([^\]]+)\]/g, (_, a) => IconMarkups[a] ? `<img class="ico" src="images/${IconMarkups[a]}"/>` : `[${a}]`)}`;
					sp.classList.add('sp', 'dropdownItem');
					sp.addEventListener('mousedown', (e) => {
						el.innerHTML = sp.innerHTML;
						el.value = sp.value;
						sp.parentElement.style.visibility = 'hidden';
						doPlot(e);
					});
					el.nextElementSibling.appendChild(sp);
				}
			}
			el.innerHTML = el.nextElementSibling.querySelector('span').innerHTML;
			el.value = el.nextElementSibling.querySelector('span').value;
			el.addEventListener('click', (_)=>{
				el.nextElementSibling.style.visibility = (el.nextElementSibling.style.visibility === 'visible') ? 'hidden' : 'visible';
			});
			el.parentElement.addEventListener('focusout', (e)=>{
				if (!el.nextElementSibling.contains(e.explicitOriginalTarget))
					el.nextElementSibling.style.visibility = 'hidden';
			});
			let temp = el.parentElement.parentElement.style.display;
			el.parentElement.parentElement.style.display = 'block';
			el.style.minWidth = el.nextElementSibling.getBoundingClientRect().width + 'px';
			el.parentElement.parentElement.style.display = temp;
		});
		for (let i = 0; i < results[0].values.length; i++) {
			let li = document.createElement("li");
			li.classList.add(`events-cities-GameID`,`GameID${results[0].values[i][1]}`);
			li.value = results[0].values[i][1];
			li.innerHTML = `<a href="#">${results[0].values[i][0]}</a><ul><li><a href="#">Loading...</a></li></ul>`;
			li.addEventListener('click', function(e) {
				let parent = e.target.parentElement;
				let classList = parent.classList;
				if(classList.contains('open')) {
					classList.remove('open');
					parent.querySelectorAll(':scope .open').forEach((el) => {
						el.classList.remove('open');
					});
				} else {
					classList.add('open');
				}
				if (!classList.contains('cached')) {
					classList.add('cached');
					let query = `
							SELECT * FROM (VALUES('GameID${results[0].values[i][1]}'),('Players'));
							SELECT Player||' ('||CivKey||')'||IIF(Standing = 1, ' *Winner*', ''), GameID, PlayerID FROM Games
							JOIN GameSeeds USING(GameID)
							JOIN Players USING(GameSeed, PlayerID)
							JOIN CivKeys USING(CivID)
							WHERE GameID = ${results[0].values[i][1]}
						`;
					worker.postMessage({ action: 'exec', sql: query, id: 'tree-node-update' });
				}
				e.preventDefault();
			});
			treeRoot.appendChild(li);
		}
	}
	// fill Games front tab
	else if (id === "plot-games-victories") {
		console.log('results:', results);

		let annotations = [
			{
				text: '<span style=\'font-size:1.7vw;\'>Civilization Standings</span>',
				showarrow: false,
				x: 0.33, //position in x domain
				y: 1.01, // position in y domain
				xref: 'paper',
				yref: 'paper',
				xanchor: 'center',
				yanchor: 'bottom',
			},
			{
				text: '<span style=\'font-size:1.7vw;\'>Victory Types and Ideologies</span>',
				showarrow: false,
				x: 0.80, //position in x domain
				y: 1.01, // position in y domain
				xref: 'paper',
				yref: 'paper',
				xanchor: 'center',
				yanchor: 'bottom',
			},
			{
				text: '<span style=\'font-size:1.7vw;\'>% of Qualification Games Played</span>',
				showarrow: false,
				x: 0.80, //position in x domain
				y: 0.41, //position in y domain
				xref: 'paper',
				yref: 'paper',
				xanchor: 'center',
				yanchor: 'bottom',
			},
		];
		let data = [
			Object.assign({}, ...results[0].columns.map((n, index) => ({[n]: JSON.parse(results[0].values[0][index])}))),
			{
				x: results[2].values.map(a => a[0]),
				y: results[2].values.map(a => a[1]),
				type: 'bar',
				showlegend: false,
				offsetgroup: '1',
				legendgroup: '1',
			},
		];
		Object.assign(data[0], {
			branchvalues: "total",
			texttemplate: `%{label}<br>%{value} (%{percentEntry})`,
			hovertemplate: '%{label}<br>%{value} (%{percentRoot:%})<extra></extra>',
			hoverlabel: { align: 'left' },
			type: 'sunburst',
			domain: { x: [0.6, 1], y: [0.5, 1] },
			marker: {colors: data[0].labels.map(l => civColorsDict[l] ?? null)}
		});
		results[1].columns.slice(3).forEach((name, i) => {
			data.push({
				x: results[1].values.map(a => a[i + 3] / a[1]),
				y: results[1].values.map(a => a[0]),
				type: 'bar',
				name: name,
				hovertext: results[1].values.map(a => `${a[i + 3]} games`),
				showlegend: false,
				orientation: 'h',
				offsetgroup: '0',
				xaxis: 'x2',
				yaxis: 'y2',
				marker: { color: colorscaleViridis[i] },
			});
		});
		results[1].values.forEach((a, i) => {
			annotations.push({
				x: -0.01,
				y: i,
				text: a[0],
				xref: 'x2',
				yref: 'y2',
				xanchor: 'right',
				showarrow: false,
				yshift: 0
			},
			{
				x: 1.01,
				y: i,
				text: a[2],
				xref: 'x2',
				yref: 'y2',
				xanchor: 'left',
				showarrow: false,
				yshift: 0
			})
		});
		console.log('data:', data);
		let layout = {
			barmode: 'stack',
			yaxis: {
				domain: [0.1, 0.4],
				anchor: 'x'
			},
			xaxis: {
				domain: [0.7, 0.9],
				anchor: 'y'
			},
			yaxis2: {
				domain: [0, 1],
				showticklabels: false,
				showgrid: false
			},
			xaxis2: {
				domain: [0, 0.6],
				anchor: 'y',
				showticklabels: false,
				showgrid: false
			},
			annotations: annotations,
		};
		Plotly.newPlot('plotOut', data, layout);
	}
	// events tree node update
	else if (id === "tree-node-update") {
		let nodeID = results[0].values[0][0];
		let tag = results[0].values[1][0];
		console.log('nodeid', nodeID, tag)
		document.querySelectorAll('.'+nodeID).forEach((li,ind) => {
			if (tag === 'Constructions') {
				li.replaceChildren(li.firstElementChild, tableCreate(null, results[1].columns, results[1].values));
			}
			else {
				li.replaceChildren(li.firstElementChild, ...results[1].values.map((el) => {
					let li2 = document.createElement("li");
					let ul = document.createElement("ul");
					ul.appendChild(li2);
					let nodeID2 = results[1].columns.slice(1).reduce((a,c,i)=>a+c+el[i+1],'');
					li2.classList.add(nodeID2);
					li2.innerHTML = `<a href="#">${el[0]}</a><ul><li><a href="#">Loading...</a></li></ul>`;
					li2.addEventListener('click', function(e) {
						let parent = e.target.parentElement;
						let classList = parent.classList;
						if(classList.contains('open')) {
							classList.remove('open');
							parent.querySelectorAll(':scope .open').forEach((el2) => {
								el2.classList.remove('open');
							});
						} else {
							classList.add('open');
						}
						if (!classList.contains('cached')) {
							classList.add('cached');
							if (tag === 'Players') {
								let query = `
									SELECT * FROM (VALUES('${nodeID2}'),('Cities'));
									select CityName, GameID, PlayerID, PlotIndex AS CityID FROM (
										select GameID, PlayerID, CivKey, Player, Turn, TimeStamp, num1 as PlotIndex, IFNULL(Text, str) as CityName, iif(count(*)=1, iif(str = 'NO_CITY', 'raze',''), 'conquest') as remark, max(ReplayEvents.rowid) as mx from ReplayEvents
										join ReplayEventKeys on ReplayEventKeys.ReplayEventID = ReplayEvents.ReplayEventType
										join GameSeeds using(GameSeed)
										join Games using(GameID, PlayerID)
										join Players using(GameSeed, PlayerID)
										join CivKeys using(CivID)
										left join CityNames on str = CityName
										where ReplayEventID in (101) and GameID = ${el[1]} and PlayerID = ${el[2]}
										group by GameSeed, PlotIndex, Turn, TimeStamp
										order by GameID, PlayerID, Turn, TimeStamp
									) where remark = ''
								`;
								worker.postMessage({action: 'exec', sql: query, id: 'tree-node-update'});
							}
							else if (tag === 'Cities') {
								let query = `
									SELECT * FROM (VALUES('${nodeID2}'),('Constructions'));
									select turn,
									iif(replayeventid=62,'purchased '||UnitKey,
									iif(replayeventid=63,'purchased '||BuildingKey,
									iif(replayeventid=77,UnitKey,
									iif(replayeventid=78,BuildingKey,
									'???')))) as Event from replayevents
									join replayeventkeys on replayeventkeys.replayeventid = replayevents.replayeventtype
									join gameseeds using(gameseed)
									join games using(gameid, playerid)
									join players using(gameseed, playerid)
									join civkeys using(civid)
									left join BuildingKeys on iif(replayeventid=78,BuildingID = num2,BuildingID=num3)
									left join UnitKeys on UnitID = num2
									where replayeventid in (62,63,77,78) and gameid = ${el[1]} and playerid = ${el[2]} and num1 = ${el[3]}
								`;
								worker.postMessage({action: 'exec', sql: query, id: 'tree-node-update'});
							}
						}
						e.stopPropagation();
						e.preventDefault();
					});
					return ul;
				}));
			}
		});
	}
	// fill table
	else {
		outputElm.innerHTML = "";
		SQLLoadingElm.innerHTML = "";
		console.log('results:', results);
		let blob = {};
		// check if first table contains names of other tables
		if (results[0].columns[0] === 'tableName') {
			blob = Object.assign(...results.map((t, i) => ({ [results[0].values[i]]: t })));
			delete blob.config;
		}
		else {
			blob = Object.assign(...results.map((t, i) => ({ [`Table ${i}`]: t })));
		}
		console.log('table blob', blob);
		Object.entries(blob).forEach((t, _)=>{
			outputElm.appendChild(tableCreate(t[0], t[1].columns, t[1].values));
		});

	}
	toc("Displaying results");
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
	SQLLoadingElm.textContent = "Fetching results...";
	worker2.postMessage({ action: 'exec', id: 'table', sql: commands });
}

function fillSelects() {
	worker.postMessage({ action: 'exec', id: 1, sql: sqlQueries.fillSelects });
}

// Create an HTML table
let tableCreate = function () {
	function valconcat(vals, tagName) {
		if (vals.length === 0) return '';
		let open = '<' + tagName + '>', close = '</' + tagName + '>';
		return open + vals.join(close + open).replace(/\[([^\]]+)\]/g, (_, a) => IconMarkups[a] ? `<img class="ico" src="images/${IconMarkups[a]}"/>` : `[${a}]`) + close;
	}
	return function (name, columns, values) {
		let div = document.createElement('div');
		div.classList.add('table-cont');
		if (name) {
			let ttl = document.createElement('span');
			ttl.textContent = name;
			ttl.classList.add('sp');
			ttl.style.fontSize = '22px';
			div.appendChild(ttl);
		}
		let tbl = document.createElement('table');
		let html = '<thead>' + valconcat(columns, 'th') + '</thead>';
		let rows = values.map(function (v) { return valconcat(v, 'td'); });
		html += '<tbody>' + valconcat(rows, 'tr') + '</tbody>';
		tbl.innerHTML = html;
		rows = Array.from(tbl.tBodies[0].rows);
		for (const th of tbl.tHead.rows[0].cells) {
			const cellIndex = th.cellIndex;

			th.addEventListener("click", () => {
				let dir = th.classList.contains("sort-desc");
				th.parentElement.childNodes.forEach(el=>el.classList.remove("sort-asc", "sort-desc"));
				th.classList.add(dir === true ? "sort-asc" : "sort-desc");
				rows.sort((tr1, tr2) => {
					return tr1.cells[cellIndex].textContent.localeCompare(tr2.cells[cellIndex].textContent, undefined, { numeric: true });
				});
				if (!dir) rows.reverse();

				tbl.tBodies[0].append(...rows);
			});
		}
		div.appendChild(tbl);
		return div;
	}
}();

function populateTreeNode(tag, id) {
}

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
	},
	theme: 'vars'
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
	r.open('GET', 'sample3.zip', true);
	r.responseType = 'arraybuffer';
	r.onload = function () {
		toc('loading DB');
		inputsElm.style.display = 'block';
		const uInt8Array = new Uint8Array(r.response);
		tic();
		const unzipped = fflate.unzipSync(uInt8Array)['sample3.db'];
		DBConfig = JSON.parse(String.fromCharCode.apply(null, fflate.unzipSync(uInt8Array)['config.json']));
		toc('decompression finished');
		let b = uInt8Array.length;
		let b2 = unzipped.length;
		dbsizeLbl.textContent = `DB size is ${(b2/Math.pow(1024,~~(Math.log2(b2)/10))).toFixed(2)} \
			${("KMGTPEZY"[~~(Math.log2(b2)/10)-1]||"") + "B"} \
			(${(b / Math.pow(1024, ~~(Math.log2(b) / 10))).toFixed(2)} \
			${("KMGTPEZY"[~~(Math.log2(b) / 10) - 1] || "") + "B"} compressed)`;
		tic();
		try {
			worker.postMessage({ action: 'open', buffer: unzipped }, [unzipped]);
			worker2.postMessage({ action: 'open', buffer: unzipped }, [unzipped]);
		}
		catch (exception) {
			worker.postMessage({ action: 'open', buffer: unzipped });
			worker2.postMessage({ action: 'open', buffer: unzipped });
		}
	};
	tic();
	r.send();
}
fetchdb();

// Save the db to a file
function savedb() {
	tic();
	worker.postMessage({ action: 'export' });
}
savedbElm.addEventListener("click", savedb, true);

function doPlot(e) {
	Plotly.purge('plotOut');
	if (tab0Rad.checked) {
		worker.postMessage({ action: 'exec', sql: sqlQueries["plot-games-victories"], id: "plot-games-victories" });
		return;
	}
	if (tab5Rad.checked || tab6Rad.checked)
		return;
	tic();
	noerror();
	let target = e?.target.id;
	let gameID = gameSelHead.value ? gameSelHead.value : 1;
	let dataset = datasetSelHead.value ? datasetSelHead : {value: DBConfig.DefaultDatasetID, textContent: DBConfig.DefaultDatasetKey};
	let playerName = playerSelHead.value ? playerSelHead.textContent : DBConfig.DefaultPlayer;
	let dataset2 = datasetSelHead2.value ? datasetSelHead2 : {value: DBConfig.DefaultDatasetID, textContent: DBConfig.DefaultDatasetKey};
	let compareGroup = compareSelHead.value ? compareSelHead : {value: JSON.stringify(DBConfig.DefaultCompareGroup), textContent: DBConfig.DefaultCompareGroupKey};
	let dataset3 = datasetSelHead3.value ? datasetSelHead3 : {value: DBConfig.DefaultDatasetID, textContent: DBConfig.DefaultDatasetKey};
	let condition1 = `Games.GameID = 1`;
	let condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${DBConfig.DefaultDatasetID}`;
	let traceName = `Games.Player`;
	let yaxisName = ``;
	let aggregate, aggregateMethod, supplement, groupID;

	if (compareGroupArithmeticMeanRad.checked) {
		aggregateMethod = 0;
	}
	else if (compareGroupWinsorizedMeanRad.checked) {
		aggregateMethod = 1;
	}
	else if (compareGroupMedianRad.checked) {
		aggregateMethod = 2;
	}

	if (target === 'plotAllGames') {
		condition1 = '';
		condition2 = `ReplayDataSetsChanges.ReplayDataSetID = ${dataset.value}`;
		traceName = `Games.Player || ' (' || Games.PlayerGameNumber || ')'`;
		yaxisName = dataset.textContent;
	}
	else if (target === 'plotAllPlayers') {
		condition1 = '';
		condition2 = `ReplayDataSetsChanges.ReplayDataSetID = ${dataset2.value}`;
		traceName = `Games.Player || ' ' || Games.PlayerGameNumber || ': ' || CivKeys.CivKey`;
		yaxisName = dataset2.textContent;
	}
	// Plot by Game
	else if (tab1Rad.checked) {
		condition1 = `Games.GameID = ${gameID}`;
		condition2 = `ReplayDataSetsChanges.ReplayDataSetID = ${dataset.value}`;
		traceName = `Games.Player||' ('||CivKeys.CivKey||')'`;
		yaxisName = dataset.textContent;
	}
	// Plot by Player
	else if (tab2Rad.checked) {
		condition1 = `Games.Player = '${playerName.replace(/'/g, "''")}'`;
		condition2 = `ReplayDataSetsChanges.ReplayDataSetID = ${dataset2.value}`;
		traceName = `Games.PlayerGameNumber || ': ' || CivKeys.CivKey`;
		yaxisName = dataset2.textContent;
	}
	// Compare Average
	else if (tab3Rad.checked) {
		let val = JSON.parse(compareGroup.value);
		if (val.group === 'generic') {
			traceName = `Games.Player`;
			aggregate = `{"group":"generic","method":${aggregateMethod},"id":${val.id}}`;
		}
		else if (val.group === 'civs') {
			traceName = `CivKeys.CivKey`;
			aggregate = `{"group":"civs","method":${aggregateMethod},"id":"${compareGroup.textContent}"}`;
		}
		else if (val.group === 'players') {
			traceName = `Games.Player`;
			aggregate = `{"group":"players","method":${aggregateMethod},"id":"${val.id}"}`;
		}
		else if (val.group === 'wonders') {
			traceName = `Games.Player`;
			aggregate = `{"group":"wonders","method":${aggregateMethod},"id":"${val.id}"}`;
			supplement = `
				LEFT JOIN (
					SELECT GameID, PlayerID, 0 AS GroupID FROM ReplayEvents
					JOIN BuildingKeys ON BuildingID = Num2
					JOIN BuildingClassKeys USING(BuildingClassID)
					JOIN GameSeeds USING(GameSeed)
					WHERE ReplayEventType = 78 AND BuildingClassKeys.TypeID = 2 AND BuildingClassKey IN (${selection})
				) USING(GameID, PlayerID)
			`;
			groupID = 'IFNULL(GroupID, 1)';
		}
		condition1 = '';
		condition2 = `ReplayDataSetsChanges.ReplayDataSetID = ${dataset3.value}`;
		yaxisName = dataset3.textContent;
	}
	// Plot Distribution
	else if (tab4Rad.checked) {
		doBarPlot(e);
		return;
	}
	let msg = `
		WITH
			config(Key,Value) AS (
				VALUES('type','scatter'),
					('mode', 'lines'),
					('xaxis','Turn'),
					('yaxis',"${yaxisName}")
					${aggregate ? `,('aggregate', '${aggregate}')` : ''}
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
				SELECT Games.GameID, Games.rowid, ${traceName} AS TraceName, Standing, PlayerQuitTurn AS QuitTurn ${groupID ? `, ${groupID} AS GroupID` : ''}
				FROM Games
				JOIN GameSeeds USING(GameID)
        		JOIN Players USING(GameSeed, PlayerID)
				JOIN CivKeys USING(CivID)
				${supplement || ''}
				${condition1 ? `WHERE ${condition1}` : ''}
			)
		SELECT * FROM tracesData
		;
		
		SELECT Games.rowid, Turn AS x, 
		SUM(ReplayDataSetsChanges.Value) OVER (PARTITION by Games.GameID, Games.Player ORDER BY Turn) y
		FROM ReplayDataSetsChanges
		JOIN GameSeeds ON GameSeeds.GameSeed = ReplayDataSetsChanges.GameSeed
		JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayDataSetsChanges.PlayerID
		WHERE ${condition1 ? condition1 : ''} ${condition2 ? (condition1 ? `AND ${condition2}` : condition2) : ''}
		;
	`;
	console.log(msg);
	worker.postMessage({ action: 'exec', id: 0, sql: msg });
}

function doBarPlot(e) {
	noerror();
	let target = e?.target.id;
	let msg;
	if (target === 'policies-time') {
		msg = sqlQueries["plot-bar-policies-time"];
	}
	else if (target === 'techs-time') {
		msg = sqlQueries["plot-bar-techs-time"];
	}
	else if (target === 'wonders-time') {
		msg = sqlQueries["plot-bar-wonders-time"];
	}
	else if (tab4Rad.checked || target === 'beliefs-time') {
		msg = sqlQueries["plot-bar-beliefs-time"];
	}
	console.log('msg', msg);
	worker.postMessage({ action: 'exec', id: 0, sql: msg });
}

let lastSankeyId, lastSankeyTitle;
function doSankeyPlot(e) {
	let target = e?.target.id;
	let msg = '';
	let pols, numEntries = 7,
		numGroups, groupLabels, groupSelector;
	if (e?.target.classList.contains('sankey-clk') && e?.target?.type !== 'radio') {
		lastSankeyId = target;
		lastSankeyTitle = e.target.textContent;
	}
	if (['sankey-groups1', 'sankey-groups2', 'sankey-groups3'].includes(target)) {
		if (lastSankeyId === undefined) return;
		target = lastSankeyId;
	}

	if (sankeyGroups1Rad.checked) {
		numGroups = 1;
		groupSelector = '0';
		groupLabels = '[]';
	}
	else if (sankeyGroups2Rad.checked) {
		numGroups = 2;
		groupSelector = 'WinID > 0';
		groupLabels = '["Losers","Winners"]';
	}
	else if (sankeyGroups3Rad.checked) {
		numGroups = 6;
		groupSelector = 'WinID';
		groupLabels = '["Losers","Time Victory","Science Victory","Domination Victory","Cultural Victory","Diplomatic Victory"]';
	}

	if (target === 'sankey-policies') {
		msg = `
			WITH
			config(Key,Value) AS (
				VALUES('type','sankey'),
					('title', 'Policy Branches Flow'),
					('numEntries', 9),
					('groups', ${numGroups}),
					('labels', '${groupLabels}')
			)
			SELECT * FROM config
			;
			SELECT * FROM PolicyBranches
			;
            SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
                SELECT *, GROUP_CONCAT(BranchID)
                OVER (PARTITION BY GameSeed, PlayerID ORDER BY Turn, TimeStamp ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
                FROM (
                    SELECT *
                    FROM ReplayEvents
                    JOIN PolicyKeys ON PolicyID = Num2
                    JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
                    JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = ReplayEvents.PlayerID
                    JOIN CivKeys ON CivKeys.CivID = Players.CivID
                    JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
                    WHERE ReplayEventType = 61
                    GROUP BY ReplayEvents.GameSeed, Players.PlayerID, BranchID
                )
            )
            GROUP BY GameSeed, CivID
            HAVING COUNT(*) > 1
            ;

		`;
		worker.postMessage({ action: 'exec', id: 0, sql: msg });
		return;
	}
	else if (target === 'sankey-techs') {
		msg = `
			WITH
			config(Key,Value) AS (
				VALUES('type','sankey'),
					('title', 'Technologies Flow'),
					('numEntries', 13),
					('groups', ${numGroups}),
					('labels', '${groupLabels}')
			)
			SELECT * FROM config
			;
			SELECT * FROM TechnologyKeys
			;
			SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
                SELECT *, GROUP_CONCAT(Num2)
                OVER (PARTITION BY GameSeed, PlayerID ORDER BY Turn, TimeStamp ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
                FROM (
                    SELECT *
                    FROM ReplayEvents
                    JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
                    JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = ReplayEvents.PlayerID
                    JOIN CivKeys ON CivKeys.CivID = Players.CivID
                    JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
                    WHERE ReplayEventType = 91 AND Num2 IN (0,24,26,32,33,34,42,43,45,47,53,54,62)
                )
            )
            GROUP BY GameSeed, CivID
            HAVING COUNT(*) > 1
            ;
		`;
		worker.postMessage({ action: 'exec', id: 0, sql: msg });
		return;
	}
	else if (target === 'sankey-tradition') {
		pols = '6,7,8,9,10,11,42'
	}
	else if (target === 'sankey-liberty') {
		pols = '0,1,2,3,4,5,43'
	}
	else if (target === 'sankey-honor') {
		pols = '12,13,14,15,16,17,44'
	}
	else if (target === 'sankey-piety') {
		pols = '18,19,20,21,22,23,45'
	}
	else if (target === 'sankey-patronage') {
		pols = '24,25,26,27,28,29,46'
	}
	else if (target === 'sankey-aesthetics') {
		pols = '49,50,51,52,53,54,55'
	}
	else if (target === 'sankey-commerce') {
		pols = '30,31,32,33,34,35,47'
	}
	else if (target === 'sankey-exploration') {
		pols = '56,57,58,59,60,61,62'
	}
	else if (target === 'sankey-rationalism') {
		pols = '36,37,38,39,40,41,48'
	}
	else if (target === 'sankey-freedom') {
		pols = '63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,108';
		numEntries = 16;
	}
	else if (target === 'sankey-order') {
		pols = '78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,109';
		numEntries = 15;
	}
	else if (target === 'sankey-autocracy') {
		pols = '93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,110';
		numEntries = 15;
	}

	msg = `
		WITH
		config(Key,Value) AS (
			VALUES('type','sankey'),
				('title', '${lastSankeyTitle.replace(/'/g, "''")}'),
				('numEntries', ${numEntries}),
				('groups', ${numGroups}),
				('labels', '${groupLabels}')
		)
		SELECT * FROM config
		;
		SELECT * FROM PolicyKeys
		;
		SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
            SELECT *, GROUP_CONCAT(PolicyID)
            OVER (PARTITION BY GameSeed, PlayerID ORDER BY Turn, TimeStamp ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) AS Arr
            FROM (
                SELECT *
                FROM ReplayEvents
                JOIN PolicyKeys ON PolicyID = Num2
                JOIN GameSeeds ON GameSeeds.GameSeed = ReplayEvents.GameSeed
                JOIN Players ON Players.GameSeed = GameSeeds.GameSeed AND Players.PlayerID = ReplayEvents.PlayerID
                JOIN CivKeys ON CivKeys.CivID = Players.CivID
                JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.PlayerID = ReplayEvents.PlayerID
                WHERE ReplayEventType = 61 AND PolicyID IN (${pols})
                GROUP BY ReplayEvents.GameSeed, Players.PlayerID, PolicyID
            )
        )
        GROUP BY GameSeed, CivID
        HAVING COUNT(*) > 1
        ;
	`;
	worker.postMessage({ action: 'exec', id: 0, sql: msg });
}
document.querySelectorAll(".plot-sel").forEach(el => {
	el.addEventListener("change", doPlot, true);
});
document.querySelectorAll(".plot-clk, .compare-clk").forEach(el => {
	el.addEventListener("click", doPlot, true);
});
document.querySelectorAll(".sankey-clk").forEach(el => {
	el.addEventListener("click", doSankeyPlot, true);
});

tableHallOfFameBtn.addEventListener("click", () => { noerror(); let r = sqlQueries["table-hall-of-fame"]; execute(r); editor.setValue(r); }, true);

tableBeliefAdoptionBtn.addEventListener("click", () => { noerror(); let r = sqlQueries["table-belief-adoption"]; execute(r); editor.setValue(r); }, true);

tablePolicyAdoptionBtn.addEventListener("click", () => { noerror(); let r = sqlQueries["table-policy-adoption"]; execute(r); editor.setValue(r); }, true);

tableTechResearchBtn.addEventListener("click", () => { noerror(); let r = sqlQueries["table-tech-research"]; execute(r); editor.setValue(r); }, true);

tableWonderConstructionBtn.addEventListener("click", () => { noerror(); let r = sqlQueries["table-wonder-construction"]; execute(r); editor.setValue(r); }, true);
