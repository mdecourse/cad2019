//--------------------
// JointActuator Class
//--------------------
// from m.sketch 2.4 java
// updated on 2015.11.02

function JointActuator(arg1, arg2, arg3, arg4) {
    MechElement.apply(this, arguments);

    this.coaxialConstraint;
    this.angularConstraint;
    this.angle = 0;
    this.initAngle = 0;

    this.isServo = false;
    this.startAngle = 0;
    this.endAngle = Math.PI;

    this.speedMultiply = 1.00;
    this.phaseShift = 0;
    this.revDir = false;

    this.backup_angle;

    var arg_num = arguments.length;

    switch (arg_num) {
        case 3:
            if (arg1 != null && arg2 != null && arg3 != null) {
                this.coaxialConstraint = arg1;
                this.angularConstraint = new AngularConstraint(arg2, arg3);
                this.originPoint = arg1.getPoint(0);
            }
            this.name = "Motor" + JointActuator.counter++;
            break;
        case 4: // String _name, CoaxialConstraint _cc, Link _baseLink, Link _targetLink
            if (arg2 != null && arg3 != null && arg4 != null) {
                this.coaxialConstraint = arg2;
                this.angularConstraint = new AngularConstraint(arg3, arg4);
                this.originPoint = arg2.getPoint(0);
            }
            this.name = arg1;
            break;
    }
}
// --- Inheritance
JointActuator.counter = 1;
JointActuator.prototype = new MechElement();
JointActuator.prototype.constructor = JointActuator;

JointActuator.prototype.getName = function() {
    return this.name;
}
JointActuator.prototype.getValue = function() {
    return this.angle;
}
JointActuator.prototype.setValue = function(_value) {
    this.angle = _value;
    this.angularConstraint.setAngle(this.angle - this.initAngle);
}

JointActuator.prototype.setCoaxialConstraint = function(_cc) {
    this.coaxialConstraint = _cc;
}
JointActuator.prototype.getCoaxialConstraint = function() {
    return this.coaxialConstraint;
}
JointActuator.prototype.getBaseLink = function() {
    return this.angularConstraint.getLink(this.angularConstraint.BASE);
}
JointActuator.prototype.getTargetLink = function() {
    return this.angularConstraint.getLink(this.angularConstraint.TARGET);
}
JointActuator.prototype.attach = function(_assembly) {
    if (_assembly == null) return;
    _assembly.addConstraint(this.angularConstraint);

}
JointActuator.prototype.dettach = function(_assembly) {
    if (_assembly == null) return;
    _assembly.removeConstraint(this.angularConstraint);
}

JointActuator.prototype.savePosition = function() {
    this.backup_angle = this.getValue();
}
JointActuator.prototype.restorePosition = function() {
    this.setValue(this.backup_angle);
}


// interfacing with motor panel
JointActuator.prototype.setPhase = function(_phase) {
    this.phaseShift = _phase;
}
JointActuator.prototype.getPhase = function() {
    return this.phaseShift;
}
JointActuator.prototype.setSpeedMultiply = function(_speedM) {
    this.speedMultiply = _speedM;
}
JointActuator.prototype.getSpeedMultiply = function() {
    return this.speedMultiply;
}
JointActuator.prototype.setReverse = function(_flag) {
    this.revDir = _flag;
}
JointActuator.prototype.getReverse = function() {
    return this.revDir;
}
JointActuator.prototype.setStartAngle = function(_phase) {
    this.startAngle = _phase;
}
JointActuator.prototype.getStartAngle = function() {
    return this.startAngle;
}
JointActuator.prototype.setEndAngle = function(_phase) {
    this.endAngle = _phase;
}
JointActuator.prototype.getEndAngle = function() {
    return this.endAngle;
}
JointActuator.prototype.setInitAngle = function(_angle) {
    this.initAngle = _angle;
}


JointActuator.prototype.setServo = function() {
    this.isServo = true;
}
JointActuator.prototype.setDC = function() {
    this.isServo = false;
}
