// =============================================================================
// 							Assembly Group Class
// =============================================================================
// from m.sketch 2.4 java
// updated on 2015.11.02

/**
* This is a class for organizing Assembly class in Three.js environment.
*/

function AssemblyGroup(){
    // for elements
    this.assembly 		= new Assembly();
    this.mechCalc 		= new MechanismCalculator();
    this.space 			= new Space();
    this.trajectoryList = new ArrayList();
    this.optimizedPath 	= new Trajectory();
    this.loadList 		= new ArrayList();

    // for THREE.JS
    this.group 			= new THREE.Object3D();
    this.plane;
    this.mousePlane;
    this.selectCube;
    this.sbGrid;
    this.mmGrid;
    this.axis;

    this.frame;

    this.anchorMaterial 	= new THREE.MeshBasicMaterial({ map: (new THREE.TextureLoader()).load('./public/res/anchor.png'),
                                                            side: THREE.DoubleSide,
                                                            transparent: true,
                                                            depthWrite: false,
                                                            depthTest: false });
    this.loadMaterial 	= new THREE.MeshBasicMaterial({ map: (new THREE.TextureLoader()).load('./public/res/load.png'), 	side: THREE.DoubleSide,
                                                            transparent: true,
                                                            depthWrite: false,
                                                            depthWrite: false,
                                                            depthTest: false });

    this.objectList 		= [];
    this.lengthList			= [];
    this.actuatorObjList  	= [];
    this.trajectoryObjList  = [];
    this.gearObjList		= [];
    this.loadObjList 		= [];

    this.segmentHoverGeometry;
    this.segmentHoverObject;
    this.segmentSelectedGeometry;
    this.segmentSelectedObject;

    this.optPathGeometry;
    this.optPathObject;


    this.prevElementsNum = 0;
    this.isHidingText = false;
    this.isRemoveText = false;
    this.needsUpdate = false;

    // CONSTRUCTOR

    this.assembly.addSpace(this.space);
    this.drawPlane();
    this.drawSelection();

}

AssemblyGroup.PLANE_SIZE 				= 1000;
AssemblyGroup.GRID_GAP					= 100;
AssemblyGroup.PLANE_COLOR 				= 0x6a3fc4;
AssemblyGroup.PLANE_OPA 				= 0.2;
AssemblyGroup.NUM_OF_GRID 				= 50;

AssemblyGroup.CUBE_SIZE 				= 30;
AssemblyGroup.CUBE_OPA 					= 0.5;

AssemblyGroup.GRID_OPA 					= 0.1;
AssemblyGroup.SBGRID_OPA 				= 0.5;

AssemblyGroup.SEGMENT_HOVER_OPA 		= 0.5;
AssemblyGroup.SEGMENT_SELECTED_OPA 		= 1;




// DECLARATION & UPDATE
AssemblyGroup.prototype.init = function(){
    this.load();
    this.showGrid();
    this.hideSBGrid();
    this.onStart();
    scene.add(this.group);
}

AssemblyGroup.prototype.remove = function(){
    scene.remove(this.group);
}

AssemblyGroup.prototype.load = function(){
    this.loadElements();
    this.loadActuators();
    this.loadTrajectories();
    this.loadOptPath();
    this.loadLoads();
}
AssemblyGroup.prototype.updateRender = function(){
    this.prevElementsNum = 0;
    this.loadElements();
}

AssemblyGroup.prototype.update = function(){
    this.updateElements();
    this.updateActuators();
    this.updateTrajectories();
    this.updateOptPath();
    this.updateLoads();
}

AssemblyGroup.prototype.onStart = function(){
    this.mechCalc.onStart(this.assembly);
}
AssemblyGroup.prototype.onEnd = function(){
    this.mechCalc.onEnd(this.assembly);
}

// RETURNS
AssemblyGroup.prototype.getAssembly = function(){
    return this.assembly;
}
AssemblyGroup.prototype.getSpace = function(){
    return this.space;
}
AssemblyGroup.prototype.getMousePlane = function(){
    return this.mousePlane;
}
AssemblyGroup.prototype.getPlane = function(){
    return this.plane;
}
AssemblyGroup.prototype.getTrajectory = function(){
    return this.trajectoryList;
}
AssemblyGroup.prototype.getSelection = function(){
    return this.selectCube;
}

// DRAW COMMON FEATURES
AssemblyGroup.prototype.drawPlane = function(){
    var planeGeometry = new THREE.PlaneGeometry( AssemblyGroup.PLANE_SIZE, AssemblyGroup.PLANE_SIZE );
    var planeMaterial = new THREE.MeshBasicMaterial( { color: AssemblyGroup.PLANE_COLOR, side: THREE.DoubleSide, transparent: true, opacity: AssemblyGroup.PLANE_OPA,  depthWrite: false, depthTest: false } );

    this.group = new THREE.Object3D();
    this.plane = new THREE.Mesh( planeGeometry, planeMaterial );
    this.group.add( this.plane );

    planeGeometry = new THREE.PlaneGeometry( 9999, 9999 );
    planeMaterial = new THREE.MeshBasicMaterial( { color: AssemblyGroup.PLANE_COLOR, side: THREE.DoubleSide, transparent: true, opacity: 0,  depthWrite: false, depthTest: false } );

    this.mousePlane = new THREE.Mesh( planeGeometry, planeMaterial );
    this.group.add( this.mousePlane );


    this.mmGrid = new THREE.GridHelper( AssemblyGroup.GRID_GAP*AssemblyGroup.NUM_OF_GRID, AssemblyGroup.NUM_OF_GRID ); // dimension, number
    this.mmGrid.material.opacity = AssemblyGroup.GRID_OPA;
    this.mmGrid.material.transparent = true;
    this.mmGrid.material.depthWrite = false;
    this.mmGrid.material.depthTest = false;
    this.mmGrid.rotation.x = Math.PI/2;
    this.group.add( this.mmGrid );


    this.sbGrid = new THREE.GridHelper( SCIENCEBOX_SNAP*AssemblyGroup.NUM_OF_GRID, AssemblyGroup.NUM_OF_GRID , EDISON_COLOR, EDISON_COLOR);
    this.sbGrid.material.opacity = AssemblyGroup.SBGRID_OPA;
    this.sbGrid.material.transparent = true;
    this.sbGrid.material.depthWrite = false;
    this.sbGrid.material.depthTest = false;
    this.sbGrid.rotation.x = Math.PI/2;
    //this.sbGrid.setColors(0x671eac, 0x671eac);
    this.group.add( this.sbGrid );

    this.axis = new THREE.AxisHelper();
    this.axis.position.set( 0, 0, 0 );
    this.axis.scale.set(100, 100, 100);
    this.group.add( this.axis );
}

AssemblyGroup.prototype.drawSelection = function(){
    var _geometry = new THREE.SphereGeometry( AssemblyGroup.CUBE_SIZE, AssemblyGroup.CUBE_SIZE, AssemblyGroup.CUBE_SIZE );
    var _material = new THREE.MeshLambertMaterial( { color: EDISON_COLOR, transparent: true, opacity: AssemblyGroup.CUBE_OPA} )
    this.selectCube = new THREE.Mesh( _geometry, _material );
    this.group.add(this.selectCube);
    this.selectCube.visible = false;

    var vertices = new Float32Array(6);
    _material = new THREE.LineBasicMaterial( { color: HOVER_COLOR, side: THREE.DoubleSide, linewidth: 2, transparent: true} );
    this.segmentHoverGeometry = new THREE.BufferGeometry();
    this.segmentHoverGeometry.addAttribute( 'position', new THREE.BufferAttribute( vertices , 3 ).setDynamic( true ) );
    this.segmentHoverObject = new THREE.Line( this.segmentHoverGeometry, _material );
    this.group.add(this.segmentHoverObject);
    this.segmentHoverObject.position.set( 0, 0, 0.5 );

    _material = new THREE.LineBasicMaterial( { color: SELECTED_COLOR, side: THREE.DoubleSide, linewidth: 2, transparent: true} );
    this.segmentSelectedGeometry = new THREE.BufferGeometry();
    this.segmentSelectedGeometry.addAttribute( 'position', new THREE.BufferAttribute( vertices , 3 ).setDynamic( true ) );
    this.segmentSelectedObject = new THREE.Line( this.segmentSelectedGeometry, _material );
    this.group.add(this.segmentSelectedObject);
    this.segmentSelectedObject.position.set( 0, 0, 0.5 );
}

// VISIBILITY
AssemblyGroup.prototype.showPlane = function(){
    this.plane.material.opacity = AssemblyGroup.PLANE_OPA;
    this.setOpacity(1);
    this.showText();
    this.showGrid();
}
AssemblyGroup.prototype.hidePlane = function(){
    this.plane.material.opacity = 0;
    this.setOpacity(DISABLED_PLANE_OPA);
    this.hideText();
    this.hideGrid();
}

AssemblyGroup.prototype.showGrid = function(){
    this.mmGrid.material.opacity = AssemblyGroup.GRID_OPA;
    this.axis.visible = true;
}

AssemblyGroup.prototype.hideGrid = function(){
    this.mmGrid.material.opacity = 0;
    this.axis.visible = false;
}


AssemblyGroup.prototype.showSBGrid = function(){
    if(isScienceBoxSanpOn){
        this.sbGrid.material.opacity = AssemblyGroup.SBGRID_OPA;
    }else{
        this.sbGrid.material.opacity = 0;
    }
    this.hideGrid();
}

AssemblyGroup.prototype.hideSBGrid = function(){
    this.sbGrid.material.opacity = 0;
    this.showGrid();
}

AssemblyGroup.prototype.showCube = function(){
    //this.selectCube.material.opacity = AssemblyGroup.CUBE_OPA;
    this.selectCube.visible = true;
}
AssemblyGroup.prototype.hideCube = function(){
    //this.selectCube.material.opacity = 0;
    this.selectCube.visible = false;
}

AssemblyGroup.prototype.showText = function(){
    this.isHidingText = false;
}

AssemblyGroup.prototype.hideText = function(){
    this.isHidingText = true;
}


AssemblyGroup.prototype.setSettings = function(_settings){
    if(msketchSettings.showGrid)	this.group.add( this.mmGrid );
    else 							this.group.remove( this.mmGrid );

    if(msketchSettings.showPlane)	this.group.add( this.plane );
    else 							this.group.remove( this.plane );

    this.isRemoveText = !msketchSettings.showText;

    var _planeSacle =  ( msketchSettings.planeSize/SCALE_TRANS ) / AssemblyGroup.PLANE_SIZE;
    this.plane.scale.set( _planeSacle, _planeSacle, 1 );

    var _gridSacle =  ( msketchSettings.gridGap/SCALE_TRANS ) / AssemblyGroup.GRID_GAP;
    this.mmGrid.scale.set( _gridSacle, 1, _gridSacle );
}


AssemblyGroup.prototype.setOpacity = function(_opa){
    for(var i=0; i<this.group.children.length; i++){
        if( this.group.children[i] != this.plane 	&& this.group.children[i] != this.mousePlane 	&& this.group.children[i] != this.plane 		&&
            this.group.children[i] != this.mmGrid 	&& this.group.children[i] != this.sbGrid 		&& this.group.children[i] != this.selectCube	&& this.group.children[i] != this.axis ){

            if(this.group.children[i].material!=null){
                this.group.children[i].material.transparent = true;
                this.group.children[i].material.opacity = _opa;
            }

            if(this.group.children[i].children.length>1){
                for(j=0; j<this.group.children[i].children.length; j++){
                    this.group.children[i].children[j].material.transparent = true;
                    this.group.children[i].children[j].material.opacity = _opa;
                }
            }
        }

    }
}

AssemblyGroup.prototype.setPlane = function(_z){
    this.group.position.z = _z;
}
AssemblyGroup.prototype.getPositionData = function(){
    var _data = new Object(); // object로 변경
    _data.tx = parseFloat(this.group.position.x);
    _data.ty = parseFloat(this.group.position.y);
    _data.tz = parseFloat(this.group.position.z);
    _data.rx = parseFloat(this.group.rotation.x);
    _data.ry = parseFloat(this.group.rotation.y);
    _data.rz = parseFloat(this.group.rotation.z);
    return _data;
}

AssemblyGroup.prototype.setPositionData = function(_data){

    this.group.position.x = parseFloat(_data.tx);
    this.group.position.y = parseFloat(_data.ty);
    this.group.position.z = parseFloat(_data.tz);
    this.group.rotation.x = parseFloat(_data.rx);
    this.group.rotation.y = parseFloat(_data.ry);
    this.group.rotation.z = parseFloat(_data.rz);

}


AssemblyGroup.prototype.savePositions = function(){
    this.assembly.savePositions();
}
AssemblyGroup.prototype.restorePositions = function(){
    this.assembly.restorePositions();
}

AssemblyGroup.prototype.calculateAssembly = function(){
    return this.mechCalc.calculateAssembly(this.assembly);
}

AssemblyGroup.prototype.actuateAll = function(_angle){
    for(var ai in this.assembly.getAllActuator().array){
        var a = this.assembly.getAllActuator().get(ai);

        if(!a.isServo){ // is dc
            var actuatingAngle = _angle*a.getSpeedMultiply();
            actuatingAngle = (a.getReverse())? actuatingAngle-a.getPhase():-actuatingAngle-a.getPhase();

            a.setValue(-actuatingAngle);
        }else{ // is servo
            var actuatingAngle = _angle*a.getSpeedMultiply();

            var startAngle 	= a.getStartAngle() + a.getPhase();
            var endAngle 	= a.getEndAngle() + a.getPhase();

            /*
            if(startAngle > endAngle){
                var tempAngle 	= startAngle;
                startAngle 		= endAngle;
                endAngle 		= tempAngle;
            }
            */
            if(startAngle==endAngle) return;
            var servoAngle = startAngle+(endAngle-startAngle)/2 - (endAngle-startAngle)/2 * Math.cos( actuatingAngle/2 * (2*Math.PI/(endAngle-startAngle)) );

            a.setValue(servoAngle);

        }

    }

    return this.calculateAssembly();
}

AssemblyGroup.prototype.setAllActuator = function(_angle){ // Not in use
    for(var ai in this.assembly.getAllActuator().array){
        var a = this.assembly.getAllActuator().get(ai);
        if(a.name == _name){
            a.setValue(_angle);
        }
    }
    return this.calculateAssembly();
}

AssemblyGroup.prototype.actuateByName = function(_name, _angle){ // Not in use
    for(var ai in this.assembly.getAllActuator().array){
        var a = this.assembly.getAllActuator().get(ai);
        if(a.name == _name){
            a.setValue(_angle);
        }
    }
    return this.calculateAssembly();
}

AssemblyGroup.prototype.getAllActuator = function(){
    return this.assembly.getAllActuator();
}

AssemblyGroup.prototype.recordTrajectories = function(){
    for (var ti in this.trajectoryList.array) {
      var t=this.trajectoryList.get(ti);
      t.record();
    }
}

AssemblyGroup.prototype.flushTrajectories = function(){
    for (var ti in this.trajectoryList.array) {
      var t=this.trajectoryList.get(ti);
      t.flush();
    }
}

AssemblyGroup.prototype.initTrajectories = function(){
    for (var ti in this.trajectoryList.array) {
      var t=this.trajectoryList.get(ti);
      t.init();
    }
}

AssemblyGroup.prototype.newTrajectory = function(_point){
    this.trajectoryList.add(new Trajectory(this.assembly, _point));
}

AssemblyGroup.prototype.newLoad = function(_point){
    this.loadList.add(new Load(this.assembly, _point));
}



// ===== DRAWING ELEMENTS =====
AssemblyGroup.prototype.loadElements = function(){

    var elementList = this.assembly.getAllElement();
    if(elementList==null) return;

    // check is it changed?
    var toBeChanged = false;
    if(elementList.array.length!=this.prevElementsNum) toBeChanged = true;

    for(var ei in elementList.array){
        var e = elementList.get(ei);
        if(e instanceof Space){
            if(e.pointIsChanged()){
                toBeChanged = true;
            }
        }
        else if(e instanceof Link){
            if(e.vertexIsChanged() || e.pointIsChanged()){
                toBeChanged = true;
            }
        }
    }

    // force to refresh
    if(this.needsUpdate){
        this.needsUpdate = false;
        toBeChanged = true;
    }

    if(!toBeChanged) return;

    // start drawing
    this.resetElements( this.objectList );
    this.resetElements( this.lengthList );
    this.objectList 	= [];
    this.lengthList 	= [];

    for(var ei in elementList.array){
        var e = elementList.get(ei);
        if(e instanceof Space){
            for(var pi in e.getPointList().array){
                var p = e.getPointList().get(pi);
                var coordinate = e.getGlobalPosition(p);

                this.objectList.push( new Anchor3D(p, coordinate.getX(), coordinate.getY(), this.group, this.anchorMaterial ) );
            }
            e.pushPoint();
        }
        else if(e instanceof Link){
            var v = e.getGlobalVertex();
            if(viewMode == 0) 		var vertices = this.getLinkVertex(v);
            else if(viewMode == 1)	var vertices = this.getLinkVertex( e.getGlobalRoundedVertex(0) );

            this.objectList.push( new Link3D(e, vertices, this.group ) );

            if(!this.isRemoveText && !e.isSlider){
                for(var i=0; i<v.length/4; i++){
                    var _x = (v[i*4+0]+v[i*4+2])/2;
                    var _y = (v[i*4+1]+v[i*4+3])/2;

                    this.lengthList.push( new Text3D(e, _x, _y, this.group ) );
                }
            }

            for(var pi in e.getPointList().array){
                var p = e.getPointList().get(pi);
                var coordinate = e.getGlobalPosition(p);

                if(!e.isSlider || (e.isSlider && pi == 0)){
                    this.objectList.push( new Point3D(p, coordinate.getX(), coordinate.getY(), this.group ) );
                }

            }
            e.pushPoint();
            e.pushVertex();
        }
    }

    this.prevElementsNum = elementList.array.length;
}

AssemblyGroup.prototype.updateElements = function(){

     var elementList = this.assembly.getAllElement();
     if(elementList==null) return;

     for(var ei in elementList.array){
        var e = elementList.get(ei);
        if(e instanceof Space){
            for(var pi in e.getPointList().array){
                var p = e.getPointList().get(pi);
                var coordinate = e.getGlobalPosition(p);

                var obj = this.findObjectFromElement(p);
                if(obj instanceof Anchor3D){
                    obj.setPosition( coordinate.getX(), coordinate.getY() );

                    if(p == hoverPoint){
                        obj.setColor(HOVER_COLOR);
                        //obj.setScale(AssemblyGroup.HOVER_SCALE);
                    }
                    else if(p == selectedPointTg){
                        obj.setColor(SELECTED_COLOR);
                        //obj.setScale(AssemblyGroup.SELECTED_SCALE);
                    }
                    else{
                        obj.setColor(NORMAL_COLOR);
                        //obj.setScale(1);
                    }
                }
            }
        }
        else if(e instanceof Link){
            var v = e.getGlobalVertex();
            if(viewMode == 0) 		var vertices = this.getLinkVertex(v);
            else if(viewMode == 1)	var vertices = this.getLinkVertex( e.getGlobalRoundedVertex(0) );

            var v3D = e.getGlobalRoundedVertex(0); // for 3D rounded
            var vertices3D = this.getLinkVertex(v3D);

            var obj = this.findObjectFromElement(e);
            if(obj instanceof Link3D){
                obj.setVertices( vertices, vertices3D );

                if(e == hoverLink)										obj.setColor(HOVER_COLOR);
                else if(this.assembly.getUnspecified().contains(e))		obj.setColor(ERROR_COLOR);
                else	 												obj.setColor(NORMAL_COLOR);
            }

            if(!this.isRemoveText && !e.isSlider){
                for(var i=0; i<v.length/4; i++){
                    var _x = (v[i*4+0]+v[i*4+2])/2+120;
                    var _y = (v[i*4+1]+v[i*4+3])/2-20;

                    if(this.findLengthListFromElement(e) != null){
                        var obj = this.findLengthListFromElement(e)[i];
                        if(obj instanceof Text3D){
                            obj.setPosition(_x, _y);
                            obj.setText( (e.getLength(i)/10).toFixed(2) + "mm\nSB: " + (e.getLength(i)/(SCIENCEBOX_SNAP)).toFixed(1) );

                            if(this.isHidingText){
                                obj.setOpacity(0);
                            }else{
                                obj.setOpacity(1);
                            }

                            if(v.length/4==2 && i==1){
                                obj.setOpacity(0);
                            }
                        }
                    }
                }
            }

            for(var pi in e.getPointList().array){
                var p = e.getPointList().get(pi);
                var coordinate = e.getGlobalPosition(p);

                if(!e.isSlider || (e.isSlider && pi == 0)){
                    var obj = this.findObjectFromElement(p);

                    if(obj instanceof Point3D){
                        obj.setPosition( coordinate.getX(), coordinate.getY() );

                        if(p == hoverPoint){
                            obj.setColor(HOVER_COLOR);
                        }
                        else if(p == selectedPointTg){
                            obj.setColor(SELECTED_COLOR);
                        }
                        else{
                            obj.setColor(NORMAL_COLOR);
                        }
                    }
                }
            }
        }
    }
}

AssemblyGroup.prototype.loadActuators = function(){
    this.resetElements(this.actuatorObjList);
    this.actuatorObjList = [];

    var _actuatorList = this.assembly.getAllActuator();
    if(_actuatorList==null) return;

    for(var ai in _actuatorList.array){
        var a = _actuatorList.get(ai);
        if(a instanceof JointActuator){
            var x = this.assembly.getBelongedLink(a.getOriginPoint()).getGlobalPosition(a.getOriginPoint()).getX();
            var y = this.assembly.getBelongedLink(a.getOriginPoint()).getGlobalPosition(a.getOriginPoint()).getY();

            this.actuatorObjList.push( new Actuator3D( a, x, y, this.group ) );
        }
    }
}
AssemblyGroup.prototype.updateActuators = function(){
    var _actuatorList = this.assembly.getAllActuator();
    if(_actuatorList==null) return;

    for(var ai in _actuatorList.array){
        var a = _actuatorList.get(ai);
        if(a instanceof JointActuator){
            var x = this.assembly.getBelongedLink(a.getOriginPoint()).getGlobalPosition(a.getOriginPoint()).getX();
            var y = this.assembly.getBelongedLink(a.getOriginPoint()).getGlobalPosition(a.getOriginPoint()).getY();
            var lastAngle = a.getValue();

            var obj = this.findActObjFromActuator(a);
            if(obj instanceof Actuator3D){
                obj.showServoAngle( a.getStartAngle()+a.getPhase(), a.getEndAngle()+a.getPhase(), this.group);
                obj.setPosition( x, y );
                obj.setAngle( -lastAngle );

                if(this.isHidingText){
                    obj.setTextOpacity(0);
                }else{
                    obj.setTextOpacity(1);
                }

                if(a == hoverActuator){
                    obj.setColor(EDISON_COLOR);
                    //obj.setScale(AssemblyGroup.HOVER_SCALE);
                }
                else if(a == pointedActuator){
                    obj.setColor(SELECTED_COLOR);
                    //obj.setScale(AssemblyGroup.POINTED_ACTUATOR_SCALE);
                }
                else{
                    obj.setColor(ACTUATOR_COLOR);
                    //obj.setScale(1);
                }
            }
        }
    }
}

AssemblyGroup.prototype.loadTrajectories = function(){
    this.resetElements(this.trajectoryObjList);
    this.trajectoryObjList = [];

    if(this.trajectoryList==null) return;

    for (var ti in this.trajectoryList.array) {
        var t=this.trajectoryList.get(ti);

        t.init();

        var vertices = new Float32Array(MAX_TRAJECTORY_SIZE);


        for(var i =0; i<vertices.length; i++){
            vertices[i] = Math.random();
        }

        this.trajectoryObjList.push( new Trajectory3D(t, vertices, t.gpoint.getX(), t.gpoint.getY(), this.group) );

    }
}
AssemblyGroup.prototype.updateTrajectories = function(){
    var interval = 1;

    for (var ti in this.trajectoryList.array) {
        var t = this.trajectoryList.get(ti);

        var pointNum = t.getTrajectory().length();

        var obj = this.findTrgObjFromTrajectory(t);
        if(obj instanceof Trajectory3D){

            if(pointNum>5 && (pointNum/interval)*3 < MAX_TRAJECTORY_SIZE){
                var vertices = new Float32Array((pointNum/interval)*3);

                var j=0;
                for(var i=0; i<pointNum; i+=interval){
                    if(t.getTrajectory().get(i)!=null){
                        vertices[j] = t.getTrajectory().get(i).getX();
                        vertices[j+1] = t.getTrajectory().get(i).getY();
                        vertices[j+2] = Trajectory3D.Z_POS;
                        j+=3;
                    }
                }

                obj.setVertices(vertices);
                obj.setDrawRange( 0, pointNum/interval );
            }

            obj.setPosition( t.gpoint.getX(), t.gpoint.getY() );
        }
    }
}
AssemblyGroup.prototype.loadOptPath = function(){
    this.group.remove(this.optPathObject);

    var segments = 18;

    if(this.optimizedPath.getTrajectory() == null) return;

    var t=this.optimizedPath;

    t.init();

    var vertices = new Float32Array(MAX_TRAJECTORY_SIZE);

    var curveMaterial = new THREE.LineBasicMaterial( { color: OPT_PATH_COLOR , side: THREE.DoubleSide, linewidth: 2 } );

    this.optPathGeometry = new THREE.BufferGeometry();
    this.optPathGeometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ).setDynamic( true ) );
    this.optPathGeometry.setDrawRange( 0, 0 );
    this.optPathObject = new THREE.Line ( this.optPathGeometry , curveMaterial )

    this.group.add( this.optPathObject );
}
AssemblyGroup.prototype.updateOptPath = function(){
    var interval = 1;

    var t = this.optimizedPath;

    if(t.getTrajectory() == null) return;

    var pointNum = t.getTrajectory().length();

    if(pointNum>5 && (pointNum/interval)*3 < MAX_TRAJECTORY_SIZE){
        var vertices = new Float32Array((pointNum/interval)*3);

        var j=0;
        for(var i=0; i<pointNum; i+=interval){
            if(t.getTrajectory().get(i)!=null){
                vertices[j] = t.getTrajectory().get(i).getX();
                vertices[j+1] = t.getTrajectory().get(i).getY();
                vertices[j+2] = -1;
                j+=3;
            }
        }

        this.optPathGeometry.attributes.position.array = vertices;
        this.optPathGeometry.setDrawRange( 0, pointNum/interval );
        this.optPathGeometry.attributes.position.needsUpdate = true;

    }
}


// Load and Update Load Function
AssemblyGroup.prototype.loadLoads = function(){
    this.resetElements(this.loadObjList);
    this.loadObjList = [];

    if(this.loadList==null) return;

    for (var ti in this.loadList.array) {
        var t=this.loadList.get(ti);
        t.init();
        this.loadObjList.push( new Load3D(t, t.gpoint.getX(), t.gpoint.getY(), this.group, this.loadMaterial) );
    }
}

AssemblyGroup.prototype.updateLoads = function(){
    for (var ti in this.loadList.array) {
        var t = this.loadList.get(ti);
        var obj = this.findLoadObjFromLoad(t);
        if(obj instanceof Load3D){
            obj.setPosition( t.gpoint.getX(), t.gpoint.getY() );
        }
  }
}



// for selection of link
AssemblyGroup.prototype.drawHoverSegment = function(_x, _y){
  var targetLink = getLinkByPosition(_x, _y);

  if( targetLink!=null){

    if(targetLink.isSlider) return false;

    var pointPair = findPointPair(targetLink, _x, _y);

    var vertices = new Float32Array(6);

    if(pointPair!=null){
      vertices[0] = targetLink.getGlobalPosition(pointPair[0]).getX();
      vertices[1] = targetLink.getGlobalPosition(pointPair[0]).getY();
      vertices[2] = 0;
      vertices[3] = targetLink.getGlobalPosition(pointPair[1]).getX();
      vertices[4] = targetLink.getGlobalPosition(pointPair[1]).getY();
      vertices[5] = 0;
    }

    this.updateSegmentHover(vertices);
  }
  else{
    this.updateSegmentHover(new Float32Array(6));
  }
}

AssemblyGroup.prototype.updateSegmentHover = function(vertices){
    this.segmentHoverGeometry.attributes.position.array = vertices;
    this.segmentHoverGeometry.attributes.position.needsUpdate = true;
    this.segmentHoverObject.material.opacity = AssemblyGroup.SEGMENT_HOVER_OPA;
}
AssemblyGroup.prototype.setSegmentSelected = function(_link, _pair){
    var vertices = new Float32Array(6);

    if(_pair!=null){
      vertices[0] = _link.getGlobalPosition(_pair[0]).getX();
      vertices[1] = _link.getGlobalPosition(_pair[0]).getY();
      vertices[2] = 0;
      vertices[3] = _link.getGlobalPosition(_pair[1]).getX();
      vertices[4] = _link.getGlobalPosition(_pair[1]).getY();
      vertices[5] = 0;
    }

    this.segmentSelectedGeometry.attributes.position.array = vertices;
    this.segmentSelectedGeometry.attributes.position.needsUpdate = true;
    this.segmentSelectedObject.material.opacity = AssemblyGroup.SEGMENT_SELECTED_OPA;
}
AssemblyGroup.prototype.removeSegmentSelected = function(){
    var vertices = new Float32Array(6);
    this.segmentHoverGeometry.attributes.position.array = vertices;
    this.segmentHoverGeometry.attributes.position.needsUpdate = true;
    this.segmentSelectedGeometry.attributes.position.array = vertices;
    this.segmentSelectedGeometry.attributes.position.needsUpdate = true;
}

// Used to convert Link vertext to Float32Array
AssemblyGroup.prototype.getLinkVertex = function(_v){
    var zPos = Link3D.Z_POS;
    var returnVertex = new Float32Array(_v.length*1.5+3);

    var j = 0;
    for(var i = 0; i<returnVertex.length-3; i+=3){
        returnVertex[i] = _v[j];
        returnVertex[i+1] = _v[j+1];
        returnVertex[i+2] = zPos;
        j+=2;
    }
    returnVertex[returnVertex.length-3] = _v[0];
    returnVertex[returnVertex.length-2] = _v[1];
    returnVertex[returnVertex.length-1] = zPos;

    return returnVertex;
}

AssemblyGroup.prototype.findObjectFromElement = function(_e){
    for(var i=0; i<this.objectList.length; i++){
        if(this.objectList[i].findFromElement(_e)){
            return this.objectList[i];
        }
    }
    return null;
}
AssemblyGroup.prototype.findActObjFromActuator = function(_a){
    for(var i=0; i<this.actuatorObjList.length; i++){
        if(this.actuatorObjList[i].findFromElement(_a)){
            return this.actuatorObjList[i];
        }
    }
    return null;
}
AssemblyGroup.prototype.findTrgObjFromTrajectory = function(_t){
    for(var i=0; i<this.trajectoryObjList.length; i++){
        if(this.trajectoryObjList[i].findFromElement(_t)){
            return this.trajectoryObjList[i];
        }
    }
    return null;
}

AssemblyGroup.prototype.findLoadObjFromLoad = function(_l){
    for(var i=0; i<this.loadObjList.length; i++){
        if(this.loadObjList[i].findFromElement(_l)){
            return this.loadObjList[i];
        }
    }
    return null;
}

AssemblyGroup.prototype.findLengthListFromElement = function(_e){
    var returnValue = [];

    for(var i=0; i<this.lengthList.length; i++){
        if(this.lengthList[i].findFromElement(_e)){
            returnValue.push( this.lengthList[i] );
        }
    }

    if(returnValue.length != 0) return returnValue;

    return null;
}
AssemblyGroup.prototype.resetElements = function(_objArray){
    // Reset Geometry and Objects
    for(var i = 0; i < _objArray.length; i++){
        _objArray[i].remove( this.group );
    }

    //**********************
    //*TRASH COLLECTOR
    //*********************

    if ( renderer instanceof THREE.CanvasRenderer ) {

        scene.__lights = { length: 0, push: function(){}, indexOf: function (){ return -1 }, splice: function(){} }
        scene.__objectsAdded = { length: 0, push: function(){}, indexOf: function (){ return -1 }, splice: function(){} }
        scene.__objectsRemoved = { length: 0, push: function(){}, indexOf: function (){ return -1 }, splice: function(){} }

    }
    // End of Reset
}


// added for try360
AssemblyGroup.prototype.try360 = function(){
    this.savePositions();
    this.onStart();
    this.flushTrajectories();

    var step = (2*Math.PI) / OptInterface.SAMPLE_SIZE;
    var maxCost = 0;

    /*
    for(var tempAngle = 0; tempAngle < 2 * Math.PI + step/2; tempAngle+=step){
        for(var aci in this.assembly.getAllActuator().array){
            var ac = this.assembly.getAllActuator().get(aci);
            ac.setValue(tempAngle);
        }

        var d = this.calculateAssembly();
        if(maxCost<d)
          maxCost = d;
        if(d == Number.POSITIVE_INFINITY){
          break;
        }

        this.recordTrajectories();
    }
    */

    for(var tempAngle = 0; tempAngle < 2 * Math.PI + step/2; tempAngle+=step){
        this.actuateAll(tempAngle);

        var d = this.calculateAssembly();
        if(maxCost<d)
          maxCost = d;
        if(d == Number.POSITIVE_INFINITY){
          break;
        }

        if(isPathOptimizing){
            this.trajectoryList.get(baseTrjInd).record();
        }else{
            this.recordTrajectories();
        }

    }



    this.onEnd();
    this.restorePositions();
    this.initTrajectories();

    this.update();
    return maxCost;
}


// Gear 3D
AssemblyGroup.prototype.makeGear = function(){
    this.resetElements(this.gearObjList);
    this.gearObjList = [];

    var _actuatorList = this.assembly.getAllActuator();
    if(_actuatorList==null) return false;

    if(_actuatorList.array.length < 2){
        //showSnackBar("2개 이상의 모터가 필요합니다.", "More than 2 motors are required.");
        return false;
    }
    // currently for pair
    for(var ai in _actuatorList.array){
        var a = _actuatorList.get(ai);
        var ai = parseInt(ai);
        var aNext = _actuatorList.get(ai+1);

        if(a instanceof JointActuator){

            if(aNext!=null){
                var x = this.assembly.getBelongedLink(a.getOriginPoint()).getGlobalPosition(a.getOriginPoint()).getX();
                var y = this.assembly.getBelongedLink(a.getOriginPoint()).getGlobalPosition(a.getOriginPoint()).getY();

                var xNext = this.assembly.getBelongedLink(aNext.getOriginPoint()).getGlobalPosition(aNext.getOriginPoint()).getX();
                var yNext = this.assembly.getBelongedLink(aNext.getOriginPoint()).getGlobalPosition(aNext.getOriginPoint()).getY();

                var dist = MMath.dist( new Point2D(x, y), new Point2D(xNext, yNext) );

                var speed = a.getSpeedMultiply();
                var speedNext = aNext.getSpeedMultiply();

                var radius = dist * speedNext / (speed + speedNext);
                var radiusNext = dist * speed / (speed + speedNext);

                var interGearRadius = SCIENCEBOX_SNAP * 0.5;
                var interX = x + (xNext - x) * speedNext / (speed + speedNext);
                var interY = y + (yNext - y) * speed / (speed + speedNext);

                if(a.getReverse() == aNext.getReverse()){
                    this.gearObjList.push( new Gear3D(x, y, radius - interGearRadius, ai+1) );
                    this.gearObjList.push( new Gear3D(xNext, yNext, radiusNext - interGearRadius, ai+1) );

                    this.gearObjList.push( new Gear3D(interX, interY, interGearRadius, ai+1) );
                }else{
                    this.gearObjList.push( new Gear3D(x, y, radius, ai+1) );
                    this.gearObjList.push( new Gear3D(xNext, yNext, radiusNext, ai+1) );
                }
            }

        }
    }
}

AssemblyGroup.prototype.removeGear = function(){
    this.resetElements(this.gearObjList);
    this.gearObjList = [];
}

function Gear3D(_x, _y, _r, _z, _a){
    this.gear = new Gear();
    this.gear.setRadius(_r);
    this.gear.setPoint(new Point2D(_x, _y));
    this.stack = _z;
    this.gearObject = null

    this.createShape(currentAssemblyGroup.group);
}

Gear3D.HEIGHT			= 30;
Gear3D.EXTRUDE_SET		= {
                            steps: 1,
                            amount: Gear3D.HEIGHT,
                            bevelEnabled: false
                        };
Gear3D.HOLE_SIZE		= 20;

Gear3D.prototype.createShape = function(_group){
    _vertices = this.gear.getVertices();

    this.shape = new THREE.Shape();
    this.shape.moveTo(_vertices[0], _vertices[1]);
    for(var i=0; i<_vertices.length; i+=3){
        this.shape.lineTo(_vertices[i], _vertices[i+1]);
    }
    this.shape.lineTo(_vertices[0], _vertices[1]);

    this.gearGeometry = new THREE.ExtrudeGeometry( this.shape, Gear3D.EXTRUDE_SET );
    this.gearMaterial = new THREE.MeshStandardMaterial( {color: 0xC0C0C0, transparent: true, blending: THREE.MultiplyBlending } );
    //this.gearObject = new THREE.Mesh( this.gearGeometry, this.gearMaterial ) ;

    var gear3Dbsp = new ThreeBSP( this.gearGeometry );

    // making hole
    var holeGeometry = new THREE.CylinderGeometry( Gear3D.HOLE_SIZE, Gear3D.HOLE_SIZE, Gear3D.HEIGHT+1, 16 );
    holeGeometry.rotateX( -Math.PI/2 );
    holeGeometry.translate(0, 0, Gear3D.HEIGHT/2);
    var holeMesh = new THREE.Mesh( holeGeometry, this.gearMaterial );

    gear3Dbsp = gear3Dbsp.subtract( new ThreeBSP( holeMesh ) );


    if(this.gear.radius > SCIENCEBOX_SNAP * 1.2){
        holeMesh.position.set(SCIENCEBOX_SNAP, 0, 0);
        gear3Dbsp = gear3Dbsp.subtract( new ThreeBSP( holeMesh ) );
        holeMesh.position.set(-SCIENCEBOX_SNAP, 0, 0);
        gear3Dbsp = gear3Dbsp.subtract( new ThreeBSP( holeMesh ) );
    }

    this.gearObject = gear3Dbsp.toMesh( this.gearMaterial );

    this.gearObject.position.set(this.gear.getPoint().getX(), this.gear.getPoint().getY(), - this.stack * Gear3D.HEIGHT);

    _group.add(this.gearObject);
}

Gear3D.prototype.remove = function(_group){
    _group.remove( this.gearObject );
}

// frame
AssemblyGroup.prototype.makeFrame = function(_d, _a){

    this.group.remove(this.frame);

    //find max area
    var max = new Point2D(-9999, -9999);
    var min = new Point2D(9999, 9999);

    var elementList = this.assembly.getAllElement();
    if(elementList==null) return;

    for(var ei in elementList.array){
       var e = elementList.get(ei);
       if(e instanceof Space){
           for(var pi in e.getPointList().array){
               var p = e.getPointList().get(pi);
               var coordinate = e.getGlobalPosition(p);

               if(coordinate.getX()>max.getX()){
                max.x = coordinate.getX();
                }
                if(coordinate.getX()<min.getX()){
                    min.x = coordinate.getX();
                }
                if(coordinate.getY()>max.getY()){
                    max.y = coordinate.getY();
                }
                if(coordinate.getY()<min.getY()){
                    min.y = coordinate.getY();
                }
           }
       }
   }

    var margin = 200;
    var frameWidth = max.getX()-min.getX() + margin*2;
    var frameHeight = max.getY()-min.getY() + margin*2;
    var frameThickness = 30;


    var frameX = (max.getX()+min.getX())/2;
    var frameY = (max.getY()+min.getY())/2;

    var frameMaterial = new THREE.MeshStandardMaterial( {color: 0xC0C0C0, transparent: true, blending: THREE.MultiplyBlending } );

    var frontGeometry = new THREE.BoxGeometry( frameWidth, frameHeight, frameThickness );
    var frontMesh = new THREE.Mesh( frontGeometry, frameMaterial );
    frontMesh.position.set( frameX, frameY, 0 );

    var frameBsp = new ThreeBSP( frontMesh );

    // holes
    for(var ei in elementList.array){
       var e = elementList.get(ei);
       if(e instanceof Space){
           for(var pi in e.getPointList().array){
               var p = e.getPointList().get(pi);
               var coordinate = e.getGlobalPosition(p);

               var holeGeometry = new THREE.CylinderGeometry( Gear3D.HOLE_SIZE, Gear3D.HOLE_SIZE, frameThickness+1, 16 );
                holeGeometry.rotateX( -Math.PI/2 );
                holeGeometry.translate(coordinate.getX(), coordinate.getY(), 0);
                var holeMesh = new THREE.Mesh( holeGeometry, frameMaterial );

                frameBsp = frameBsp.subtract( new ThreeBSP( holeMesh ) );
           }
       }
   }

   var maxGearStack = 0;
   for(var gi in this.gearObjList){
      var g = this.gearObjList[gi];

      var coordinate = g.gear.getPoint();

      var holeGeometry = new THREE.CylinderGeometry( Gear3D.HOLE_SIZE, Gear3D.HOLE_SIZE, frameThickness+1, 16 );
       holeGeometry.rotateX( -Math.PI/2 );
       holeGeometry.translate(coordinate.getX(), coordinate.getY(), 0);
       var holeMesh = new THREE.Mesh( holeGeometry, frameMaterial );

       frameBsp = frameBsp.subtract( new ThreeBSP( holeMesh ) );
       maxGearStack = this.gearObjList[gi].stack;
  }
    // anotherSide
    var anotherSideFrame = frameBsp.toMesh( frameMaterial ).clone();
    anotherSideFrame.position.set(frameX, frameY, -_d/SCALE_TRANS);
    frameBsp = frameBsp.union( new ThreeBSP( anotherSideFrame ) );

    // bottom
    var bottomGeometry = new THREE.BoxGeometry( frameWidth, frameThickness, _d/SCALE_TRANS+frameThickness);
    var bottomMesh = new THREE.Mesh( bottomGeometry, frameMaterial );
    bottomMesh.position.set( frameX, frameY-frameHeight/2, -(_d/SCALE_TRANS)/2 );
    frameBsp = frameBsp.union( new ThreeBSP( bottomMesh ) );

    // motorBox

    if(_a != null){
        var _aX = this.assembly.getBelongedLink(_a.getOriginPoint()).getGlobalPosition(_a.getOriginPoint()).getX();
        var _aY = this.assembly.getBelongedLink(_a.getOriginPoint()).getGlobalPosition(_a.getOriginPoint()).getY();

        var motorBoxWidth = 320;
        var motorBoxDepth = 280;
        var motorBoxX = _aX - motorBoxWidth/2 - SCIENCEBOX_SNAP - 45;
        var motorBoxY = _aY - 95 - frameThickness/2;

        var motorBoxGeometry = new THREE.BoxGeometry( motorBoxWidth, frameThickness, motorBoxDepth );
        var motorBoxMesh = new THREE.Mesh( motorBoxGeometry, frameMaterial );

        var motorBoxBsp = new ThreeBSP(motorBoxMesh);

        var sideWidth = frameX - motorBoxX + motorBoxWidth/2 - frameWidth/2 + 100;
        if(sideWidth<motorBoxWidth) sideWidth = motorBoxWidth;
        var sideHeight = motorBoxY - frameY + frameHeight/2 + frameThickness
        var sideX = (sideWidth - motorBoxWidth)/2;
        var sideY = -sideHeight/2 + frameThickness/2

        var motorBoxSideGeometry = new THREE.BoxGeometry( sideWidth, sideHeight, frameThickness );

        var motorBoxSideMesh = new THREE.Mesh( motorBoxSideGeometry, frameMaterial );
        motorBoxSideMesh.position.set(sideX, sideY, -motorBoxDepth/2 + frameThickness/2 )
        motorBoxBsp = motorBoxBsp.union( new ThreeBSP(motorBoxSideMesh) );

        motorBoxSideMesh.position.set(sideX, sideY, +motorBoxDepth/2 - frameThickness/2 )
        motorBoxBsp = motorBoxBsp.union( new ThreeBSP(motorBoxSideMesh) );

        var holeGeometry = new THREE.CylinderGeometry( Gear3D.HOLE_SIZE, Gear3D.HOLE_SIZE, frameThickness+1, 16 );
        var holeMesh = new THREE.Mesh( holeGeometry, frameMaterial );
        holeMesh.position.set(motorBoxWidth/2 - 70, 0, -SCIENCEBOX_SNAP/2);
        var motorBoxBsp = motorBoxBsp.subtract( new ThreeBSP( holeMesh ));

        holeMesh.position.set(motorBoxWidth/2 - 70, 0, +SCIENCEBOX_SNAP/2);
        motorBoxBsp = motorBoxBsp.subtract( new ThreeBSP( holeMesh ));
        holeMesh.position.set(motorBoxWidth/2 - 70 - SCIENCEBOX_SNAP, 0, -SCIENCEBOX_SNAP/2);
        motorBoxBsp = motorBoxBsp.subtract( new ThreeBSP( holeMesh ));
        holeMesh.position.set(motorBoxWidth/2 - 70 - SCIENCEBOX_SNAP, 0, +SCIENCEBOX_SNAP/2);
        motorBoxBsp = motorBoxBsp.subtract( new ThreeBSP( holeMesh ));


        var motorBoxMesh = motorBoxBsp.toMesh( frameMaterial );
        motorBoxMesh.position.set(motorBoxX, motorBoxY, -(_d/SCALE_TRANS)/2 - frameThickness/2);
        frameBsp = frameBsp.union( new ThreeBSP(motorBoxMesh) );

        var motorBottomGeometry = new THREE.BoxGeometry( motorBoxWidth, frameThickness, motorBoxDepth -frameThickness*2);
        var motorBottomMesh = new THREE.Mesh( motorBottomGeometry, frameMaterial );
        motorBottomMesh.position.set(motorBoxX, frameY-frameHeight/2, -(_d/SCALE_TRANS)/2 - frameThickness/2);

        //this.group.add(motorBottomMesh)
        frameBsp = frameBsp.subtract( new ThreeBSP(motorBottomMesh) );

    }
    //bottomMesh.position.set( frameX, frameY-frameHeight/2, -(_d/SCALE_TRANS)/2 );
    //frameBsp = frameBsp.union( new ThreeBSP( bottomMesh ) );

    this.frame = frameBsp.toMesh( frameMaterial );

    this.frame.position.z = -(maxGearStack+0.5) * Gear3D.HEIGHT;

    this.group.add( this.frame );
}

AssemblyGroup.prototype.removeFrame = function(){
    this.group.remove( this.frame );
}
