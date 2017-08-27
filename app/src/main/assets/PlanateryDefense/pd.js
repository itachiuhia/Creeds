var floor = Math.floor;
var random = Math.random;
var sin = Math.sin;
var cos = Math.cos;
var atan2 = Math.atan2;
var atan = Math.atan;
var PI = Math.PI;
var sqrt = Math.sqrt;
var min = Math.min;
var max = Math.max;
var abs = Math.abs;
var round = Math.round;

// This is global to let the audio manager use it.
var useSounds = false;

var Game = new function()
{
	// Flags if we are running mobile mode
	var isMobile = !!navigator.userAgent.toLowerCase().match( /ipod|ipad|iphone|android/gi );
	
	var DEFAULT_WIDTH = 900,
		DEFAULT_HEIGHT = 590,
		BORDER_WIDTH = 6,
		PLANET_SIZE = 48,
		MOON_SIZE = 24,
		MOON2_SIZE = 14,
		EXPLOSION_FADE = 0.3,
		CLICK_QUEUE_LENGTH = 20,
		SATELLITE_SIZE = 5.5,
		TARGET_CURVE = 0.025;
		FRAMERATE = 60;
	
	// The world dimensions
	var world = {
		width: isMobile ? window.innerWidth : DEFAULT_WIDTH,
		height: isMobile ? window.innerHeight : DEFAULT_HEIGHT
	};
	
	var canvas,
		context;
	
	var canvasBackground,
		contextBackground;
	
	// UI DOM elements
	var status;
	var panels;
	var message;
	var title;
	var startButton;
	var soundButton;

	// Game elements
	var enemies = [];
	var particles = [];
	var projectiles = [];
	var explosions = [];
	var clickPoints = [];
	var clickHead = 0;
	var clickTail = 0;
	var gunHeat = 0;
	var overHeat = 0;
	var shieldTime = 0;
	var enemyProjectiles = [];
	var bombCount = 0;
	
	var planet;
	var moon;
	var moon2;
	var satellite;
	var level = 0;
	var showMoon = false;
	var showMoon2 = false;
	var orbitMoon = false;
	
	var shieldOut = false;

	// Mouse properties
	//var mouseX = (window.innerWidth + world.width) * 0.5;
	//var mouseY = (window.innerHeight + world.height) * 0.5;
	var mouseIsDown = false;
	var activateShield = false;
	var clicks = 0;
	var lastClick = new Date().getTime();

	var changingLevels = false;
	
	// Game properties and scoring
	var playing = false;
	var score = 0;
	var time = 0;
	var duration = 0;
	var difficulty = 1;
	var lastSpawn = 0;
	var nextEnemyProjectileTime = 0;
	var allAlpha = 1;
	var fade = 0;

	var timeScale = 1;
	
	// Performance (FPS) tracking
	var fps = 0;
	var timeLastSecond = new Date().getTime();
	var frames = 0;
	var lastTime = 0;
	
	this.init = function()
	{
		canvas = document.getElementById('world');
		canvasBackground = document.getElementById('background');
		panels = document.getElementById('panels');
		status = document.getElementById('status');
		message = document.getElementById('message');
		title = document.getElementById('title');
		startButton = document.getElementById('startButton');
		soundButton = document.getElementById('soundButton');
		
		if (canvas && canvas.getContext) 
		{
			context = canvas.getContext('2d');
			
			contextBackground = canvasBackground.getContext('2d');
			
			// Register event listeners
			document.addEventListener('mousemove', documentMouseMoveHandler, false);
			document.addEventListener('mousedown', documentMouseDownHandler, false);
			document.addEventListener('mouseup', documentMouseUpHandler, false);
			canvas.addEventListener('touchstart', documentTouchStartHandler, false);
			document.addEventListener('touchmove', documentTouchMoveHandler, false);
			document.addEventListener('touchend', documentTouchEndHandler, false);
			window.addEventListener('resize', windowResizeHandler, false);
			startButton.addEventListener('click', startButtonClickHandler, false);
			soundButton.addEventListener('click', soundButtonClickHandler, false);
			//soundButton.addEventListener('touchstart', soundTouchStartHandler, false);
			soundButton.addEventListener('mousedown', soundTouchStartHandler, false);
			
			document.addEventListener('keydown', documentKeyDownHandler, false);
			document.addEventListener('keyup', documentKeyUpHandler, false);
			canvas.onselectstart = function () { return false; }			
			document.onselectstart = function () { return false; }	
			
			
			// Check if a new cache is available on page load.
			window.addEventListener('load', function(e) {
			  window.applicationCache.addEventListener('updateready', function(e) 
			  {
				if (window.applicationCache.status == window.applicationCache.UPDATEREADY) 
				{
				  // Browser downloaded a new app cache.
				  // Swap it in and reload the page to get the new hotness.
				  window.applicationCache.swapCache();
				  if (confirm('A new version of this site is available. Load it?')) 
				  {
					var Body = document.getElementById( "body" );
					if( Body )
						Body.innerHTML = "reloading...";
					window.location.reload();
				  }
				} else 
				{
				  // Manifest didn't changed. Nothing new to server.
				}
			  }, false);

			}, false);					
			
			// Define our planet(s), moon(s), and satellite.
			planet = new Core( 0, 0 );
			moon = new Core( 0, 0 );
			moon2 = new Core( 0, 0 );
			satellite = new Satellite( 0, 0 );
			
			// Force an initial resize to make sure the UI is sized correctly
			windowResizeHandler();
			
			defaultStatus();
			
			enableSounds( getLocalStorageItem( 'pd_usesound' ) == "true" );
			
			animate();
		}
	};
	
	function getParam(name) 
	{
		name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
		var regexS = "[\\?&]" + name + "=([^&#]*)";
		var regex = new RegExp(regexS);
		var results = regex.exec( window.location.href );
		if (results == null)
			return "";
		else
			return results[1];
	}

	function renderBackground() {
		var gradient = contextBackground.createRadialGradient( world.width * 0.5, world.height * 0.5, 0, world.width * 0.5, world.height * 0.5, 500 );
		gradient.addColorStop( 0, 'rgba(0, 70, 70, 1)' );
		gradient.addColorStop( 1, 'rgba(0, 8, 14, 1)' );
		
		contextBackground.fillStyle = gradient;
		contextBackground.fillRect( 0, 0, world.width, world.height );
	}
	
	function enableSounds( bEnable )
	{
		if( !shootSound.supported || !explode1Sound.supported )
		{
			soundButton.style.visibility = "hidden";
			soundButton.style.display = "none";
			useSounds = false;
			return;
		}
	
		useSounds = bEnable;
		if( useSounds )
			soundButton.src = "/soundon.gif";
		else
			soundButton.src = "/soundoff.gif";
		soundButton.style.visibility = "visible";
	}
	
	function soundButtonClickHandler( event )
	{
		//event.bubbles = false;
		event.stopPropagation();
		event.preventDefault();
		enableSounds( !useSounds );
		setLocalStorageItem( 'pd_usesound', useSounds ? "true" : "false" );
			
		return false;
	}

	/**
	 * Handles click on the start button in the UI.
	 */
	function startButtonClickHandler(event)
	{
		if( playing == false ) 
		{
			playing = true;
			
			// Reset game properties
			enemies = [];
			projectiles = [];
			enemyProjectiles = [];
			explosions = [];
			nextEnemyProjectileTime = new Date().getTime() + 2000 + ( random() * 8000 );
			score = 0;
			difficulty = 1;
			var templevel = getParam( "level" );
			if( templevel >= 1 )
				level = templevel - 1; // Users say one when we mean zero.
			else
				level = 0;
			changingLevels = false;
			allAlpha = 0;
			fade = 0.005;
			bombCount = 0;
			
			// Reset the planet and moon data
			planet.energy = 1;
			moon.energy = 1;
			moon2.energy = 1;
			
			// Hide the game UI
			panels.style.display = 'none';
			
			time = new Date().getTime();
			
			planet.create( 2 );
			moon.create( 3 );
			moon2.create( 4 );

			OnLevelChange();
			
		}
		return false;
	}
	
	function defaultStatus()
	{
		status.innerHTML = "<span><b>Planetary Defense</b></span> <i>by Geeky Toby</a></i>";
	}
	
	/**
	 * Stops the currently ongoing game and shows the
	 * resulting data in the UI.
	 */
	function gameOver() 
	{
		playing = false;
		
		// Determine the duration of the game
		duration = new Date().getTime() - time;
		
		// Show the UI
		//panels.style.display = 'block';
		
		// Ensure that the score is an integer
		score = max( round( score ), 0 );
		
		// Write the users score to the UI
		title.innerHTML = 'K O:' + score;
		
		// Update the status bar with the final score and time
		scoreText = 'Score: <span>' + round( score ) + '</span>';
		scoreText += ' Time: <span>' + round( ( ( new Date().getTime() - time ) / 1000 ) * 100 ) / 100 + 's</span>';
		status.innerHTML = scoreText;
		
		defaultStatus();
	}
	
	function documentKeyDownHandler(event) 
	{
		switch( event.keyCode ) 
		{
			case 32:
				activateShield = true;
				event.preventDefault();
				break;
		}
	}
	function documentKeyUpHandler(event) 
	{
		switch( event.keyCode ) {
			case 32:
				event.preventDefault();
				break;
		}
	}
	
	/**
	 * Event handler for document.onmousemove.
	 */
	function documentMouseMoveHandler(event)
	{
		var mouseX = event.clientX - (window.innerWidth - world.width) * 0.5;
		var mouseY = event.clientY - (window.innerHeight - world.height) * 0.5;
	}

	function fire( x, y )
	{
		if( !playing )
			return;

		clickPoints[clickHead] = new Point( x, y );

		if( overHeat <= 0 )
		{
			shootSound.play();

			gunHeat += .30 * timeScale;
			if( gunHeat >= 1.0 )
			{
				overHeat = 1.0;
				gunHeat = 0;
			}

			++clickHead;
			if( clickHead >= CLICK_QUEUE_LENGTH )
				clickHead = 0;
			if( clickHead == clickTail )
			{
				++clickTail;
				if( clickTail >= CLICK_QUEUE_LENGTH )
					clickTail = 0;
			}
		}
	}
	
	/**
	 * Event handler for document.onmousedown.
	 */
	function documentMouseDownHandler(event)
	{
		mouseIsDown = true;
		var mouseX = event.clientX - (window.innerWidth - world.width) * 0.5;
		var mouseY = event.clientY - (window.innerHeight - world.height) * 0.5;
		
		fire( mouseX, mouseY );
	}
	
	/**
	 * Event handler for document.onmouseup.
	 */
	function documentMouseUpHandler(event) {
		mouseIsDown = false;
		return false;
	}
	
	function soundTouchStartHandler(event) 
	{
		event.stopPropagation();
		event.preventDefault();
	}

	/**
	 * Event handler for document.ontouchstart.
	 */
	function documentTouchStartHandler(event) 
	{
		if(event.touches.length == 1)
		{
			event.preventDefault();
			
			var mouseX = event.touches[0].pageX - (window.innerWidth - world.width) * 0.5;
			var mouseY = event.touches[0].pageY - (window.innerHeight - world.height) * 0.5;
			
			mouseIsDown = true;

			fire( mouseX, mouseY );
		}
		else if(event.touches.length == 2)
		{
			event.preventDefault();
			activateShield = true;
		}
	}
	
	/**
	 * Event handler for document.ontouchmove.
	 */
	function documentTouchMoveHandler(event) {
		if(event.touches.length == 1) {
			event.preventDefault();

			var mouseX = event.touches[0].pageX - (window.innerWidth - world.width) * 0.5 - 60;
			var mouseY = event.touches[0].pageY - (window.innerHeight - world.height) * 0.5 - 30;
		}
	}
	
	/**
	 * Event handler for document.ontouchend.
	 */
	function documentTouchEndHandler(event) {
		mouseIsDown = false;
	}
	
	/**
	 * Event handler for window.onresize.
	 */
	function windowResizeHandler() 
	{
		// Update the game size

		world.width = isMobile ? window.innerWidth : DEFAULT_WIDTH;
		world.height = isMobile ? window.innerHeight : DEFAULT_HEIGHT;
		
		// Center the planet
		planet.x = world.width * 0.5;
		planet.y = world.height * 0.5;
		
		// Resize the canvas. The canvas wdith and height attributes specify the coordinate space.
		// The css style wil use the same valueunless specified with style.width and style.height
		// separately. At least that what I think it is supposed to do.
		canvas.width = world.width;
		canvas.height = world.height;
		canvasBackground.width = world.width;
		canvasBackground.height = world.height;
		
		// Determine the x/y position of the canvas
		var cvx = floor( ( window.innerWidth - world.width ) * 0.5 );
		var cvy = floor( ( window.innerHeight - world.height ) * 0.5 );

		// Adjust for the border.
		cvx -= BORDER_WIDTH;
		cvy -= BORDER_WIDTH;
		
		// Position the canvas
		canvas.style.position = 'absolute';
		canvas.style.left = cvx + 'px';
		canvas.style.top = cvy + 'px';
		canvasBackground.style.position = 'absolute';
		canvasBackground.style.left = cvx + BORDER_WIDTH + 'px';
		canvasBackground.style.top = cvy + BORDER_WIDTH + 'px';
		
		var PanelOffsetX = -panels.offsetWidth / 2;
		var PanelOffsetY = -panels.offsetHeight / 2;

		if( isMobile ) 
		{
			canvas.style.border = 'none';
			status.style.left = '0px';
			status.style.top = '0px';
			status.style.width = world.width - 6 + "px"; /* Subtract the padding specified by the CSS :( */
			panels.style.left = floor( cvx + ( world.width / 2 ) + PanelOffsetX ) + 'px';
			panels.style.top = floor( cvy + ( world.height / 2 ) + PanelOffsetY ) + 'px';

			soundButton.style.left = cvx + world.width - 32 - 6 + "px"; // 26 pixel wide icon plus 6 pixels of offset.
			soundButton.style.top = cvy + 24 + 6 + "px"; // status height plus 6 pixels of offset.
		}
		else 
		{
			status.style.left = cvx + BORDER_WIDTH + 'px';
			status.style.top = cvy + BORDER_WIDTH + 'px';
			status.style.width = world.width - 6 + "px"; /* Subtract the padding specified by the CSS :( */
			panels.style.left = floor( cvx + BORDER_WIDTH + ( world.width / 2 ) + PanelOffsetX ) + 'px';
			panels.style.top = floor( cvy + BORDER_WIDTH + ( world.height / 2 ) + PanelOffsetY ) + 'px';

			soundButton.style.left = cvx + BORDER_WIDTH + world.width - 32 - 6 + "px"; // 26 pixel wide icon plus 6 pixels of offset.
			soundButton.style.top = cvy + BORDER_WIDTH + 24 + 6 + "px"; // status height plus 6 pixels of offset.
		}
		

		renderBackground();
	}
	
	/**
	 * Emits a random number of particles from a set point.
	 * 
	 * @param position The point where particles will be 
	 * emitted from
	 * @param spread The pixel spread of the emittal
	 */
	function emitParticles( position, direction, spread, count, size, explosion_here, speedAdjust ) 
	{
		var q = count + ( random() * ( count / 8 ) );
		
		while( --q >= 0 ) 
		{
			var p = new Point();
			p.x = position.x + ( sin(q) * spread );
			p.y = position.y + ( cos(q) * spread );
			var speed;
			if( explosion_here )
				speed = 0.4 + random() * 0.4;
			else
				speed = 0.2 + random() * 0.6;
			speed *= speedAdjust;
			var angle = random() * PI * 2;
			p.velocity = { x: direction.x + cos( angle ) * speed, y: direction.y + sin( angle ) * speed };
			p.alpha = size;
			
			particles.push( p );
		}
		if( explosion_here )
		{
			var e = new Explosion();
			e.life = size;
			e.alpha = size;
			e.x = position.x;
			e.y = position.y;
			e.speed = 0.7 * speedAdjust;
			explosions.push( e );
		}
	}

	function explode( position, whichsound )
	{
		if( whichsound == 0 )
			explode1Sound.play();
		else
			explode2Sound.play();
		emitParticles( position, { x: 0, y: 0 }, 1, 25, 13, 1, .7 );
	}
		
	function msleep(milliseconds) 
	{
		var start = new Date().getTime();
		for (var i = 0; i < 1e7; i++) 
		{
			if ((new Date().getTime() - start) > milliseconds)
			{
				break;
			}
		}
	}
	
	this.normalizeAngle = function( angle )
	{
		while( angle < 0 )
			angle += PI * 2;
		while( angle > PI * 2 )
			angle -= PI * 2;

		return angle;
	}

	this.normalizeRelativeAngle = function( angle )
	{
		while( angle < -PI )
			angle += PI * 2;
		while( angle > PI )
			angle -= PI * 2;

		return angle;
	}

	function withinAngle( leftAngle, rightAngle, testAngle )
	{
		// All angles should be normalized before calling this function.
		if( rightAngle == leftAngle )
			return testAngle == leftAngle ? true : false;

		if( rightAngle > leftAngle )
			return ( testAngle >= leftAngle && testAngle <= rightAngle ) ? true : false;
		else
			return ( testAngle >= leftAngle || testAngle <= rightAngle ) ? true : false;

		return false;
	}
	
	function adjustObstructionAngles( projectile, obstruction, obstructionAngles, satelliteDistance, newAngle, extraSpace )
	{
		var minAngle = 0.0;
		var maxAngle = 0.0;
		
		// Get the tangent distances for checking the distances.
		var opposite = obstruction.energyRadius + 12;
		var hypotenuse = p.distanceTo( obstruction );
		
		var coreAngle = Game.normalizeAngle( atan2( obstruction.y - p.y, obstruction.x - p.x ) );
		// get the angle to the center of the obstruction.
		coreAngle = Game.normalizeRelativeAngle( coreAngle - newAngle );

		if( hypotenuse < opposite )
		{
			// Closer than our avoidance radius. Turn away no matter what!
			if( coreAngle < 0 )
			{
				obstructionAngles.min = -PI;
				obstructionAngles.max = PI / 2;
			}
			else
			{
				obstructionAngles.min = -PI / 2;
				obstructionAngles.max = PI;
			}
			return obstructionAngles;
		}
		
		var distanceToTangent = sqrt(  hypotenuse * hypotenuse - opposite * opposite );
		
		// If the distance to the obstruction is small then don't bother 
		// to avoid it. We can turn sharp enough to nbot have a problem with it.
		if( hypotenuse > 100 + max( 50, obstruction.energyRadius ) )
			return obstructionAngles;
			
		// If we are too close then give up on avoiding this and hope for the best.
		//if( hypotenuse < opposite )
		//	return obstructionAngles;

		// If the satellite is closer than the tangents then there is no obstruction.
		if( satelliteDistance < distanceToTangent )
			return obstructionAngles;
		
		// Get an angle for the tangent of the obstruction relative to an angle of 0.
		var sideAngle = atan( opposite / distanceToTangent );		

		var limitLeftAngle = coreAngle - sideAngle;
		var limitRightAngle = coreAngle + sideAngle;
		
		// If the newAngle is within the left-right bounds of the obstruction then
		// include these as part of the overall obstruction angles. If not then
		// this is not an obstruction. This is a test that includes negative angles
		// because the angles are relative to the newAngle of the projectile.
		if( limitLeftAngle > 0 || limitRightAngle < 0 )
			return obstructionAngles;

		if( limitLeftAngle < obstructionAngles.min )
			obstructionAngles.min = limitLeftAngle;
		if( limitRightAngle > obstructionAngles.max )
			obstructionAngles.max = limitRightAngle;
			
		//context.strokeStyle = makeRGBA( 255, 200, 50, 0.5 );
		//context.beginPath();
		//context.arc( obstruction.x, obstruction.y, 9, 0, PI*2, true );
		//context.lineWidth = 1.5;
		//context.fill();
		//context.stroke();
			
		return obstructionAngles;
	}

	function pickBestDirection( p )
	{
	}
	
	function pickBestDirection( p )
	{
		if( !playing )
			return p.angle;

		// Find current angle to satellite.
		var angle = Game.normalizeAngle( atan2( satellite.y - p.y, satellite.x - p.x ) );
		
		var satelliteDistance = p.distanceTo( satellite );

		var ClosenessAdjustment = max( 0, ( 12 - satelliteDistance ) / 300 );
		var targetCurve = TARGET_CURVE + ClosenessAdjustment;

		// Get new angle towards satellite relative to the current direction.
		var difference = angle - p.angle;
		if( difference < -PI )
			difference += PI * 2;
		if( difference > PI )
			difference -= PI * 2;
		difference = min( max( difference, -targetCurve * timeScale ), targetCurve * timeScale );

		// Get the new angle but it is relative to the old angle (can be negative).
		var newAngle = Game.normalizeAngle( p.angle + difference );
		
		// newAngle is the direction we want to go.
		
		// Check to see if we are just way too close to one of the possible obstructions.
		//var avoidanceAngle = getAvoidanceAngle( planet, newAngle );
		
		// All angles are now relative to the desired direction of travel.
		var obstructionAngles = { min:0, max:0 };
		obstructionAngles = adjustObstructionAngles( p, planet, obstructionAngles, satelliteDistance, newAngle, 0 );
		if( showMoon )
			obstructionAngles = adjustObstructionAngles( p, moon, obstructionAngles, satelliteDistance, newAngle, 0 );
		if( showMoon2 )
			obstructionAngles = adjustObstructionAngles( p, moon2, obstructionAngles, satelliteDistance, newAngle, 0 );
		
		//context.strokeStyle = makeRGBA( 255, 0, 50, 0.5 );
		//context.beginPath();
		//context.moveTo( p.x, p.y );
		//context.lineTo( p.x + cos( newAngle ) * 200, p.y+ sin( newAngle ) * 200 );
		//context.lineWidth = 1.5;
		//context.stroke();

		if( obstructionAngles.min != obstructionAngles.max )
		{
			// Avoid the obstruction and limit turns relative to the original path,
			// not relative to the desired path.
			//obstructionAngles.min += difference;
			//obstructionAngles.max += difference;
			
			if( obstructionAngles.min <= 0 && obstructionAngles.max >= 0 )
			{
			
				//context.strokeStyle = makeRGBA( 255, 200, 50, 0.5 );
				//context.beginPath();
				//context.moveTo( p.x, p.y );
				//context.lineTo( p.x + cos( p.angle + obstructionAngles.min ) * 200, p.y+ sin( p.angle + obstructionAngles.min ) * 200 );
				//context.moveTo( p.x, p.y );
				//context.lineTo( p.x + cos( p.angle + obstructionAngles.max ) * 200, p.y+ sin( p.angle + obstructionAngles.max ) * 200 );
				//context.lineWidth = 1.5;
				//context.stroke();
			
				var temp = 0;
			
				if( -obstructionAngles.min > obstructionAngles.max )
					temp = obstructionAngles.max;
				else
					temp = obstructionAngles.min;
					
				difference = min( max( difference + temp, -targetCurve * timeScale ), targetCurve * timeScale );

				newAngle = Game.normalizeAngle( p.angle + difference );
			}
			else
				newAngle = p.angle;
		}
		
		return newAngle;
	}
	
	function checkLevelChange( enemyCount, enemyProjectileCount, particles, explosions )
	{
		if( enemyCount == 0 && enemyProjectileCount == 0 && particles == 0 && explosions == 0 )
		{
			if( allAlpha >= 1 )
			{
				fade = -0.005;
				allAlpha = 1 - fade;
			}
			else if( allAlpha <= 0 )
			{
				++level;
				OnLevelChange();
			}
		}
	}
	
	function OnLevelChange()
	{
		changingLevels = false;
		
		bombCount = 0;
		difficulty = 1;

		if( level >= 1 )
		{
			// Reset these for all but level 0 and 1.
			planet.energy = 1;
			moon.energy = 1;
			planet.create( 2 );
			moon.create( 3 );
			moon2.create( 4 );
		}
		
		if( level == 0 )
		{
			showMoon = false;
			showMoon2 = false;
			orbitMoon = false;
		}
		else if( level == 1 )
		{
			showMoon = true;
			showMoon2 = true;
			orbitMoon = false;
		}
		else if( level == 2 )
		{
			showMoon = true;
			showMoon2 = false;
			orbitMoon = true;
		}
		else if( level == 3 )
		{
			showMoon = true;
			showMoon2 = true;
			orbitMoon = true;
		}
	}

	/**
	 * Called on every frame to update the game properties
	 * and render the current state to the canvas.
	 */
	function animate() 
	{
		// Fetch the current time for this frame
		var frameTime = new Date().getTime();
		var elapsedTime = frameTime - lastTime;
		lastTime = frameTime;		
		// Increase the frame count
		frames++;

		// Get a scale factor that can be used to scale all movement.
		// First calc 60FPS in milliseconds, get the floor, then devide the actual time by that.
		timeScale = elapsedTime / ( floor( 1000 / 60 ) );
		
		// if the timeScale is way off then assume that we are debugging and make it 1.
		// 1/2 second is the threshold since I can't stop at breakpoints and then proceed
		// any quicker than that.
		if( elapsedTime > 150 )
			timeScale = 1;

		allAlpha = min( 1, allAlpha + fade * timeScale );
		// If it went all the way down, stat it fading back up again.
		if( allAlpha <= 0 )
		{
			fade = 0.005;
			allAlpha = 0;
		}
		
		// Check if a second has passed since the last time we updated the FPS
		if( frameTime > timeLastSecond + 1000 )
		{
			// Establish the current, minimum and maximum FPS
			fps = min( round( ( frames * 1000 ) / ( frameTime - timeLastSecond ) ), FRAMERATE );
			timeLastSecond = frameTime;
			frames = 0;
		}
		
		// Clear the canvas of all old pixel data
		context.clearRect( 0, 0, canvas.width, canvas.height );
		
		// The user interfae will be displayed when the last particle is gone and the game is over.
		// nothing else is checked because particles will be the last thing seen on the screen.
		var ShowUI = !playing && particles.length > 0;

		// Only update game properties and draw the planet if a game is active.
		if( playing ) 
		{
			// Increment the difficulty slightly
			difficulty += 0.0003;
			
			// Increment the score depending on difficulty and on the level.
			score += ( ( 0.17 * difficulty ) + ( level * 0.17 ) ) * timeScale;
			
			planet.updateSize( PLANET_SIZE );
			
			moon.updateSize( MOON_SIZE );
			moon.updateAngle ( -0.01 * timeScale * 0.4 )
			moon.updateOrbitPosition( planet, PLANET_SIZE + 60 );
			
			moon2.updateSize( MOON2_SIZE );
			moon2.updateAngle ( -0.002 * timeScale * 0.4 )
			moon2.updateOrbitPosition( planet, PLANET_SIZE + 125 );

			//satellite.updateAngle( 0.007 + ( 0.003 * timeScale * min( planet.energy, moon.energy ) ) );
			// The old style slowed the satellite down but speeding it up seems more interesting and
			// just as difficult.
			satellite.updateAngle( 0.005 + ( 0.005 * timeScale / ( level == 2 ? moon.energy : planet.energy ) ) );
			if( orbitMoon )
				satellite.updateOrbitPosition( moon, moon.energyRadius + 15 );
			else
				satellite.updateOrbitPosition( planet, planet.energyRadius + 15 );

			// Check for the shield being active and not overheated.
			if( shieldOut )
			{
				activateShield = false;
				// Stick the gun heat values at their maximum while the shield is out.
				// The gun will stay overheated for a while after the shield is gone.
				gunHeat = 1.0;
				overHeat = 2.5;
				shieldTime += 0.021 * timeScale;
				if( shieldTime >= 1 )
					shieldOut = false;
			}
			else if( activateShield )
			{
				activateShield = false;
				if( overHeat <= 0 )
				{
					shieldSound.play();
					shieldOut = true;
					shieldTime = 0;
				}
			}
		}
		
		var enemyCount = 0;
		var enemyProjectileCount = 0;
		var explosioncount = 0;
		
		// Go through each enemy updating and drawing.
		for( i = 0; i < enemies.length; i++ ) 
		{
			p = enemies[i];
			p.x += p.velocity.x * timeScale;
			p.y += p.velocity.y * timeScale;
			
			// Fade in the enemy.
			p.alpha = min( p.alpha + 0.008 * timeScale, 1 );
			
			context.fillStyle = makeRGBA( 180, 50, 50, min( allAlpha, p.alpha ) );
			context.strokeStyle = makeRGBA( 255, 90, 90, min( allAlpha, p.alpha ) );
			
			context.beginPath();
			context.arc( p.x, p.y, p.size, 0, PI*2, true );
			context.lineWidth = 1.5;
			context.fill();
			context.stroke();
			
			// Do collision detection when playing.
			if( playing )
			{
				if( detectCollisions( p, true, true, false, true, 1 ) )
					p.dead = true;
			}
			
			// If the enemy is outside of the game bounds, destroy it without an explosion.
			// Enemies can only be outside when the game is not playing and the planet is not visible.
			if( p.x < -p.size || p.x > world.width + p.size || p.y < -p.size || p.y > world.height + p.size ) 
			{
				p.dead = true;
			}

			// If the enemy is dead, remove it.
			if( p.dead ) 
			{
				enemies.splice( i, 1 );
				i--;
			}
			else
				enemyCount++;
		}

		// Go through each projectile updating and drawing.
		for( i = 0; i < projectiles.length; i++ ) 
		{
			p = projectiles[i];
			p.x += p.velocity.x * timeScale;
			p.y += p.velocity.y * timeScale;
			
			context.fillStyle = makeRGBA( 170, 170, 170, allAlpha );
			context.beginPath();
			context.arc( p.x, p.y, p.size, 0, PI*2, true );
			context.fill();
			
			var distance = p.distanceTo( p.destination );
			if( distance < 1.5 || distance > p.lastDistance )
			{
				explode( p.destination, 0 );
				p.dead = true;
			}
			else if( detectCollisions( p, true, false, false, false, 0 ) )
				p.dead = true;
			
			p.lastDistance = distance;

			// If the projectile is dead, remove it.
			if( p.dead ) 
			{
				projectiles.splice( i, 1 );
				i--;
			}
		}
		
		// Go through each explosion and adjust the size.
		for( i = 0; i < explosions.length; i++ ) 
		{
			e = explosions[i];

			// Explosions are expected to match the size and movement of a group of
			// particles but that is not enforced.
			if( e.life < .1 )
			{
				e.life -= EXPLOSION_FADE / 4;
				e.size += e.speed / 4;
			}
			else
			{
				e.life -= EXPLOSION_FADE;
				e.size += e.speed;
			}
			
			e.alpha = max( e.alpha - EXPLOSION_FADE, 0 );

			context.beginPath();
			var useAlpha = min( allAlpha, min( e.alpha / 50, 0.05 ) );
			context.fillStyle = makeRGBA( 255, 255, 255, useAlpha );
			context.arc( e.x, e.y, e.size, 0, PI*2, true );
			context.fill();
			
			// If the explosion is dead, remove it
			if( e.life <= 0 ) 
			{
				explosions.splice( i, 1 );
				i--;
			}
		}

		// Go through and draw all particle effects
		for( i = 0; i < particles.length; i++ ) 
		{
			p = particles[i];
			p.x += p.velocity.x * timeScale;
			p.y += p.velocity.y * timeScale;
			
			// Fade out
			p.alpha = max( p.alpha - EXPLOSION_FADE, 0 );
			
			// Draw the particle
			context.fillStyle = makeRGBA( 255, 210, 210, min( ( p.alpha / 8 ), allAlpha ) );
			context.fillRect( p.x, p.y, 1, 1 );
			
			// If the particle is faded out to zero, remove it.
			if( p.alpha <= 0 ) 
				particles.splice( i, 1 );
			else
			{
				// At least one particle is stil visible so don't show the user interface.
				ShowUI = false;
			}
		}

		// Go through each incoming projectile updating and drawing.
		for( i = 0; i < enemyProjectiles.length; i++ ) 
		{
			p = enemyProjectiles[i];
			
			p.angle = pickBestDirection( p );
			
			var velocity = { x: 0, y: 0 };
			velocity.x = cos( p.angle ) * p.speed;
			velocity.y = sin( p.angle ) * p.speed;
			
			p.x += velocity.x * timeScale;
			p.y += velocity.y * timeScale;
			
			context.fillStyle = makeRGBA( 176, 174, 0, allAlpha );
			context.beginPath();
			context.arc( p.x, p.y, p.size, 0, PI*2, true );
			context.fill();
			
			if( detectCollisions( p, true, true, true, true, 0 ) )
				p.dead = true;
					
			p.lastDistance = distance;

			// If the projectile is dead, remove it.
			if( p.dead ) 
			{
				nextEnemyProjectileTime = new Date().getTime() + 2000 + ( random() * 8000 );
				enemyProjectiles.splice( i, 1 );
				i--;
			}
			else
				++enemyProjectileCount;
		}

		// The satellite and moon are all invisible when the game is not playing.
		if( playing )
		{
			if( showMoon )
				moon.draw( shieldOut, context, allAlpha );
				
			if( showMoon2 )
				moon2.draw( shieldOut, context, allAlpha );
			
			planet.draw( shieldOut, context, allAlpha );

			context.beginPath();
			var gunadjust = min( max( 1.0 - gunHeat, 0 ), 1 );
			if( overHeat > 0 )
				gunadjust = 0;
			else
				gunadjust *= 180; // Maximum brightness based on the gun heat.
			context.fillStyle = makeRGBA( floor( gunadjust ), floor( gunadjust ), floor( gunadjust ), allAlpha );
			context.strokeStyle = makeRGBA( 238, 238, 238, allAlpha );
			context.lineWidth = 1.5;
			context.arc( satellite.x, satellite.y, SATELLITE_SIZE, 0, PI*2, true );
			context.fill();
			context.stroke();

			if( overHeat > 0 )
				overHeat -= 0.01 * timeScale;
			if( gunHeat > 0 )
				gunHeat -= 0.01 * timeScale;
			
			if( clickHead != clickTail )
			{
				var SinceLastLick = frameTime - lastClick;
				if( SinceLastLick > 200 )
				{
					ShootAt( { x: clickPoints[clickTail].x, y: clickPoints[clickTail].y } );
					lastClick = frameTime;
					++clickTail;
					if( clickTail >= CLICK_QUEUE_LENGTH )
						clickTail = 0;
				}
			}

			scoreText = '<span><b>Planetary Defense</b></span>&nbsp;&nbsp;&nbsp;Score: <span>' + max( round( score ), 0 ) + '</span>';
			var temp = new Date().getTime() - time;
			scoreText += '&nbsp;&nbsp;Time: <span>' + floor( ( new Date().getTime() - time ) / 1000 ) + 's</span>';
			//scoreText += ' <p class="fps">FPS: <span>' + round( fps ) + ' ('+round(max(min(fps/FRAMERATE, FRAMERATE), 0)*100)+'%)</span></p>';
			scoreText += ' <p class="fps">FPS: <span>'+round(max(min(fps/FRAMERATE, FRAMERATE), 0)*100)+'%</span></p>';

			status.innerHTML = scoreText;
			
			if( planet.energyRadius <= 3 || ( level >= 2 && moon.energyRadius <= 3 ) ) // reasonable size as a minimum. Zero is too small.
			{
			
				explode1Sound.play();
				explode2Sound.play();
			
				setTimeout( 'explode1Sound.play();', 100 );			
				setTimeout( 'explode2Sound.play();', 150 );			
				
				setTimeout( 'explode2Sound.play();', 300 );			
				setTimeout( 'explode1Sound.play();', 380 );			

				emitParticles( planet, { x: 0, y: 0 }, 10, 40, 15, 0, 1 );
				emitParticles( planet, { x: 0, y: 0 }, 2, 6, 25, 0, 1 );

				if( level == 2 )
					emitParticles( moon2, { x: 0, y: 0 }, 5, 30, 10, 0, 1 );
					
				if( level >= 2 )
					emitParticles( moon, { x: 0, y: 0 }, 5, 30, 10, 0, 1 );

				emitParticles( satellite, { x: 0, y: 0 }, 3, 20, 10, 0, 1 );
				emitParticles( satellite, { x: 0, y: 0 }, 3, 20, 10, 0, 1 );
				
				gameOver();
			}
		}

		if( changingLevels )
			checkLevelChange( enemyCount, enemyProjectileCount, particles.length, explosions );
		else
		{
			// If there are less enemies than intended for this difficulty, add another one.
			if( enemyCount < 1 * difficulty && new Date().getTime() - lastSpawn > 200 && allAlpha >= 1 ) 
				createEnemy();

			if( playing )
			{
				if( bombCount > 50 && enemyProjectileCount < 1 && new Date().getTime() > nextEnemyProjectileTime && allAlpha >= 1 ) 
					createEnemyProjectile();

				// Check for level changes.
				if( bombCount > 80 )
					changingLevels = true;
			}
		}

		if( ShowUI )
			panels.style.display = 'block';
		
		requestAnimFrame( animate );
	}
	
	function detectCollisions( object, checkCores, checkShield, checkSatellite, checkExplosions, whichSound )
	{
		if( checkShield && shieldOut )
		{
			if( object.distanceTo( planet ) < planet.shieldRadius + object.size ) 
			{
				explode( object, whichSound );
				return true;
			}
			else if ( showMoon && object.distanceTo( moon ) < moon.shieldRadius + object.size ) 
			{
				explode( object, whichSound )
				return true;
			}
			else if ( showMoon2 && object.distanceTo( moon2 ) < moon2.shieldRadius + object.size ) 
			{
				explode( object, whichSound )
				return true;
			}
		}

		if( checkCores )
		{
			if( object.distanceTo( planet ) < planet.energyRadius + object.size ) 
			{
				explode( object, whichSound );
				planet.energy -= 0.06;
				planet.energy = max( min( planet.energy, 1 ), 0.000001 );
				planet.hitCore( object );
				return true;
			}
			else if ( showMoon && object.distanceTo( moon ) < moon.energyRadius + object.size ) 
			{
				explode( object, whichSound )
				moon.energy -= 0.06;
				moon.hitCore( object );
				moon.energy = max( min( moon.energy, 1 ), 0.000001 );
				return true;
			}
			else if ( showMoon2 && object.distanceTo( moon2 ) < moon2.energyRadius + object.size ) 
			{
				explode( object, whichSound )
				moon2.energy -= 0.06;
				moon2.hitCore( object );
				moon2.energy = max( min( moon2.energy, 1 ), 0.000001 );
				return true;
			}
		}
		
		if( checkSatellite )
		{
			if( object.distanceTo( satellite ) < SATELLITE_SIZE )
			{
				explode( object, whichSound );
				overHeat = 2.5;
				return true;
			}
		}
		
		if( checkExplosions )
		{
			for( counter = 0; counter < explosions.length; counter++ ) 
			{
				e = explosions[counter];

				if( e.distanceTo( object ) <= e.size + 2 )
				{
					explode( object, whichSound );
					return true;
				}
			}
		}
	}
	
	// Shoot a projectile at the specified location.
	function ShootAt( eventposition )
	{
		var projectile = new Projectile();

		projectile.x = satellite.x;
		projectile.y = satellite.y;
		projectile.destination.x = eventposition.x;
		projectile.destination.y = eventposition.y;
		
		projectile.speed = 1.5;

		var angle = atan2( eventposition.y - satellite.y, eventposition.x - satellite.x );
		projectile.velocity.x = cos( angle ) * projectile.speed;
		projectile.velocity.y = sin( angle ) * projectile.speed;

		score -= 3;
		
		projectiles.push( projectile );
	}
	
	function createEnemyProjectile()
	{
		var enemy = new EnemyProjectile();
		var side = round( random() * 3 );
		
		switch( side )
		{
			case 0:
				enemy.x = 3;
				enemy.y = world.height * random();
				break;
			case 1:
				enemy.x = world.width * random();
				enemy.y = 3;
				break;
			case 2:
				enemy.x = world.width - 3;
				enemy.y = world.height * random();
				break;
			case 3:
				enemy.x = world.width * random();
				enemy.y = world.height - 3;
				break;
		}

		enemy.speed = 1.2;

		enemy.angle = atan2( satellite.y - enemy.y, satellite.x - enemy.x );
		if( enemy.angle < 0 )
			enemy.angle += PI * 2;
		else if( enemy.angle >= PI * 2 )
			enemy.angle -= PI * 2;
		
		enemy.alpha = 0;
		
		enemyProjectiles.push( enemy );
	}

	// Create an enemy.
	function createEnemy() 
	{
		var enemy = new Enemy();
		var side = round( random() * 3 );
		
		switch( side )
		{
			case 0:
				enemy.x = 3;
				enemy.y = world.height * random();
				break;
			case 1:
				enemy.x = world.width * random();
				enemy.y = 3;
				break;
			case 2:
				enemy.x = world.width - 3;
				enemy.y = world.height * random();
				break;
			case 3:
				enemy.x = world.width * random();
				enemy.y = world.height - 3;
				break;
		}
		
		enemy.speed = 0.2 + ( random() * 0.2 );
		enemy.speed += ( difficulty - 1 ) * 0.1; // Difficulty starts at 1 but we don't need to include that in the speed.

		var distance = enemy.distanceTo( planet );
		// Don't adjust the speed if the distance is greater than 300.
		distance = min( distance, 350 );
		distance /= 350;

		// Slow it down if it is closer than 350.
		enemy.speed *= distance;

		var angle = atan2( planet.y - enemy.y, planet.x - enemy.x );
		enemy.velocity.x = cos( angle ) * enemy.speed;
		enemy.velocity.y = sin( angle ) * enemy.speed;

		enemy.alpha = 0;
		
		lastSpawn = new Date().getTime();

		++bombCount;

		enemies.push( enemy );
	}
};

function makeRGBA( r, g, b, a )
{
	return "rgba( " + r + "," + g + "," + b + "," + a + " )";
}
	
function makeRGB( r, g, b )
{
	return "rgb( " + r + "," + g + "," + b + " )";
}



function Point( x, y )
{
	if( typeof( x ) == 'undefined' || typeof( y ) == 'undefined' )
	{
		this.x = 0;
		this.y = 0;
	}
	else
	{
		this.x = x;
		this.y = y;
	}
}

Point.prototype.distanceTo = function( p ) 
{
	var dx = p.x - this.x;
	var dy = p.y - this.y;
	return sqrt( dx*dx + dy*dy );
};

SpaceObject.prototype = new Point( 0, 0 );
function SpaceObject()
{
	Point.call( this, 0, 0 );
	this.velocity = new Point( 0, 0 );
	this.size = 0;
	this.speed = 0;
	this.angle = 0;
}

Core.prototype = new SpaceObject();
function Core()
{
	SpaceObject.call( this );
	this.energy = 1;
	this.energyRadius = 0;
	this.coreRoughness = [];
	this.shieldRadius = 0;
}

Satellite.prototype = new SpaceObject();
function Satellite()
{
	SpaceObject.call( this );
}

Core.prototype.updateSize = function( maxSize)
{
	var targetSize = this.energy * maxSize;
	this.energyRadius += ( targetSize - this.energyRadius ) * 0.2;
	this.shieldRadius = this.energyRadius + 15;
}

SpaceObject.prototype.updateAngle = function( rotationChange)
{
	this.angle += rotationChange;
	this.angle = Game.normalizeAngle( this.angle );
}

SpaceObject.prototype.updateOrbitPosition = function( parent, orbitDistance )
{
	this.x = parent.x + cos( this.angle ) * orbitDistance;
	this.y = parent.y + sin( this.angle ) * orbitDistance;
}

Core.prototype.create = function( roughness )
{
	var counter;
	this.coreRoughness = [];
	for( counter = 0; counter < 64; ++counter )
	{
		this.coreRoughness.push( ( -roughness + ( random() * ( roughness * 2 ) ) ) / 100 );
	}
};

Core.prototype.draw = function( shieldOut, context, allAlpha ) 
{
	if( shieldOut )
	{
		context.beginPath();
		context.fillStyle = makeRGBA( 0, 100, 100, min( allAlpha, 0.3 ) );
		context.arc( this.x, this.y, this.shieldRadius, 0, PI*2, true );
		context.fill();
	}
	
	context.beginPath();
	context.fillStyle = makeRGBA( 36, 157, 147, allAlpha );
	context.strokeStyle = makeRGBA( 59, 226, 212, allAlpha );
	context.lineWidth = 1.5;

	var counter;
	for( counter = 0; counter < 64; ++counter )
	{
		var angle = ( PI * 2 ) / 64 * counter;
		
		var x = this.x + cos( angle ) * ( this.energyRadius + this.energyRadius * this.coreRoughness[counter] );
		var y = this.y + sin( angle ) * ( this.energyRadius + this.energyRadius * this.coreRoughness[counter] );

		if( counter == 0 ) 
			context.moveTo( x, y );
		else
			context.lineTo( x, y );
	}

	context.closePath();
	context.fill();
	context.stroke();
};

Core.prototype.hitCore = function( position )
{
	var angle = atan2( position.y - this.y, position.x - this.x );
	if( angle < 0 )
		angle += PI * 2;
	var RawIndex = 64 / ( PI * 2 / angle );
	var Index0 = floor( RawIndex + 0.5 );
	var Index1 = Index0 + 1;
	if( Index1 >= 64 )
		Index1 -= 64;
	var Adjustment1 = RawIndex % 1;
	var Adjustment0 = 1.0 - Adjustment1;
	
	if( this.coreRoughness[Index0] > -5 )
		this.coreRoughness[Index0] -= 0.08 * Adjustment0;
	if( this.coreRoughness[Index1] > -5 )
		this.coreRoughness[Index1] -= 0.08 * Adjustment1;
		
	var Index = Index0 - 1;
	if( Index < 0 )
		Index += 64;
	var Index2 = Index1 + 1;
	if( Index2 >= 64 )
		Index2 -= 64;

	if( this.coreRoughness[Index] > -5 )
		this.coreRoughness[Index] -= 0.01 * Adjustment0;
	if( this.coreRoughness[Index2] > -5 )
		this.coreRoughness[Index2] -= 0.01 * Adjustment1;
}

Enemy.prototype = new SpaceObject();
function Enemy()
{
	SpaceObject.call( this );
	this.size = ( 7 + ( random() * 4 ) ) / 2;
}

Projectile.prototype = new SpaceObject();
function Projectile() 
{
	SpaceObject.call( this );
	this.destination = new Point( 0, 0 );
	this.size = 2.5;
	// lastDistance is used to keep track of when we pass the explosion point.
	// It is possible at low frame rates to pass the point and never detect it.
	this.lastDistance = 999999999.9;
}

EnemyProjectile.prototype = new SpaceObject();
function EnemyProjectile() 
{
	SpaceObject.call( this );
	this.angle = 0;
	this.size = 2.5;
	this.speed = 1.5;
	this.type = 'projectile';
	// lastDistance is used to keep track of when we pass the explosion point.
	// It is possible at low frame rates to pass the point and never detect it.
	this.lastDistance = 999999999.9;
}

Explosion.prototype = new SpaceObject();
function Explosion()
{
	SpaceObject.call( this );
	this.life = 0;
	this.alpha = 0;
}

// shim with setTimeout fallback from http://paulirish.com/2011/requestanimationframe-for-smart-animating/
window.requestAnimFrame = (function(){
  return  window.requestAnimationFrame       || 
          window.webkitRequestAnimationFrame || 
          window.mozRequestAnimationFrame    || 
          window.oRequestAnimationFrame      || 
          window.msRequestAnimationFrame     || 
          function(/* function */ callback, /* DOMElement */ element){
            window.setTimeout(callback, 1000 / 60);
          };
})();

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function getLocalStorageItem( Item )
{
	if( !supports_html5_storage() )
		return "";
		
	try
	{
		var Value = localStorage.getItem( Item );
		return Value;
	}
	catch(err)
	{
		return "";
	}
}

function setLocalStorageItem( Item, Value )
{
	if( !supports_html5_storage() )
		return;
		
	try
	{
		localStorage.setItem( Item, Value );
	}
	catch(err)
	{
	}
}

AudioFX = new function() {

  //---------------------------------------------------------------------------

  var VERSION = '0.4.0';

  //---------------------------------------------------------------------------

  thasAudio = false, audio = document.createElement('audio'), audioSupported = function(type) { var s = audio.canPlayType(type); return (s === 'probably') || (s === 'maybe'); };
  if (audio && audio.canPlayType) {
    hasAudio = {
      ogg: audioSupported('audio/ogg; codecs="vorbis"'),
      mp3: audioSupported('audio/mpeg;'),
      m4a: audioSupported('audio/x-m4a;') || audioSupported('audio/aac;'),
      wav: audioSupported('audio/wav; codecs="1"'),
      loop: (typeof audio.loop === 'boolean') // some browsers (FF) dont support loop yet
    }
  }

  //---------------------------------------------------------------------------

  var create = function(src, options ) {

    var audio = document.createElement('audio');

    if (options.loop && !hasAudio.loop)
      audio.addEventListener('ended', function() { audio.currentTime = 0; audio.play(); }, false);

    audio.volume   = options.volume || 0.1;
    audio.autoplay = options.autoplay;
    audio.loop     = options.loop;
    audio.src      = src;

    return audio;
  }

  //---------------------------------------------------------------------------

  var choose = function(formats) {
    for(var n = 0 ; n < formats.length ; n++)
      if (hasAudio && hasAudio[formats[n]])
        return formats[n];
	return null;
  };

  //---------------------------------------------------------------------------

  var find = function(audios) {
    var n, audio;
    for(n = 0 ; n < audios.length ; n++) {
      audio = audios[n];
      if (audio.paused || audio.ended)
        return audio;
    }
  };

  //---------------------------------------------------------------------------

  var afx = function(src, options ) 
  {
  
    options = options || {};

    var formats = options.formats || [];
    var format  = choose(formats);
    var pool    = [];

    src = src + (format ? '.' + format : '');

    if (hasAudio && format != null ) 
	{
      for(var n = 0 ; n < (options.pool || 1) ; n++)
        pool.push(create( src, options ));
    }

    return {
	
		version: VERSION,
		
		supported: format != null,

      audio: (pool.length == 1 ? pool[0] : pool),

      play: function() 
	  {
		if( format == null || !useSounds )
			return;
        var audio = find(pool);
        if (audio)
          audio.play();
      },

      stop: function() {
		if( format == null || !useSounds )
			return;
	  
        var n, audio;
        for(n = 0 ; n < pool.length ; n++) {
          audio = pool[n];
          audio.pause();
          audio.currentTime = 0;
        }
      }
    };

  };

  //---------------------------------------------------------------------------

  afx.version   = VERSION;
  afx.supported = hasAudio;

  return afx;

  //---------------------------------------------------------------------------

}();

var shootSound  = new AudioFX('laser',  { formats: ['mp3'], volume: 1.0, loop: false, autoplay: false, pool: 8 });
var explode1Sound  = new AudioFX('quickexplode',  { formats: ['mp3'], volume: 1.0, loop: false, autoplay: false, pool: 10 });
var explode2Sound  = new AudioFX('quickexplode2',  { formats: ['mp3'], volume: 1.0, loop: false, autoplay: false, pool: 10 });
var shieldSound  = new AudioFX('buzzer',  { formats: ['mp3'], volume: 1.0, loop: false, autoplay: false, pool: 1 });

Game.init();