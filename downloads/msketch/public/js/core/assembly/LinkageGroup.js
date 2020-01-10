//-------------------
// Linkage Group Class
//-------------------
// from m.sketch 2.4 java
// updated on 2015.11.02

function LinkGroup(_link){
    this.linkList = new ArrayList();
    this.relativePosition;
    this.relativeAngle;
    this.positionRelativeTo = null;
    this.angleRelativeTo = null;

    var arg_num = arguments.length;
    switch(arg_num){
        case 0:
            this.relativePosition = new Point2D(0,0);
            this.relativeAngle = 0;
            break;
        case 1:
            this.relativePosition = new Point2D(0,0);
            this.relativeAngle = 0;
            this.linkList.add(_link);
            break;
    }

}

LinkGroup.prototype.setRelativePosition = function(_point){
    this.relativePosition = _point;
}
LinkGroup.prototype.getRelativePosition = function(){
    return this.relativePosition;
}
LinkGroup.prototype.setRelativeAngle = function(_angle){
    this.relativeAngle = _angle;
}
LinkGroup.prototype.getRelativeAngle = function(){
    return this.relativeAngle;
}
LinkGroup.prototype.getLinkList = function(){
    return this.linkList;
}
LinkGroup.prototype.addLink = function(_link){
    if(_element instanceof Link){
        var  returnValue = this.linkList.add(_link);
        return returnValue;
    }
    else if(_element instanceof ArrayList){
        var  returnValue = this.linkList.addAll(_link);
        return returnValue;
    }
}
LinkGroup.prototype.removeLink = function(_link){
    var  returnValue = this.linkList.remove(_link);
    return returnValue;

}
LinkGroup.prototype.findOutgoingCoaxialConstraint = function(_constraintList, _listGroup){
    var returnValue = new ArrayList();

    for(var ci = 0; ci<_constraintList.array.length; ci++){
        // find_in_a_cc:
        var c = _constraintList.array[ci];
        if(c instanceof CoaxialConstraint){
            var cc = c;
            var addedLG = new ArrayList();

            for(var i=0; i<cc.getAllPoint().length(); i++){
                if(this.linkList.contains(cc.getLink(i))){
                    for(var j=0; j<cc.getAllPoint().length(); j++){
                        if(i!=j && !this.linkList.contains(cc.getLink(j)) && !addedLG.contains(cc.getLink(j))){
                            returnValue.add(new CCI(cc, i, j));

                            for(var lgi = 0; lgi < _listGroup.array.length; lgi++){
                                lg = _listGroup.array[lgi];
                                if(lg.getLinkList().contains(cc.getLink(j))){
                                    addedLG.add(lg);
                                }
                            }
                        }
                    }
                    break;
                }
            }
        }
    }
    return returnValue;
}

LinkGroup.prototype.findOutgoingSliderConstraint = function(_constraintList) {
  var returnValue = new ArrayList();

  for (var ci=0; ci< _constraintList.array.length; ci++) {
      var c = _constraintList.array[ci];

    if (c instanceof SliderConstraint) {
      var sc = c;
      var base = sc.getLink(sc.BASE);
      var target = sc.getLink(sc.TARGET);

      if (base!=null && target!=null) {
        if (this.linkList.contains(base) && !this.linkList.contains(target)) {
          returnValue.add(sc);
        }
        //for(Link l:linkList){
        //  if(base == l && ){

        //  }
        //}
      }
    }
  }
  return returnValue;
}

LinkGroup.prototype.findOutgoingAngularConstraint = function(_constraintList){
    //console.log("[LinkGroup.findOutgoingAngularConstraint] " + _constraintList.array[0].constructor.name);
    var returnValue = new ArrayList();
    for(var ci=0; ci< _constraintList.array.length; ci++){
        var c = _constraintList.array[ci];
        if(c instanceof AngularConstraint){
            for(var i=0; i<2; i++){
                if(this.linkList.contains(c.getLink(i)) && !this.linkList.contains(c.getLink(1-i))){
                    returnValue.add(new ACI(c, 1-i));
                }
            }
        }
    }
    return returnValue;

}
LinkGroup.prototype.getLocalPosition = function(_l, _p){
    var x = _l.getOriginPoint().getX() + _p.getX()*Math.cos(_l.getAngle()) - _p.getY()*Math.sin(_l.getAngle());
    var y = _l.getOriginPoint().getY() + _p.getX()*Math.sin(_l.getAngle()) + _p.getY()*Math.cos(_l.getAngle());
    return new Point2D(x, y);
}
LinkGroup.prototype.getLocalAngle = function(_l, _p){
    var localPosition = this.getLocalPosition(_l, _p);
    return Math.atan2(localPosition.getY(), localPosition.getX());
}
LinkGroup.prototype.merge = function(_targetLG, _groupList){
    for(var li=0; li< _targetLG.getLinkList().array.length; li++){
        l = _targetLG.getLinkList().array[li];

        var ox=l.getOriginPoint().getX();
        var oy=l.getOriginPoint().getY();

        var rx=ox*Math.cos(+_targetLG.getRelativeAngle())-oy*Math.sin(+_targetLG.getRelativeAngle())+_targetLG.relativePosition.getX();
        var ry=ox*Math.sin(+_targetLG.getRelativeAngle())+oy*Math.cos(+_targetLG.getRelativeAngle())+_targetLG.relativePosition.getY();

        l.setOriginPoint(rx,ry);
        l.setAngle( l.getAngle() + _targetLG.getRelativeAngle() );
        this.linkList.add(l);
    }

    _groupList.remove(_targetLG);
}
LinkGroup.prototype.backToZero = function(){
    var space = null;
    for (var li=0; li< this.linkList.array.length; li++) {
        var l = this.linkList.array[li];

      if(l instanceof Space){
        space = l;
      }
    }

    // ************************************************************
    if(space!=null){
      var zeroP = new Point2D(  JSON.parse(JSON.stringify(space.getOriginPoint().getX()) ),
                                JSON.parse(JSON.stringify(space.getOriginPoint().getY()) ) );
      var zeroA = space.getAngle();

      for (var li=0; li< this.linkList.array.length; li++) {
        var l = this.linkList.array[li];
         var ox=l.getOriginPoint().getX() - zeroP.getX();
         var oy=l.getOriginPoint().getY() - zeroP.getY();

         var rx=ox*Math.cos(-zeroA)-oy*Math.sin(-zeroA);
         var ry=ox*Math.sin(-zeroA)+oy*Math.cos(-zeroA);

         l.setOriginPoint(rx, ry);
         l.setAngle( l.getAngle() - zeroA );
      }
    }
}

LinkGroup.prototype.zeroToPoint = function(_newOrigon){
    for(var li=0; li< this.getLinkList().array.length; li++){
        var l = this.getLinkList().array[li];
        var x=l.getOriginPoint().getX()-_newOrigon.getX();
        var y=l.getOriginPoint().getY()-_newOrigon.getY();
        l.setOriginPoint(x, y);
    }
}
LinkGroup.prototype.isBaseGroup = function(){
    for(var li = 0; li< this.linkList.array.length; li++){
        if(this.linkList.array[li] instanceof Space){
          return true;
        }
    }
    return false;
}


function CCI(_constraint, _base, _target){
    this.constraint = _constraint;
    this.target = _target;
    this.base = _base;
}
CCI.prototype.inverseCCI = function(){
    return new CCI(this.constraint, this.target, this.base);
}

function ACI(_constraint, _target){
    this.constraint = _constraint;
    this.target = _target;
    this.base = 1-this.target;

    //console.log("[New ACI] " + this.constraint);
}

function LinkTriangle(_base, _floating, _output, _b2f, _b2o, _f2o){
    this.base = _base;
    this.floating=_floating;
    this.output=_output;
    this.b2f=_b2f;
    this.b2o=_b2o;
    this.f2o=_f2o;
}

function LinkTriangle2(_a, _b, _c, _a2b, _b2c, _a2c) {
    this.a=_a;
    this.b=_b;
    this.c=_c;
    this.a2b=_a2b;
    this.b2c=_b2c;
    this.a2c=_a2c;
}
