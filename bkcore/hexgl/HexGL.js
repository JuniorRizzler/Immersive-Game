 /*
 * HexGL
 * @author Thibaut 'BKcore' Despoulain <http://bkcore.com>
 * @license This work is licensed under the Creative Commons Attribution-NonCommercial 3.0 Unported License.
 *          To view a copy of this license, visit http://creativecommons.org/licenses/by-nc/3.0/.
 */

'use strict';
'v1.0.1';

var bkcore = bkcore || {};
bkcore.hexgl = bkcore.hexgl || {};

bkcore.hexgl.HexGL = function(opts)
{
	var self = this;

	this.document = opts.document || document;

	this.a = window.location.href;

	this.active = true;
	this.displayHUD = opts.hud == undefined ? true : opts.hud;
	this.width = opts.width == undefined ? window.innerWidth : opts.width;
	this.height = opts.height == undefined ? window.innerHeight : opts.height;
	
	this.difficulty = opts.difficulty == undefined ? 0 : opts.difficulty;
	this.player = opts.player == undefined ? "Anonym" : opts.player;

	this.track = bkcore.hexgl.tracks[ opts.track == undefined ? 'Cityscape' : opts.track ];

	this.mode = opts.mode == undefined ? 'timeattack' : opts.mode;

	this.controlType = opts.controlType == undefined ? 1 : opts.controlType;
	
	// 0 == low, 1 == mid, 2 == high, 3 == very high
	// the old platform+quality combinations map to these new quality values
	// as follows:
	// mobile + low quality => 0 (LOW)
	// mobile + mid quality OR desktop + low quality => 1 (MID)
	// mobile + high quality => 2 (HIGH)
	// desktop + mid or high quality => 3 (VERY HIGH)
	this.quality = opts.quality == undefined ? 3 : opts.quality;

	if(this.quality === 0)
	{
		this.width /= 2;
		this.height /=2;
	}

	this.settings = null;
	this.renderer = null;
	this.manager = null;
	this.lib = null;
	this.materials = {};
	this.components = {};
	this.extras = {
		vignetteColor: new THREE.Color(0x458ab1),
		bloom: null,
		fxaa: null
	};

	this.containers = {};
	this.containers.main = opts.container == undefined ? document.body : opts.container;
	this.containers.overlay = opts.overlay == undefined ? document.body : opts.overlay;

	this.gameover = opts.gameover == undefined ? null : opts.gameover;

	this.godmode = opts.godmode == undefined ? false : opts.godmode;

	this.hud = null;

	this.gameplay = null;
	this.stationPromptActive = false;
	this.stationPromptReady = false;
	this.stationPromptTimer = null;

	this.composers = {
		game: null
	};

	this.initRenderer();

	function onKeyPress(event)
	{
		if(event.keyCode == 27/*escape*/)
		{
			self.reset();
		}
	}

	this.document.addEventListener('keydown', onKeyPress, false);
}

bkcore.hexgl.HexGL.prototype.start = function()
{

	this.manager.setCurrent("game");

	var self = this;

	function raf()
	{
		if(self && self.active) requestAnimationFrame( raf );
		self.update();
	}

	//if(this.a[15] == "o")
		raf();

	this.initGameplay();
}

bkcore.hexgl.HexGL.prototype.reset = function()
{
	this.manager.get('game').objects.lowFPS = 0;
	this.gameplay.start();

	bkcore.Audio.stop('bg');
	bkcore.Audio.stop('wind');
	bkcore.Audio.volume('wind', 0.35);
	bkcore.Audio.play('bg');
	bkcore.Audio.play('wind');
}

bkcore.hexgl.HexGL.prototype.restart = function()
{
	try{ this.document.getElementById('finish').style.display = 'none'; }
	catch(e){};
	this.reset();
}

bkcore.hexgl.HexGL.prototype.update = function()
{
	if(!this.active) return;

	if(this.gameplay != null)
		this.gameplay.update();

	this.manager.renderCurrent();
}

bkcore.hexgl.HexGL.prototype.init = function()
{
	this.initHUD();
	
	this.track.buildMaterials(this.quality);

	this.track.buildScenes(this, this.quality);

	this.initGameComposer();
}

bkcore.hexgl.HexGL.prototype.load = function(opts)
{
	this.track.load(opts, this.quality);
}

bkcore.hexgl.HexGL.prototype.initGameplay = function()
{
	var self = this;

	this.gameplay = new bkcore.hexgl.Gameplay({
		mode: this.mode,
		hud: this.hud,
		shipControls: this.components.shipControls,
		cameraControls: this.components.cameraChase,
		cores: this.components.cores,
		analyser: this.track.analyser,
		pixelRatio: this.track.pixelRatio,
		track: this.track,
		onStation: function() {
			self.displayStationPrompt();
		},
		onFinish: function() {
			self.components.shipControls.terminate();
			self.displayScore(this.finishTime, this.lapTimes);
		}
	});

	this.gameplay.start();
	this.manager.get('game').objects.gameplay = this.gameplay;

	bkcore.Audio.play('bg');
	bkcore.Audio.play('wind');
	bkcore.Audio.volume('wind', 0.35);
}

bkcore.hexgl.HexGL.prototype.displayStationPrompt = function()
{
	if(this.gameover === null)
		return;

	var self = this;
	var nextLevel = this.gameplay.contract.level + 1;
	var maxLevel = this.gameplay.contract.maxLevel;
	var nextTarget = this.gameplay.contract.levelTargets[nextLevel - 1];
	var nextLaps = this.gameplay.contract.levelLapTargets[nextLevel - 1];
	var deadline = bkcore.Timer.msToTimeString(this.gameplay.contract.levelDeadlines[nextLevel - 1]);

	this.stationPromptActive = true;
	this.stationPromptReady = false;
	if(this.stationPromptTimer != null)
		clearTimeout(this.stationPromptTimer);
	this.gameover.className = "result-station";
	this.gameover.style.display = "block";
	this.document.getElementById("time").innerHTML = "Station Docked";
	this.document.getElementById("result-title").innerHTML = "Relay Level " + this.gameplay.contract.level + " Secured";
	this.document.getElementById("contract-summary").innerHTML = "Docking clamps locked. Refilling hull integrity and overdrive cells before the next city relay opens.";
	this.document.getElementById("rank-summary").innerHTML = "Stand by for station release.";
	this.document.getElementById("station-actions").style.display = "none";
	this.document.getElementById("station-continue").innerHTML = "Continue Level " + nextLevel;
	this.document.getElementById("station-stop").innerHTML = "Stop Here";
	this.document.querySelector("#step-5 #ctrl-help").innerHTML = "Refilling...";
	this.stationPromptTimer = setTimeout(function() {
		if(!self.stationPromptActive)
			return;
		self.stationPromptReady = true;
		self.document.getElementById("contract-summary").innerHTML = "Station service complete. Hull integrity and overdrive are full.";
		self.document.getElementById("rank-summary").innerHTML = "Continue to Level " + nextLevel + "/" + maxLevel + ": clear " + nextLaps + " lap" + (nextLaps > 1 ? "s" : "") + " and collect " + nextTarget + " cores before " + deadline.m + "'" + deadline.s + "''. Or stop here and bank the secured relay.";
		self.document.getElementById("station-actions").style.display = "flex";
		self.document.querySelector("#step-5 #ctrl-help").innerHTML = "Choose the next contract move.";
	}, 950);
}

bkcore.hexgl.HexGL.prototype.continueStation = function()
{
	if(!this.stationPromptActive || !this.stationPromptReady || this.gameplay == null)
		return false;

	if(!this.gameplay.continueFromStation())
		return false;

	this.stationPromptActive = false;
	this.stationPromptReady = false;
	this.gameover.style.display = "none";
	this.active = true;
	this.containers.main.parentElement.style.display = "block";
	this.document.getElementById("station-actions").style.display = "none";
	this.document.querySelector("#step-5 #ctrl-help").innerHTML = "Click/Touch to continue.";
	return true;
}

bkcore.hexgl.HexGL.prototype.stopStation = function()
{
	if(!this.stationPromptActive || !this.stationPromptReady || this.gameplay == null)
		return false;

	if(!this.gameplay.stopAtStation())
		return false;

	this.stationPromptActive = false;
	this.stationPromptReady = false;
	this.gameover.style.display = "none";
	this.active = true;
	this.containers.main.parentElement.style.display = "block";
	this.document.getElementById("station-actions").style.display = "none";
	this.document.querySelector("#step-5 #ctrl-help").innerHTML = "Click/Touch to continue.";
	return true;
}

bkcore.hexgl.HexGL.prototype.saveGhostRun = function()
{
	if(typeof(Storage) === "undefined" || this.gameplay == null || this.gameplay.raceData == undefined)
		return false;

	try {
		var ghostRun = this.compactGhostRun(this.gameplay.raceData.export(), 900);
		if(ghostRun.length <= 12)
			return false;

		localStorage['pulse-rush-ghost'] = JSON.stringify({
			version: 2,
			savedAt: (new Date).getTime(),
			result: this.gameplay.result,
			level: this.gameplay.contract != undefined ? this.gameplay.contract.level : 1,
			data: ghostRun
		});
		return true;
	}
	catch(e) {
		console.warn("Unable to save ghost run.");
		try { localStorage.removeItem('pulse-rush-ghost'); }
		catch(storageError) {}
	}

	return false;
}

bkcore.hexgl.HexGL.prototype.displayScore = function(f, l)
{
	this.active = false;
	this.stationPromptActive = false;
	this.stationPromptReady = false;
	this.document.getElementById("station-actions").style.display = "none";

	var tf = bkcore.Timer.msToTimeString(f);
	var tl = [
		l[0] != undefined ? bkcore.Timer.msToTimeString(l[0]) : {},
		l[1] != undefined ? bkcore.Timer.msToTimeString(l[1]) : {},
		l[2] != undefined ? bkcore.Timer.msToTimeString(l[2]) : {}
	];

	if(this.gameover !== null)
	{
		this.saveGhostRun();

		var delivered = this.gameplay.contract != undefined ? this.gameplay.contract.delivered : 0;
		var total = this.gameplay.contract != undefined ? this.gameplay.contract.total : 3;
		var level = this.gameplay.contract != undefined ? this.gameplay.contract.level : 1;
		var maxLevel = this.gameplay.contract != undefined ? this.gameplay.contract.maxLevel : 3;
		var deadline = this.gameplay.contract != undefined ? this.gameplay.contract.deadline : 60000;
		var timedOut = this.gameplay.contract != undefined ? this.gameplay.contract.timedOut : false;
		var stoppedAtStation = this.gameplay.contract != undefined ? this.gameplay.contract.stoppedAtStation : false;
		var crashes = this.components.shipControls.crashCount || 0;
		var rank = "FAILED";
		var resultTitle = "Contract Failed";
		var nextTarget = "Stabilize the ship, protect the cargo, and try again.";
		var storyResult = "The pulse cores never reached the relays. The city grid overheated, the lower districts went dark, and the skyline cooked in its own power surge.";

		if(timedOut)
		{
			var deadlineTime = bkcore.Timer.msToTimeString(deadline);
			nextTarget = "Level " + level + " relay window closed. Clear the required laps and reach " + delivered + "/" + total + " cores before " + deadlineTime.m + "'" + deadlineTime.s + "''.";
			storyResult = "The delivery missed the Level " + level + " relay window. The city grid overloaded, fires climbed the skyline, and the lower districts went dark.";
		}

		if(stoppedAtStation)
		{
			resultTitle = "Run Banked";
			rank = "STATION SECURED";
			storyResult = "You locked the current relay and returned to the station with the ship intact. The city gained time, but the remaining relays are still waiting.";
			nextTarget = "Banked at Level " + level + "/" + maxLevel + ". Restart to push deeper into the relay chain.";
		}
		else if(this.gameplay.result == this.gameplay.results.FINISH)
		{
			resultTitle = "Contract Complete";
			if(f < 150000 && crashes <= 4)
			{
				rank = "S-RANK COURIER";
				storyResult = "Perfect delivery. All three relay levels locked before the blackout wave hit, and the city stayed alive.";
				nextTarget = "Elite clear. Next goal: beat 2'30'' with four crashes or fewer.";
			}
			else if(f < 170000 && crashes <= 8)
			{
				rank = "A-RANK RUNNER";
				storyResult = "All relay levels came online in time, but the grid took damage. Half the city flickered, then stabilized on emergency power.";
				nextTarget = "Clean delivery. Next goal: reach S-Rank under 2'30''.";
			}
			else
			{
				rank = "CONTRACT CLEARED";
				storyResult = "You saved the city, barely. The final relay came online seconds before the lower grid melted down.";
				nextTarget = "Next goal: reduce crashes and finish under 2'50''.";
			}
		}

		this.gameover.className = this.gameplay.result == this.gameplay.results.FINISH ? "result-success" : "result-failure";
		this.gameover.style.display = "block";
		this.document.querySelector("#step-5 #ctrl-help").innerHTML = "Click/Touch to continue.";
		this.document.getElementById("time").innerHTML = this.gameplay.result == this.gameplay.results.FINISH ? tf.m + "'" + tf.s + "''" + tf.ms : timedOut ? "Time Expired" : "Cargo Lost";
		this.document.getElementById("result-title").innerHTML = resultTitle;
		this.document.getElementById("contract-summary").innerHTML = storyResult + "<br>Level: " + level + "/" + maxLevel + " &middot; Lap: " + this.gameplay.contract.levelLap + "/" + this.gameplay.contract.levelLapTargets[level - 1] + " &middot; Pulse cores delivered: " + delivered + "/" + total + " &middot; Hull impacts: " + crashes;
		this.document.getElementById("rank-summary").innerHTML = rank + "<br>" + nextTarget;
		this.containers.main.parentElement.style.display = "none";
		return;
	}

	var t = this.track;
	var dc = this.document.getElementById("finish");
	var ds = this.document.getElementById("finish-state");
	var dh = this.document.getElementById("finish-hallmsg");
	var dr = this.document.getElementById("finish-msg");
	var dt = this.document.getElementById("finish-result");
	var dl1 = this.document.getElementById("finish-lap1");
	var dl2 = this.document.getElementById("finish-lap2");
	var dl3 = this.document.getElementById("finish-lap3");
	var dd = this.document.getElementById("finish-diff")
	var st = this.document.getElementById("finish-twitter");
	var sf = this.document.getElementById("finish-fb");
	var sl = this.document.getElementById("lowfps-msg");
	var d = this.difficulty == 0 ? 'casual' : 'hard';
	var ts = this.hud.timeSeparators;

	if(this.gameplay.result == this.gameplay.results.FINISH)
	{
		ds != undefined && (ds.innerHTML = "Finished!");
		// local record
		if(typeof(Storage)!=="undefined")
		{
			if(localStorage['score-'+t+'-'+d] == undefined || localStorage['score-'+t+'-'+d] > f)
			{
				dr != undefined && (dr.innerHTML = "New local record!");
				localStorage['score-'+t+'-'+d] = f;

				// Export race data
				localStorage['race-'+t+'-replay'] = JSON.Stringify(this.gameplay.raceData.export());
			}
			else
			{
				dr != undefined && (dr.innerHTML = "Well done!");
			}
		}
		// ladder record
		var p = bkcore.hexgl.Ladder.global[t][d][bkcore.hexgl.Ladder.global[t][d].length-2];
		if(p != undefined && p['score'] > f)
		{
			dh != undefined && (dh.innerHTML = "You made it to the HOF!");
		}
		else
		{
			dh != undefined && (dh.innerHTML = "Hall Of Fame");
		}

		dt != undefined && (dt.innerHTML = tf.m + ts[1] + tf.s + ts[2] + tf.ms);
		dl1 != undefined && (dl1.innerHTML = tl[0]["m"] != undefined ? tl[0].m + ts[1] + tl[0].s + ts[2] + tl[0].ms : "-");
		dl2 != undefined && (dl2.innerHTML = tl[1]["m"] != undefined ? tl[1].m + ts[1] + tl[1].s + ts[2] + tl[1].ms : "-");
		dl3 != undefined && (dl3.innerHTML = tl[2]["m"] != undefined ? tl[2].m + ts[1] + tl[2].s + ts[2] + tl[2].ms : "-");

		// Ladder save
		// Undisclosed
	}
	else
	{
		ds != undefined && (ds.innerHTML = "Destroyed!");
		dr != undefined && (dr.innerHTML = "Maybe next time!");
		dh != undefined && (dh.innerHTML = "Hall Of Fame");
		dt != undefined && (dt.innerHTML = "None");
		dl1 != undefined && (dl1.innerHTML = "None");
		dl2 != undefined && (dl2.innerHTML = "None");
		dl3 != undefined && (dl3.innerHTML = "None");
	}

	dd != undefined && (dd.innerHTML = d);
	st != undefined && (st.href='http://twitter.com/share?text='+encodeURIComponent('I just scored '+dt.innerHTML+' in '+'Cityscape ('+d+') on #HexGL! Come try it and beat my record on '));
	sf != undefined && (sf.href='http://www.facebook.com/sharer.php?s=100'
		+'&p[title]='+encodeURIComponent('I just scored '+dt.innerHTML+' in '+'Cityscape ('+d+') on HexGL!')
		+'&p[summary]='+encodeURIComponent('HexGL is a futuristic racing game built by Thibaut Despoulain (BKcore) using HTML5, Javascript and WebGL. Come challenge your friends on this fast-paced 3D game!')
		+'&p[url]='+encodeURIComponent('http://hexgl.bkcore.com')
		+'&p[images][0]='+encodeURIComponent('http://hexgl.bkcore.com/image.png'));

	bkcore.hexgl.Ladder.displayLadder('finish-ladder', t, d, 8);

	if(this.manager.get('game').objects.lowFPS >= 999)
		sl != undefined && (sl.innerHTML = 'Note: Your framerate was pretty low, you should try a lesser graphic setting!');
	else
		sl != undefined && (sl.innerHTML = '');

	dc.style.display = 'block';
}

bkcore.hexgl.HexGL.prototype.compactGhostRun = function(data, maxPoints)
{
	if(data == undefined || data.length == undefined)
		return [];

	maxPoints = maxPoints || 900;
	if(data.length <= maxPoints)
		return data.slice(0);

	var compact = [];
	var step = Math.max(1, Math.floor(data.length / maxPoints));
	for(var i = 0; i < data.length; i += step)
		compact.push(data[i]);

	var last = data[data.length - 1];
	if(compact.length == 0 || compact[compact.length - 1][0] != last[0])
		compact.push(last);

	return compact;
}

bkcore.hexgl.HexGL.prototype.initRenderer = function()
{
	var renderer = new THREE.WebGLRenderer({
		antialias: false,
		clearColor: 0x000000
	});

	// desktop + quality mid or high
	if(this.quality > 2)
	{
		renderer.physicallyBasedShading = true;
		renderer.gammaInput = true;
		renderer.gammaOutput = true;
		renderer.shadowMapEnabled = true;
		renderer.shadowMapSoft = true;
	}

	renderer.autoClear = false;
	renderer.sortObjects = false;
	renderer.setSize( this.width, this.height );
	renderer.domElement.style.position = "relative";

	this.containers.main.appendChild( renderer.domElement );
	this.canvas = renderer.domElement;
	this.renderer = renderer;
	this.manager = new bkcore.threejs.RenderManager(renderer);
}

bkcore.hexgl.HexGL.prototype.initHUD = function()
{
	if(!this.displayHUD) return;
	this.hud = new bkcore.hexgl.HUD({
		width: this.width,
		height: this.height,
		font: "BebasNeueRegular",
		bg: this.track.lib.get("images", "hud.bg"),
		speed: this.track.lib.get("images", "hud.speed"),
		shield: this.track.lib.get("images", "hud.shield")
	});
	this.containers.overlay.appendChild(this.hud.canvas);
}

bkcore.hexgl.HexGL.prototype.initGameComposer = function()
{
	var renderTargetParameters = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat, stencilBuffer: false };
	var renderTarget = new THREE.WebGLRenderTarget( this.width, this.height, renderTargetParameters );

	// GAME COMPOSER
	var renderSky = new THREE.RenderPass( this.manager.get("sky").scene, this.manager.get("sky").camera );

	var renderModel = new THREE.RenderPass( this.manager.get("game").scene, this.manager.get("game").camera );
	renderModel.clear = false;

	this.composers.game = new THREE.EffectComposer( this.renderer, renderTarget );

	var effectScreen = new THREE.ShaderPass( THREE.ShaderExtras[ "screen" ] );
	effectScreen.renderToScreen = true;
	var effectVignette = new THREE.ShaderPass( THREE.ShaderExtras[ "vignette" ] );

	var effectHex = new THREE.ShaderPass( bkcore.threejs.Shaders[ "hexvignette" ] );
	effectHex.uniforms[ 'size' ].value = 512.0 * (this.width/1633);
	effectHex.uniforms[ 'rx' ].value = this.width;
	effectHex.uniforms[ 'ry' ].value = this.height;
	effectHex.uniforms[ 'tHex' ].texture = this.track.lib.get("textures", "hex");
	effectHex.uniforms[ 'color' ].value = this.extras.vignetteColor;

	effectHex.renderToScreen = true;

	this.composers.game.addPass( renderSky );
	this.composers.game.addPass( renderModel );

	// if(this.quality > 0 && !this.mobile)
	// {
	// 	var effectFXAA = new THREE.ShaderPass( THREE.ShaderExtras[ "fxaa" ] );
	// 	effectFXAA.uniforms[ 'resolution' ].value.set( 1 / this.width, 1 / this.height );

	// 	this.composers.game.addPass( effectFXAA );

	// 	this.extras.fxaa = effectFXAA;
	
	// }
	
	// desktop + quality mid or high
	if(this.quality > 2)
	{
		var effectBloom = new THREE.BloomPass( 0.8, 25, 4 , 256);

		this.composers.game.addPass( effectBloom );

		this.extras.bloom = effectBloom;
	}

	// desktop + quality low, mid or high
	// OR
	// mobile + quality mid or high
	if(this.quality > 0)
		this.composers.game.addPass( effectHex );
	else
		this.composers.game.addPass( effectScreen );
}

bkcore.hexgl.HexGL.prototype.createMesh = function(parent, geometry, x, y, z, mat)
{
	geometry.computeTangents();

	var mesh = new THREE.Mesh( geometry, mat );
	mesh.position.set( x, y, z );
	parent.add(mesh);

	// desktop + quality mid or high
	if(this.quality > 2)
	{
		mesh.castShadow = true;
		mesh.receiveShadow = true;
	}

	return mesh;
}

bkcore.hexgl.HexGL.prototype.tweakShipControls = function()
{
	var c = this.components.shipControls;
	if(this.difficulty == 1)
	{
		c.airResist = 0.035;
		c.airDrift = 0.07;
		c.thrust = 0.035;
		c.airBrake = 0.04;
		c.maxSpeed = 9.6;
		c.boosterSpeed = c.maxSpeed * 0.35;
		c.overdriveSpeed = c.maxSpeed * 0.38;
		c.boosterDecay = 0.007;
		c.angularSpeed = 0.0140;
		c.airAngularSpeed = 0.0165;
		c.rollAngle = 0.6;
		c.shieldDamage = 0.03;
		c.collisionSpeedDecrease = 0.8;
		c.collisionSpeedDecreaseCoef = 0.5;
		c.rollLerp = 0.1;
		c.driftLerp = 0.4;
		c.angularLerp = 0.4;
	}
	else if(this.difficulty == 0)
	{
		c.airResist = 0.02;
		c.airDrift = 0.06;
		c.thrust = 0.02;
		c.airBrake = 0.025;
		c.maxSpeed = 7.0;
		c.boosterSpeed = c.maxSpeed * 0.5;
		c.overdriveSpeed = c.maxSpeed * 0.38;
		c.boosterDecay = 0.007;
		c.angularSpeed = 0.0125;
		c.airAngularSpeed = 0.0135;
		c.rollAngle = 0.6;
		c.shieldDamage = 0.06;
		c.collisionSpeedDecrease = 0.8;
		c.collisionSpeedDecreaseCoef = 0.5;
		c.rollLerp = 0.07;
		c.driftLerp = 0.3;
		c.angularLerp = 0.4;
	}

	if(this.godmode)
		c.shieldDamage = 0.0;
}
