/**
 * @author juwhan kim
 * @author hanjong kim
 * last modified: 2016.06.30
 */

// ==========================================================================================
//						AngularConstraint Class
// ==========================================================================================

/**
    AngularConstraint
    defines a relative angle from the baseLink to the targetLink.
*/

// === Constructor ===
function AngularConstraint(arg1, arg2) {
    Constraint.apply(this, arguments);
    this.DOF = -1;
    this.angle;
    if (arguments.length > 0) {
        this.setLink(this.BASE, arg1);
        this.setLink(this.TARGET, arg2);
        this.angle = arg2.getAngle() - arg1.getAngle();
    }

    this.name = "AngularConstraint" + AngularConstraint.COUNTER++;
}
AngularConstraint.COUNTER = 1;
AngularConstraint.prototype = new Constraint();
AngularConstraint.prototype.constructor = AngularConstraint;

// === IO ===
AngularConstraint.prototype.setAngle = function(_angle) {
    while (_angle > 2 * Math.PI) {
        _angle -= 2 * Math.PI;
    }
    while (_angle < 0) {
        _angle += 2 * Math.PI;
    }
    this.angle = _angle;
}
AngularConstraint.prototype.getAngle = function() {
    return this.angle;
}
