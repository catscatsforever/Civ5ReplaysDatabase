/*	using:
		sql.js
		plotly
		codemirror
		fflate
*/

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
	ICON_WTF2: 'Civ5Icon.Wtf2.png'
};
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
let WonderAverageBtn = document.getElementById('WondersAverage');
let WonderMedianBtn = document.getElementById('WondersMedian');
let WonderMinimumBtn = document.getElementById('WondersMinimum');

let gameSelHead = document.getElementById('gameID-select-head');
let gameSelDropdown = document.getElementById('gameID-select-dropdown');
let datasetSelHead = document.getElementById('dataset-select-head');
let datasetSelDropdown = document.getElementById('dataset-select-dropdown');
let playerSelHead = document.getElementById('playerID-select-head');
let playerSelDropdown = document.getElementById('playerID-select-dropdown');
let datasetSelHead2 = document.getElementById('dataset-select-head-2');
let datasetSelDropdown2 = document.getElementById('dataset-select-dropdown-2');

let sankeyGroups1Rad = document.getElementById('sankey-groups1');
let sankeyGroups2Rad = document.getElementById('sankey-groups2');
let sankeyGroups3Rad = document.getElementById('sankey-groups3');

let dbsizeLbl = document.getElementById('dbsize');

// Start the worker in which sql.js will run
let worker = new Worker("worker.sql-wasm.js");
worker.onerror = error;
worker.onmessage = function (event) {
	console.log("e", event);
	let results = event.data.results;
	let id = event.data.id;
	// on db load
	if (event.data.ready === true) {
		toc("Loading database from file");
		editor.setValue(`\tANALYZE main;\n\tSELECT tbl AS Name, stat AS Rows FROM sqlite_stat1 ORDER BY Name;`);
		execEditorContents();
		fillSelects();
		doPlot();
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
	if (!results) {
		error({message: event.data.error || 'No data!'});
		return;
	}
	if (results.length === 0) {
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
			let tracesData = results[1].values.map(([k, v]) => (k));
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
					blob.v[k][el].forEach((x) => {
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
				filename: `TODO`,
				height: 2160,
				width: 3840,
				scale: 1 // Multiply title/legend/axis/canvas sizes by this factor
			},
		};
		Plotly.newPlot('plotOut', data, layout, config);
	}
	// fill games select
	else if (id === 1) {
		[gameSelHead, datasetSelHead, playerSelHead, datasetSelHead2].forEach((el, n)=>{
			n = (n === 3) ? 1 : n;
			el.innerHTML = `${results[n].values[0][0].replace(/\[([^\]]+)\]/g, (_,a)=>IconMarkups[a]?`<img src="Images/${IconMarkups[a]}"/>`:`[${a}]`)}`;
			el.value = 1;
			el.addEventListener('click', (e)=>{
				el.nextElementSibling.style.visibility = (el.nextElementSibling.style.visibility === 'visible') ? 'hidden' : 'visible';
			});
			el.addEventListener('focusout', (e)=>{
				if (!el.nextElementSibling.contains(e.explicitOriginalTarget))
					el.nextElementSibling.style.visibility = 'hidden';
			});
			for (let i = 0; i < results[n].values.length; i++) {
				const sp = document.createElement("span");
				sp.value = results[n].values[i][1];
				sp.innerHTML = `${results[n].values[i][0].replace(/\[([^\]]+)\]/g, (_,a)=>IconMarkups[a]?`<img src="Images/${IconMarkups[a]}"/>`:`[${a}]`)}`;
				sp.classList.add('sp', 'dropdownItem');
				el.nextElementSibling.appendChild(sp);
			}
			let temp = el.parentElement.parentElement.style.display;
			el.parentElement.parentElement.style.display = 'block';
			el.style.minWidth = el.nextElementSibling.getBoundingClientRect().width + 'px';
			el.parentElement.parentElement.style.display = temp;
		});
		document.querySelectorAll('.dropdownItem').forEach((el)=>{
			el.addEventListener('click', (e)=>{
				el.parentElement.parentElement.children[0].innerHTML = el.innerHTML;
				el.parentElement.parentElement.children[0].value = el.value;
				el.parentElement.style.visibility = 'hidden';
				doPlot(e);
			})
		})
	}
	// fill table
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
					let dir = th.classList.contains("sort-desc");
					th.parentElement.childNodes.forEach(el=>el.classList.remove("sort-asc", "sort-desc"));
					th.classList.add(dir === true ? "sort-asc" : "sort-desc");
					rows.sort((tr1, tr2) => {
						const tr1Text = tr1.cells[cellIndex].textContent;
						const tr2Text = tr2.cells[cellIndex].textContent;
						return dir ? 1 : -1 * tr2Text.localeCompare(tr1Text, undefined, { numeric: true });
					});

					tBody.append(...rows);
				});
			}
		}

	}
	toc("Displaying results");
};


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
	worker.postMessage({ action: 'exec', sql: commands });
	outputElm.textContent = "Fetching results...";
}

function fillSelects() {
	worker.postMessage({ action: 'exec', id: 1, sql: `
		SELECT GameSeeds.GameID||'	('||GROUP_CONCAT(Player, ', ')||')', GameSeeds.GameID FROM Games
		JOIN GameSeeds ON GameSeeds.GameID = Games.GameID
		WHERE GameSeeds.EndTurn > 0
		GROUP BY Games.GameID
		ORDER BY GameSeeds.GameID;
		SELECT ReplayDataSetKey, ReplayDataSetID FROM ReplayDataSetKeys;
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
	r.open('GET', 'sample.zip', true);
	r.responseType = 'arraybuffer';
	r.onload = function () {
		toc('loading DB');
		inputsElm.style.display = 'block';
		const uInt8Array = new Uint8Array(r.response);
		tic();
		const unzipped = fflate.unzipSync(uInt8Array)['sample.db'];
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
		}
		catch (exception) {
			worker.postMessage({ action: 'open', buffer: unzipped });
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
	tic();
	noerror();
	let gameID = gameSelDropdown.children.length > 0 ? gameSelHead.value : 1;
	let dataset = datasetSelDropdown.children.length > 0 ? datasetSelHead : {value:1, textContent:'Score'};
	console.log(datasetSelHead.value,datasetSelHead.textContent);
	let playerName = playerSelDropdown.children.length > 0 ? playerSelHead.textContent : '12g';
	let dataset2 = datasetSelDropdown2.children.length > 0 ? datasetSelHead2 : {value:1, textContent:'Score'};
	let condition1 = `Games.GameID = 1`;
	let condition2 = `ReplayDataSetKeys.ReplayDataSetID = 1`;
	let traceName = `Games.Player`;
	let yaxisName = ``;
	if (e?.target === plotAllGamesBtn) {
		condition1 = '';
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset.value}`;
		traceName = `Games.Player || ' (' || Games.PlayerGameNumber || ')'`;
		yaxisName = dataset.textContent;
	}
	else if (e?.target === plotAllPlayersBtn) {
		condition1 = '';
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset2.value}`;
		traceName = `Games.Player || ' ' || Games.PlayerGameNumber || ': ' || Games.Civilization`;
		yaxisName = dataset2.textContent;
	}
	else if (tab1Rad.checked) {
		condition1 = `Games.GameID = ${gameID}`;
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset.value}`;
		traceName = `Games.Player||' ('||Games.Civilization||')'`;
		yaxisName = dataset.textContent;
	}
	else if (tab2Rad.checked) {
		condition1 = `Games.Player = '${playerName.replace(/'/g, "''")}'`;
		condition2 = `ReplayDataSetKeys.ReplayDataSetID = ${dataset2.value}`;
		traceName = `Games.PlayerGameNumber || ': ' || Games.Civilization`;
		yaxisName = dataset2.textContent;
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
	console.log(msg);
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
	if(e?.target.id === 'sankey-groups1' || e?.target.id === 'sankey-groups2' || e?.target.id === 'sankey-groups3') {
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
		groupSelector = 'WinID > 1';
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
			WITH
				data AS (
					SELECT *
					FROM PoliciesChanges
					JOIN PolicyKeys ON PolicyKeys.PolicyID = PoliciesChanges.PolicyID
        			JOIN GameSeeds ON GameSeeds.GameSeed = PoliciesChanges.GameSeed
        			JOIN CivKeys ON CivKeys.CivID = PoliciesChanges.CivID
        			JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.Civilization = CivKeys.CivKey
					WHERE ((PoliciesChanges.PolicyID IN (0,6,12,18,24,30,36,49,56)) OR (PoliciesChanges.PolicyID > 62)) AND value = 1
					GROUP BY PoliciesChanges.GameSeed, PoliciesChanges.CivID, BranchID
					ORDER BY PoliciesChanges.GameSeed, PoliciesChanges.CivID
     		)
     		SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
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
			WITH
				data AS (
					SELECT *
					FROM TechnologiesChanges
        			JOIN GameSeeds ON GameSeeds.GameSeed = TechnologiesChanges.GameSeed
        			JOIN CivKeys ON CivKeys.CivID = TechnologiesChanges.CivID
        			JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.Civilization = CivKeys.CivKey
					WHERE TechnologyID IN (0,24,26,32,33,34,42,43,45,47,53,54,62) AND value = 1
					GROUP BY TechnologiesChanges.GameSeed, TechnologiesChanges.CivID, Turn
					ORDER BY TechnologiesChanges.GameSeed, TechnologiesChanges.CivID
			)
			SELECT '['||Arr||']', ${groupSelector} AS seq FROM (
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
		pols = '78,79,80,81,82,83,84,85,86,87,89,90,91,92,109';
		numEntries = 15;
	}
	else if (target === 'sankey-autocracy') {
		pols = '93,94,95,96,97,98,99,100,101,102,103,104,105,106,110';
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
		WITH
			data AS (
				SELECT *
				FROM PoliciesChanges
        		JOIN GameSeeds ON GameSeeds.GameSeed = PoliciesChanges.GameSeed
        		JOIN CivKeys ON CivKeys.CivID = PoliciesChanges.CivID
        		JOIN Games ON Games.GameID = GameSeeds.GameID AND Games.Civilization = CivKeys.CivKey
				WHERE PolicyID IN (${pols}) AND value = 1
				GROUP BY PoliciesChanges.GameSeed, PoliciesChanges.CivID, Turn, PolicyID
				ORDER BY PoliciesChanges.GameSeed, PoliciesChanges.CivID
		)
		SELECT '['||Arr||']' AS seq, ${groupSelector} FROM (
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
	
	SELECT BeliefType as "Belief Type", BeliefKey AS Belief, min(Turn) as "Minimum Turn", Player, Civilization

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
	
	SELECT PolicyBranch as "Policy Branch", PolicyKey AS Policy, min(Turn) as "Minimum Turn", Player, Civilization

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
	WHERE TechnologyID != 0 and Value = 1
	)
	
	SELECT EraKey as "Era", TechnologyKey AS Technology, round(avg(Turn), 1) as "Average Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = RankedTable.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN TechnologyEras ON TechnologyEras.EraID = TechnologyKeys.EraID
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
	WHERE TechnologyID != 0 and Value = 1
	)
	
	SELECT EraKey as "Era", TechnologyKey AS Technology, avg(Turn) OVER (PARTITION by TechnologyKeys.TechnologyID) as "Median Turn"
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = RankedTable.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN TechnologyEras ON TechnologyEras.EraID = TechnologyKeys.EraID
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
	WHERE TechnologyID != 0 and Value = 1
	)
	
	SELECT EraKey as "Era", TechnologyKey AS Technology, min(Turn) as "Minimum Turn", Player, Civilization
	
	FROM DataSets
	JOIN RankedTable ON RankedTable.DataSetID = DataSets.DataSetID
	JOIN TechnologyKeys ON TechnologyKeys.TechnologyID = RankedTable.TechnologyID
	JOIN CivKeys ON CivKeys.CivID = RankedTable.CivID
	JOIN GameSeeds ON GameSeeds.GameSeed = RankedTable.GameSeed
	JOIN Games ON Games.Civilization = CivKeys.CivKey AND Games.GameID = GameSeeds.GameID
	JOIN TechnologyEras ON TechnologyEras.EraID = TechnologyKeys.EraID
	GROUP BY RankedTable.TechnologyID
	ORDER BY "Minimum Turn"
	;
	`; execute(r); editor.setValue(r); }, true);
WonderAverageBtn.addEventListener("click", () => { noerror(); let r = `
	with RankedTable as (
	SELECT *
	, row_number() OVER (PARTITION by BuildingClassID order by Turn) as rnk
	, count(*) over (PARTITION by BuildingClassID) as cnt
	 
	FROM BuildingClassesChanges as BuildingClassesChangesOut
	WHERE BuildingClassID != 46 and Value = 1 and Turn = (
		SELECT min(sub.Turn)
		FROM BuildingClassesChanges as sub
		WHERE sub.Value = 1 and BuildingClassesChangesOut.BuildingClassID = sub.BuildingClassID and BuildingClassesChangesOut.GameSeed = sub.GameSeed
		)
	)

	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS Building, round(avg(Turn),1) as "Average Turn"

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
	WHERE BuildingClassID != 46 and Value = 1 and Turn = (
		SELECT min(sub.Turn)
		FROM BuildingClassesChanges as sub
		WHERE sub.Value = 1 and BuildingClassesChangesOut.BuildingClassID = sub.BuildingClassID and BuildingClassesChangesOut.GameSeed = sub.GameSeed
		)
	)

	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS Building, avg(Turn) as "Median Turn"

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
	WHERE BuildingClassID != 46 and Value = 1 and Turn = (
		SELECT min(sub.Turn)
		FROM BuildingClassesChanges as sub
		WHERE sub.Value = 1 and BuildingClassesChangesOut.BuildingClassID = sub.BuildingClassID and BuildingClassesChangesOut.GameSeed = sub.GameSeed
		)
	)

	SELECT BuildingClassType AS "Wonder Type", BuildingClassKey AS Building, min(Turn) as "Minimum Turn", Player, Civilization

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
