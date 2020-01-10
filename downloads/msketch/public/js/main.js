// =============================================================================
// 									Variables
// =============================================================================

var MSKETCH_VERSION = "Ver. 3.0.171025";
var MANUAL_URL = "manual/";

var systemLang 			= "ko_KR";
var isTouchScreen		= false;
var historyInfo 		= [];
var historyAddress		= 0;
var MAX_HISTORY 		= 20;

//* ===== Assembly Unit =====
var AssemblyGroupList 	= new Array();
var currentAssembly;
var currentAssemblyGroup;
var currentMousePlane;

//* ===== Actuating variables =====
var angleRelations 		= new Object();
var speedRelations 		= new Object();
var reverseRotation 	= new Object();
var globalAngle 		= 0; 				//* Motors will be rotate with this in "actuate()";
var motorSpeed 			= Math.radians( 180 );
var stopAngle 			= 0;
var prevMillis, currentMillis;

var isPlaying 			= false;
var isControlable 		= false;
var prevControlable 	= false;
var MAX_TRAJECTORY_SIZE = 1800; // 3*x

//* ===== Interface variables =====
var isScienceBoxSanpOn 	= false;
var isScienceBoxLinkOn 	= false;
var isAnalysisOn 		= false;
var loadPlaneData 		= false;
var SCIENCEBOX_SNAP 	= 127; // 0.5inch
var SCALE_TRANS 		= 0.1;

var isPathOptimizing	= false;

//* ===== Visualization variables =====
var DISABLED_PLANE_OPA 	= 0.3;
var CAM_FACTOR 			= 1.2;

var EDISON_COLOR 		= 0x6a3fc4;
var EDISON_LIGHT_COLOR	= 0x833ac7; // NOT USED
var NORMAL_COLOR 		= 0x27262c;
var WHITE_COLOR 		= 0xffffff;
var ERROR_COLOR 		= 0xFC315A;
var ACTUATOR_COLOR 		= 0x27262c;
var BACKGROUND_COLOR 	= 0xffffff;
var TRAJECTORY_COLOR	= 0x6a3fc4;
var HOVER_COLOR			= 0x6a3fc4;
var SELECTED_COLOR		= 0x4bb7ba;
var OPT_PATH_COLOR 		= 0xFC315A;

// for Settings
var msketchSettings = {};
viewMode = 0;

msketchSettings.showGrid = true;
msketchSettings.showText = true;
msketchSettings.showPlane = true;

msketchSettings.gridGap = 10;
msketchSettings.planeSize = 100;

msketchSettings.linkWidth = 12.7; // 0.5inch
msketchSettings.holeDiameter = 4;
msketchSettings.linkThickness = 5;

msketchSettings.MaxHistorySize = 20;


// =============================================================================
// 									Main Script
// =============================================================================
initSettings();

init();					//* initializing Three.js environment
initMechCalc();			//* initializing Pre-defined Mechanism
animate();				//* calls every frame

interfaceSelect(-1);	// init interface


// =============================================================================
// 									Animate (Loop)
// =============================================================================


function animate(){

	requestAnimationFrame( animate );

	if (isPlaying)	{
		actuate();		//* Calls actuate in every frame
		for(var i=0; i<AssemblyGroupList.length; i++){
			AssemblyGroupList[i].recordTrajectories();	// Trajectory recording function in [assembly/AssemblyGroup.js]
		}
	}

	for(var i=0; i<AssemblyGroupList.length; i++){
		AssemblyGroupList[i].update();
	}

	if(currentInterface instanceof OptInterface && isPathOptimizing){
		optimize();
	}

	render();
}


function render(){
	controls.update();
	transformControl.update();
	renderer.render(scene, camera);
}

// =============================================================================
// 									Actuation
// =============================================================================
function actuate(){

	currentMillis = new Date().getTime();
	if(isAnalysisOn)	globalAngle += 0.02
	else				globalAngle = (motorSpeed*(currentMillis-prevMillis)/1000);

	for(var i=0; i<AssemblyGroupList.length; i++){
		AssemblyGroupList[i].actuateAll(globalAngle);
	}

	getAnalysisInfo();
}


// =============================================================================
// 							Mechanical Parts Predefine
// =============================================================================

function initMechCalc(){
	addAssemblyGroup(0);
	currentAssemblyGroup.init();
	selectAssembly(0);

	//jansen();				//** ======================= Example Jansen Mechanism Case in [common/MechExample.js]
	//currentAssemblyGroup.init();
}


// =============================================================================
// 							Assembly Organizing Functions
// =============================================================================

function addAssemblyGroup(_z){
	AssemblyGroupList.push( new AssemblyGroup() );
	currentAssemblyGroup = AssemblyGroupList[AssemblyGroupList.length-1];
	currentAssembly = currentAssemblyGroup.getAssembly();
	currentSpace = currentAssemblyGroup.getSpace();
	currentTrajectory = currentAssemblyGroup.getTrajectory();
	currentMousePlane = currentAssemblyGroup.getMousePlane();
	currentAssemblyGroup.setPlane(_z);
}

function removeAssemblyGroup(_index){
	if(AssemblyGroupList.length>1){
		AssemblyGroupList[_index].remove();
		AssemblyGroupList.splice(_index, 1);
		if(_index>0){
			selectAssembly(_index-1);
		}
		else{
			selectAssembly(_index);
		}
	}
	else{
		showMessage("Cannot remove: Last plane.")
	}
	updateMotorList();
}

function selectAssembly(_k){
	if(_k > AssemblyGroupList.length-1) _k = AssemblyGroupList.length-1;

	currentAssemblyGroup = AssemblyGroupList[_k];
	currentAssembly = currentAssemblyGroup.getAssembly();
	currentSpace = currentAssemblyGroup.getSpace();
	currentTrajectory = currentAssemblyGroup.getTrajectory();
	currentMousePlane = currentAssemblyGroup.getMousePlane();

	for(var i=0; i<AssemblyGroupList.length; i++){
		if(AssemblyGroupList[i] == currentAssemblyGroup){
			AssemblyGroupList[i].showPlane();
		}
		else{
			AssemblyGroupList[i].hidePlane();
		}
	}

	if(toolState==TOOL_PTRANS || toolState==TOOL_PROT){
		transformControl.attach( currentAssemblyGroup.group );
	}

}

function findCurrentAssemblyNum(){
	for(var i=0; i<AssemblyGroupList.length; i++){
		if(AssemblyGroupList[i] == currentAssemblyGroup){
			return i;
		}
	}
	return -1;
}
