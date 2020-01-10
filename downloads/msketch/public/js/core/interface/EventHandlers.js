// =============================================================================
// 									Animate (Loop)
// =============================================================================

var mouse, intersects;
var mouseState 			= 0;
var currentInterface;
var mouseX, mouseY, lastX, lastY;

var STATE_NULL = 0;
var STATE_DOWN = 1;
var STATE_DOWN_AND_MOVE = 2;
var STATE_DOWN_AND_OUT = 3;

var ctrlDown = false;

function getMousePoints(_event, _target){
	if(!isTouchScreen){
		mouse.x = ( _event.offsetX / canvasWidth ) * 2 - 1;
		mouse.y = - ( _event.offsetY / canvasHeight ) * 2 + 1;
	}
	else if ( _event.touches != null ){
		isTouchScreen = true;
		if ( _event.touches.length === 1 ) {
			var tgOffset = _event.target.getBoundingClientRect();
			mouse.x = ( (_event.targetTouches[0].clientX -  tgOffset.left) / canvasWidth ) * 2 - 1;
			mouse.y = -( (_event.targetTouches[0].clientY -  tgOffset.top) / canvasHeight ) * 2 + 1;
		}
	}

	raycaster.setFromCamera( mouse, camera );
	intersects = raycaster.intersectObject( _target, true );

	var mVector;
	if (intersects.length > 0) {
		mVector = new THREE.Vector3().copy( intersects[ 0 ].point );
        intersects[ 0 ].object.worldToLocal( mVector );
        mouseX = mVector.x;
		mouseY = mVector.y;
	}

}

function getTargetPlane(){
	var assemblySelection = raycaster.intersectObject( scene, true );
	if(assemblySelection.length>0){
		for(var i=0; i<assemblySelection.length; i++){
			for(var j=0; j<AssemblyGroupList.length; j++){
				if(assemblySelection[i].object == AssemblyGroupList[j].selectCube){
					return j;
				}
			}
		}
	}
	return -1;
}

function onDocumentMouseMove( event ) {
	event.preventDefault();

	getMousePoints(event, currentMousePlane);

	if (currentInterface!=null && mouseX!=lastX && mouseY!=lastY) {
	    switch(mouseState) {
	    case STATE_NULL:
	      currentInterface.mouseMove(mouseX, mouseY);
	      break;
	    case STATE_DOWN:
	      currentInterface.mouseDownAndMoveFirst(mouseX, mouseY);
	      currentInterface.mouseDownAndMove(mouseX, mouseY);
	      mouseState=STATE_DOWN_AND_MOVE;
	      break;
	    case STATE_DOWN_AND_MOVE:
	      currentInterface.mouseDownAndMove(mouseX, mouseY);
	      break;
      	case STATE_DOWN_AND_OUT:
	      currentInterface.mouseDownAndMove(mouseX, mouseY);
	      break;
	    }

    }

	controls.enabled = true;

	if(event.type == "mousemove") {
		isTouchScreen = false;
		controls.zoomSpeed = 1.2;

	}
	lastX = mouseX;
    lastY = mouseY;

}

function onDocumentMouseDown( event ) {
	event.preventDefault();

	getMousePoints(event, currentMousePlane);

	if(event.which!=1 && !isTouchScreen) return;

	if (currentInterface!=null && mouseState!=STATE_DOWN_AND_OUT) {
		currentInterface.mouseDown(mouseX, mouseY);
		mouseState=STATE_DOWN;
	}

}

function onDocumentMouseUp( event ) {
	event.preventDefault();

	getMousePoints(event, currentMousePlane);

	if (currentInterface!=null) {
	    switch(mouseState) {
	    case STATE_NULL:
	      currentInterface.mouseDownAndUp(mouseX, mouseY);
	      break;
	    case STATE_DOWN:
	      currentInterface.mouseDownAndUp(mouseX, mouseY);
	      currentInterface.mouseMove(mouseX, mouseY);
	      break;
	    case STATE_DOWN_AND_MOVE:
	      currentInterface.mouseMoveAndUp(mouseX, mouseY);
	      currentInterface.mouseMove(mouseX, mouseY);
	      break;
	    }
	    currentAssemblyGroup.onStart();
	    currentAssemblyGroup.calculateAssembly();
	}
	mouseState=STATE_NULL;

	if(toolState==TOOL_PSEL){
		if(getTargetPlane()!=-1){
			selectAssembly(getTargetPlane());
		}
	}

	checkHistory();
}

function onDocumentMouseOut( event ) {
	event.preventDefault();

	getMousePoints(event, currentMousePlane);

	if(mouseState == STATE_DOWN_AND_MOVE && event.which == 1){
		mouseState=STATE_DOWN_AND_OUT;
	}
	controls.enabled = false;
}

// touch events
function onDocumentTouchDown( event ){
	event.preventDefault();
	isTouchScreen = true;
	controls.zoomSpeed = 0.3;
	onDocumentMouseMove(event);
	onDocumentMouseDown(event);
}
function onDocumentTouchUp( event ){
	event.preventDefault();
	onDocumentMouseMove(event);
	onDocumentMouseUp(event);
	hoverPoint = new Point2D;
	hoverLink = null;
}
function onDocumentTouchMove( event ){
	event.preventDefault();
	onDocumentMouseMove(event);

}



function onDocumentKeyDown( event ){
	ctrlDown = false;
	if (event.ctrlKey) ctrlDown = true;
	if (event.ctrlKey && event.keyCode == 90){
		undo();
	}
	if (event.ctrlKey && event.keyCode == 89){
		redo();
	}

    //var ctrlKey = 17, vKey = 86, cKey = 67;
}

function onDocumentKeyUp( event ){
	ctrlDown = false;

	checkHistory();

	if(event.keyCode == 32){
		//interfaceSelect(TOOL_NAV);
	}
}

function onWindowResize() {
	canvasWidth = $('#threejs_canvas').innerWidth();
	canvasHeight = $('#threejs_canvas').innerHeight();

	windowHalfX = canvasWidth / 2;
	windowHalfY = canvasHeight / 2;

	camera.aspect = canvasWidth / canvasHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( canvasWidth, canvasHeight );
}

function onUpdatePlanePanel(){
	getPlaneInfoToPlanePanel();
}
