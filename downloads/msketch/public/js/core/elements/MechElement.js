/**
 * @author juwhan kim
 * @author hanjong kim
 * last modified: 2016.06.30
 */

// ==========================================================================================
//						MechElement Class
// ==========================================================================================

// === Constructor ===
function MechElement(arg1, arg2, arg3){
    this.name;
    this.originPoint = new Point2D();
    this.backup_originPoint;
    this.DOF;

    var arg_num = arguments.length;
    switch(arg_num){
        case 1:
            if(typeof(arg1)=="string"){									// Element(String _name)
                this.name = arg1;
            }
            else{														// Element(Point2D _pt)
                this.originPoint = arg1;
            }
            break;
        case 2:
            if((typeof(arg1)=="number")&&(typeof(arg2)=="number")){ 	// Element(double _x, double _y)
                this.originPoint = new Point2D(arg1, arg2);
            }
            else{														// Element(String _name, Point2D _pt)
                this.name = arg1;
                this.originPoint = arg2;
            }
            break;
        case 3:  														//  Element(String _name, double _x, double _y)
                this.name = arg1;
                this.originPoint = new Point2D(arg2, arg3);
            break;
    }
}


//-------------------- IO Functions --------------------
MechElement.prototype.getOriginPoint = function(){
    return this.originPoint;
}
MechElement.prototype.setOriginPoint = function(arg1, arg2){
    var arg_num = arguments.length;
    switch(arg_num){
        case 1:
            this.originPoint = arg1;
            break;
        case 2:
            this.originPoint = new Point2D(arg1, arg2);
            break;

    }
}
MechElement.prototype.getName = function(){
    return this.name;
}
MechElement.prototype.setName = function(_name){
    this.name = _name;
}
MechElement.prototype.getDOF = function(){
    return this.DOF;
}
MechElement.prototype.savePosition = function(){
    this.backup_originPoint = new Point2D(this.originPoint.getX(), this.originPoint.getY());
}
MechElement.prototype.restorePosition = function(){
    this.originPoint = this.backup_originPoint;
}
