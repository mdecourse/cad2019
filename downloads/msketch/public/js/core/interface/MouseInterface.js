//--------------------
// MouseEvnet Class
//--------------------
// from m.sketch 2.4 java
// updated on 2015.11.02

var hoverPoint = new Point2D;
var hoverLink = null;
var hoverActuator;
var pointedActuator;
var hoverMotorNum     = -1;

var selectedPoint     = null;
var selectedPointTg   = null;
var selectedLink      = null;
var selectedPointPair = null;

var DISTANCE_SNAP = 24;

//--------------------
// Link Class
//--------------------
function LinkInterface(){
  this.associatedPoint = null;
  this.associatedLink = null;
  this.activePoint = null;
  this.activeLink = null;
  this.lastX;
  this.lastY;
}

LinkInterface.prototype.mouseMove = function(_x, _y){
  hoverPoint = getPointByPosition(_x, _y);

  if (hoverPoint==null) {
      hoverLink = getLinkByPosition(_x, _y);
  } else {
      hoverLink = null;
  }
}

LinkInterface.prototype.mouseDown = function(_x, _y){
    if ( hoverPoint==null && hoverLink==null ) { // new space
      var newPt = new Point2D(_x, _y);
      currentSpace.addGlobalPoint(newPt);

      this.associatedPoint = newPt;
      this.associatedLink  = currentSpace;
    }
    else{ // start from existing point
      if( hoverPoint != null) {
        this.associatedLink  = currentAssembly.getBelongedLink(hoverPoint);
        this.associatedPoint = hoverPoint;
      }
      else if( hoverLink != null){
        this.activeLink = hoverLink;
      }
    }
    currentAssemblyGroup.load();
    //try360forAssemblies();
}

LinkInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){
  if (this.associatedPoint!=null) {
    this.activeLink = new Link(this.associatedLink.getGlobalPosition(this.associatedPoint));
    currentAssembly.addElement(this.activeLink);
    currentAssembly.appendCoaxialConstraint(this.activeLink, this.activeLink.getPointList().get(0), this.associatedLink, this.associatedPoint);
  }
  if (this.activeLink!=null) {
    this.activePoint = new Point2D(_x, _y);
    this.activeLink.addGlobalPoint(this.activePoint);
  }
  currentAssemblyGroup.load();
  //try360forAssemblies();
}

LinkInterface.prototype.mouseDownAndMove = function(_x, _y){
  if (this.activeLink!=null && this.activePoint!=null) {
      hoverPoint = getPointByPosition(_x, _y, this.activePoint);
      if(hoverPoint==null){
        this.activePoint.setLocation(this.activeLink.getLocalPosition(new Point2D(_x, _y)));
        this.activeLink.redefineVertex();
      }else{
        var position = currentAssembly.getBelongedLink(hoverPoint).getGlobalPosition(hoverPoint);
        this.activePoint.setLocation( this.activeLink.getLocalPosition(position) );
        this.activeLink.redefineVertex();
      }
    }
    currentAssemblyGroup.load();
    //try360forAssemblies();
}

LinkInterface.prototype.mouseDownAndUp = function(_x, _y){
    if(this.activeLink!=null){
      this.activePoint = new Point2D(_x, _y);
      this.activeLink.addGlobalPoint(this.activePoint);
    }
    currentAssemblyGroup.load();
    try360forAssemblies();

    this.associatedPoint = null;
    this.associatedLink  = null;
    this.activePoint     = null;
    this.activeLink      = null;
}

LinkInterface.prototype.mouseMoveAndUp = function(_x, _y){
    if (this.activeLink!=null && this.activePoint!=null) {
        hoverPoint = getPointByPosition(_x, _y, this.activePoint);

      if(hoverPoint!=null){
        currentAssembly.appendCoaxialConstraint(currentAssembly.getBelongedLink(hoverPoint), hoverPoint, this.activeLink, this.activePoint);
      }
    }
    currentAssemblyGroup.load();

    // for canceling
    if(getPointByPosition(_x, _y) == this.associatedPoint){
      var removedPointList = new ArrayList();

      //console.log(this.associatedPoint);
      //console.log(this.activeLink);
      removedPointList.addAll(this.activeLink.getPointList());
      currentAssembly.removeElement(this.activeLink);
      currentAssemblyGroup.load();

      for(var rmpti in removedPointList.array){
        var rmpt = removedPointList.get(rmpti);
        currentAssembly.removePointInConstraint(rmpt);
        currentAssemblyGroup.load();
      }
    }
    try360forAssemblies();

    this.associatedPoint = null;
    this.associatedLink  = null;
    this.activePoint     = null;
    this.activeLink      = null;
}


//--------------------
// JA Class
//--------------------
function JAInterface(){

}

JAInterface.prototype.mouseMove = function(_x, _y){
  var tempActuator = getActuatorByPosition(_x, _y);

  if(tempActuator != null){
    //console.log(tempActuator.getName());
  }

  hoverPoint = getPointByPosition(_x, _y);
}
JAInterface.prototype.mouseDown = function(_x, _y){

    if(hoverPoint!=null){
      var targetCC = null;
      for(var ci in currentAssembly.getAllConstraint().array){
        var c = currentAssembly.getAllConstraint().get(ci);
        if(c instanceof CoaxialConstraint){
          var cc = c;
          for(var pi in cc.getAllPoint().array){
            var p = cc.getAllPoint().get(pi);
            if(p==hoverPoint){
              //added to avoid overlap
              var _isExist = false;
              for(var ai in currentAssembly.getAllActuator().array){
                var a = currentAssembly.getAllActuator().get(ai);
                if(a.getCoaxialConstraint() == c){
                  //console.log("OVERLAP");
                  _isExist = true;
                }else{
                  //console.log("NOT");
                }
              }
              if(!_isExist) targetCC = c;
            }
          }
        }
      }

      if(targetCC!=null){
        var ja = new JointActuator(targetCC, targetCC.getLink(0), targetCC.getLink(1));
        currentAssembly.addActuator(ja);
        //updateMotorList(); // update motor list
        //updateMotorInfo();
      }
    }
    currentAssemblyGroup.load();
    try360forAssemblies();
}
JAInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){}
JAInterface.prototype.mouseDownAndMove = function(_x, _y){}
JAInterface.prototype.mouseDownAndUp = function(_x, _y){}
JAInterface.prototype.mouseMoveAndUp = function(_x, _y){}


//--------------------
// Mark Class
//--------------------

function MarkInterface() {
  this.activePoint = null;
}

MarkInterface.prototype.mouseMove = function(_x, _y){
  hoverPoint = getPointByPosition(_x, _y);
}
MarkInterface.prototype.mouseDown = function(_x, _y){
  this.activePoint = hoverPoint;

  if(this.activePoint!=null){
      var duplicateCheck = false;
      for(var i=0; i<currentAssemblyGroup.trajectoryList.length(); i++){
        if(currentAssemblyGroup.trajectoryList.get(i).getPoint() == this.activePoint) {
          currentAssemblyGroup.trajectoryList.remove(currentAssemblyGroup.trajectoryList.get(i));
          duplicateCheck=true;
          currentAssemblyGroup.load();
          //loadTrajectories(trajectoryList);
        }
      }
      if(!duplicateCheck){
        currentAssemblyGroup.newTrajectory(this.activePoint);
        //currentAssemblyGroup.trajectoryList.add(new Trajectory(currentAssembly, this.activePoint));
        currentAssemblyGroup.load();
        //loadTrajectories(trajectoryList);

      }
      this.activePoint=null;
    }

  try360forAssemblies();
}
MarkInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){}
MarkInterface.prototype.mouseDownAndMove = function(_x, _y){}
MarkInterface.prototype.mouseDownAndUp = function(_x, _y){}
MarkInterface.prototype.mouseMoveAndUp = function(_x, _y){
  this.activePoint = null;
}


//--------------------
// Move Class
//--------------------
function MoveInterface(){
	this.linkToMove;
	this.pointToMove;
	this.activePoint = null;
	this.activeLink = null;
	this.lastX;
	this.lastY;
}

MoveInterface.prototype.mouseMove = function(_x, _y){
	hoverPoint = getPointByPosition(_x, _y);

    // for selecting slider
    /*
    if(hoverPoint!=null){
        var _tempLink = currentAssembly.getBelongedLink(hoverPoint);
        if(_tempLink.isSlider){
            if(_tempLink.getPointList().get(0)!=hoverPoint){
                hoverPoint = null;
            }
        }
    }
    */

    currentAssemblyGroup.drawHoverSegment(_x, _y);

}

MoveInterface.prototype.mouseDown = function(_x, _y){
	if (hoverPoint!=null) {
  	this.activePoint = hoverPoint;
    this.activeLink  = null;
  }
  var targetLink = getLinkByPosition(_x, _y);
  if(targetLink!=null){
    this.activeLink   = targetLink;
  }

  this.lastX = _x;
  this.lastY = _y;


}

MoveInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){
	this.linkToMove  = new ArrayList();
    this.pointToMove = new ArrayList();

    if (this.activePoint!=null) {
      this.linkToMove.add( currentAssembly.getBelongedLink(this.activePoint) );
      this.pointToMove.add(this.activePoint);
    }

    for(var i=0; i<currentAssembly.getAllConstraint().length(); i++){
      if(currentAssembly.getAllConstraint().get(i) instanceof CoaxialConstraint){
        var cc = currentAssembly.getAllConstraint().get(i);

        check_one_cc:
        for(var j=0; j<this.pointToMove.length(); j++){
          for(var p2i in cc.getAllPoint().array){
            var p2 = cc.getAllPoint().get(p2i);

            if(this.pointToMove.get(j)==p2){
              for(var p3i in cc.getAllPoint().array){
                var p3 = cc.getAllPoint().get(p3i);
                var ifContains = false;
                for(var pi in this.pointToMove.array){
                  var p = this.pointToMove.get(pi);
                  if(p==p3) ifContains = true;
                }

                if(!ifContains){
                  this.linkToMove.add(currentAssembly.getBelongedLink(p3));
                  this.pointToMove.add(p3);
                }
              }
              break check_one_cc;
            }
          }
        }
      }
    }
}

MoveInterface.prototype.mouseDownAndMove = function(_x, _y){
    var tX, tY;
    if(isScienceBoxSanpOn){
      tX = (_x%SCIENCEBOX_SNAP<SCIENCEBOX_SNAP/2)? _x - (_x%SCIENCEBOX_SNAP) : _x + (SCIENCEBOX_SNAP-_x%SCIENCEBOX_SNAP);
      tY = (_y%SCIENCEBOX_SNAP<SCIENCEBOX_SNAP/2)? _y - (_y%SCIENCEBOX_SNAP) : _y + (SCIENCEBOX_SNAP-_y%SCIENCEBOX_SNAP);
    }
    else{
      tX = _x;
      tY = _y;
    }

    currentAssemblyGroup.updateSegmentHover(new Float32Array(6));
    currentAssemblyGroup.removeSegmentSelected();

    // to find is containing slider
    var targetSliderLink = null;
    for (var i=0; i<this.linkToMove.length(); i++) {
      if(this.linkToMove.get(i).isSlider){
          targetSliderLink = this.linkToMove.get(i);
      }
    }

    if(this.activePoint!=null){
      hoverPoint = getPointByPosition(_x, _y, this.pointToMove);

      // for selecting slider
      /*
      if(hoverPoint!=null){
          var _tempLink = currentAssembly.getBelongedLink(hoverPoint);
          if(_tempLink.isSlider){
              if(_tempLink.getPointList().get(0)!=hoverPoint){
                  hoverPoint = null;
              }
          }
      }
      */

      if(hoverPoint !=null && targetSliderLink == null){
        for (var i=0; i<this.pointToMove.length(); i++) {
          this.pointToMove.get(i).setLocation( this.linkToMove.get(i).getLocalPosition(currentAssembly.getBelongedLink(hoverPoint).getGlobalPosition(hoverPoint)) );
          this.linkToMove.get(i).redefineVertex();
        }
      }else if(targetSliderLink != null){

          // for slider snap
        var tempSc = targetSliderLink.baseSC;

        var pts = tempSc.getPoints();
        pts = [ tempSc.getLink(tempSc.BASE).getGlobalPosition(pts[0]),
                tempSc.getLink(tempSc.BASE).getGlobalPosition(pts[1]) ];
        var t = MMath.getNearestTfromALine(new Point2D(_x, _y), pts[0], pts[1]);

        t = Math.max(0, Math.min(1, t));

        var sX = (pts[0].getX()*(1-t)+pts[1].getX()*t);
        var sY = (pts[0].getY()*(1-t)+pts[1].getY()*t);

        for (var i=0; i<this.pointToMove.length(); i++) {
            if(targetSliderLink == this.linkToMove.get(i)){
                this.linkToMove.get(i).setOriginPoint( new Point2D(sX, sY) );
                this.linkToMove.get(i).setAngle(tempSc.getLink(tempSc.BASE).getAngle()+tempSc.getAngle());
                this.linkToMove.get(i).redefineVertex();
            }
            else{
                this.pointToMove.get(i).setLocation( this.linkToMove.get(i).getLocalPosition(new Point2D(sX, sY)) );
                this.linkToMove.get(i).redefineVertex();
            }
        }
    }else{
        for (var i=0; i<this.pointToMove.length(); i++) {
          this.pointToMove.get(i).setLocation( this.linkToMove.get(i).getLocalPosition(new Point2D(tX, tY)) );
          this.linkToMove.get(i).redefineVertex();
        }
      }
    } else {
      for (var i=0; i<this.pointToMove.length(); i++) {
        var position = this.linkToMove.get(i).getGlobalPosition(this.pointToMove.get(i));
        position.setLocation(position.getX()+(_x-lastX), position.getY()+(_y-lastY));
        this.pointToMove.get(i).setLocation( this.linkToMove.get(i).getLocalPosition(position) );
        this.linkToMove.get(i).redefineVertex();
      }
    }

    this.lastX = _x;
    this.lastY = _y;

    currentAssemblyGroup.load();
    try360forAssemblies();
}

MoveInterface.prototype.mouseDownAndUp = function(_x, _y){

    //find ScienceBox Approaximation
    if(isScienceBoxLinkOn && this.activeLink!=null){
      var pointPair = findPointPair(this.activeLink, _x, _y);

      if(pointPair!=null){
        var _length = pointPair[0].distance(pointPair[1].getX(), pointPair[1].getY());
        var _newLength = (_length%SCIENCEBOX_SNAP>SCIENCEBOX_SNAP/2)? _length-(_length%SCIENCEBOX_SNAP)+SCIENCEBOX_SNAP : _length-(_length%SCIENCEBOX_SNAP);
        setLengthToLink(this.activeLink, pointPair[0], pointPair[1], _newLength);

        currentAssemblyGroup.removeSegmentSelected();
      }
    }else if(this.activeLink!=null){
      // for move panel's length change
      selectedPointPair = findPointPair(this.activeLink, _x, _y);
      selectedLink = this.activeLink;
      selectedPointTg = null;

    }

    if(this.activePoint!=null){
      selectedPointTg = this.activePoint;
      selectedPoint = currentAssembly.getBelongedLink(this.activePoint).getGlobalPosition(this.activePoint);
      selectedPointPair = null;
      selectedLink = null;
      currentAssemblyGroup.removeSegmentSelected();
    }

    this.activePoint = null;
    this.activeLink = null;

    getPointInfoToMovePanel();

    currentAssemblyGroup.load();
    try360forAssemblies();
}

MoveInterface.prototype.mouseMoveAndUp = function(_x, _y){

    if(this.activePoint!=null){
      hoverPoint = getPointByPosition(_x, _y, this.pointToMove);
      if(hoverPoint !=null){
        currentAssembly.appendCoaxialConstraint( currentAssembly.getBelongedLink(this.activePoint), this.activePoint, currentAssembly.getBelongedLink(hoverPoint), hoverPoint);
      }
      else{
        selectedPointTg = this.activePoint;
        selectedPoint = currentAssembly.getBelongedLink(this.activePoint).getGlobalPosition(this.activePoint);
      }
      selectedPointPair = null;
      selectedLink = null;

    }

    this.activePoint = null;
    this.activeLink = null;

    getPointInfoToMovePanel();

    currentAssemblyGroup.load();
    try360forAssemblies();
}


//--------------------
// Remove Class
//--------------------
function RemoveInterface(){
}

RemoveInterface.prototype.mouseMove = function(_x, _y){
    hoverActuator = getActuatorByPosition(_x, _y);
    if(hoverActuator==null){
      hoverPoint = getPointByPosition(_x, _y);
      if(hoverPoint==null){
        hoverLink = getLinkByPosition(_x, _y);
      }else{
        hoverLink=null;
      }
    }else{
      hoverLink=null;
      hoverPoint=null;
    }

}

RemoveInterface.prototype.mouseDown = function(_x, _y){
    var removedPointList = new ArrayList();

    if(hoverActuator!=null){
      currentAssembly.removeActuator(hoverActuator);
      hoverActuator = null;

    }else if(hoverPoint!=null){
      removedPointList.add(hoverPoint);
      if(!(currentAssembly.getBelongedLink(hoverPoint) instanceof Space)){
        if(currentAssembly.getBelongedLink(hoverPoint).getPointList().length()<=2
            || currentAssembly.getBelongedLink(hoverPoint).isSlider){
          hoverLink = currentAssembly.getBelongedLink(hoverPoint);
        }
        else{
          currentAssembly.getBelongedLink(hoverPoint).removePoint(hoverPoint);
          currentAssemblyGroup.load();
          //loadElements(currentAssembly);
        }
      }
      else{
        currentSpace.removePoint(hoverPoint);
        currentAssemblyGroup.load();
        //loadElements(currentAssembly);
      }


      hoverPoint = null;
    }

    if(hoverLink!=null && hoverLink!=currentSpace){
      removedPointList.addAll(hoverLink.getPointList());
      currentAssembly.removeElement(hoverLink);
      hoverLink = null;
      //currentAssemblyGroup.load();
    }

    for(var rmpti in removedPointList.array){
      var rmpt = removedPointList.get(rmpti);
      currentAssembly.removePointInConstraint(rmpt);
      currentAssemblyGroup.load();
      //loadElements(currentAssembly);

      //remove marker
      for(var i=0; i<currentAssemblyGroup.trajectoryList.length(); i++){
        if(currentAssemblyGroup.trajectoryList.get(i).getPoint() == rmpt) {
          currentAssemblyGroup.trajectoryList.remove(currentAssemblyGroup.trajectoryList.get(i));
          currentAssemblyGroup.load();
        }
      }
      
      //remove load
      for(var i=0; i<currentAssemblyGroup.loadList.length(); i++){
        if(currentAssemblyGroup.loadList.get(i).getPoint() == rmpt) {
          currentAssemblyGroup.loadList.remove(currentAssemblyGroup.loadList.get(i));
          currentAssemblyGroup.load();
        }
      }
    }
    currentAssemblyGroup.load();
    //loadActuators(currentAssembly);
    updateMotorList();
    updateMotorInfo();

    try360forAssemblies();


}

RemoveInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){}
RemoveInterface.prototype.mouseDownAndMove = function(_x, _y){}
RemoveInterface.prototype.mouseDownAndUp = function(_x, _y){}
RemoveInterface.prototype.mouseMoveAndUp = function(_x, _y){}



function OptInterface(){
  currentAssemblyGroup.optimizedPath = new Trajectory();
  this.ind = -1;
  this.targetTrj = [];
  this.Lambda;

  this.total_iter;
  this.accumTime;
  this.msg;
  //this.SAMPLE_SIZE = 32;
}
OptInterface.SAMPLE_SIZE = 16;

OptInterface.prototype.mouseMove = function(_x, _y){}
OptInterface.prototype.mouseDown = function(_x, _y){}
OptInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){
    currentAssemblyGroup.optimizedPath.flush();
    var p = new Point2D(_x, _y);
    currentAssemblyGroup.optimizedPath.getTrajectory().add(p);
    currentAssemblyGroup.load();
    //try360forAssemblies();
}
OptInterface.prototype.mouseDownAndMove = function(_x, _y){
  var p = new Point2D(_x, _y);
  currentAssemblyGroup.optimizedPath.getTrajectory().add(p);
  currentAssemblyGroup.load();
  try360forAssemblies();
  checkBaseTrj(true);
}
OptInterface.prototype.mouseDownAndUp = function(_x, _y){}
OptInterface.prototype.mouseMoveAndUp = function(_x, _y){
    /*
  if(currentAssemblyGroup.getTrajectory().length()>0){
    //this.ind = currentAssemblyGroup.getTrajectory().length() - 1;
    this.Lambda = 5;
    this.targetTrj = resample(currentAssemblyGroup.optimizedPath.getTrajectory(), OptInterface.SAMPLE_SIZE);

    this.total_iter = 0;
    this.accumTime = 0;
    //alert("Path Optimization Will be start.\nClick anywhere to stop while optimizing.")
    //showSnackBar("궤적 최적화를 시작합니다.\n아무 곳이나 클릭하면 종료됩니다.", "Path Optimization Will be start.\nClick anywhere to stop while optimizing.")
  }
  currentAssemblyGroup.load();

  try360forAssemblies();
  */
}


/*
Slider Interface
*/

function SliderInterface(){
    this.targetLink;
    this.tempSc;
}
SliderInterface.prototype.mouseMove = function(_x, _y){
    this.targetLink = getLinkByPosition(_x, _y);
    hoverLink = this.targetLink;
}
SliderInterface.prototype.mouseDown = function(_x, _y){
    if (this.targetLink!=null) {
      this.tempSc = findSliderConstraint(this.targetLink, _x, _y);
    }
}
SliderInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){
}
SliderInterface.prototype.mouseDownAndMove = function(_x, _y){
}
SliderInterface.prototype.mouseDownAndUp = function(_x, _y){
    if (this.tempSc!=null) {
      var pts = this.tempSc.getPoints();
      pts = [ this.tempSc.getLink(this.tempSc.BASE).getGlobalPosition(pts[0]),
              this.tempSc.getLink(this.tempSc.BASE).getGlobalPosition(pts[1]) ];

      var t = MMath.getNearestTfromALine(new Point2D(_x, _y), pts[0], pts[1]);
      t = Math.max(0, Math.min(1, t));

      var tempLink = new Link( pts[0].getX()*(1-t)+pts[1].getX()*t, pts[0].getY()*(1-t)+pts[1].getY()*t );

      // making the default slider link be a square //
      //tempLink.addLocalPoint(new Point2D(+30, -30));
      //tempLink.addLocalPoint(new Point2D(-30, -30));
      //tempLink.addLocalPoint(new Point2D(+30, +30));
      //tempLink.addLocalPoint(new Point2D(-30, +30));

      tempLink.setSlider( this.tempSc );
      tempLink.addLocalPoint(new Point2D(+50, 0));
      tempLink.addLocalPoint(new Point2D(-50, 0));

      this.tempSc.setLink(this.tempSc.TARGET, tempLink);
      tempLink.setAngle(this.tempSc.getLink(this.tempSc.BASE).getAngle()+this.tempSc.getAngle());

      currentAssembly.addElement(tempLink);
      currentAssembly.addConstraint(this.tempSc);
      currentAssemblyGroup.load();
    }
}
SliderInterface.prototype.mouseMoveAndUp = function(_x, _y){
}


// For load Interface : @ywJeong

//--------------------
// AddLoad Class
//--------------------
function AddLoadInterface(){
  this.activePoint = null;
}

AddLoadInterface.prototype.mouseMove = function(_x, _y){
  hoverPoint = getPointByPosition(_x, _y);
}
AddLoadInterface.prototype.mouseDown = function(_x, _y){
  this.activePoint = hoverPoint;

  if(this.activePoint!=null){
      var duplicateCheck = false;
      for(var i=0; i<currentAssemblyGroup.loadList.length(); i++){
        if(currentAssemblyGroup.loadList.get(i).getPoint() == this.activePoint) {
          duplicateCheck=true;
        }
      }
      if(!duplicateCheck){
        currentAssemblyGroup.newLoad(this.activePoint);
        currentAssemblyGroup.load();
      }
      this.activePoint=null;
    }

  try360forAssemblies();
}
AddLoadInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){}
AddLoadInterface.prototype.mouseDownAndMove = function(_x, _y){}
AddLoadInterface.prototype.mouseDownAndUp = function(_x, _y){}
AddLoadInterface.prototype.mouseMoveAndUp = function(_x, _y){}

//--------------------
// EditLoad Class
//--------------------
var loadIndex;
function EditLoadInterface(){

}

EditLoadInterface.prototype.mouseMove = function(_x, _y){
  hoverPoint = getPointByPosition(_x, _y);
}
EditLoadInterface.prototype.mouseDown = function(_x, _y){}
EditLoadInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){}
EditLoadInterface.prototype.mouseDownAndMove = function(_x, _y){}
EditLoadInterface.prototype.mouseDownAndUp = function(_x, _y){
  this.activePoint = hoverPoint;
  var loadX;
  var loadY;
  if(this.activePoint!=null){
    for(var i=0; i<currentAssemblyGroup.loadList.length(); i++){
      if(currentAssemblyGroup.loadList.get(i).getPoint() == this.activePoint) {
        loadX = currentAssemblyGroup.loadList.get(i).getLoadX();
        loadY = currentAssemblyGroup.loadList.get(i).getLoadY();
        loadIndex = i;
      }
    }
    this.activePoint=null;
  }
  getLoadInfoToLoadPanel(loadX, loadY);
}
EditLoadInterface.prototype.mouseMoveAndUp = function(_x, _y){}

//--------------------
// RemoveLoad Class
//--------------------
function RemoveLoadInterface(){
  this.activePoint = null;
}

RemoveLoadInterface.prototype.mouseMove = function(_x, _y){
  hoverPoint = getPointByPosition(_x, _y);
}
RemoveLoadInterface.prototype.mouseDown = function(_x, _y){
  this.activePoint = hoverPoint;

  if(this.activePoint!=null){
      for(var i=0; i<currentAssemblyGroup.loadList.length(); i++){
        if(currentAssemblyGroup.loadList.get(i).getPoint() == this.activePoint) {
          currentAssemblyGroup.loadList.remove(currentAssemblyGroup.loadList.get(i));
          currentAssemblyGroup.load();
        }
      }
      this.activePoint=null;
    }
  try360forAssemblies();
}
RemoveLoadInterface.prototype.mouseDownAndMoveFirst = function(_x, _y){}
RemoveLoadInterface.prototype.mouseDownAndMove = function(_x, _y){}
RemoveLoadInterface.prototype.mouseDownAndUp = function(_x, _y){}
RemoveLoadInterface.prototype.mouseMoveAndUp = function(_x, _y){}


//--------------------
// Common Functions
//--------------------


function getPointByPosition(_x, _y, _ignorePointList){
	var arg_num = arguments.length;
	var returnValue;

  DISTANCE_SNAP = (!isTouchScreen)? 24 : 64;

  switch(arg_num){
    case 2:
      return getPointByPosition(_x, _y, new ArrayList());
      break;

    case 3:
      if(_ignorePointList instanceof ArrayList){ // _ignorePointList
        for(var ei in currentAssembly.getAllElement().array){
          var l = currentAssembly.getAllElement().get(ei);
          if(l instanceof Link){
            for(var pi in l.getPointList().array){
              var p = l.getPointList().get(pi);

              var ifContains = false;
              for(var tpi in _ignorePointList.array){
                var tp = _ignorePointList.get(tpi);

                if(tp==p) ifContains = true;

              }
              // for avoid slider length
              if(l.isSlider){
                  if(pi!=0){
                      ifContains = true;
                  }
              }

              if(!ifContains && l.getGlobalPosition(p).distance(_x, _y) < DISTANCE_SNAP){
                return p;
              }
            }
          }
        }
      }
      else{ // ignorePoint
        var list = new ArrayList();

        if(_ignorePointList!=null){
          list.add(_ignorePointList);
        }

        return getPointByPosition(_x, _y, list);

      }
      break;

  }
}


function getLinkByPosition(_x, _y) {
  for (var ei in currentAssembly.getAllElement().array) {
    var e = currentAssembly.getAllElement().get(ei);
    if (!(e instanceof Space) && e instanceof Link) {
      var l = e;

      var vertex = l.getGlobalRoundedVertex(0);
      var p = [];
      for (var i=0; i<vertex.length; i+=2) {
        //p.addPoint((int)vertex[i+0], (int)vertex[i+1]);
        p.push( new Point2D(vertex[i+0], vertex[i+1]));
      }
      if (isPointInPoly(p, new Point2D(_x, _y))) {

        return l;
      }
    }
  }
  return null;
}

function getAllLinkByPosition(_x, _y) {
  var returnValue = [];

  for (var ei in currentAssembly.getAllElement().array) {
    var e = currentAssembly.getAllElement().get(ei);
    if (!(e instanceof Space) && e instanceof Link) {
      var l = e;

      var vertex = l.getGlobalRoundedVertex(0);
      var p = [];
      for (var i=0; i<vertex.length; i+=2) {
        //p.addPoint((int)vertex[i+0], (int)vertex[i+1]);
        p.push( new Point2D(vertex[i+0], vertex[i+1]));
      }
      if (isPointInPoly(p, new Point2D(_x, _y))) {
        returnValue.push(l);
      }
    }
  }
  return returnValue;
}

function getActuatorByPosition(_x, _y) {

  for (var ai in currentAssembly.getAllActuator().array) {
    var a = currentAssembly.getAllActuator().get(ai);

    if (a instanceof JointActuator) {
      var p = a.getOriginPoint();
      if (currentAssembly.getBelongedLink(p).getGlobalPosition(p).distance(_x, _y) < DISTANCE_SNAP) {
        return a;
      }
    }
  }
  return null;
}


function isPointInPoly(poly, pt){
    for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        ((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y))
        && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x)
        && (c = !c);
    return c;
}

/*
function getLinkContainingPoints(_x1, _y1, _x2, _y2){
    var returnLink;
    var links = getAllLinkByPosition(_x1, _y1);

    var foundPointsNumber = new Array(2);

    for(var li in links){
      var _link = links[li];

      for(var pi in _link.getPointList().array){
        var _point = _link.getPointList().get(pi);

        if( _link.getGlobalPosition(_point).distance(_x1, _y1) < 1 ){
          foundPointsNumber[0] = pi;
        }
        else if( _link.getGlobalPosition(_point).distance(_x2, _y2) < 1 ){
          foundPointsNumber[1] = pi;
        }
      }
      if(foundPointsNumber[0] != null && foundPointsNumber[1] != null){
        returnLink = _link;
        firstPointID = foundPointsNumber[0];
        secondPointID = foundPointsNumber[1];
      }

      foundPointsNumber[0] = null;
      foundPointsNumber[1] = null;

    }

    return returnLink;
}
*/


function try360forAssemblies(){
  if(isPlaying) return;
  for(var i=0; i<AssemblyGroupList.length; i++){
    //AssemblyGroupList[i].loadTrajectories();
    //AssemblyGroupList[i].onStart();
    AssemblyGroupList[i].try360();
  }
}


// for change length of link

function setLengthToLink(_link, _p1, _p2, _legnth){

  var _tempAngle = Math.atan2(_p2.getY()-_p1.getY(), _p2.getX()-_p1.getX());

  var _newX1 = _p1.getX();
  var _newY1 = _p1.getY();
  var _newX2 = _legnth*Math.cos(_tempAngle) + _newX1;
  var _newY2 = _legnth*Math.sin(_tempAngle) + _newY1;

  _p1.setLocation( new Point2D(_newX1, _newY1) );
  _p2.setLocation( new Point2D(_newX2, _newY2) );
  _link.redefineVertex();

  currentAssemblyGroup.onStart();
  currentAssemblyGroup.calculateAssembly();

}

function findPointPair(_link, _x, _y){

  if (_link!=null && _link.getPointList().length()>1) {
    var localPos = _link.getLocalPosition(new Point2D(_x, _y));

    // to find the nearest Point pair //
    var p1r = new Point2D();
    var p2r = new Point2D();
    var shortestDist = Number.POSITIVE_INFINITY;
    for (var i=0; i<_link.getPointList().length()-1; i++) {
      for (var j=i+1; j<_link.getPointList().length(); j++) {
        var p1 = _link.getPointList().get(i);
        var p2 = _link.getPointList().get(j);
        var dist = MMath.distToSegment(localPos, p1, p2);

        if (dist<shortestDist) {
          p1r = p1;
          p2r = p2;
          shortestDist = dist;
        }
      }
    }

    return [p1r, p2r];
    //console.log(_link + ", " + p1r + ", " + p2r);
  }
  return null;

}

function findSliderConstraint(_link, _x, _y){

  if (_link!=null && _link.getPointList().length()>1) {
    var localPos = _link.getLocalPosition(new Point2D(_x, _y));

    // to find the nearest Point pair //
    var p1r = new Point2D();
    var p2r = new Point2D();
    var shortestDist = Number.POSITIVE_INFINITY;
    for (var i=0; i<_link.getPointList().length()-1; i++) {
      for (var j=i+1; j<_link.getPointList().length(); j++) {
        var p1 = _link.getPointList().get(i);
        var p2 = _link.getPointList().get(j);
        var dist = MMath.distToSegment(localPos, p1, p2);

        if (dist<shortestDist) {
          p1r = p1;
          p2r = p2;
          shortestDist = dist;
        }
      }
    }

    return new SliderConstraint(_link, null, p1r, p2r);
  }
  return null;

}
