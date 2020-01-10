// =============================================================================
// 								Assembly Class
// =============================================================================
// from m.sketch 2.4 java
// updated on 2015.11.02

/**
* The basic unit of calculating mechanism.
*/


function Assembly(){
    this.allElement = new ArrayList();
    this.allConstraint = new ArrayList();
    this.allActuator = new ArrayList();
    this.unspecifiedElementList = new ArrayList();
    this.space;
}

// ============================ Space (fixed points) =================================
Assembly.prototype.getSpace = function(){
    return this.space;
}
Assembly.prototype.addSpace = function(_space){
    if(_space != null){
        this.space = _space;
    }
    return this.addElement(_space);
}

// ============================ Elements (both Link and Space) =================================
Assembly.prototype.getAllElement = function(){
    return this.allElement;
}
Assembly.prototype.addElement = function(_element){
    if(!(_element instanceof ArrayList)){
        if(this.allElement.contains(_element)) return false;
        return this.allElement.add(_element);
    }
    else{
        var returnValue = false;
        for(var ei in _element.array){
            e = _element.get(ei);
            returnValue = returnValue || this.addElement(e);
        }
        return returnValue;
    }
}

Assembly.prototype.removeElement = function(_element){
    if(!(_element instanceof ArrayList)){
        if(_element instanceof Link){
            for(var i=0; i<this.allActuator.length(); i++){
                if(this.allActuator.get(i) instanceof JointActuator){
                    var ja = this.allActuator.get(i);
                    if(ja.getBaseLink() == _element || ja.getTargetLink() == _element){
                        this.allActuator.remove(ja);
                    }
                }
            }
            for(var i=0; i<this.allConstraint.length(); i++){
                if(this.allConstraint.get(i) instanceof SliderConstraint){
                    var sc = this.allConstraint.get(i);
                    if(sc == _element.baseSC){
                        this.allConstraint.remove(sc);
                    }
                }
            }
        }
        return this.allElement.remove(_element);
    }
    else{
        var returnValue = false;
        for(var ei in _element.array){
            e = _element.get(ei);
            console.log(this.removeElement(e));
            returnValue = returnValue || this.removeElement(e);
        }
        return this.allElement.remove(_element);
    }
}

// ============================ Constraint  =================================
Assembly.prototype.getAllConstraint = function(){
    return this.allConstraint;
}
Assembly.prototype.addConstraint = function(_constraint){
    if(this.allConstraint.contains(_constraint)) return false;
    return this.allConstraint.add(_constraint);
}
Assembly.prototype.removeConstraint = function(_constraint){
    return this.allConstraint.remove(_constraint);
}
Assembly.prototype.removePointInConstraint = function(_point){
    for(var i=0; i<this.allConstraint.length(); i++){
        if(this.allConstraint.get(i) instanceof CoaxialConstraint){
            var cc = this.allConstraint.get(i);
            for(var j = cc.getAllPoint().length()-1; j>=0; j--){
                if(cc.getPoint(j) == _point){
                    cc.removePoint(_point);
                    this.removeActuatorInConstraint(cc);
                }
            }
        }
    }

    this.checkCoaxialConstraint();
}
Assembly.prototype.appendCoaxialConstraint = function(_baseLink, _basePoint, _targetLink, _targetPoint){
    var links = [_baseLink, _targetLink];
    var pts = [_basePoint, _targetPoint];

    var cc = new CoaxialConstraint(_baseLink, _basePoint, _targetLink, _targetPoint);
    this.addConstraint(cc);

    this.checkCoaxialConstraint();
}
//** This function is to merge constrains with more than 3 links.
//** It will not be necessary for creating pre-defined Jansen Mech.
Assembly.prototype.checkCoaxialConstraint = function(){
    for(var i=this.allConstraint.length()-1; i>0; i--){
        if(this.allConstraint.get(i) instanceof CoaxialConstraint){
            var cc = this.allConstraint.get(i);

            // to merge duplicate CoaxialConstraint //
            for(var p=0; p<cc.getAllPoint().length(); p++){
                var pt = cc.getAllPoint().get(p);

                for(var j=i-1; j>=0; j--){
                    if(this.allConstraint.get(j) instanceof CoaxialConstraint){
                        var cc2 = this.allConstraint.get(j);
                        var isDuplicated = false;

                        for(var t=0; t<cc2.getAllPoint().length(); t++){
                            if(cc2.getPoint(t)==pt){
                              // found a duplicate Coaxialconstraint //
                              isDuplicated = true;
                              break;
                            }
                        }

                        if(isDuplicated){
                            for(var t=0; t<cc2.getAllPoint().length(); t++){
                              var checker = false;
                              for(var m=0; m<cc.getAllPoint().length(); m++){
                                if(cc2.getPoint(t)==cc.getPoint(m)){
                                  checker = true;
                                }
                              }
                              if( !checker ){
                                cc.addPoint(cc2.getLink(t), cc2.getPoint(t));
                              }
                            }
                            //check JA
                            for(var k=0; k<this.allActuator.length(); k++){
                                if(this.allActuator.get(k).getCoaxialConstraint() == cc2){
                                    this.allActuator.get(k).setCoaxialConstraint(cc);
                                }
                            }

                            this.allConstraint.remove(cc2);

                            i--;
                        }
                    }
                }
            }
        }
    }

    for(var i=this.allConstraint.length()-1; i>=0; i--){
      if(this.allConstraint.get(i) instanceof CoaxialConstraint){
        var cc = this.allConstraint.get(i);
        if(cc.getAllPoint().length()<=1){
          this.allConstraint.remove(cc);
        }
      }
    }
}
Assembly.prototype.printConstraints = function(){
    for(var i=0; i<allConstraint.length(); i++){
      console.log(i+". ");
      console.log(allConstraint.get(i));
    }
}

// ============================ Actuators  =================================
Assembly.prototype.getAllActuator = function(){
    return this.allActuator;
}
Assembly.prototype.addActuator = function(_actuator){
    if(this.allActuator.contains(_actuator)) return false;
    var returnValue = this.allActuator.add(_actuator);
    if(returnValue){
      _actuator.attach(this);
    }
    return returnValue;
}
Assembly.prototype.removeActuator = function(_actuator){
    var returnValue = this.allActuator.remove(_actuator);
    if(returnValue){
      _actuator.dettach(this);
    }
    return returnValue;
}
Assembly.prototype.removeActuatorInConstraint = function(_cc){
    for(var i=0; i<this.allActuator.length(); i++){

        if(this.allActuator.get(i) instanceof JointActuator){
            var ja = this.allActuator.get(i);
            if(ja.coaxialConstraint == _cc){
                this.removeActuator(ja)
            }
        }
    }

    this.checkCoaxialConstraint();
}

// ============================ Check DOF  =================================
Assembly.prototype.emptyUnspecified = function(){
    this.unspecifiedElementList.clear();
    return this.unspecifiedElementList.isEmpty();
}
Assembly.prototype.getUnspecified = function(){
    return this.unspecifiedElementList;
}
Assembly.prototype.addUnspecified = function(_element){
    if(!(_element instanceof ArrayList)){
        return this.unspecifiedElementList.add(_element);
    }
    else{
        return this.unspecifiedElementList.addAll(_element);
    }
}
Assembly.prototype.getDOF = function(){
    var returnValue = 0;

    for(var ei in this.allElement.array){
        var e = this.allElement.get(ei);
        returnValue += e.getDOF();
    }
    for(var ci in this.allConstraint.array){
        var c = this.allElement.get(ci);
        returnValue += c.getDOF();
    }
    return returnValue;
}

// ============================ Interfacing  =================================
Assembly.prototype.getGlobalPosition = function(_p){
    var belongedLink = this.getBelongedLink(_p);
    if(belongedLink!=null){
        return belongedLink.getGlobalPosition(_p);
    } else {
        return null;
    }
}
Assembly.prototype.getBelongedLink = function(_p){
    for(var ei in this.allElement.array){
        var e = this.allElement.get(ei);
        if(e instanceof Link){
            var _pointList = e.getPointList();

            for(pi in _pointList.array){
                var p = _pointList.get(pi);
                if(p == _p ){
                    return e;
                }
            }
        }
    }
    return null;
}
Assembly.prototype.savePositions = function(){
    for(var ei in this.allElement.array){
      var e = this.allElement.get(ei);
      e.savePosition();
    }
    for(var ai in this.allActuator.array){
        var a = this.allActuator.get(ai);

        if(a instanceof JointActuator){
            a.savePosition();
        }
    }
}
Assembly.prototype.restorePositions = function(){
    for(var ei in this.allElement.array){
        var e = this.allElement.get(ei);
        e.restorePosition();
    }
    for(var ai in this.allActuator.array){
        var a = this.allActuator.get(ai);

        if(a instanceof JointActuator){
            a.restorePosition();
        }
    }
}

// Get Element by name
Assembly.prototype.getLinkByName = function(_name){
    var elementList = this.getAllElement();

    for(var ei in elementList.array){
        var e = elementList.get(ei);
        if(e instanceof Space || e instanceof Link){
            if(e.name==_name){
                return e;
            }
        }
    }
    return null;
}
Assembly.prototype.getConstraintByName = function(_name){
    var constraintList = this.getAllConstraint();

    for(var ci in constraintList.array){
        var c = constraintList.get(ci);
        if(c instanceof CoaxialConstraint){
            if(c.name==_name){
                return c;
            }
        }
    }
    return null;
}
