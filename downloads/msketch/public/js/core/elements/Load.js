//--------------------
// Load Class
//--------------------
// updated on 2018.02.05 by jeong yunwoo

function Load(_assembly, _point){
  this.assembly;
  this.link;
  this.point;
  this.gpoint;
  // this.fx = 1;
  // this.fy = 1;
  this.initialLoad = 100;
  this.loadX = this.initialLoad;
  this.loadY = this.initialLoad;

  if (_assembly != null && _point != null) {
            this.assembly = _assembly
            this.link = _assembly.getBelongedLink(_point);
            this.point = _point;
            this.gpoint = this.link.getGlobalPosition(this.point);
    }
}

Load.prototype.getPoint = function() {
    return this.point;
}

Load.prototype.init = function(){
    if(this.gpoint!=null)	this.gpoint = this.link.getGlobalPosition(this.point);
}

// Load.prototype.getFy = function() {
// 	return this.fy;
// }
Load.prototype.getLoadX = function() {
    return this.loadX;
}

Load.prototype.getLoadY = function() {
    return this.loadY;
}

Load.prototype.setLoadX = function(_loadX) {
    this.loadX = _loadX;
}

Load.prototype.setLoadY = function(_loadY) {
    this.loadY = _loadY;
}

Load.prototype.getGlobalPosition = function(){
  return this.gpoint;
}
