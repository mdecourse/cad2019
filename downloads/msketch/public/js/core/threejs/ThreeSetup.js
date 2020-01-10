// =============================================================================
// 						Initializing Three.js and HTML Elements
// =============================================================================
var container, camera, scene, renderer, raycaster;
var canvasWidth, canvasHeight;

function init(){
	canvasWidth = $('#threejs_canvas').innerWidth();
	canvasHeight = $('#threejs_canvas').innerHeight();
	//scene and camera
	scene = new THREE.Scene();
	camera = new THREE.PerspectiveCamera( 1, canvasWidth/canvasHeight, 10000, 100000000 );
	camera.position.set( 0, 0, 100000 );
	scene.add( camera );

	//scene basic setup
	scene.add( new THREE.AmbientLight( WHITE_COLOR ) );
	var light = new THREE.PointLight( WHITE_COLOR, 0.5);
	light.position.set( 0, 1000, 1000 );
	/*
	light.castShadow = true;
	light.shadow.camera.near = camera.near;
	light.shadow.camera.far = camera.far;
	light.shadow.camera.fov = 70;
	light.shadow.mapSize.width = 1024;
	light.shadow.mapSize.height = 1024;
	*/
	scene.add( light );

	var globalAxis = new THREE.AxisHelper();
	globalAxis.position.set( 0, 0, 0 );
	globalAxis.scale.set(200, 200, 200);
	scene.add( globalAxis );

	//renderer
	//IE Competible


	if ( webglAvailable() ) {
		renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true} );
		renderer.shadowMap.enabled = true;
		console.log("WebGL Renderer Enabled");
	} else {
		renderer = new THREE.CanvasRenderer();
		console.log("Canvas Renderer Enabled");
	}


	//renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( BACKGROUND_COLOR );
	renderer.setSize( canvasWidth, canvasHeight );
	document.getElementById("threejs_canvas").appendChild( renderer.domElement );


	// Controls
	controls = new THREE.OrbitControls( camera, renderer.domElement );
	controls.rotateSpeed = 0.8;
	controls.zoomSpeed = 1.2;
	controls.panSpeed = 0.8;
	controls.enableDamping = true;
	controls.dampingFactor = 0.75;

	transformControl = new THREE.TransformControls( camera, renderer.domElement );
	transformControl.addEventListener( 'change', render );
	transformControl.setSize(0.008);
	transformControl.setRotationSnap(Math.PI/12);

	scene.add( transformControl );

	raycaster = new THREE.Raycaster();
	mouse = new THREE.Vector3(0,0,0);

	// Event Listener
	window.addEventListener( 'resize', onWindowResize, false );
	renderer.domElement.addEventListener( 'mousemove', onDocumentMouseMove, false );
	renderer.domElement.addEventListener( 'mousedown', onDocumentMouseDown, false );
	renderer.domElement.addEventListener( 'mouseup', onDocumentMouseUp, false );
	renderer.domElement.addEventListener( 'mouseout', onDocumentMouseOut, false );
	renderer.domElement.addEventListener( 'touchmove', onDocumentTouchMove, false );
	renderer.domElement.addEventListener( 'touchstart', onDocumentTouchDown, false );
	renderer.domElement.addEventListener( 'touchend', onDocumentTouchUp, false );

	transformControl.addEventListener( 'change', onUpdatePlanePanel, false );
	window.addEventListener( 'keydown', onDocumentKeyDown, false);
	window.addEventListener( 'keyup', onDocumentKeyUp, false);

}

function webglAvailable() {
	try {
		var canvas = document.createElement( 'canvas' );
		return !!( window.WebGLRenderingContext && (
			canvas.getContext( 'webgl' ) ||
			canvas.getContext( 'experimental-webgl' ) )
		);
	} catch ( e ) {
		return false;
	}
}
