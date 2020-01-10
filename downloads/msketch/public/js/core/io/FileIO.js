//----------------------------------------------------------------------------------------------------
// ** FIleI/O Functions
//----------------------------------------------------------------------------------------------------

function makeNewFile(){
	addAssemblyGroup(0);
	currentAssemblyGroup.init();
	selectAssembly(AssemblyGroupList.length-1);

	for(var i=AssemblyGroupList.length-2; i>=0; i--){
		removeAssemblyGroup(i);
	}
	updateMotorList();
}

// Load File
function loadMsketchInfo(_data, _isNew){

	var _dataJSON = JSON.parse(_data);

	//check header
	if(_dataJSON.app != "EDISON" || _dataJSON.type != "Assembly"){
		showMessage("Wrong File");
		return null;
	}else{
		makeNewFile();
	}

	// generate planes
	for(var i=0; i<_dataJSON.sketches.length; i++){
		loadMsketchInfoForPlane(_dataJSON.sketches[i], _isNew)
	}
	try360forAssemblies();
	updateMotorList();
	removeAssemblyGroup(0);
}

function importPlaneInfo(_data, _isNew){
	var _dataJSON = JSON.parse(_data);

	//check header
	if(_dataJSON.app != "EDISON" || _dataJSON.type != "Sketch"){
		showMessage("Wrong File");
		return null;
	}

	loadMsketchInfoForPlane(_dataJSON.sketch, _isNew)

	try360forAssemblies();
	updateMotorList();
	selectAssembly(AssemblyGroupList.length-1);
}

// Load File
function loadMsketchInfoForPlane(_sketch, _isNew){
	var nameTag = (_isNew)? "*":""; // to avoid duplicate of element names

	addAssemblyGroup(0);
	currentAssemblyGroup.init();

	//Space
	for(var j=0; j<_sketch.anchor.points.length; j++){
		var _points = _sketch.anchor.points[j];
		currentSpace.addGlobalPoint( new Point2D( parseFloat(_points.x)/SCALE_TRANS, parseFloat(_points.y)/SCALE_TRANS ) );
	}

	//Links
	for(var j=0; j<_sketch.links.length; j++){
		var _link = _sketch.links[j];
		var _linkElement = new Link(_link.name + nameTag, parseFloat(_link.points[0].x)/SCALE_TRANS, parseFloat(_link.points[0].y)/SCALE_TRANS )
		_linkElement.stack = _link.points[0].z/Link3D.HEIGHT; //yw_edited
		currentAssembly.addElement(_linkElement);

		currentAssemblyGroup.load();

		for(var k=1; k<_link.points.length; k++){
			_linkElement.addGlobalPoint( parseFloat(_link.points[k].x)/SCALE_TRANS, parseFloat(_link.points[k].y)/SCALE_TRANS )
		}
	}

	// CC
	for(var j=0; j<_sketch.constraints.length; j++){
		var _cc = _sketch.constraints[j];
		var _baseName = _cc.points[0].targetLink;
		var _baseIndex = parseInt(_cc.points[0].targetIndex);
		var _targetName =  _cc.points[1].targetLink;
		var _targetIndex = parseInt(_cc.points[1].targetIndex);

		var _base, _target;

		if(_baseName!="Anchor"){
			_baseName = _baseName+nameTag;
		}
		if(_targetName!="Anchor"){
			_targetName = _targetName+nameTag;
		}

		_base = currentAssembly.getLinkByName(_baseName);
		_target = currentAssembly.getLinkByName(_targetName);

		var _ccElement = new CoaxialConstraint(_cc.name + nameTag , _base, _base.getPointList().get(_baseIndex), _target, _target.getPointList().get(_targetIndex));;

		// Apendding CC
		for(var k=2; k<_cc.points.length; k++){
			var _targetName =  _cc.points[k].targetLink;
			var _targetIndex = parseInt(_cc.points[k].targetIndex);
			var _target;

			if(_targetName!="Anchor"){
				_targetName = _targetName+nameTag;
			}

			_target = currentAssembly.getLinkByName(_targetName);

			_ccElement.addPoint(_target, _target.getPointList().get(_targetIndex));
		}

		currentAssembly.addConstraint(_ccElement);
	}

	// Slider
	for(var j=0; j<_sketch.sliders.length; j++){
		var _sc = _sketch.sliders[j];
		var _baseName = _sc.baseLink +nameTag;
		var _targetName = _sc.targetLink +nameTag;

		var _base = currentAssembly.getLinkByName(_baseName);
		var _target = currentAssembly.getLinkByName(_targetName);

		var _scElement = new SliderConstraint(_base, null, _base.getPointList().get(_sc.baseIndex1), _base.getPointList().get(_sc.baseIndex2) );

		_target.setSlider(_scElement);
		_scElement.setLink(_scElement.TARGET, _target);

		_target.addLocalPoint(new Point2D(+50, 0));
		_target.addLocalPoint(new Point2D(-50, 0));
		_target.setAngle(_scElement.getLink(_scElement.BASE).getAngle()+_scElement.getAngle());

		currentAssembly.addConstraint(_scElement);
		_target.redefineVertex();
	}

	// JA
	for(var j=0; j<_sketch.motors.length; j++){
		var _motor = _sketch.motors[j];

		var _ccName 	= _motor.targetConstraint + nameTag;
		var _baseName 	= _motor.targetLink1;
		var _targetName = _motor.targetLink2;

		var _base, _target, _cc;

		if(_baseName!="Anchor"){
			_baseName = _baseName+nameTag;
		}
		if(_targetName!="Anchor"){
			_targetName = _targetName+nameTag;
		}

		_base = currentAssembly.getLinkByName(_baseName);
		_target = currentAssembly.getLinkByName(_targetName);
		_cc = currentAssembly.getConstraintByName(_ccName);


		var _motorElement = new JointActuator(_motor.name, _cc, _base, _target);
		currentAssembly.addActuator(_motorElement);


		_motorElement.isServo = (_motor.type=="SERVO")? true:false;
		_motorElement.setPhase( Math.radians(parseFloat(_motor.phase)) );
		_motorElement.setSpeedMultiply( parseFloat(_motor.speed)/100 );
		_motorElement.setReverse( (parseInt(_motor.direction)==1)? true : false );
		_motorElement.setStartAngle( Math.radians(parseFloat(_motor.range.split("-")[0])) );
		_motorElement.setEndAngle( Math.radians(parseFloat(_motor.range.split("-")[1])) );
		if(_motorElement.isServo){
			//a.setInitAngle( a.startAngle );
			_motorElement.setValue( _motorElement.startAngle + _motorElement.phaseShift );
		}
		else{
			//a.setInitAngle( a.phaseShift );
			_motorElement.setValue( _motorElement.phaseShift );
		}
	}

	// Markers
	for(var j=0; j<_sketch.markers.length; j++){
		var _marker = _sketch.markers[j];

		var _linkName 	= _marker.targetLink;
		var _index 		= _marker.targetIndex;

		if(_linkName!="Anchor"){
			_linkName = _linkName+nameTag;
		}

		_link = currentAssembly.getLinkByName(_linkName);

		currentAssemblyGroup.newTrajectory(_link.getPointList().get(_index));
	}

	// Plane Info
	var _planeData = {};
	_planeData.tx = parseFloat(_sketch.plane.translation.x)/SCALE_TRANS;
	_planeData.ty = parseFloat(_sketch.plane.translation.y)/SCALE_TRANS;
	_planeData.tz = parseFloat(_sketch.plane.translation.z)/SCALE_TRANS;
	_planeData.rx = Math.radians( parseFloat(_sketch.plane.rotation.x) );
	_planeData.ry = Math.radians( parseFloat(_sketch.plane.rotation.y) );
	_planeData.rz = Math.radians( parseFloat(_sketch.plane.rotation.z) );
	currentAssemblyGroup.setPositionData(_planeData);

	currentAssemblyGroup.load();
}


// Get Info
function getMsketchInfo(){
	var tempObject = {};

	tempObject.app = "EDISON";
	tempObject.type = "Assembly";
	tempObject.fileVersion = "2.0";
	tempObject.description = "Saved From M.Sketch v3.0";

	//part setting (yw_edited)
	tempObject.thickness = msketchSettings.linkThickness;
	tempObject.holeSize = msketchSettings.holeDiameter;
	tempObject.linkWidth = msketchSettings.linkWidth;

	saveAssemblyPositions();

	// Start to Save File
	tempObject.sketches = [];

	for(var i=0; i<AssemblyGroupList.length; i++){
		var tempAssembly = {};

		// Plane Info
		planeData = AssemblyGroupList[i].getPositionData();
		tempAssembly.plane = {};
		tempAssembly.plane.name = "Plane"+i;
		tempAssembly.plane.translation = {
										x: (planeData.tx*SCALE_TRANS).toFixed(2),
										y: (planeData.ty*SCALE_TRANS).toFixed(2),
										z: (planeData.tz*SCALE_TRANS).toFixed(2)
										}

		tempAssembly.plane.rotation = {
										x: Math.degrees(planeData.rx).toFixed(2),
										y: Math.degrees(planeData.ry).toFixed(2),
										z: Math.degrees(planeData.rz).toFixed(2)
		}

		// Element Info
		var elementList = AssemblyGroupList[i].assembly.getAllElement();

		tempAssembly.anchor = {};
		tempAssembly.links = [];

		for(var ei in elementList.array){
			var e = elementList.get(ei);
			if(e instanceof Space){
				tempAssembly.anchor.points = [];

				for(var pi in e.getPointList().array){
		 			var _p = e.getPointList().get(pi);
					tempAssembly.anchor.points.push({
						x: (_p.getX()*SCALE_TRANS).toFixed(2),
						y: (_p.getY()*SCALE_TRANS).toFixed(2),
						z: "0.00"
					});
				}
			}

			else if(e instanceof Link){
				var tempLink = {};
				tempLink.name = e.name;
				tempLink.points = [];

				for(var pi in e.getPointList().array){
		 			var _p = e.getPointList().get(pi);

					if(!e.isSlider || (e.isSlider && pi == 0))
					tempLink.points.push({
						x: (e.getGlobalPosition(_p).getX()*SCALE_TRANS).toFixed(2),
						y: (e.getGlobalPosition(_p).getY()*SCALE_TRANS).toFixed(2),
						z: (e.stack * Link3D.HEIGHT).toFixed(2) //yw_edited
					});
				}

				tempAssembly.links.push(tempLink);
			}
		}

		// CC Info
		var constList = AssemblyGroupList[i].assembly.getAllConstraint();

		tempAssembly.constraints = [];
		tempAssembly.sliders = [];

		for(var ei in constList.array){
			var e = constList.get(ei);
			if(e instanceof CoaxialConstraint){
				var tempCC = {};
				tempCC.name = e.name;
				tempCC.points = [];

				for(var j = 0; j<e.link.length(); j++){
					var _link = e.link.get(j);
					var _index;

					for(var k=0; k<_link.getPointList().length(); k++){
		 				if(e.point.get(j).getX() == _link.getPointList().get(k).getX() && e.point.get(j).getY() == _link.getPointList().get(k).getY()){
		 					_index = k;
		 				}
		 			}
					tempCC.points.push({targetLink: _link.name, targetIndex: _index})
				}

				tempAssembly.constraints.push(tempCC)
			}
			else if(e instanceof SliderConstraint){
				var tempSC = {};
				tempSC.name = e.name;
				tempSC.baseLink = e.link.get(e.BASE).name;
				tempSC.targetLink = e.link.get(e.TARGET).name;
				tempSC.baseIndex1 = 0;
				tempSC.baseIndex2 = 1;

				for(var k=0; k<e.link.get(e.BASE).getPointList().length(); k++){
					if(e.getPoints()[0].getX() == e.link.get(e.BASE).getPointList().get(k).getX() && e.getPoints()[0].getY() == e.link.get(e.BASE).getPointList().get(k).getY()){
						tempSC.baseIndex1 = k;
					}
					if(e.getPoints()[1].getX() == e.link.get(e.BASE).getPointList().get(k).getX() && e.getPoints()[1].getY() == e.link.get(e.BASE).getPointList().get(k).getY()){
						tempSC.baseIndex2 = k;
					}
				}

				tempAssembly.sliders.push(tempSC);

			}
		}

		// Markers
		var _trajectoryList = AssemblyGroupList[i].getTrajectory();

		tempAssembly.markers = [];

		for(var ti in _trajectoryList.array){
			var t = _trajectoryList.get(ti);

			if(t instanceof Trajectory){
				_link = t.link;

				for(var k=0; k<_link.getPointList().length(); k++){
	 				if(t.point.getX() == _link.getPointList().get(k).getX() && t.point.getY() == _link.getPointList().get(k).getY()){
	 					_index = k;
	 				}
	 			}

				var tempTrj = {targetLink: _link.name, targetIndex: _index};
			}

			tempAssembly.markers.push(tempTrj);
		}

		// JA
		var _actuatorList = AssemblyGroupList[i].assembly.getAllActuator();

		tempAssembly.motors = [];

		for(var ai in _actuatorList.array){
			var a = _actuatorList.get(ai);
			if(a instanceof JointActuator){
				tempAssembly.motors.push({
					name: a.name,
					targetConstraint: a.coaxialConstraint.name,
					targetLink1: a.angularConstraint.link.get(0).name,
					targetLink2: a.angularConstraint.link.get(1).name,
					type: (a.isServo)? "SERVO":"DC",
					direction: (a.revDir)? 1:0,
					speed: Math.round(a.speedMultiply*100),
					phase: Math.round(Math.degrees(a.phaseShift)),
					range: Math.round(Math.degrees(a.startAngle)) +"-"+ Math.round(Math.degrees(a.endAngle))
				});
			}
		}

		tempObject.sketches.push( tempAssembly );
	}

	restoreAssemblyPositions();

	var tempText = JSON.stringify(tempObject, null, '\t');
	return tempText;

}

function getMsketchInfoForPlane(){
	var tempData = JSON.parse( getMsketchInfo() );

	tempData.type = "Sketch";

	tempData.sketch = tempData.sketches[findCurrentAssemblyNum()];
	delete tempData.sketches;

	var tempText = JSON.stringify(tempData, null, '\t');
	return tempText;
}


function saveAssemblyPositions(){
	// save positions
	for(var i=0; i<AssemblyGroupList.length; i++){
		AssemblyGroupList[i].savePositions();
		AssemblyGroupList[i].onStart();
		AssemblyGroupList[i].flushTrajectories();

		var _actuatorList = AssemblyGroupList[i].assembly.getAllActuator();
		for(var ai in _actuatorList.array){
			var a = _actuatorList.get(ai);
			if(a instanceof JointActuator){
				a.setValue(0);
			}
		}
		AssemblyGroupList[i].calculateAssembly();
	}
}

function restoreAssemblyPositions(){
	for(var i=0; i<AssemblyGroupList.length; i++){
		AssemblyGroupList[i].onEnd();
		AssemblyGroupList[i].restorePositions();
		AssemblyGroupList[i].initTrajectories();
		AssemblyGroupList[i].calculateAssembly();
	}
}

function saveAsText(filename, data){
    var blob = new Blob([data], {type: 'text/plane;charset=utf-8'});
    if(window.navigator.msSaveOrOpenBlob) {
        window.navigator.msSaveBlob(blob, filename);
    }
    else{
        var elem = window.document.createElement('a');
        elem.href = window.URL.createObjectURL(blob);
        elem.download = filename;
        document.body.appendChild(elem)
        elem.click();
        document.body.removeChild(elem);
    }
}
