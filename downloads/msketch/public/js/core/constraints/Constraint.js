/**
 * @author juwhan kim
 * @author hanjong kim
 * last modified: 2016.06.30
 */

// ==========================================================================================
//						Constraint Class
// ==========================================================================================

// === Constructor ===
function Constraint() {
    this.name;
    this.link = new ArrayList();
    this.DOF = 0;
    this.BASE = 0;
    this.TARGET = 1;
}

// === IO ===
Constraint.prototype.getAllLink = function() {
    return this.link;
}
Constraint.prototype.getLink = function(_index) {
    if (this.link.length() >= _index + 1) {
        return this.link.get(_index);
    } else {
        return null;
    }

}
Constraint.prototype.setLink = function(_index, _link) {
    if (this.link.length() >= _index + 1) {
        this.link.set(_index, _link);
    } else {
        while (this.link.length() < _index) {
            this.link.add(null);
        }
        this.link.add(_link);
    }
}
Constraint.prototype.getDOF = function() {
    return MechConstraint.DOF;
}
