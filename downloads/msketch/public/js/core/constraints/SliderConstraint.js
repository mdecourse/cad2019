/**
 * @author juwhan kim
 * @author hanjong kim
 * last modified: 2017.11.07
 */

// ==========================================================================================
//						Slider Constraint Class
// ==========================================================================================
function SliderConstraint(_baseLink, _targetLink, _p1, _p2) {
    Constraint.apply(this, arguments);

    this.p1 = new Point2D(null, null);
    this.p2 = new Point2D(null, null);
    this.DOF = -2;
    this.name = "SliderConstraint" + SliderConstraint.COUNTER++;

    if(arguments.length>0){
        this.setLink(this.BASE, _baseLink);
        this.setLink(this.TARGET, _targetLink);
        this.setPoints([_p1, _p2]);
    }

    
}
SliderConstraint.COUNTER = 1;
SliderConstraint.prototype = new Constraint();
SliderConstraint.prototype.constructor = SliderConstraint;

SliderConstraint.prototype.toString = function() {
    return this.name;
}
SliderConstraint.prototype.getPoint1 = function(){
  return this.p1;
}
SliderConstraint.prototype.setPoint1 = function(_p1){
  this.p1 = _p1;
}
SliderConstraint.prototype.getPoint2 = function(){
  return this.p2;
}
SliderConstraint.prototype.setPoint2 = function(_p2){
  this.p2 = _p2;
}
SliderConstraint.prototype.getPoints = function(){
  return [this.p1, this.p2];
}
SliderConstraint.prototype.setPoints = function(_pts){
  if(_pts!=null && _pts.length==2){
    this.p1 = _pts[0];
    this.p2 = _pts[1];
    return true;
  } else {
    return false;
  }
}

SliderConstraint.prototype.getAngle = function(){
    return Math.atan2(this.p2.getY()-this.p1.getY(), this.p2.getX()-this.p1.getX());
}
