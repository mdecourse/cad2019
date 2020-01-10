function Gear(){
    this.point = new Point2D(0, 0);
    this.radius = 100;
    this.pitch = 15;
    this.teethUnit = 20;

    this.vertices = [];

    this.defineVertices();
}

Gear.prototype.getPoint = function(){
    return this.point;
}
Gear.prototype.setPoint = function(_p){
    this.point = _p;
}
Gear.prototype.setRadius = function(_r){
    this.radius = _r;
    this.defineVertices();
}
Gear.prototype.defineVertices = function(){
    var circum = 2 * Math.PI * this.radius;
    var numOfTeeth = Math.ceil(circum/this.teethUnit);

    var returnVertex = [];

    var step = Math.PI*2 / numOfTeeth;

    for(var i=0; i<Math.PI*2-step/2; i+=step){
        var topX = ( this.radius + (this.pitch/2) )*Math.cos(i);
        var topY = ( this.radius + (this.pitch/2) )*Math.sin(i);
        var bottomX = ( this.radius - (this.pitch/2) )*Math.cos(i);
        var bottomY = ( this.radius - (this.pitch/2) )*Math.sin(i);

        var topX1 = topX + 2 * Math.sin(i);
        var topY1 = topY - 2 * Math.cos(i);
        var topX2 = topX - 2 * Math.sin(i);
        var topY2 = topY + 2 * Math.cos(i);

        var bottomX1 = bottomX + 7 * Math.sin(i);
        var bottomY1 = bottomY - 7 * Math.cos(i);
        var bottomX2 = bottomX - 7 * Math.sin(i);
        var bottomY2 = bottomY + 7 * Math.cos(i);

        returnVertex.push(bottomX1);
        returnVertex.push(bottomY1);
        returnVertex.push(0);
        returnVertex.push(topX1);
        returnVertex.push(topY1);
        returnVertex.push(0);

        returnVertex.push(topX2);
        returnVertex.push(topY2);
        returnVertex.push(0);
        returnVertex.push(bottomX2);
        returnVertex.push(bottomY2);
        returnVertex.push(0);

    }

    this.vertices = returnVertex;
}
Gear.prototype.getVertices = function(){
    return this.vertices;
}
