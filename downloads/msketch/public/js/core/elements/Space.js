//--------------------
// Space Class
//--------------------
// from m.sketch 2.4 java
// updated on 2015.11.02

//-------------------- Constructor --------------------
function Space(){
    Link.apply(this, arguments);

    this.name = "Anchor";
    this.originPoint = new Point2D(0, 0);
    this.DOF = 0;

  //console.log("[Space] new space: " + this.name);
}
// --- Inheritance
Space.prototype = new Link();
Space.prototype.constructor = Space;

Space.prototype.redefineVertex = function(){

}
