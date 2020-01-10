// =============================== Drawing Three.js Elements ===========================

// Link
function Link3D(_l, _v, _group){
    this.link = _l;
    this.prevVertex = null;
    this.prevLengths = null;

    this.linkMaterial 	= new THREE.LineBasicMaterial( { color: NORMAL_COLOR , side: THREE.DoubleSide, linewidth: Link3D.LINE_WIDTH } );
    //this.linkMaterial = new THREE.MeshBasicMaterial( {color: 0xff0000} );
    this.linkGeometry	= new THREE.BufferGeometry();
    this.linkGeometry.addAttribute( 'position', new THREE.BufferAttribute( _v, 3 ).setDynamic( true ) );
    this.linkObject		= new THREE.Line( this.linkGeometry, this.linkMaterial );
    //this.linkObject		= new THREE.Mesh( this.linkGeometry, this.linkMaterial );
    _group.add( this.linkObject );


    // for 3D init
    this.stack = this.link.stack;

    this.group3D = new THREE.Object3D();

    this.link3DGeometry = new THREE.Object3D();
    this.link3DMaterial = new THREE.MeshStandardMaterial( {color: 0xC0C0C0, transparent: true, blending: THREE.MultiplyBlending } );
    this.transparentMaterial = new THREE.MeshStandardMaterial({color: 0xffffff, transparent: true, blending: THREE.SubtractiveBlending });
    this.link3DObject = new THREE.Mesh( this.link3DGeometry, this.link3DMaterial ) ;
    this.group3D.add(this.link3DObject);

    this.link3DHoles = new THREE.Object3D();
    this.group3D.add(this.link3DHoles);


}
Link3D.Z_POS 			= 0;
Link3D.LINE_WIDTH		= 2;
Link3D.SHOW_3D 			= false;

Link3D.prototype.remove = function (_group){
    _group.remove( this.linkObject );
}
Link3D.prototype.findFromElement = function(_l){
    if(this.link == _l) 	return true;
    else 					return false;
}
Link3D.prototype.setVertices = function(_vertices, _vertices3D){
    if(JSON.stringify(_vertices) == JSON.stringify(this.prevVertex)) return; // fixed

    this.linkGeometry.attributes.position.array = _vertices;
    this.linkGeometry.attributes.position.needsUpdate = true;
    this.prevVertex = _vertices;



    if(Link3D.SHOW_3D){
        this.createShape(_vertices3D);
    }else{
        this.linkObject.remove(this.group3D);
    }
}
Link3D.prototype.setColor = function(_color){
    this.linkMaterial.color.setHex( _color );
}

// for 3D
Link3D.HEIGHT			= 30;
Link3D.EXTRUDE_SET		= {
                            steps: 1,
                            amount: Link3D.HEIGHT,
                            bevelEnabled: false
                        };
Link3D.HOLE_SIZE		= 20;

Link3D.prototype.createShape = function(_vertices){
    this.linkObject.remove(this.group3D);
    this.group3D.remove(this.link3DObject);
    this.group3D.remove(this.link3DHoles);

    this.shape = new THREE.Shape();
    this.shape.moveTo(_vertices[0], _vertices[1]);
    for(var i=0; i<_vertices.length; i+=3){
        this.shape.lineTo(_vertices[i], _vertices[i+1]);
    }
    this.shape.lineTo(_vertices[0], _vertices[1]);

    this.link3DGeometry = new THREE.ExtrudeGeometry( this.shape, Link3D.EXTRUDE_SET );
    this.link3DObject = new THREE.Mesh( this.link3DGeometry, this.link3DMaterial ) ;
    var link3Dbsp = new ThreeBSP( this.link3DGeometry );

    this.link3DHoles = new THREE.Object3D();
    // creating hole
    for(var pi in this.link.getPointList().array){
        var p = this.link.getPointList().get(pi);
        var coordinate = this.link.getGlobalPosition(p);

        var holeGeometry = new THREE.CylinderGeometry( Link3D.HOLE_SIZE, Link3D.HOLE_SIZE, Link3D.HEIGHT+1, 16 );
        holeGeometry.rotateX( -Math.PI/2 );
        holeGeometry.translate(coordinate.getX(), coordinate.getY(), Link3D.HEIGHT/2);

        var holeMesh = new THREE.Mesh( holeGeometry, this.transparentMaterial );

        if(!isPlaying) link3Dbsp = link3Dbsp.subtract( new ThreeBSP( holeMesh ) )
        //else this.link3DHoles.add(holeMesh); // for check
    }
    if(!isPlaying) this.link3DObject = link3Dbsp.toMesh( this.link3DMaterial );
    //else this.group3D.add(this.link3DHoles);
    this.group3D.add(this.link3DObject);

    this.linkObject.add( this.group3D );

    this.updateStack();
}
Link3D.prototype.setStack = function(_n){
    this.link.stack = _n;
    this.updateStack();
}
Link3D.prototype.updateStack = function(){
    this.stack = this.link.stack;
    this.group3D.position.z = this.stack * Link3D.HEIGHT;
}

// Point
function Point3D(_p, _x, _y, _group){
    this.point 				= _p;

    // for viewMode
    if(viewMode == 0)		Point3D.POINT_SIZE = 10;
    else if(viewMode == 1)	Point3D.POINT_SIZE = (msketchSettings.holeDiameter/SCALE_TRANS)/2;

    this.fillGeometry 		= new THREE.CircleGeometry( Point3D.POINT_SIZE - 0.1, Point3D.SEGMENT );
    //this.fillGeometry.vertices.shift();
    this.fillMaterial 		= new THREE.MeshBasicMaterial( { color: WHITE_COLOR, side: THREE.DoubleSide, transparent: true} );
    this.fillMaterial.opacity = 0;
    this.fillObject			= new THREE.Mesh( this.fillGeometry, this.fillMaterial );
    this.fillObject.position.set( _x, _y, Point3D.Z_POS );

    this.lineGeometry 		= new THREE.CircleGeometry( Point3D.POINT_SIZE, Point3D.SEGMENT );
    this.lineGeometry.vertices.shift();
    this.lineMaterial 		= new THREE.LineBasicMaterial( { color: NORMAL_COLOR, side: THREE.DoubleSide, linewidth: Point3D.LINE_WIDTH } );
    this.lineObject			= new THREE.Line( this.lineGeometry, this.lineMaterial );
    this.lineObject.position.set( _x, _y, Point3D.Z_POS );

    _group.add( this.lineObject );
    _group.add( this.fillObject );
}

Point3D.Z_POS 			= 0.1;
Point3D.POINT_SIZE		= 10;
Point3D.SEGMENT			= 32;
Point3D.LINE_WIDTH		= 2;

Point3D.prototype.remove = function (_group){
    _group.remove( this.lineObject );
    _group.remove( this.fillObject );
}
Point3D.prototype.findFromElement = function(_p){
    if(this.point == _p) 	return true;
    else 					return false;
}
Point3D.prototype.setPosition = function(_x, _y){
    this.fillObject.position.set( _x, _y, Point3D.Z_POS );
    this.lineObject.position.set( _x, _y, Point3D.Z_POS );
}
Point3D.prototype.setScale = function(_scale){
    this.fillObject.scale.set( _scale, _scale, _scale );
    this.lineObject.scale.set( _scale, _scale, _scale );
}
Point3D.prototype.setColor = function(_color){

    if(_color == NORMAL_COLOR){
        this.fillMaterial.color.setHex( 0xffffff );
        this.fillMaterial.opacity = 0;
    }else{
        this.fillMaterial.color.setHex( _color );
        this.fillMaterial.opacity = 0.5;
    }
    //this.lineMaterial.color.setHex( _color );
}

// Anchor
function Anchor3D(_p, _x, _y, _group, _material){
    this.point 				= _p;

    this.anchorGeometry 	= new THREE.PlaneGeometry( Anchor3D.ANCHOR_SIZE, Anchor3D.ANCHOR_SIZE );
    this.anchorObject 		= new THREE.Mesh( this.anchorGeometry, _material );

    this.anchorObject.overdraw = true;
    this.anchorObject.position.set( _x, _y, Anchor3D.Z_POS );
    _group.add( this.anchorObject );

    this.point3D 			= new Point3D( _p, _x, _y, _group );
}

Anchor3D.ANCHOR_SIZE	= 80;
Anchor3D.Z_POS 			= -0.1;


Anchor3D.prototype.remove = function(_group){
    this.point3D.remove( _group );
    _group.remove( this.anchorObject );
}
Anchor3D.prototype.findFromElement = function(_p){
    if(this.point == _p) 	return true;
    else 					return false;
}
Anchor3D.prototype.setPosition = function(_x, _y){
    this.anchorObject.position.set( _x, _y, Anchor3D.Z_POS );
    this.point3D.setPosition( _x, _y );
}
Anchor3D.prototype.setScale = function(_scale){
    this.point3D.setScale( _scale );
}
Anchor3D.prototype.setColor = function(_color){
    this.point3D.setColor( _color );
}

// Text
function Text3D(_l, _x, _y, _group){
    this.link 			= _l;
    this.prevText		= "";

    this.canvas 		= document.createElement('canvas');
    this.canvas.width 	= 256;
    this.canvas.height 	= 128;

    this.context 		= this.canvas.getContext('2d');

    this.texture 		= new THREE.Texture(this.canvas);
    this.texture.needsUpdate = true;

    this.textMaterial   = new THREE.MeshBasicMaterial( {map: this.texture, side:THREE.DoubleSide , transparent: true, depthWrite: false, depthTest: false} );
    this.textGeometry	= new THREE.PlaneGeometry( this.canvas.width, this.canvas.height );
    this.textObject		= new THREE.Mesh( this.textGeometry, this.textMaterial );

    this.textObject.position.set( _x, _y, Text3D.Z_POS );
    _group.add( this.textObject );
}

Text3D.Z_POS 	= 0;

Text3D.prototype.remove = function(_group){
    _group.remove( this.textObject );
}
Text3D.prototype.findFromElement = function(_l){
    if(this.link == _l) 	return true;
    else 					return false;
}
Text3D.prototype.setPosition = function(_x, _y){
    this.textObject.position.set( _x, _y, Text3D.Z_POS );
}
Text3D.prototype.setText = function(_text){
    if(_text == this.prevText) return;

    this.canvas 	= this.textMaterial.map.image;

    this.context 	= this.canvas.getContext('2d');
    this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
    this.context.font 		= "24px Nunito";
    this.context.fillStyle 	= "rgba(0,0,0,0.9)";
    this.context.fillText(_text.split('\n')[0], 0, 80);

    if(_text.split('\n').length>0){
        this.context.font 		= "18px Nunito";
        this.context.fillStyle 	= "rgba(0,0,0,0.9)";
        this.context.fillText("("+ _text.split('\n')[1] +")", 0, 100);
    }

    this.textMaterial.map.needsUpdate = true;
    this.prevText = _text;
}
Text3D.prototype.setOpacity = function(_opa){
    this.textMaterial.opacity = _opa;
}

// Actuator
function Actuator3D(_a, _x, _y, _group){
    this.actuator 			= _a;
    this.startAngle 		= 0;
    this.endAngle 			= 0;

    this.actGeometry 		= new THREE.CircleGeometry( Actuator3D.ACTUATOR_SIZE, Actuator3D.SEGMENT );
    //this.actGeometry.vertices.shift();
    this.actMaterial 		= new THREE.LineBasicMaterial( { color: ACTUATOR_COLOR, 	side: THREE.DoubleSide, 	linewidth: Actuator3D.LINE_WIDTH } );
    this.actObject			= new THREE.Line( this.actGeometry, this.actMaterial );
    this.actObject.position.set( 0, 0, 0 );

    this.dotGeometry 		= new THREE.CircleGeometry( Actuator3D.DOT_SIZE, Actuator3D.SEGMENT );
    this.dotGeometry.vertices.shift();
    this.dotMaterial 		= new THREE.MeshBasicMaterial( { color: ACTUATOR_COLOR, 	side: THREE.DoubleSide} );
    this.dotObject			= new THREE.Mesh( this.dotGeometry, this.dotMaterial );
    this.dotObject.position.set( Actuator3D.ACTUATOR_SIZE, 0, 0 );

    this.subGroup 			= new THREE.Object3D();
    this.subGroup.add(this.actObject);
    this.subGroup.add(this.dotObject);

    this.subGroup.position.set( _x, _y, Actuator3D.Z_POS );

    _group.add( this.subGroup );

    // text
    this.canvas 		= document.createElement('canvas');
    this.canvas.width 	= 256;
    this.canvas.height 	= 256;

    this.context 		= this.canvas.getContext('2d');
    this.context.clearRect( 0, 0, this.canvas.width, this.canvas.height );
    this.context.font 		= "24px Nunito";
    this.context.fillStyle 	= "rgba(0,0,0,0.9)";
    this.context.fillText(this.actuator.getName(), 90, 80);

    this.texture 		= new THREE.Texture(this.canvas);
    this.texture.needsUpdate = true;

    this.textMaterial   = new THREE.MeshBasicMaterial( {map: this.texture, side:THREE.DoubleSide , transparent: true, depthWrite: false, depthTest: false} );
    this.textGeometry	= new THREE.PlaneGeometry( this.canvas.width, this.canvas.height );
    this.textObject		= new THREE.Mesh( this.textGeometry, this.textMaterial );

    this.textObject.position.set( _x, _y, Actuator3D.Z_POS );

    _group.add( this.textObject );


    //arc

    this.angleCurve = new THREE.EllipseCurve(
        0, 0,  // ax, aY
        0, 0,  // xRadius, yRadius
        0, 0,  // aStartAngle, aEndAngle
        true,  // aClockwise
        0      // aRotation
    );

    this.anglePath 		= new THREE.Path( this.angleCurve.getPoints( Actuator3D.SEGMENT ) );
    this.angleGeometry 	= this.anglePath.createPointsGeometry( Actuator3D.SEGMENT );
    this.angleMaterial 	= new THREE.LineBasicMaterial( { color: ACTUATOR_COLOR, 	side: THREE.DoubleSide, 	linewidth: Actuator3D.LINE_WIDTH, transparent: true, opacity:0 } );
    this.angleObject = new THREE.Line( this.angleGeometry, this.angleMaterial );

    this.angleObject.position.set( _x, _y, Actuator3D.Z_POS );

    _group.add( this.angleObject );

}

Actuator3D.ACTUATOR_SIZE	= 32;
Actuator3D.DOT_SIZE			= 3;
Actuator3D.Z_POS 			= 0.2;
Actuator3D.SEGMENT			= 32;
Actuator3D.LINE_WIDTH		= 2;

Actuator3D.prototype.remove = function(_group){
    _group.remove( this.subGroup );
    _group.remove( this.textObject );
    _group.remove( this.angleObject );
}
Actuator3D.prototype.findFromElement = function(_a){
    if(this.actuator == _a) 	return true;
    else 						return false;
}
Actuator3D.prototype.setPosition = function(_x, _y){
    this.subGroup.position.set( _x, _y, Actuator3D.Z_POS );
    this.textObject.position.set( _x, _y, Actuator3D.Z_POS );
    this.angleObject.position.set( _x, _y, Actuator3D.Z_POS );
}
Actuator3D.prototype.setAngle = function(_angle){
    this.subGroup.rotation.z = _angle;
}
Actuator3D.prototype.setColor = function(_color){
    this.actMaterial.color.setHex( _color );
    this.dotMaterial.color.setHex( _color );
    this.angleMaterial.color.setHex( _color );
}
Actuator3D.prototype.setScale = function(_scale){
    this.subGroup.scale.set( _scale, _scale, _scale );
    this.angleObject.scale.set( _scale, _scale, _scale );
}
Actuator3D.prototype.setTextOpacity = function(_opa){
    this.textMaterial.opacity = _opa;
}
Actuator3D.prototype.showServoAngle = function(_s, _e, _group){
    if(!this.actuator.isServo) 	this.angleMaterial.opacity = 0;
    else 						this.angleMaterial.opacity = 1;

    if( (this.startAngle == - _s && this.endAngle == - _e) || (this.startAngle == - _e && this.endAngle == - _s) ) return;

    if(_s<_e){
        this.startAngle = - _s;
        this.endAngle 	= - _e;

    }else{
        this.startAngle = - _e;
        this.endAngle 	= - _s;
    }

    _group.remove( this.angleObject );

    this.angleCurve = new THREE.EllipseCurve(
        0,  0,        // ax, aY
        Actuator3D.ACTUATOR_SIZE+10, Actuator3D.ACTUATOR_SIZE+10,           // xRadius, yRadius
        this.startAngle, this.endAngle,  	  // aStartAngle, aEndAngle
        true,         // aClockwise
        0             // aRotation
    );

    this.anglePath 		= new THREE.Path( this.angleCurve.getPoints( Actuator3D.SEGMENT ) );
    this.angleGeometry 	= this.anglePath.createPointsGeometry( Actuator3D.SEGMENT );
    this.angleMaterial 	= new THREE.LineBasicMaterial( { color: ACTUATOR_COLOR, 	side: THREE.DoubleSide, 	linewidth: Actuator3D.LINE_WIDTH, transparent: true, opacity:0 } );
    this.angleObject = new THREE.Line( this.angleGeometry, this.angleMaterial );

    if(!this.actuator.isServo) 	this.angleMaterial.opacity = 0;
    else 						this.angleMaterial.opacity = 1;

    _group.add( this.angleObject );
}


// Trajectory
function Trajectory3D(_t, _v, _x, _y, _group){
    this.trajectory = _t;

    this.trjMaterial 	= new THREE.LineBasicMaterial( { color: TRAJECTORY_COLOR , side: THREE.DoubleSide, linewidth: Trajectory3D.LINE_WIDTH } );
    this.trjGeometry	= new THREE.BufferGeometry();
    this.trjGeometry.addAttribute( 'position', new THREE.BufferAttribute( _v, 3 ).setDynamic( true ) );
    this.trjObject		= new THREE.Line( this.trjGeometry, this.trjMaterial );

    _group.add( this.trjObject );

    this.dotGeometry 		= new THREE.CircleGeometry( Trajectory3D.DOT_SIZE, Trajectory3D.SEGMENT );
    this.dotGeometry.vertices.shift();
    this.dotMaterial 		= new THREE.MeshBasicMaterial( { color: TRAJECTORY_COLOR, side: THREE.DoubleSide} );
    this.dotObject			= new THREE.Mesh( this.dotGeometry, this.dotMaterial );
    this.dotObject.position.set( _x, _y, Trajectory3D.Z_POS );

    _group.add( this.dotObject );

    this.setDrawRange(0,0);
}
Trajectory3D.DOT_SIZE		= 6;
Trajectory3D.Z_POS 			= 0.3;
Trajectory3D.LINE_WIDTH		= 2;
Trajectory3D.SEGMENT		= 32;

Trajectory3D.prototype.remove = function(_group){
    _group.remove( this.trjObject );
    _group.remove( this.dotObject );
}
Trajectory3D.prototype.findFromElement = function(_t){
    if(this.trajectory == _t) 	return true;
    else 						return false;
}
Trajectory3D.prototype.setVertices = function(_vertices){
    this.trjGeometry.attributes.position.array = _vertices;
    this.trjGeometry.attributes.position.needsUpdate = true;
}
Trajectory3D.prototype.setPosition = function(_x, _y){
    this.dotObject.position.set( _x, _y, Trajectory3D.Z_POS );
}
Trajectory3D.prototype.setColor = function(_color){
    this.trjMaterial.color.setHex( _color );
    this.dotMaterial.color.setHex( _color );
}
Trajectory3D.prototype.setDrawRange = function(_s, _e){
    this.trjGeometry.setDrawRange(_s, _e);
}


// Load
function Load3D(_l, _x, _y, _group, _material){
    this.load 			= _l;

    //fy
    this.loadYGeometry 	= new THREE.PlaneGeometry( Load3D.LOAD_SIZE, Load3D.LOAD_SIZE );
    this.loadYObject 		= new THREE.Mesh( this.loadYGeometry, _material );

    this.loadYObject.overdraw = true;
    if(this.load.getLoadY()<0){
        this.loadYObject.position.set( _x, _y-40, Load3D.Z_POS );
    }else{
        this.loadYObject.rotateZ(Math.PI);
        this.loadYObject.position.set( _x, _y+40, Load3D.Z_POS );
    }
    _group.add( this.loadYObject );

    // text
    this.canvasY 		= document.createElement('canvas');
    this.canvasY.width 	= 256;
    this.canvasY.height 	= 256;

    this.contextY 		= this.canvasY.getContext('2d');
    this.contextY.clearRect( 0, 0, this.canvasY.width, this.canvasY.height );
    this.contextY.font 		= "24px Nunito";
    this.contextY.fillStyle 	= "rgba(0,0,0,0.9)";
    this.contextY.textAlign = "center";
    this.contextY.fillText(this.load.getLoadY() + "N", 128, 128);

    this.textureY 		= new THREE.Texture(this.canvasY);
    this.textureY.needsUpdate = true;

    this.textYMaterial   = new THREE.MeshBasicMaterial( {map: this.textureY, side:THREE.DoubleSide , transparent: true, depthWrite: false, depthTest: false} );
    this.textYGeometry	= new THREE.PlaneGeometry( this.canvasY.width, this.canvasY.height );
    this.textYObject		= new THREE.Mesh( this.textYGeometry, this.textYMaterial );

    if(this.load.getLoadY()<0){
        this.textYObject.position.set( _x, _y-110, Load3D.Z_POS );
    }else{
        this.textYObject.position.set( _x, _y+100, Load3D.Z_POS );
    }


    _group.add( this.textYObject );

    //fx
    this.loadXGeometry 	= new THREE.PlaneGeometry( Load3D.LOAD_SIZE, Load3D.LOAD_SIZE );
    this.loadXObject 		= new THREE.Mesh( this.loadXGeometry, _material );

    this.loadXObject.overdraw = true;

    if(this.load.getLoadX()>=0){
        this.loadXObject.position.set( _x+40, _y, Load3D.Z_POS );
        this.loadXObject.rotateZ(Math.PI/2);
    }else{
        this.loadXObject.position.set( _x-40, _y, Load3D.Z_POS );
        this.loadXObject.rotateZ(-Math.PI/2);
    }

    _group.add( this.loadXObject );

    // text
    this.canvasX 		= document.createElement('canvas');
    this.canvasX.width 	= 256;
    this.canvasX.height 	= 256;

    this.contextX 		= this.canvasX.getContext('2d');
    this.contextX.clearRect( 0, 0, this.canvasX.width, this.canvasX.height );
    this.contextX.font 		= "24px Nunito";
    this.contextX.fillStyle 	= "rgba(0,0,0,0.9)";
    this.contextX.textAlign = "center";
    this.contextX.fillText(this.load.getLoadX() + "N", 128, 128);

    this.textureX 		= new THREE.Texture(this.canvasX);
    this.textureX.needsUpdate = true;

    this.textXMaterial   = new THREE.MeshBasicMaterial( {map: this.textureX, side:THREE.DoubleSide , transparent: true, depthWrite: false, depthTest: false} );
    this.textXGeometry	= new THREE.PlaneGeometry( this.canvasX.width, this.canvasX.height );
    this.textXObject		= new THREE.Mesh( this.textXGeometry, this.textXMaterial );

    if(this.load.getLoadX()>=0){
        this.textXObject.position.set( _x+120, _y-10, Load3D.Z_POS );
    }else{
        this.textXObject.position.set( _x-120, _y-10, Load3D.Z_POS );
    }
    _group.add( this.textXObject );
}

Load3D.LOAD_SIZE	= 80;
Load3D.Z_POS 			= -0.1;

Load3D.prototype.remove = function(_group){
    _group.remove( this.loadYObject );
    _group.remove( this.textYObject );
    _group.remove( this.loadXObject );
    _group.remove( this.textXObject );
}
Load3D.prototype.findFromElement = function(_l){
    if(this.load == _l) 	return true;
    else 						return false;
}
Load3D.prototype.setPosition = function(_x, _y){
    //fy
    if(this.load.getLoadY()<0){
        this.loadYObject.visible = true;
        this.loadYObject.position.set( _x, _y-40, Load3D.Z_POS );
        this.textYObject.position.set( _x, _y-110, Load3D.Z_POS );
    }
    else if(this.load.getLoadY()==0){
        this.loadYObject.visible = false;
        this.textYObject.position.set( _x, _y+10, Load3D.Z_POS );
    }
    else{
        this.loadYObject.visible = true;
        this.loadYObject.position.set( _x, _y+40, Load3D.Z_POS );
        this.textYObject.position.set( _x, _y+100, Load3D.Z_POS );
    }

    //fx
    if(this.load.getLoadX()>0){
        this.loadXObject.visible = true;
        this.loadXObject.position.set( _x+40, _y, Load3D.Z_POS );
        this.textXObject.position.set( _x+120, _y-10, Load3D.Z_POS );
    }
    else if(this.load.getLoadX()==0){
        this.loadXObject.visible = false;
        this.textXObject.position.set( _x+20, _y-10, Load3D.Z_POS );
    }
    else{
        this.loadXObject.visible = true;
        this.loadXObject.position.set( _x-40, _y, Load3D.Z_POS );
        this.textXObject.position.set( _x-120, _y-10, Load3D.Z_POS );
    }
}
