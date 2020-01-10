//-------------------
// MechanismCalculator Class
//-------------------
// from m.sketch 2.4 java
// updated on 2015.11.02

function MechanismCalculator(){
    this.mapsOfMu;
    this.sliderMu;
}


MechanismCalculator.prototype.onStart = function(_assembly){
    this.mapsOfMu = this.mapMu(_assembly);
    this.sliderMu = new Object();
}
MechanismCalculator.prototype.onEnd = function(_assembly){

}
MechanismCalculator.prototype.calculateAssembly = function(_assembly){
    var noError = true;
    var maxCost = 0;

    var groupList = this.buildLinkGroup(_assembly);
    _assembly.emptyUnspecified();

    var lastNOfGroup = groupList.length()+1;

    while(groupList.length()>1 && lastNOfGroup>groupList.length()){
        lastNOfGroup = groupList.length();

        var baseGroupIndex = 0;
        while(baseGroupIndex<groupList.length()){
            var baseLG = groupList.get(baseGroupIndex);
            var outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getAllConstraint() , groupList);
            var outgoingAngularConstraint = baseLG.findOutgoingAngularConstraint( _assembly.getAllConstraint() );

            /**
             find a pair of linkGroups that share both coaxialConstraint and a angularConstraint (e.g. LinkointActuator)
            */

            var targetIndex = baseGroupIndex+1;
            while(targetIndex<groupList.length()){
                var targetLG = groupList.get(targetIndex);

                var ac_constraint = this.search_AC_Constraint(targetLG, outgoingAngularConstraint, outgoingCoaxialConstraint);
                if(ac_constraint[0].length()==1 && ac_constraint[1].length()==1){
                    var ac = ac_constraint[0].get(0);
                    var cc = ac_constraint[1].get(0);

                    targetLG.zeroToPoint(targetLG.getLocalPosition(cc.constraint.getLink(cc.target), cc.constraint.getPoint(cc.target)));
                    targetLG.setRelativePosition(  baseLG.getLocalPosition(cc.constraint.getLink(cc.base),   cc.constraint.getPoint(cc.base)) );
                    var angleSign = (ac.target==Constraint.target) ?+1 : -1; // javascript does it work?

                    targetLG.setRelativeAngle( ac.constraint.getLink(ac.base).getAngle() - ac.constraint.getLink(ac.target).getAngle() + angleSign*ac.constraint.getAngle());

                    baseLG.merge(targetLG, groupList);

                    // need to re-collect information
                    outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getAllConstraint() , groupList );
                    outgoingAngularConstraint = baseLG.findOutgoingAngularConstraint( _assembly.getAllConstraint() );
                }else{
                    if(ac_constraint[0].length()+ac_constraint[1].length()>=2){
                      // over-constraint
                    }
                    targetIndex++;
                }
            }

            /**
             find three linkGroup that are connected by three coaxial constraints
            */
            var needToFindMore = true;

            while(needToFindMore){
              needToFindMore = false;

              /// XXX constraint ///
              var triangle = this.findXXXLinkTriangle(_assembly, groupList, baseLG, outgoingCoaxialConstraint);
              if( triangle != null ){
                var 	b    = triangle.base;
                var 	f    = triangle.floating;
                var 	o    = triangle.output;
                var     b2f  = triangle.b2f;
                var     b2o  = triangle.b2o;
                var     f2o  = triangle.f2o;


                var R1   = this.getPtoP( b.getLocalPosition(b2f.constraint.getLink(b2f.base), 	b2f.constraint.getPoint(b2f.base)  ), b.getLocalPosition(b2o.constraint.getLink(b2o.base  ), b2o.constraint.getPoint(b2o.base  )) );
                var R2   = this.getPtoP( f.getLocalPosition(b2f.constraint.getLink(b2f.target), b2f.constraint.getPoint(b2f.target)), f.getLocalPosition(f2o.constraint.getLink(f2o.base  ), f2o.constraint.getPoint(f2o.base  )) );
                var R3   = this.getPtoP( o.getLocalPosition(b2o.constraint.getLink(b2o.target), b2o.constraint.getPoint(b2o.target)), o.getLocalPosition(f2o.constraint.getLink(f2o.target), f2o.constraint.getPoint(f2o.target)) );

                var dr1 = R1.distance(0,0);
                var dr2 = R2.distance(0,0);
                var dr3 = R3.distance(0,0);

                // +++++
                var angle1 = 0;
                var angle2 = 0;

                if( dr1==0 || dr1>dr2+dr3 || dr2>dr1+dr3 || dr3>dr1+dr2){
                  noError = false;
                  maxCost = Number.POSITIVE_INFINITY;

                  if ( dr1>dr2+dr3 ) {
                    angle1=0;
                    angle2=0;
                  } else if ( dr2>dr1+dr3 ) {
                    angle1=0;
                    angle2=Math.PI;
                  } else if ( dr3>dr1+dr2 ) {
                    angle1=Math.PI;
                    angle2=0;
                  }
                  // break;
                } else {
                  angle1  = Math.acos((dr1*dr1+dr2*dr2-dr3*dr3)/(2*dr1*dr2));
                  angle2  = Math.acos((dr1*dr1+dr3*dr3-dr2*dr2)/(2*dr1*dr3));

                  var cost = this.getTriangleCost(dr1, dr2, dr3);
                  if(maxCost < cost) maxCost = cost;
                }

                  var mu = ((this.mapsOfMu[(b2f.constraint)])[(b2o.constraint)])[(f2o.constraint)];
                  angle1  = Math.atan2(R1.getY(), R1.getX()) - Math.atan2(R2.getY(), R2.getX()) - mu*angle1;
                  angle2  = Math.atan2(-R1.getY(), -R1.getX()) - Math.atan2(R3.getY(), R3.getX()) + mu*angle2;

                  f.zeroToPoint( f.getLocalPosition(b2f.constraint.getLink(b2f.target), b2f.constraint.getPoint(b2f.target)) );
                  f.setRelativePosition( b.getLocalPosition(b2f.constraint.getLink(b2f.base), b2f.constraint.getPoint(b2f.base)) );
                  f.setRelativeAngle( angle1 );
                  o.zeroToPoint( o.getLocalPosition(b2o.constraint.getLink(b2o.target), b2o.constraint.getPoint(b2o.target)) );
                  o.setRelativePosition( b.getLocalPosition(b2o.constraint.getLink(b2o.base), b2o.constraint.getPoint(b2o.base)) );

                  o.setRelativeAngle( angle2 );

                  b.merge(f, groupList);
                  b.merge(o, groupList);

                  outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getAllConstraint(), groupList );
                  outgoingAngularConstraint = baseLG.findOutgoingAngularConstraint( _assembly.getAllConstraint() );

                  needToFindMore = true;
                }


                /// XSX constraint ///
                var triangle2 = this.findXSXLinkTriangle(_assembly, groupList, baseLG, outgoingCoaxialConstraint);

                if ( triangle2 != null ) {
                  var       a   = triangle2.a;
                  var       b   = triangle2.b;
                  var       c   = triangle2.c;
                  var       a2b = triangle2.a2b;
                  var  		b2c = triangle2.b2c;
                  var       a2c = triangle2.a2c;

                  // Point2D pointA = a2b.getLink(Constraint.BASE).getGlobalPosition(a2b.constraint.getPoint(a2b.

                  var VP   = this.getPtoP( a.getLocalPosition(a2b.constraint.getLink(a2b.base), a2b.constraint.getPoint(a2b.base)), a.getLocalPosition(a2c.constraint.getLink(a2c.base), a2c.constraint.getPoint(a2c.base) ) );
                  var L2   = VP.getX()*VP.getX() + VP.getY()*VP.getY();

                  var VA   = this.getPtoP( b.getLocalPosition(a2b.constraint.getLink(a2b.target), a2b.constraint.getPoint(a2b.target)), b.getLocalPosition(b2c.getLink(b2c.BASE), b2c.getPoint1() ) );
                  var VB   = this.getPtoP( b.getLocalPosition(b2c.getLink(b2c.BASE), b2c.getPoint1() ), b.getLocalPosition(b2c.getLink(b2c.BASE), b2c.getPoint2() ) );
                  var DA   = this.getPtoP( c.getLocalPosition(b2c.getLink(b2c.TARGET), new Point2D(0, 0) ), c.getLocalPosition(a2c.constraint.getLink(a2c.target), a2c.constraint.getPoint(a2c.target)) );

                  VA = new Point2D(VA.getX()+DA.getX(), VA.getY()+DA.getY());

                  var det = Math.pow(VA.getX()*VB.getX()+VA.getY()*VB.getY() ,2) - (VB.getX()*VB.getX() + VB.getY()*VB.getY()) * (VA.getX()*VA.getX() + VA.getY()*VA.getY() - L2);

                  if( det>=0 ) {
                    var mu;
                    if(this.sliderMu[b2c]==null){

                      var positive_t = ( -(VA.getX()*VB.getX()+VA.getY()*VB.getY()) + Math.sqrt(det) ) / (VB.getX()*VB.getX() + VB.getY()*VB.getY());
                      var negative_t = ( -(VA.getX()*VB.getX()+VA.getY()*VB.getY()) - Math.sqrt(det) ) / (VB.getX()*VB.getX() + VB.getY()*VB.getY());
                      var positive_des = new Point2D( VA.getX() + VB.getX()*positive_t, VA.getY() + VB.getY()*positive_t );
                      var negative_des = new Point2D( VA.getX() + VB.getX()*negative_t, VA.getY() + VB.getY()*negative_t );

                      var vP = this.getPtoP( a2b.constraint.getLink(a2b.base).getGlobalPosition(a2b.constraint.getPoint(a2b.base)), a2c.constraint.getLink(a2c.base).getGlobalPosition(a2c.constraint.getPoint(a2c.base)) );

                      var positiveDist = MMath.dist(vP, positive_des);
                      var negativeDist = MMath.dist(vP, negative_des);

                      if(positiveDist < negativeDist) {
                        mu = +1.;
                      } else {
                        mu = -1.;
                      }
                      this.sliderMu[b2c] = mu;

                    } else {
                      mu = this.sliderMu[b2c];
                    }
                    var  t = ( -(VA.getX()*VB.getX()+VA.getY()*VB.getY()) + mu * Math.sqrt(det) ) / (VB.getX()*VB.getX() + VB.getY()*VB.getY());

                    if(t < 0 || t > 1){
                      //console.log("BROKEN: slider out of range")
                      _assembly.addUnspecified(a2c.constraint.getLink(a2c.base));
                      _assembly.addUnspecified(a2c.constraint.getLink(a2c.target));

                      if(t<0) t=0;
                      if(t>1) t=1;
                    }

                    var des = new Point2D( VA.getX() + VB.getX()*t, VA.getY() + VB.getY()*t );
                    var angle = Math.atan2(VP.getY(), VP.getX()) - Math.atan2(des.getY(), des.getX());

                    b.zeroToPoint( b.getLocalPosition(a2b.constraint.getLink(a2b.target), a2b.constraint.getPoint(a2b.target)) );
                    b.setRelativePosition( a.getLocalPosition(a2b.constraint.getLink(a2b.base), a2b.constraint.getPoint(a2b.base)) );
                    b.setRelativeAngle(angle);

                    des = new Point2D(des.getX()-DA.getX(), des.getY()-DA.getY());
                    c.zeroToPoint( c.getLocalPosition(b2c.getLink(b2c.TARGET), new Point2D(0, 0)  )  );
                    c.setRelativePosition( des );

                    c.setRelativeAngle(b2c.getLink(b2c.BASE).getAngle()-b2c.getLink(b2c.TARGET).getAngle()+b2c.getAngle());

                    b.merge(c, groupList);
                    a.merge(b, groupList);

                  } else {
                    // broken
                  }
                }
              }
            baseGroupIndex++;
        }
    }
    // position specification -- fininshed //

    for(var i=1; i<groupList.length(); i++){
        _assembly.addUnspecified(groupList.get(i).getLinkList());
    }

    // additional specification //
    var needToMove = true;
    while(needToMove){
      needToMove = false;
      var space=groupList.get(0);

      for(var i=1; i<groupList.length(); i++){
        var baseLG = groupList.get(i);
        var outgoingCoaxialConstraint = baseLG.findOutgoingCoaxialConstraint( _assembly.getAllConstraint(), groupList );
        for(var ccii in outgoingCoaxialConstraint.array){
            var cci = outgoingCoaxialConstraint.get(ccii);
          if( space.getLinkList().contains(cci.constraint.getLink(cci.target)) ){
            baseLG.zeroToPoint( baseLG.getLocalPosition(cci.constraint.getLink(cci.base), cci.constraint.getPoint(cci.base)));
            baseLG.setRelativePosition( space.getLocalPosition(cci.constraint.getLink(cci.target), cci.constraint.getPoint(cci.target)));
            space.merge(baseLG, groupList);
            needToMove = true;
            break;
          }
        }
      }
    }

    // Rearranging all mechanism //
    groupList.get(0).backToZero();

    return maxCost;

}

MechanismCalculator.prototype.getTriangleCost = function(dr1, dr2, dr3){
    var ds = [dr1, dr2, dr3];
    ds.sort();
    if( ds[2] >= ds[0]+ds[1] ){
      return Number.POSITIVE_INFINITY;
    } else {
      return 3*(ds[0]+ds[1])/(ds[0]+ds[1]-ds[2]);
    }
}

MechanismCalculator.prototype.buildLinkGroup = function(_assembly){
    var returnValue = new ArrayList();

    for(var ei in _assembly.getAllElement().array){
        var e = _assembly.getAllElement().get(ei);
      if(e instanceof Link){
        var lg = new LinkGroup(e);
        //console.log(e);
        if(e instanceof Space){
          returnValue.addIn(0, lg);
        } else {
          returnValue.add(lg);
        }
      }
    }

    return returnValue;
}

MechanismCalculator.prototype.mapMu = function(_assembly){
    var returnValue = new Object();

    for(var c1i in _assembly.getAllConstraint().array){
        var c1 = _assembly.getAllConstraint().get(c1i);
        var secondLayer = new Object();

        if(c1 instanceof CoaxialConstraint){
            var p1 = c1.getLink(c1.BASE).getGlobalPosition(c1.getPoint(c1.BASE));

            for(var c2i in _assembly.getAllConstraint().array){
                var c2 = _assembly.getAllConstraint().get(c2i);

                if(c2 instanceof CoaxialConstraint && c1!=c2){
                    var thirdLayer = new Object();

                    var p2 = c2.getLink(c1.BASE).getGlobalPosition(c2.getPoint(c1.BASE));

                    p2.setLocation(p2.getX()-p1.getX(), p2.getY()-p1.getY());

                    for(var c3i in _assembly.getAllConstraint().array){
                        var c3 = _assembly.getAllConstraint().get(c3i);

                        if(c3 instanceof CoaxialConstraint && c1!=c3 && c2!=c3){
                            var p3 = c3.getLink(c1.BASE).getGlobalPosition(c3.getPoint(c1.BASE));

                            p3.setLocation(p3.getX()-p1.getX(), p3.getY()-p1.getY());
                            var v = p2.getY()*p3.getX() - p2.getX()*p3.getY();

                            if(v>0) v=1;
                            if(v<0) v=-1;
                            thirdLayer[c3] = v;

                        }
                    }
                    secondLayer[c2] = thirdLayer;
                }
            }
            returnValue[c1] = secondLayer;
          }
    }
    return returnValue;
}
MechanismCalculator.prototype.getSliderMu = function(_assembly){
    /*
  LinkedHashMap<SliderConstraint, LinkedHashMap<CoaxialConstraint, LinkedHashMap<CoaxialConstraint, Double>>> returnValue = new LinkedHashMap<SliderConstraint, LinkedHashMap<CoaxialConstraint, LinkedHashMap<CoaxialConstraint, Double>>>();

  for (Constraint c : _assembly.getAllConstraint()) {
    if(c instanceof SliderConstraint){
      LinkedHashMap<CoaxialConstraint, LinkedHashMap<CoaxialConstraint, Double>> secondLayer = new LinkedHashMap<CoaxialConstraint, LinkedHashMap<CoaxialConstraint, Double>>();

      SliderConstraint sc = (SliderConstraint) c;
      Link baseLink = sc.getLink(Constraint.BASE);
      Link targetLink = sc.getLink(Constraint.TARGET);

      for(Constraint c1 : _assembly.getAllConstraint()) {
        if(c1 instanceof CoaxialConstraint ){
          CoaxialConstraint cc1 = (CoaxialConstraint) c1;
          LinkedHashMap<CoaxialConstraint, Double> thirdLayer = new LinkedHashMap<CoaxialConstraint, Double>();

          for(Constraint c2 : _assembly.getAllConstraint()) {
            if(c2 instanceof CoaxialConstraint ){
              CoaxialConstraint cc2 = (CoaxialConstraint) c2;

              Point2D p1  = baseLink.getGlobalPosition(sc.getPoint1());
              Point2D p2  = baseLink.getGlobalPosition(sc.getPoint2());
              Point2D pc1 = cc1.getLink(0).getGlobalPosition(cc1.getPoint(0));
              Point2D pc2 = cc2.getLink(0).getGlobalPosition(cc2.getPoint(0));

              double t1 = MMath.getNearestTfromALine(pc1, p1, p2);
              double t2 = MMath.getNearestTfromALine(pc2, p1, p2);

              double mu = (t1<=t2) ?+1 :-1;

              thirdLayer.put(cc2, mu);
            }
          }

          secondLayer.put(cc1, thirdLayer);
        }
      }
      returnValue.put(sc, secondLayer);
    }
  }

  return returnValue;
  */
}

MechanismCalculator.prototype.search_AC_Constraint = function(_targetLG, _angularConstraint, _coaxialConstraint){
    var returnValue = new Array(2);

    returnValue[0] = new ArrayList();
    for(var acii in _angularConstraint.array){
        var aci = _angularConstraint.get(acii);
        if(aci instanceof ACI){
            if(_targetLG.getLinkList().contains(aci.constraint.getLink(aci.target))){
                returnValue[0].add(aci);
            }
        }
    }

    returnValue[1] = new ArrayList();
    for(var ccii in _coaxialConstraint.array){
        var cci = _coaxialConstraint.get(ccii);
        if(cci instanceof CCI){
            if(_targetLG.getLinkList().contains(cci.constraint.getLink(cci.target))){
                returnValue[1].add(cci);
            }
        }
    }

    return returnValue;
}

MechanismCalculator.prototype.findXXXLinkTriangle = function(_assembly, _groupList, _baseGroup, _outgoingCoaxialConstraint){
    // find all linkGroups that are connected to the baseGroup only once
    var connectedLGList = new ArrayList();
    var duplicateLGList = new ArrayList();

    for(var ccii in _outgoingCoaxialConstraint.array){
        var cci = _outgoingCoaxialConstraint.get(ccii);
        if(cci instanceof CCI){
            var lg = this.findGroupByLink(_groupList, cci.constraint.getLink(cci.target));
            //console.log(lg);

            if(!duplicateLGList.contains(lg)){
                if(!connectedLGList.contains(lg)){
                    connectedLGList.add(lg);
                }else{
                    duplicateLGList.add(lg);
                    connectedLGList.remove(lg);
                }
            }
        }
    }
    if(connectedLGList.length()<=1) return null;
    //console.log(connectedLGList.array);

    // find a pair of inter-connected link groups //
    for(var targetIndex1=0; targetIndex1<connectedLGList.length()-1; targetIndex1++){
        var floating = connectedLGList.get(targetIndex1);


        //if(floating.isBaseGroup()) break;
        var floatingToOutCoaxialConstraint = floating.findOutgoingCoaxialConstraint(_assembly.getAllConstraint(), _groupList);

        for(var targetIndex2=targetIndex1+1; targetIndex2<connectedLGList.length(); targetIndex2++){
            var output = connectedLGList.get(targetIndex2);


            //if(output.isBaseGroup()) break;
            var f2o=null;
            var b2f=null;
            var b2o=null;
            var count = 0;

            for(var tci in floatingToOutCoaxialConstraint.array){
                var tc = floatingToOutCoaxialConstraint.get(tci);
                if(output.getLinkList().contains(tc.constraint.getLink(tc.target))){ // if mton is targetting n //
                    // if f2o is targetting output //
                    f2o = tc;
                    count++;
                }
            }

            if(count==1){

                for(var tci in _outgoingCoaxialConstraint.array){
                    var tc = _outgoingCoaxialConstraint.get(tci);
                    if(floating.getLinkList().contains(tc.constraint.getLink(tc.target))){
                        b2f = tc;
                    }
                else if(output.getLinkList().contains(tc.constraint.getLink(tc.target))){
                        b2o = tc;
                    }
                }

                if(b2f.constraint!=b2o.constraint && b2f.constraint!=f2o.constraint && b2o.constraint!=f2o.constraint) {

                    if(floating.isBaseGroup()){
                      var temp = _baseGroup;
                      _baseGroup = floating;
                      floating = temp;
                      b2f = b2f.inverseCCI();
                      var temp2 = b2o;
                      b2o = f2o;
                      f2o = temp2;
                    }else if(output.isBaseGroup()){
                      var temp = _baseGroup;
                      _baseGroup = output;
                      output = temp;
                      b2o = b2o.inverseCCI();

                      //var temp2 = b2f;
                      //b2f = b2o;
                      //b2o = temp2;

                      /**
                      Error Fixed by Ju-Whan
                      */

                        var temp2 = f2o;
                        f2o = b2f.inverseCCI();
                        b2f = temp2.inverseCCI();
                    }
                    return new LinkTriangle(_baseGroup, floating, output, b2f, b2o, f2o);
                }
            }

        } //for(int targetIndex2=targetIndex1+1; targetIndex2<connectedLGList.size(); targetIndex2++)
    } //for(targetIndex1=0; targetIndex1<connectedLGList.size(); targetIndex1++)

    return null;
}

MechanismCalculator.prototype.findXSXLinkTriangle = function(_assembly, _groupList, _baseGroup, _outgoingCoaxialConstraint){
    // find all linkGroups that are connected to the baseGroup only once
    var connectedLGList = new ArrayList();
    var duplicateLGList = new ArrayList();

    for(var ccii in _outgoingCoaxialConstraint.array){
        var cci = _outgoingCoaxialConstraint.get(ccii);
        if(cci instanceof CCI){
            var lg = this.findGroupByLink(_groupList, cci.constraint.getLink(cci.target));

            if(!duplicateLGList.contains(lg)){
                if(!connectedLGList.contains(lg)){
                    connectedLGList.add(lg);
                }else{
                    duplicateLGList.add(lg);
                    connectedLGList.remove(lg);
                }
            }
        }
    }
    if(connectedLGList.length()<=1) return null;

    // find a pair of inter-connected link groups //
    for(var targetIndex1=0; targetIndex1<connectedLGList.length(); targetIndex1++){
        var floating = connectedLGList.get(targetIndex1);

        //if(floating.isBaseGroup()) break;
        var floatingToOutgoingSliderConstraint = floating.findOutgoingSliderConstraint(_assembly.getAllConstraint());

        if(floatingToOutgoingSliderConstraint.length() > 0){
            for(var targetIndex2=0; targetIndex2<connectedLGList.length(); targetIndex2++){

                if(targetIndex1!=targetIndex2){
                    var output = connectedLGList.get(targetIndex2);

                    b2c = null;
                    a2b = null;
                    a2c = null;

                    var count = 0;

                    for (var sci in floatingToOutgoingSliderConstraint.array) {
                        var sc = floatingToOutgoingSliderConstraint.get(sci);

                      if (output.getLinkList().contains(sc.getLink(sc.TARGET))) {
                        b2c = sc;
                        count++;
                      }
                    }



                    if(count == 1){
                        for (var tci in _outgoingCoaxialConstraint.array) {
                            var tc = _outgoingCoaxialConstraint.get(tci);

                          if (floating.getLinkList().contains(tc.constraint.getLink(tc.target))) {
                            a2b = tc;
                          } else if (output.getLinkList().contains(tc.constraint.getLink(tc.target))) {
                            a2c = tc;
                          }
                        }

                        if (a2c!=null && a2b!=null & a2b.constraint!=a2c.constraint) { // && !floating.isBaseGroup() && !output.isBaseGroup()) {
                          return new LinkTriangle2(_baseGroup, floating, output, a2b, b2c, a2c);
                        }
                    }
                } // if(targetIndex1!=targetIndex2){
            } //for(int targetIndex2=0; targetIndex2<connectedLGList.size(); targetIndex2++)
        }
    } //for(targetIndex1=0; targetIndex1<connectedLGList.size(); targetIndex1++)

    return null;
}

MechanismCalculator.prototype.findGroupByLink = function(_groupList, _link){
    for(var li in _groupList.array){
        var lg = _groupList.get(li);
        if(lg.linkList.contains(_link)){
            return lg;
        }
    }
   return null;
}

MechanismCalculator.prototype.getPtoP = function(_p1, _p2){
    return new Point2D(_p2.getX()-_p1.getX(), _p2.getY()-_p1.getY());
}
