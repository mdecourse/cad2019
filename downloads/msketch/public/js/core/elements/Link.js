//--------------------
// Link Class
//--------------------
// from m.sketch 2.4 java
// updated on 2015.11.02

//-------------------- Constructor --------------------
function Link(arg1, arg2, arg3){
    MechElement.apply(this, arguments);

    this.pointList = new ArrayList();
    this.vertex = [];
    this.angle = 0;
    this.DOF = 3;
    this.lengths = [];

  this.backup_angle = 0;
  this.backup_pointNum = 0;
  this.backup_vertexNum = 0;

  this.angleOnFirstTwoPoints = 0;
  //this.counter = 1;

  if(arguments.length>0) {
    if(!(typeof(arg1)=="string")){
      this.name = "Link" + Link.counter++;
    }
    this.init();
  }
    // for 3D
    this.stack = 0;

    // for Slider
    this.isSlider = false;
    this.baseSC = null;
}
Link.counter = 1;
Link.sliderCount = 1;
Link.prototype = new MechElement;
Link.prototype.constructor = Link;

//-------------------- IO Functions --------------------
Link.prototype.toString = function(){
  return this.name;
}
Link.prototype.getAngle = function(){
    return this.angle;
}
Link.prototype.setAngle = function(_angle){
    this.angle = _angle;
}
Link.prototype.getPointList = function(){
    return this.pointList;
}
Link.prototype.addGlobalPoint = function(arg1, arg2){
    var arg_num = arguments.length;
    var returnValue;

    switch(arg_num){
        case 1: // Point2D
            var localPt = this.getLocalPosition(arg1);
            arg1.setLocation(localPt);
            returnValue = this.addLocalPoint(arg1);
            break;
        case 2: // x, y
            returnValue = this.addGlobalPoint(new Point2D(arg1, arg2));
            break;

    }
    return returnValue;
}

Link.prototype.addLocalPoint = function(_pt){
    var returnValue = this.pointList.add(_pt);
    this.redefineVertex();
    return returnValue;
}
Link.prototype.removePoint = function(_pt){
    var returnValue = this.pointList.remove(_pt);
    this.redefineVertex();
    return returnValue;
}
Link.prototype.getVertex = function(){
    return this.vertex;
}
Link.prototype.getGlobalPosition = function(_p){
    var returnValue = new Point2D(this.originPoint.getX()+_p.getX()*Math.cos(this.angle)-_p.getY()*Math.sin(this.angle),
                                this.originPoint.getY()+_p.getX()*Math.sin(this.angle)+_p.getY()*Math.cos(this.angle));
    return returnValue;
}
Link.prototype.getLocalPosition = function(_p){
    var tx = _p.getX()-this.originPoint.getX();
    var ty = _p.getY()-this.originPoint.getY();

    var returnValue = new Point2D(tx*Math.cos(-this.angle)-ty*Math.sin(-this.angle), tx*Math.sin(-this.angle)+ty*Math.cos(-this.angle));

    return returnValue;
}
Link.prototype.getGlobalVertex = function(){
    if(this.vertex==null){
        return null;
    }

    var returnValue = new Array(this.vertex.length);
    for(var i=1; i<this.vertex.length; i+=2){
      returnValue[i-1] = (this.originPoint.getX()+this.vertex[i-1]*Math.cos(this.angle)-this.vertex[i]*Math.sin(this.angle));
      returnValue[ i ] = (this.originPoint.getY()+this.vertex[i-1]*Math.sin(this.angle)+this.vertex[i]*Math.cos(this.angle));
    }
    return returnValue;
}
Link.prototype.savePosition = function(){
  //this.savePosition();                       // does it work?
  this.backup_originPoint = new Point2D(this.originPoint.getX(), this.originPoint.getY());
  this.backup_angle = this.angle;
}
Link.prototype.restorePosition = function(){
  //this.restorePosition();
  this.originPoint = this.backup_originPoint;
  this.angle = this.backup_angle;
}



Link.prototype.init = function(){
    var firstPoint = new Point2D(0, 0);
    this.pointList.add(firstPoint);
}

Link.prototype.redefineVertex = function(){
    if(this.pointList.length() < 2) return;

    var vertexOrder = new ArrayList();

    // finding the first point //
    var firstPoint = this.pointList.get(0);
    for(var i=1; i<this.pointList.length(); i++){
      if(firstPoint.getY() < this.pointList.get(i).getY()){
        firstPoint = this.pointList.get(i);
      } else if(firstPoint.getY()==this.pointList.get(i).getY() && firstPoint.getX()>this.pointList.get(i).getX()){
        firstPoint = this.pointList.get(i);
      }
    }
    vertexOrder.add(firstPoint);

    // stacking vertex
    var lastAngle = Math.PI/2;
    while(true){
      var thisPoint = vertexOrder.get(vertexOrder.length()-1);

      var nextPoint = null;
      var angle = 10;
      for(var i=0; i<this.pointList.length(); i++){
        if(this.pointList.get(i)!=thisPoint && (this.pointList.get(i).getY()!=thisPoint.getY() || this.pointList.get(i).getX()!=thisPoint.getX())){
        //if(this.pointList.get(i)!=thisPoint{
          var thisAngle = Math.atan2(this.pointList.get(i).getY()-thisPoint.getY(), this.pointList.get(i).getX()-thisPoint.getX());

          for(var k=-1; k<2; k++){
            var comAngle = thisAngle + k*2*Math.PI;
            if(comAngle<angle && comAngle>=lastAngle){
              angle = comAngle;
              nextPoint = this.pointList.get(i);
            }
          }
        }
      }

      if(nextPoint!=null){
        vertexOrder.add(nextPoint);
        lastAngle = angle;
        if(nextPoint==vertexOrder.get(0)){
          break;
        }
      }else{
        vertexOrder.add(vertexOrder.get(0));
        break;
      }
    }

    // simplify
    this.vertex = new Array(vertexOrder.length()*4-4);
    this.lengths = [];

    if(!this.isSlider){
        for(var i=0; i<vertexOrder.length()-1; i++){
            this.vertex[i*4+0] = vertexOrder.get(i).getX();
            this.vertex[i*4+1] = vertexOrder.get(i).getY();
            this.vertex[i*4+2] = vertexOrder.get(i+1).getX();
            this.vertex[i*4+3] = vertexOrder.get(i+1).getY();

            this.lengths.push(this.distance(this.vertex[i*4+0], this.vertex[i*4+1], this.vertex[i*4+2], this.vertex[i*4+3]));
        }
    }
    else{
        // for slider rect
        for(var i=0; i<vertexOrder.length()-1; i++){
          var angle = Math.atan2(vertexOrder.get(i+1).getY()-vertexOrder.get(i).getY(), vertexOrder.get(i+1).getX()-vertexOrder.get(i).getX())-Math.PI/2;
          var dist = 20;
          this.vertex[i*4+0] = vertexOrder.get(i).getX() + dist*Math.cos(angle);
          this.vertex[i*4+1] = vertexOrder.get(i).getY() + dist*Math.sin(angle);
          this.vertex[i*4+2] = vertexOrder.get(i+1).getX() + dist*Math.cos(angle);
          this.vertex[i*4+3] = vertexOrder.get(i+1).getY() + dist*Math.sin(angle);
          this.lengths.push(this.distance(this.vertex[i*4+0], this.vertex[i*4+1], this.vertex[i*4+2], this.vertex[i*4+3]));
        }
    }

}

Link.prototype.getGlobalRoundedVertex = function(_rot){
  if(this.pointList.length() < 2) return [];

  var vertexOrder = new ArrayList();

  // finding the first point //
    var firstPoint = this.pointList.get(0);
    for(var i=1; i<this.pointList.length(); i++){
      if(firstPoint.getY() < this.pointList.get(i).getY()){
        firstPoint = this.pointList.get(i);
      } else if(firstPoint.getY()==this.pointList.get(i).getY() && firstPoint.getX()>this.pointList.get(i).getX()){
        firstPoint = this.pointList.get(i);
      }
    }
    vertexOrder.add(firstPoint);

    // stacking vertex
    var lastAngle = Math.PI/2;
    while(true){
      var thisPoint = vertexOrder.get(vertexOrder.length()-1);

      var nextPoint = null;
      var angle = 10;
      for(var i=0; i<this.pointList.length(); i++){
        if(this.pointList.get(i)!=thisPoint && (this.pointList.get(i).getY()!=thisPoint.getY() || this.pointList.get(i).getX()!=thisPoint.getX())){
          var thisAngle = Math.atan2(this.pointList.get(i).getY()-thisPoint.getY(), this.pointList.get(i).getX()-thisPoint.getX());
          for(var k=-1; k<2; k++){
            var comAngle = thisAngle + k*2*Math.PI;
            if(comAngle<angle && comAngle>=lastAngle){
              angle = comAngle;
              nextPoint = this.pointList.get(i);
            }
          }
        }
      }

      if(nextPoint!=null){
        vertexOrder.add(nextPoint);
        lastAngle = angle;
        if(nextPoint==vertexOrder.get(0)){
          break;
        }
      }else{
        vertexOrder.add(vertexOrder.get(0));
        break;
      }
    }

    vertexOrder.add(vertexOrder.get(1));

    var vertexList = new ArrayList();

    for(var i=0; i<vertexOrder.length()-2; i++){
      var angle  = Math.atan2(vertexOrder.get(i+1).getY()-vertexOrder.get(i  ).getY(), vertexOrder.get(i+1).getX()-vertexOrder.get(i  ).getX())-Math.PI/2;
      var angle2 = Math.atan2(vertexOrder.get(i+2).getY()-vertexOrder.get(i+1).getY(), vertexOrder.get(i+2).getX()-vertexOrder.get(i+1).getX())-Math.PI/2;
      if(angle2<angle) angle2+=2*Math.PI;

      var dist = (msketchSettings.linkWidth/SCALE_TRANS)/2;

      var step = 10;

      vertexList.add(vertexOrder.get(i).getX() + dist*Math.cos(angle));
      vertexList.add(vertexOrder.get(i).getY() + dist*Math.sin(angle));
      vertexList.add(vertexOrder.get(i+1).getX() + dist*Math.cos(angle));
      vertexList.add(vertexOrder.get(i+1).getY() + dist*Math.sin(angle));

      // for fixed rounded angle
      for(var k=0; k<step; k++){
          var _newAngle = angle + (angle2-angle)*(k/step)
          vertexList.add(vertexOrder.get(i+1).getX() + dist*Math.cos(_newAngle));
          vertexList.add(vertexOrder.get(i+1).getY() + dist*Math.sin(_newAngle));
      }
      /*
      for(;angle<angle2;angle+=step){
        vertexList.add(vertexOrder.get(i+1).getX() + dist*Math.cos(angle));
        vertexList.add(vertexOrder.get(i+1).getY() + dist*Math.sin(angle));
      }
      */

    }

    /*
    this.vertex = new Array(vertexList.length());
    for(var i=0; i<vertexList.length(); i++){
      this.vertex[i] = vertexList.get(i);
    }

    */

    if(vertexList==null){
      return [];
    }

    var returnVertex = new Array(vertexList.length());

    this.angleOnFirstTwoPoints = Math.atan2(this.pointList.get(1).getY()-this.pointList.get(0).getY(),this.pointList.get(1).getX()-this.pointList.get(0).getX()) + this.angle;
    for(var i=1; i<vertexList.length(); i+=2){
      var tempX = (this.originPoint.getX()+vertexList.get(i-1)*Math.cos(this.angle)-vertexList.get(i)*Math.sin(this.angle));
      var tempY = (this.originPoint.getY()+vertexList.get(i-1)*Math.sin(this.angle)+vertexList.get(i)*Math.cos(this.angle));

      if(_rot==0){
        returnVertex[i-1] = tempX;
        returnVertex[ i ] = tempY;
      }else{
        returnVertex[i-1] = Math.cos(this.angleOnFirstTwoPoints)*tempX  + Math.sin(this.angleOnFirstTwoPoints)*tempY;
        returnVertex[ i ] =-Math.sin(this.angleOnFirstTwoPoints)*tempX  + Math.cos(this.angleOnFirstTwoPoints)*tempY;
      }

    }
    return returnVertex;
    //console.log(this.vertex);
}

Link.prototype.getGlobalPositionRotated = function(_p){
  var tempX = this.getGlobalPosition(_p).getX();
  var tempY = this.getGlobalPosition(_p).getY();

  var returnX = Math.cos(this.angleOnFirstTwoPoints)*tempX  + Math.sin(this.angleOnFirstTwoPoints)*tempY;
  var returnY =-Math.sin(this.angleOnFirstTwoPoints)*tempX  + Math.cos(this.angleOnFirstTwoPoints)*tempY;

  var returnValue = new Point2D(returnX,returnY);
  return returnValue;
}

Link.prototype.getLength = function(_index){
  return this.lengths[_index];
}
Link.prototype.getLengths = function(_index){
  return this.lengths;
}
Link.prototype.distance = function(_x1, _y1, _x2, _y2){
    var d = Math.sqrt((_x2-_x1)*(_x2-_x1) + (_y2-_y1)*(_y2-_y1));
    return d;
}

Link.prototype.pushVertex = function(){
  this.backup_vertexNum = this.vertex.length;
}

Link.prototype.vertexIsChanged = function(){
  if(this.backup_vertexNum == this.vertex.length){
    return false;
  }
  else{
    return true;
  }
}

Link.prototype.pushPoint = function(){
  this.backup_pointNum = this.pointList.length();
}

Link.prototype.pointIsChanged = function(){
  if(this.backup_pointNum == this.pointList.length()){
    return false;
  }
  else{
    return true;
  }
}

Link.prototype.setSlider = function(_sc){
    this.isSlider = true;
    this.baseSC = _sc;
    this.name = this.name.replace("Link", "Slider");
}


/* removed in 2.4
//--------------------
// Space Class
//--------------------
function Space(){
    Link.apply(this, arguments);

    this.name = "Global Space";
    this.originPoint = new Point2D(0, 0);
    this.DOF = 0;

  //console.log("[Space] new space: " + this.name);
}
// --- Inheritance
Space.prototype = new Link();
Space.prototype.constructor = Space;
*/
