/**
 * @author juwhan kim
 * @author hanjong kim
 * last modified: 2016.06.30
 */

// ==========================================================================================
//						CoaxialConstraint Class
// ==========================================================================================

/**
    CoaxialConstraint
    defines xy coordiante constraint about two points
*/

// === Constructor ===
function CoaxialConstraint(arg1, arg2, arg3, arg4, arg5) {
    Constraint.apply(this, arguments);
    this.point = new ArrayList();
    this.DOF = -2;

    switch(arguments.length){
        case 1: // name
            this.name = arg1;
            break;
        case 4: // Link _baseLink, Point2D _basePoint, Link _targetLink, Point2D _targetPoint
            if(arg1.getPointList().contains(arg2) && arg3.getPointList().contains(arg4)){
                this.link.add(arg1);
                this.point.add(arg2);
                this.link.add(arg3);
                this.point.add(arg4);
            }
            this.name = "CoaxialConstraint" + CoaxialConstraint.COUNTER++;
            break;
        case 5: // String _name, Link _baseLink, Point2D _basePoint, Link _targetLink, Point2D _targetPoint
            if(arg2.getPointList().contains(arg3) && arg4.getPointList().contains(arg5)){
                this.link.add(arg2);
                this.point.add(arg3);
                this.link.add(arg4);
                this.point.add(arg5);
            }
            this.name = arg1;
            break;

    }
}
CoaxialConstraint.COUNTER = 1;
CoaxialConstraint.prototype = new Constraint();
CoaxialConstraint.prototype.constructor = CoaxialConstraint;


// === IO ===
CoaxialConstraint.prototype.toString = function() {
    var returnValue = "";

    for (var i = 0; i < this.point.length(); i++) {
        returnValue += "[";
        returnValue += this.getLink(i);
        returnValue += "(";
        var _num = this.getPoint(i).getX();
        returnValue += _num.toFixed(2);

        returnValue += ", ";
        var _num = this.getPoint(i).getY();
        returnValue += _num.toFixed(2);

        returnValue += ")]\t";
    }
    return returnValue;
}
CoaxialConstraint.prototype.addPoint = function(_link, _point) {
    this.link.add(_link);
    this.point.add(_point);
}
CoaxialConstraint.prototype.removePoint = function(_point) {
    if (this.point.contains(_point)) {
        this.link.removeOf(this.point.indexOf(_point));
        this.point.remove(_point);

    }
}
CoaxialConstraint.prototype.getAllPoint = function() {
    return this.point;
}
CoaxialConstraint.prototype.getPoint = function(_index) {
    if (this.point.length() > _index) {
        return this.point.get(_index);
    }
    return null;
}
