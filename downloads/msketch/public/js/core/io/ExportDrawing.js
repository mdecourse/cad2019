//----------------------------------------------------------------------------------------------------
// ** Export to PDF
//----------------------------------------------------------------------------------------------------
function exportDrawing(){
	if(isPlaying)	interfaceSelect(TOOL_RUN);

  	var doc = new jsPDF('landscape');

	var elementList = currentAssembly.getAllElement();
	if(elementList==null) return;

	doc.setFontSize(14);
	doc.text(12, 15, 'm.Sketch Drawing');
	doc.setFontSize(10);
	doc.text(12, 20, 'Assembled View');

	doc.setFontSize(8);
	doc.text(297-33.5, 210-15, 'EDISON DESIGN');
	doc.setFontSize(8);
	doc.text(297-42, 210-12, 'http://design.edison.re.kr');


	//get dimension
	var minX = 9999;
	var maxX = -9999;
	var minY = 9999;
	var maxY = -9999;
	var _scale = 10;


	var HOLE_RADIUS = 2;

	//========================= MAIN DRAWING ==========================
	for(var ei in elementList.array){
		var e = elementList.get(ei);

		if(e instanceof Link && !(e instanceof Space)){

			for(var pi in e.getPointList().array){
	 			var _p = e.getPointList().get(pi);
	 			var _xM = e.getGlobalPosition(_p).getX()*SCALE_TRANS;
	 			var _yM = -e.getGlobalPosition(_p).getY()*SCALE_TRANS;

	 			if(minX>_xM) minX = _xM;
	 			if(maxX<_xM) maxX = _xM;
	 			if(minY>_yM) minY = _yM;
	 			if(maxY<_yM) maxY = _yM;
	 		}
	 	}
	}
	//
	var _x = (-minX)+20;
 	var _y = (-minY)+40;

	for(var ei in elementList.array){
	 	var e = elementList.get(ei);

	 	if(e instanceof Link && !(e instanceof Space)){
	 		var v = e.getGlobalRoundedVertex(0);
	 		if(v!=null){
	 			v.push(v[0]);
	 			v.push(v[1]);

		 		for(var i=3; i<v.length; i+=2){
		 			doc.line( v[i-3]*SCALE_TRANS+_x, -v[i-2]*SCALE_TRANS+_y, v[i-1]*SCALE_TRANS+_x, -v[i]*SCALE_TRANS+_y );
		 		}

		 		for(var pi in e.getPointList().array){
		 			var _p = e.getPointList().get(pi);
		 			var _xM = _x+e.getGlobalPosition(_p).getX()*SCALE_TRANS;
		 			var _yM = _y-e.getGlobalPosition(_p).getY()*SCALE_TRANS;

		 			doc.circle(_xM, _yM, HOLE_RADIUS);


		 		}

	 		}
	 	}
    }
    var number = 1;
    for(var ei in elementList.array){  //numbering
		var e = elementList.get(ei);

        if(e instanceof Link && !(e instanceof Space)){

	 		var v = new Array();

		 	for(var pi in e.getPointList().array){
	 			var _p = e.getPointList().get(pi);
	 			v.push(e.getGlobalPosition(_p).getX());
	 			v.push(e.getGlobalPosition(_p).getY());
             }

        var sum_x = 0;
        var sum_y = 0;

        var i = 0;
        while(i<v.length){
            sum_x += (_x+v[i]*SCALE_TRANS);
            i += 2;
        }
        var j = 1;
        while(j<v.length){
            sum_y += (_y-v[j]*SCALE_TRANS);
            j += 2;
        }

        var _text = number.toString();
        var avr_x = sum_x/(v.length/2);
        var avr_y = sum_y/(v.length/2);
        doc.text(avr_x-1, avr_y+1, _text);
        number++;

        }
	}

	//========================= SCHEMATIC DRAWING ==========================
	doc.addPage();

	doc.setFontSize(14);
	doc.text(12, 15, 'm.Sketch Drawing');
	doc.setFontSize(10);
	doc.text(12, 20, 'Schematic Drawing');

	doc.setFontSize(8);
	doc.text(297-33.5, 210-15, 'EDISON DESIGN');
	doc.setFontSize(8);
	doc.text(297-42, 210-12, 'http://design.edison.re.kr');

	// for removing duplicated vertexs
	var pointList = new Array();

	for(var ei in elementList.array){
	 	var e = elementList.get(ei);

	 	if(e instanceof Link && !(e instanceof Space)){

	 		var v = new Array();

	 		for(var pi in e.getPointList().array){
	 			var _p = e.getPointList().get(pi);
	 			v.push(e.getGlobalPosition(_p).getX());
	 			v.push(e.getGlobalPosition(_p).getY());

	 			_tX = _x+v[v.length-2]*SCALE_TRANS;
	 			_tY = _y-v[v.length-1]*SCALE_TRANS;

	 			doc.circle(_tX, _tY, 0.5);
	 			doc.setFontSize(10);

	 			var _text = "(" + (v[v.length-2]*SCALE_TRANS).toFixed(2) + " , " + (v[v.length-1]*SCALE_TRANS).toFixed(2) + ")"; //revised
	 			if(pointList.indexOf(_text)==-1){
	 				pointList.push(_text);
	 				doc.text(_tX+1, _tY-1, _text);   //text insert part
	 			}

	 		}

		 	if(v.length>=6){
		 		v.push(v[0]);
	 			v.push(v[1]);
		 		for(var i=3; i<v.length; i+=2){
		 			doc.line( v[i-3]*SCALE_TRANS+_x, -v[i-2]*SCALE_TRANS+_y, v[i-1]*SCALE_TRANS+_x, -v[i]*SCALE_TRANS+_y );
		 		}
		 	}else{
	 			doc.line( v[0]*SCALE_TRANS+_x, -v[1]*SCALE_TRANS+_y, v[2]*SCALE_TRANS+_x, -v[3]*SCALE_TRANS+_y );
		 	}

	 	}
	}

	//========================= PART DRAWING ==========================
	//rotated assembly
	doc.addPage();

	var offsetX = 0;
	var offsetY = 0;
	var maxOffsetX = 0;

    var number_2 = 1;//

	for(var ei in elementList.array){
	 	var e = elementList.get(ei);

	 	if(e instanceof Link && !(e instanceof Space)){
	 		var v = e.getGlobalRoundedVertex(1);

	 		if(v!=null){
	 			var minLX = 9999;
				var maxLX = -9999;
				var minLY = 9999;
				var maxLY = -9999;

	 			for(var pi in e.getPointList().array){
		 			var _p = e.getPointList().get(pi);
		 			var _xM = e.getGlobalPositionRotated(_p).getX()*SCALE_TRANS;
		 			var _yM = -e.getGlobalPositionRotated(_p).getY()*SCALE_TRANS;

		 			if(minLX>_xM) minLX = _xM;
		 			if(maxLX<_xM) maxLX = _xM;
		 			if(minLY>_yM) minLY = _yM;
		 			if(maxLY<_yM) maxLY = _yM;

		 			//console.log (minLX +","+ maxLX+","+minLY+","+maxLY);
		 		}

		 		var _w = Math.abs(maxLX - minLX);
		 		var _h = Math.abs(maxLY - minLY);

		 		if(offsetY+_h > 210-40){
		 			offsetX += maxOffsetX + 20;
		 			offsetY = 0;

		 			maxOffsetX=0;
		 		}
		 		if(offsetX+_w > 297-40){
		 			doc.addPage();
		 			offsetX = 0;
		 			offsetY = 0;

		 			maxOffsetX=0;
		 		}

		 		var _x = (-minLX)+20 + offsetX;
			 	var _y = (-minLY)+20 + offsetY;

	 			v.push(v[0]);
	 			v.push(v[1]);

		 		for(var i=3; i<v.length; i+=2){
		 			doc.line( _x+v[i-3]*SCALE_TRANS, _y-v[i-2]*SCALE_TRANS, _x+v[i-1]*SCALE_TRANS, _y-v[i]*SCALE_TRANS );
		 		}

                var w = new Array(); //

		 		for(var pi in e.getPointList().array){
		 			var _p = e.getPointList().get(pi);
		 			var _xM = _x+e.getGlobalPositionRotated(_p).getX()*SCALE_TRANS;
		 			var _yM = _y-e.getGlobalPositionRotated(_p).getY()*SCALE_TRANS;

                    w.push(_xM);
                    w.push(_yM);

		 			doc.circle(_xM, _yM, HOLE_RADIUS);
		 		}

                var sum_x = 0; //
                var sum_y = 0; //

                var i = 0;
                while(i<w.length){
                    sum_x += w[i];
                    i += 2;
                }
                var j = 1;
                while(j<w.length){
                    sum_y += w[j];
                    j += 2;
                }

                var _text = number_2.toString();
                var avr_x = sum_x/(w.length/2);
                var avr_y = sum_y/(w.length/2);
                doc.text(offsetX+8, avr_y+1, _text);
                number_2 ++;

		 		offsetY += (_h+12);
		 		if(maxOffsetX<_w) maxOffsetX = _w;

	 		}
	 	}
	}



    /*
    var number_2 = 1;
    for(var ei in elementList.array){  //numbering
		var e = elementList.get(ei);

        if(e instanceof Link && !(e instanceof Space)){

	 		var v = new Array();

		 	for(var pi in e.getPointList().array){
	 			var _p = e.getPointList().get(pi);
	 			v.push(e.getGlobalPositionRotated(_p).getX());
	 			v.push(e.getGlobalPositionRotated(_p).getY());
            }


        var sum_x = 0;
        var sum_y = 0;

        var i = 0;
        while(i<v.length){
            sum_x += (_x+v[i]*SCALE_TRANS);
            i += 2;
        }
        var j = 1;
        while(j<v.length){
            sum_y += (_y-v[j]*SCALE_TRANS);
            j += 2;
        }

        var _text = number_2.toString();
        var avr_x = sum_x/(v.length/2);
        var avr_y = sum_y/(v.length/2);
        doc.text(avr_x+1, avr_y-1, _text);
        number_2 ++;

        }
	}
    */

	var agent = navigator.userAgent.toLowerCase();
	var name = navigator.appName;
	//console.log(name);

	if ( name == "Microsoft Internet Explorer" || agent.search("trident") > -1 || agent.search("edge/") > -1){
		doc.save('mSketchDrawing.pdf');
	}
	else {
		//doc.output('dataurlnewwindow');
		var blob = doc.output('blob');
		window.open(URL.createObjectURL(blob));
	}

	//if (agent.indexOf("chrome") != -1){
	//}
}





//----------------------------------------------------------------------------------------------------
// ** Export to PDF (Silhouette Cutting)
//----------------------------------------------------------------------------------------------------
function exportCameoDrawing(){
	if(isPlaying)	interfaceSelect(TOOL_RUN);

  	var doc = new jsPDF('l', 'mm', [300, 300]);

	var elementList = currentAssembly.getAllElement();
	if(elementList==null) return;

	doc.setFontSize(8);

	//get dimension
	var minX = 9999;
	var maxX = -9999;
	var minY = 9999;
	var maxY = -9999;
	var _scale = 10;


	var HOLE_RADIUS = 2.5;

	// Cutting dimension (263.05mm)
	var sideLength = 263.05;
	doc.circle(5, 5, 0.1);
	doc.circle(5+sideLength, 5+sideLength, 0.1);


	//========================= PART DRAWING ==========================
	//rotated assembly

	var offsetX = 0;
	var offsetY = 0;
	var maxOffsetX = 0;

    var number_2 = 1;//

	for(var ei in elementList.array){
	 	var e = elementList.get(ei);

		if(e instanceof Space){
			if(e.getPointList().length()>1){
				var v = e.getGlobalRoundedVertex(0);

				if(v!=null){
		 			var minLX = 9999;
					var maxLX = -9999;
					var minLY = 9999;
					var maxLY = -9999;
				}
				for(var pi in e.getPointList().array){
					var _p = e.getPointList().get(pi);
					var _xM = e.getGlobalPosition(_p).getX()*SCALE_TRANS;
					var _yM = -e.getGlobalPosition(_p).getY()*SCALE_TRANS;

					if(minLX>_xM) minLX = _xM;
					if(maxLX<_xM) maxLX = _xM;
					if(minLY>_yM) minLY = _yM;
					if(maxLY<_yM) maxLY = _yM;

					//console.log (minLX +","+ maxLX+","+minLY+","+maxLY);
				}

				var _w = Math.abs(maxLX - minLX);
				var _h = Math.abs(maxLY - minLY);

				if(offsetY+_h > 280-40){
					offsetX += maxOffsetX + 20;
					offsetY = 0;

					maxOffsetX=0;
				}
				if(offsetX+_w > 280-40){
					doc.addPage();
					offsetX = 0;
					offsetY = 0;

					maxOffsetX=0;
				}

				var _x = (-minLX)+15 + offsetX;
				var _y = (-minLY)+15 + offsetY;

				var spaceOffset = 10;

				//doc.roundedRect(_x+minLX, _y+minLY, (_w+spaceOffset*2)*2, _h+spaceOffset*2, 3, 3);

				var _rx = _x+minLX;
				var _ry = _y+minLY;
				var _rw = (_w+spaceOffset*2)*2;
				var _rh = (_h+spaceOffset*2);

				doc.line(_rx + 0.5, _ry, _rx + _rw - 1, _ry);
				doc.line(_rx, _ry, _rx, _ry + _rh);
				doc.line(_rx + _rw, _ry, _rx + _rw, _ry + _rh);
				doc.line(_rx + 0.5, _ry + _rh, _rx + _rw - 1, _ry + _rh);

				// folding Line
				var foldingLineX = _x + minLX + _w + spaceOffset*2;
				var foldingLineOffset = 15;
				for(var fi = 5; fi< _h+spaceOffset*2-foldingLineOffset/2; fi+=foldingLineOffset){
					doc.line(foldingLineX, _y+minLY+fi, foldingLineX, _y+minLY+fi+foldingLineOffset/2);
				}


				/*
				v.push(v[0]);
				v.push(v[1]);

				for(var i=3; i<v.length; i+=2){
					doc.line( _x+v[i-3]*SCALE_TRANS, _y-v[i-2]*SCALE_TRANS, _x+v[i-1]*SCALE_TRANS, _y-v[i]*SCALE_TRANS );
				}*/

				var w = new Array(); //

				for(var pi in e.getPointList().array){
					var _p = e.getPointList().get(pi);
					var _xM = _x+e.getGlobalPosition(_p).getX()*SCALE_TRANS;
					var _yM = _y-e.getGlobalPosition(_p).getY()*SCALE_TRANS;

					w.push(_xM);
					w.push(_yM);



					//doc.circle(_xM+spaceOffset, _yM+spaceOffset, HOLE_RADIUS);
					//doc.circle( foldingLineX+(foldingLineX-(_xM+spaceOffset)), _yM+spaceOffset, HOLE_RADIUS);

					doc.lines([[0, 0, 0, -HOLE_RADIUS, HOLE_RADIUS, -HOLE_RADIUS],[0, 0, HOLE_RADIUS, 0, HOLE_RADIUS, HOLE_RADIUS]], _xM+spaceOffset-HOLE_RADIUS, _yM+spaceOffset-0.25, [1, 1]);
					doc.lines([[0, 0, 0, HOLE_RADIUS, HOLE_RADIUS, HOLE_RADIUS],[0, 0, HOLE_RADIUS, 0, HOLE_RADIUS, -HOLE_RADIUS]],_xM+spaceOffset-HOLE_RADIUS, _yM+spaceOffset+0.25, [1, 1]);

					doc.lines([[0, 0, 0, -HOLE_RADIUS, HOLE_RADIUS, -HOLE_RADIUS],[0, 0, HOLE_RADIUS, 0, HOLE_RADIUS, HOLE_RADIUS]], foldingLineX+(foldingLineX-(_xM+spaceOffset))-HOLE_RADIUS, _yM+spaceOffset-0.25, [1, 1]);
					doc.lines([[0, 0, 0, HOLE_RADIUS, HOLE_RADIUS, HOLE_RADIUS],[0, 0, HOLE_RADIUS, 0, HOLE_RADIUS, -HOLE_RADIUS]], foldingLineX+(foldingLineX-(_xM+spaceOffset))-HOLE_RADIUS, _yM+spaceOffset+0.25, [1, 1]);
				}

				var sum_x = 0; //
				var sum_y = 0; //

				var i = 0;
				while(i<w.length){
					sum_x += w[i];
					i += 2;
				}
				var j = 1;
				while(j<w.length){
					sum_y += w[j];
					j += 2;
				}

				var _text = number_2.toString();
				var avr_x = sum_x/(w.length/2);
				var avr_y = sum_y/(w.length/2);
				//doc.text(offsetX+8, avr_y+1, _text);
				number_2 ++;

				offsetY += (_h+30);
				if(maxOffsetX<_w) maxOffsetX = _w*2;
			}

		}

	 	if(e instanceof Link && !(e instanceof Space)){
	 		var v = e.getGlobalRoundedVertex(1);

	 		if(v!=null){
	 			var minLX = 9999;
				var maxLX = -9999;
				var minLY = 9999;
				var maxLY = -9999;

	 			for(var pi in e.getPointList().array){
		 			var _p = e.getPointList().get(pi);
		 			var _xM = e.getGlobalPositionRotated(_p).getX()*SCALE_TRANS;
		 			var _yM = -e.getGlobalPositionRotated(_p).getY()*SCALE_TRANS;

		 			if(minLX>_xM) minLX = _xM;
		 			if(maxLX<_xM) maxLX = _xM;
		 			if(minLY>_yM) minLY = _yM;
		 			if(maxLY<_yM) maxLY = _yM;

		 			//console.log (minLX +","+ maxLX+","+minLY+","+maxLY);
		 		}

		 		var _w = Math.abs(maxLX - minLX);
		 		var _h = Math.abs(maxLY - minLY);

		 		if(offsetY+_h > 280-40){
		 			offsetX += maxOffsetX + 20;
		 			offsetY = 0;

		 			maxOffsetX=0;
		 		}
		 		if(offsetX+_w > 280-40){
		 			doc.addPage();
		 			offsetX = 0;
		 			offsetY = 0;

		 			maxOffsetX=0;
		 		}

		 		var _x = (-minLX)+20 + offsetX;
			 	var _y = (-minLY)+20 + offsetY;

	 			v.push(v[0]);
	 			v.push(v[1]);

		 		for(var i=3; i<v.length; i+=2){

					var _x1 = _x+v[i-3]*SCALE_TRANS;
					var _y1 = _y-v[i-2]*SCALE_TRANS;
					var _x2 = _x+v[i-1]*SCALE_TRANS;
					var _y2 = _y-v[i]*SCALE_TRANS;

					var _p1 = new Point2D(_x1, _y1);
					var _p2 = new Point2D(_x2, _y2);

					//console.log(i + "," + Math.round(v.length/8) + "," + MMath.dist(_p1, _p2));

					if( (Math.round(i/2)%Math.round(v.length/16)==0) && MMath.dist(_p1, _p2) < 5 ){
						console.log(i);
					}else{
						doc.line(_x1, _y1, _x2, _y2);
					}

		 		}

                var w = new Array(); //

		 		for(var pi in e.getPointList().array){
		 			var _p = e.getPointList().get(pi);
		 			var _xM = _x+e.getGlobalPositionRotated(_p).getX()*SCALE_TRANS;
		 			var _yM = _y-e.getGlobalPositionRotated(_p).getY()*SCALE_TRANS;

                    w.push(_xM);
                    w.push(_yM);

		 			//doc.circle(_xM, _yM, HOLE_RADIUS);
					//upper arc and bottom arc
					doc.lines([[0, 0, 0, -HOLE_RADIUS, HOLE_RADIUS, -HOLE_RADIUS],[0, 0, HOLE_RADIUS, 0, HOLE_RADIUS, HOLE_RADIUS]], _xM-HOLE_RADIUS, _yM-0.25, [1, 1]);
					doc.lines([[0, 0, 0, HOLE_RADIUS, HOLE_RADIUS, HOLE_RADIUS],[0, 0, HOLE_RADIUS, 0, HOLE_RADIUS, -HOLE_RADIUS]], _xM-HOLE_RADIUS, _yM+0.25, [1, 1]);

		 		}

                var sum_x = 0; //
                var sum_y = 0; //

                var i = 0;
                while(i<w.length){
                    sum_x += w[i];
                    i += 2;
                }
                var j = 1;
                while(j<w.length){
                    sum_y += w[j];
                    j += 2;
                }

                var _text = number_2.toString();
                var avr_x = sum_x/(w.length/2);
                var avr_y = sum_y/(w.length/2);
                //doc.text(offsetX+8, avr_y+1, _text);
                number_2 ++;

		 		offsetY += (_h+12);
		 		if(maxOffsetX<_w) maxOffsetX = _w;

	 		}
	 	}
	}


	var agent = navigator.userAgent.toLowerCase();
	var name = navigator.appName;
	//console.log(name);
	/*
	if ( name == "Microsoft Internet Explorer" || agent.search("trident") > -1 || agent.search("edge/") > -1){
		doc.save('mSketchDrawing.pdf');
	}
	else {
		doc.output('dataurlnewwindow');
	}
	*/
	var _date = new Date();
	//console.log(saveDate.getFullYear()+""+(saveDate.getMonth()+1)+""+saveDate.getDate()+"_"+saveDate.getHours()+""+saveDate.getMinutes()+""+saveDate.getSeconds());
	var _dateName = _date.getFullYear()+""+(_date.getMonth()+1)+""+_date.getDate()+"_"+_date.getHours()+""+_date.getMinutes()+""+_date.getSeconds();
	doc.save('mSketch_UIST_Drawing_'+ _dateName +'.pdf');

	//if (agent.indexOf("chrome") != -1){
	//}
}
