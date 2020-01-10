// =============================================================================
// 							Tool Select and Execute Script
// =============================================================================

//* ===== Tool function variables =====
var toolState 			= -1;
var TOOL_RUN 			= 1,
	TOOL_NAV 			= 2,

	TOOL_LINK 			= 3,
	TOOL_JA 			= 4,
	TOOL_MARK 			= 5,
	TOOL_MOVE 			= 6,
	TOOL_REMOVE 		= 7,

	TOOL_PCAM 			= 8,
	TOOL_PADD 			= 9,
	TOOL_PREMOVE 		= 10,
	TOOL_PSEL 			= 11,
	TOOL_PTRANS 		= 12,
	TOOL_PROT 			= 13,

	TOOL_SLIDER			= 14;
	TOOL_PCOPY 			= 15;

	// Menubar
	TOOL_NEWFILE 		= 21,
	TOOL_SAVE	 		= 22,
	TOOL_OPEN 			= 23,
	TOOL_EXPORT 		= 24,
	TOOL_IMPORT 		= 25,
	TOOL_DRAWING 		= 26,
	TOOL_EXAMPLE 		= 27,
	TOOL_MANUAL 		= 28,

	TOOL_CAMEO_DRAWING 	= 29,
	TOOL_EDISON_XML 	= 30;

	// Panel and External Functions
	PANEL_MOVE 			= 51;
	TOOL_OPT 			= 40;
	TOOL_PPATTERN		= 41;
	TOOL_PMOTOR			= 42;
	TOOL_PANALYSIS		= 43;
	TOOL_FAB			= 44;

	TOOL_ADDLOAD		= 61;
	TOOL_EDITLOAD		= 62;
	TOOL_REMOVELOAD		= 63;

var	PANEL_MOVE_INDEX	= 1,
	PANEL_PLANE_INDEX 	= 2;



var prevTool = -1;


function interfaceSelect(_selected){
	switch(_selected){
		// Header Toolbar
		case TOOL_RUN:
			isPlaying=!isPlaying;
			if (isPlaying) {
				toolState = -1;
				setTool(toolState);
				prevMillis = new Date().getTime();
				globalAngle = 0;

				for(var i=0; i<AssemblyGroupList.length; i++){
					AssemblyGroupList[i].load();
					AssemblyGroupList[i].savePositions();
					AssemblyGroupList[i].onStart();
					AssemblyGroupList[i].flushTrajectories();
					AssemblyGroupList[i].hideCube();
					AssemblyGroupList[i].setOpacity(1);
				}

				currentAssemblyGroup.hidePlane();
				currentAssemblyGroup.setOpacity(1);
			}
			else{
				for(var i=0; i<AssemblyGroupList.length; i++){
					AssemblyGroupList[i].restorePositions()
					AssemblyGroupList[i].onEnd();
					AssemblyGroupList[i].flushTrajectories();
					AssemblyGroupList[i].initTrajectories();
					AssemblyGroupList[i].showCube();
					AssemblyGroupList[i].setOpacity(DISABLED_PLANE_OPA);
				}

				currentAssemblyGroup.showPlane();
				if(isAnalysisOn) isAnalysisOn=false;
				try360forAssemblies();
			}
			break;
		case TOOL_NAV:
			isControlable = !isControlable;
			prevControlable = isControlable;
			if(isControlable){
				prevTool=toolState;
				if(toolState!=TOOL_PTRANS && toolState!=TOOL_PROT && toolState!=TOOL_PSEL){
					toolState = -1;
					setTool(toolState);
				}
			}else{
				if(prevTool == TOOL_LINK || prevTool == TOOL_JA || prevTool == TOOL_MARK || prevTool == TOOL_MOVE || prevTool == TOOL_REMOVE ){
					toolState=prevTool;
					setTool(toolState);
				}
			}
			break;

		case TOOL_LINK:
			if(toolState!=TOOL_LINK) toolState = TOOL_LINK;
			else if(toolState==TOOL_LINK) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_JA:
			if(toolState!=TOOL_JA) toolState = TOOL_JA;
			else if(toolState==TOOL_JA) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_SLIDER:
			if(toolState!=TOOL_SLIDER) toolState = TOOL_SLIDER;
			else if(toolState==TOOL_SLIDER) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_MARK:
			if(toolState!=TOOL_MARK) toolState = TOOL_MARK;
			else if(toolState==TOOL_MARK) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_MOVE:
			if(toolState!=TOOL_MOVE) toolState = TOOL_MOVE;
			else if(toolState==TOOL_MOVE) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_REMOVE:
			if(toolState!=TOOL_REMOVE) toolState = TOOL_REMOVE;
			else if(toolState==TOOL_REMOVE) toolState = -1;
			setTool(toolState);
			break;

		case TOOL_PCAM:
			var rX = currentAssemblyGroup.group.rotation.x;
			var rY = currentAssemblyGroup.group.rotation.y;
			var rZ = currentAssemblyGroup.group.rotation.z;

			camera.position.x = 100000*Math.sin(rY);
			camera.position.y = 100000*Math.sin(rX)*Math.cos(rY)*(-1);
			camera.position.z = 100000*Math.cos(rX)*Math.cos(rY);

			_target = new THREE.Vector3(currentAssemblyGroup.group.position.x,currentAssemblyGroup.group.position.y,currentAssemblyGroup.group.position.z);

			controls.target.set(Number(_target.x), Number(_target.y), Number(_target.z));
			camera.lookAt( currentAssemblyGroup.group.position );
			break;
		case TOOL_PADD:
			addAssemblyGroup(currentAssemblyGroup.group.position.z+100);
			currentAssemblyGroup.init();
			selectAssembly(AssemblyGroupList.length-1);
			checkHistory();
			break;
		case TOOL_PREMOVE:
			removeAssemblyGroup(findCurrentAssemblyNum());
			checkHistory();
			break;
		case TOOL_PSEL:
			if(toolState!=TOOL_PSEL) toolState = TOOL_PSEL;
			else if(toolState==TOOL_PSEL) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_PTRANS:
			if(toolState!=TOOL_PTRANS) toolState = TOOL_PTRANS;
			else if(toolState==TOOL_PTRANS) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_PROT:
			if(toolState!=TOOL_PROT) toolState = TOOL_PROT;
			else if(toolState==TOOL_PROT) toolState = -1;
			setTool(toolState);
			break;
		case TOOL_PCOPY:
			var _data = getMsketchInfoForPlane();
			loadMsketchInfoForPlane(JSON.parse(_data).sketch, true);

			break;


		// Manubar
		case TOOL_NEWFILE:
			if(isPlaying)	interfaceSelect(TOOL_RUN);
			makeNewFile();
			//showSnackBar("새 파일 생성됨.", "New File was created.");
			showMessage("New File was created.")
			closeDrawer();
			break;
		case TOOL_SAVE:
			break;
		case TOOL_OPEN:
			break;
		case TOOL_EXPORT:
			if(isPlaying)	interfaceSelect(TOOL_RUN);

			var dataOut = getMsketchInfoForPlane();
			saveAsText($('#msketch-titlebar-filename').val()+"_Plane"+findCurrentAssemblyNum()+".json", dataOut);
			closeDrawer();
			break;
		case TOOL_IMPORT:
			if(isPlaying)	interfaceSelect(TOOL_RUN);

			interfaceSelect(TOOL_PADD);
			loadFromStringData(dataFile, true);
			dataFile=null;
			toggleDrawer();
			break;
		case TOOL_DRAWING:
			exportDrawing();
			closeDrawer();
			break;
		case TOOL_CAMEO_DRAWING:
			exportCameoDrawing();
			toggleDrawer();
			break;
		case TOOL_EDISON_XML:
			if(isPlaying)	interfaceSelect(TOOL_RUN);
			exportEdisonXML();
			toggleDrawer();
			break;
		case TOOL_EXAMPLE:
			if(isPlaying)	interfaceSelect(TOOL_RUN);
			openFileFromStringData(dataFile, true);
			dataFile=null;
			toggleDrawer();
			break;
		case TOOL_MANUAL:
			window.open(MANUAL_URL, '_blank');
			toggleDrawer();
			break;

		// External Tools
		case TOOL_ADDLOAD:
			if(toolState!=TOOL_ADDLOAD) toolState = TOOL_ADDLOAD;
			else if(toolState==TOOL_ADDLOAD) toolState = -1;
			setTool(toolState);
			break;

		case TOOL_EDITLOAD:
			if(toolState!=TOOL_EDITLOAD) toolState = TOOL_EDITLOAD;
			else if(toolState==TOOL_EDITLOAD) toolState = -1;
			setTool(toolState);
			break;

		case TOOL_REMOVELOAD:
			if(toolState!=TOOL_REMOVELOAD) toolState = TOOL_REMOVELOAD;
			else if(toolState==TOOL_REMOVELOAD) toolState = -1;
			setTool(toolState);
			break;



	}

	checkToolSet();
	//checkPanelSet();

	//* ===== Check orbit control =====
	if (isControlable) {
		//controls.enabled = true;
		controls.enableRotate = true;
	} else {
		//controls.enabled = false;
		controls.enableRotate = false;
	}



	//* ===== Plane Selection =====
	if(toolState==TOOL_PSEL){
		for(var i=0; i<AssemblyGroupList.length; i++){
			AssemblyGroupList[i].showCube();
		}
	}
	else{
		for(var i=0; i<AssemblyGroupList.length; i++){
			AssemblyGroupList[i].hideCube();
		}
	}

}



function setTool(_tool){
	var _dettach = true;
	var _allowNav = true;
	switch(_tool){
		case -1:
			currentInterface = null;
			isControlable = prevControlable;
			break;
		case TOOL_LINK:
			currentInterface = new LinkInterface();
			_allowNav = false;
			break;
		case TOOL_JA:
			currentInterface = new JAInterface();
			_allowNav = false;
			break;
		case TOOL_SLIDER:
			currentInterface = new SliderInterface();
			_allowNav = false;
			break;
		case TOOL_MARK:
			currentInterface = new MarkInterface();
			_allowNav = false;
			break;
		case TOOL_MOVE:
			currentInterface = new MoveInterface();
			_allowNav = false;
			break;
		case TOOL_REMOVE:
			currentInterface = new RemoveInterface();
			_allowNav = false;
			break;
		case TOOL_PTRANS:
			transformControl.attach( currentAssemblyGroup.group );
			transformControl.setMode( "translate" );
			currentInterface = null;
			_dettach=false;
			break;
		case TOOL_PROT:
			transformControl.attach( currentAssemblyGroup.group );
			transformControl.setMode( "rotate" );
			currentInterface = null;
			_dettach=false;
			break;
		case TOOL_PSEL:
			currentInterface = null;
			break;
		case TOOL_OPT:
			currentInterface = new OptInterface();
			_allowNav = false;
			break;


		// External Interface
		case TOOL_ADDLOAD:
			currentInterface = new AddLoadInterface();
			_allowNav = false;
			break;

		case TOOL_EDITLOAD:
			currentInterface = new EditLoadInterface();
			_allowNav = false;
			break;

		case TOOL_REMOVELOAD:
			currentInterface = new RemoveLoadInterface();
			_allowNav = false;
			break;
	}

	if(_allowNav == false && isControlable){
		isControlable = false;
	}


	if(_dettach){
		transformControl.detach( currentAssemblyGroup.group );
	}
	if(toolState!=TOOL_OPT && !isPlaying){
		//flushAllTargetTrj();
	}
}


/* added for drawer */
$('#msketch_drawer_open').click(function(){
	if( $('#msketch_drawer_open').hasClass('active') ){
		$('#msketch_drawer').css('left', -240);
	}else{
		$('#msketch_drawer').css('left', 0);
	}

	$('#msketch_drawer_open').toggleClass('active');
});

function closeDrawer(){
	if( $('#msketch_drawer_open').hasClass('active') ){
		$('#msketch_drawer').css('left', -240);
	}
	$('#msketch_drawer_open').removeClass('active');
}




function checkToolSet() {
	if(isPlaying)		$('#btn_play').addClass('active');
	else 				$('#btn_play').removeClass('active');

	if(isControlable)	$('#btn_nav').addClass('active');
	else 				$('#btn_nav').removeClass('active');

	if(toolState == TOOL_LINK)		$('#btn_link').addClass('active');
	else 							$('#btn_link').removeClass('active');
	if(toolState == TOOL_JA)		$('#btn_ja').addClass('active');
	else 							$('#btn_ja').removeClass('active');
	if(toolState == TOOL_SLIDER)	$('#btn_slider').addClass('active');
	else 							$('#btn_slider').removeClass('active');
	if(toolState == TOOL_MARK)		$('#btn_mark').addClass('active');
	else 							$('#btn_mark').removeClass('active');
	if(toolState == TOOL_MOVE)		$('#btn_move').addClass('active');
	else 							$('#btn_move').removeClass('active');
	if(toolState == TOOL_REMOVE)	$('#btn_remove').addClass('active');
	else 							$('#btn_remove').removeClass('active');
	if(toolState == TOOL_PSEL)		$('#btn_psel').addClass('active');
	else 							$('#btn_psel').removeClass('active');
	if(toolState == TOOL_PTRANS)	$('#btn_ptrans').addClass('active');
	else 							$('#btn_ptrans').removeClass('active');
	if(toolState == TOOL_PROT)		$('#btn_prot').addClass('active');
	else 							$('#btn_prot').removeClass('active');
	if(toolState == TOOL_OPT){
		$('#panel_opt_draw').addClass('active');
		// for drawing derised path of linkage generation function (yw_edited)
		$('#panel_gen_draw').addClass('active');
		$('#panel_opt_run').removeClass('disableClick');
		$('#panel_opt_stop').removeClass('disableClick');
		checkBaseTrj(true);
	}else{
		$('#panel_opt_draw').removeClass('active');
		// for drawing derised path of linkage generation function (yw_edited)
		$('#panel_gen_draw').removeClass('active');
		$('#panel_opt_run').addClass('disableClick');
		$('#panel_opt_stop').addClass('disableClick');
		checkBaseTrj(false);
	}

	// Load
	if(toolState == TOOL_ADDLOAD)		$('#btn_addload').addClass('active');
	else 								$('#btn_addload').removeClass('active');
	if(toolState == TOOL_EDITLOAD)		$('#btn_editload').addClass('active');
	else 								$('#btn_editload').removeClass('active');
	if(toolState == TOOL_REMOVELOAD)	$('#btn_removeload').addClass('active');
	else 								$('#btn_removeload').removeClass('active');

	if (isPlaying) {
		$('#msketch_toolbar').addClass('disableClick')
    } else {
		$('#msketch_toolbar').removeClass('disableClick');
    }

	if (toolState != TOOL_MOVE) {
        selectedPoint = null;
        selectedPointTg = null;
        selectedLink = null;
        selectedPointPair = null;
        currentAssemblyGroup.removeSegmentSelected();
    }
}

function setViewMode(_index){
	viewMode = _index;
	for(var i=0; i<AssemblyGroupList.length; i++){
		AssemblyGroupList[i].needsUpdate = true;
		AssemblyGroupList[i].load();
	}
}
