//--------------------
// Trajectory Class
//--------------------
// from m.sketch 2.4 java
// updated on 2015.11.02


function Trajectory(_assembly, _point) {

    this.assembly;
    this.link;
    this.point;
    this.gpoint;
    this.trajectory = new ArrayList();
    this.trajectoryOneCycle= new Array(); //* For YONSEI Analysis

    if (_assembly != null && _point != null) {
            this.assembly = _assembly
            this.link = _assembly.getBelongedLink(_point);
            this.point = _point;
            this.flush();
            this.gpoint = this.link.getGlobalPosition(this.point);
    }
}

Trajectory.prototype.getPoint = function() {
    return this.point;
}
Trajectory.prototype.setPoint = function(_point) {
    this.point = _point;
}
Trajectory.prototype.getTrajectory = function() {
    return this.trajectory;
}
Trajectory.prototype.getTrajectoryOneCycle = function() {
    return this.trajectoryOneCycle;
}

Trajectory.prototype.flush = function() {
    this.trajectory = new ArrayList();
    this.trajectoryOneCycle = new Array();
}

Trajectory.prototype.record = function() {
    this.gpoint = this.link.getGlobalPosition(this.point);
    this.trajectory.add(this.gpoint);

    /*
    if(this.trajectory.length()==2){
        this.trajectory.set(0, this.trajectory.get(1));
    }
    */

    if(this.trajectory.length()>MAX_TRAJECTORY_SIZE/3-1){
        this.trajectory.removeOf(0);
    }

    //* For YONSEI Analysis
    if(isAnalysisOn && Math.abs(globalAngle)<Math.PI*2){
        this.trajectoryOneCycle.push(Math.abs(globalAngle)+"/"+this.gpoint.getX()+"/"+this.gpoint.getY());
        //console.log(trajectoryOneCycle[trajectoryOneCycle.length-1]);
        if(this.trajectoryOneCycle.length==2){
            this.trajectoryOneCycle[0] = this.trajectoryOneCycle[1];
        }
    }

    //console.log(this.trajectory.get(0));
    /*
    if(this.link.getGlobalPosition(this.point)==null) return;
    this.pointList.add(this.link.getGlobalPosition(this.point));
    this.gpoint = this.link.getGlobalPosition(this.point);
    */
}

Trajectory.prototype.init = function(){
    //this.flush();
    if(this.gpoint!=null)	this.gpoint = this.link.getGlobalPosition(this.point);
}
