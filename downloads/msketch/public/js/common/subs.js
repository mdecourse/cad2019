//--------------------
// Point2D
//--------------------
function Point2D(_x, _y){
    this.x = _x;
    this.y = _y;
}
Point2D.prototype.getX = function(){
    return this.x;
}
Point2D.prototype.getY = function(){
    return this.y;
}
Point2D.prototype.setLocation = function(arg1, arg2){
    if(arguments.length == 1 ){
        this.x = arg1.x;
        this.y = arg1.y;
    }
    else if(arguments.length == 2){
        this.x = arg1;
        this.y = arg2;
    }
}
Point2D.prototype.distance = function(_x, _y){
    var d = Math.sqrt((this.x-_x)*(this.x-_x) + (this.y-_y)*(this.y-_y));
    return d;
}

//--------------------
// ArrayList Implementation Class
//--------------------

function ArrayList(){
    this.array = new Array();
    this.add = function(obj){
        this.array.push(obj);
        return true;
    };
    this.addIn = function(_index, obj){
        this.array.splice(_index, 0, obj);
    };
    this.length = function (){
        return this.array.length;
    };
    this.get = function (_index){
        return this.array[_index];
    };
    this.addAll = function (obj){
        if (obj instanceof Array){
            for (var i=0;i<obj.length;i++){
                this.add(obj[i]);
            }
        } else if (obj instanceof ArrayList){
            for (var i=0;i<obj.length();i++){
                this.add(obj.get(i));
            }
        }
        return true;
    };
    this.remove = function (obj){
        if (!(obj instanceof ArrayList)){
            var _index = this.array.indexOf(obj);
            if(_index != -1){
                this.array.splice(_index, 1);
                return true;
            }
            else{
                return false;
            }
        }
        else if(obj instanceof ArrayList){
            for(var _e in obj.array){
                this.remove(obj.get(_e));
            }
        }

    };
    this.removeOf = function (_index){
        this.array.splice(_index, 1);
    };
    this.clear = function (obj){
        this.array = [];
    };
    this.isEmpty = function (obj){
        var _isEmpty = false;
        if(this.array.length==0){
            _isEmpty = true;
        }
        else{
            _isEmpty = false;
        }
        return _isEmpty;
    };
    this.contains = function(obj){
        var _index = this.array.indexOf(obj);
        var returnValue = false;
        if(_index != -1){
            returnValue = true;
        }
        return returnValue;
    }
    this.containsAll = function(obj){
        if(obj instanceof ArrayList){
            for(var _e in obj.array){
                if(!this.contains(obj.get(_e))){
                    return false;
                }
            }
        }
        return true;
    }
    this.set = function(_index, obj){
        this.array[_index] = obj;
    }
    this.indexOf = function(obj){
        return this.array.indexOf(obj);
    }
}


//--------------------
// MMATH Class
//--------------------
function MMath(){}

MMath.distToLine = function(_p, _v, _w) {
    return Math.sqrt(MMath.distToLineSquared(_p, _v, _w));
  }

MMath.distToLineSquared = function(_p, _v, _w) {
    var t = MMath.getNearestTfromALine(_p, _v, _w);
    var _nearestP = new Point2D(_v.getX()*(1-t)+_w.getX()*t, _v.getY()*(1-t)+_w.getY()*t);
    return MMath.dist2(_p, _nearestP);
  }

MMath.distToSegment = function(_p, _v, _w) {
    return Math.sqrt(MMath.distToSegmentSquared(_p, _v, _w));
}
MMath.distToSegmentSquared = function(_p, _v, _w) {
    var t = Math.max(0, Math.min(1, MMath.getNearestTfromALine(_p, _v, _w)));
    var _nearestP = new Point2D(_v.getX()*(1-t)+_w.getX()*t, _v.getY()*(1-t)+_w.getY()*t);
    return MMath.dist2(_p, _nearestP);
}

MMath.getNearestTfromALine = function(_p, _v, _w) {
    var l2 = MMath.dist2(_v, _w);
    if (l2==0) return 0;

    var t = ((_p.getX()-_v.getX()) * (_w.getX() - _v.getX()) + (_p.getY() - _v.getY()) * (_w.getY() - _v.getY())) / l2;
    return t;
}

MMath.dist2 = function(_v, _w) {
    return (_v.getX()-_w.getX())*(_v.getX()-_w.getX()) + (_v.getY()-_w.getY())*(_v.getY()-_w.getY());
}

MMath.dist = function(_v, _w) {
    return Math.sqrt(MMath.dist2(_v, _w));
}


//--------------------
// Rad/Deg Conversion
//--------------------

Math.radians = function(degrees) {
  return degrees * Math.PI / 180;
};

Math.degrees = function(radians) {
  return radians * 180 / Math.PI;
};
Math.map = function(value, low1, high1, low2, high2) {
    return low2 + (high2 - low2) * (value - low1) / (high1 - low1);
}


//--------------------
// TimeStamp
//--------------------

function getTimeStamp() {
  var d = new Date();
  var s =
    leadingZeros(d.getFullYear(), 4) +
    leadingZeros(d.getMonth() + 1, 2) +
    leadingZeros(d.getDate(), 2) + "_" +

    leadingZeros(d.getHours(), 2) +
    leadingZeros(d.getMinutes(), 2);
    //leadingZeros(d.getSeconds(), 2);

  return s;
}

function leadingZeros(n, digits) {
  var zero = '';
  n = n.toString();

  if (n.length < digits) {
    for (i = 0; i < digits - n.length; i++)
      zero += '0';
  }
  return zero + n;
}
