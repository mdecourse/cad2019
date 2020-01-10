<?xml version="1.0" encoding="utf-8"?>
<!-- Created by Leo: http://leoeditor.com/leo_toc.html -->
<leo_file xmlns:leo="http://leoeditor.com/namespaces/leo-python-editor/1.1" >
<leo_header file_format="2"/>
<globals/>
<preferences/>
<find_panel_settings/>
<vnodes>
<v t="leo.20191210155110.1"><vh>Split STL</vh></v>
<v t="leo.20191210160758.1"><vh>Reference</vh></v>
<v t="leo.20191210155041.1"><vh>javascript version - about nested functions</vh>
<v t="leo.20191210152753.2"><vh>@clean index.html</vh>
<v t="leo.20191210152908.1"><vh>&lt;html&gt; (index.html)</vh>
<v t="leo.20191210152908.2"><vh>&lt;body&gt; (index.html)</vh>
<v t="leo.20191210152908.3"><vh>&lt;p&gt; (index.html)</vh></v>
<v t="leo.20191210152908.4"><vh>&lt;p&gt; (index.html)</vh></v>
<v t="leo.20191210152908.5"><vh>&lt;p&gt; (index.html)</vh></v>
<v t="leo.20191210152908.6"><vh>&lt;ul id="console"&gt; (index.html)</vh></v>
<v t="leo.20191210152908.7"><vh>&lt;p id="progress"&gt; (index.html)</vh></v>
<v t="leo.20191210152908.8"><vh>&lt;script&gt; (index.html)</vh></v>
</v>
</v>
</v>
</v>
<v t="leo.20191210155056.1"><vh>python version</vh>
<v t="leo.20191210154950.1"><vh>@clean stlSplitter.py</vh>
<v t="leo.20191210155026.1"><vh>Declarations (stlSplitter.py)</vh></v>
<v t="leo.20191210155026.2"><vh>check_connection (stlSplitter.py)</vh></v>
</v>
<v t="leo.20191210154909.1"><vh>@clean stlRW.py</vh>
<v t="leo.20191210154915.1"><vh>Declarations (stlRW.py)</vh></v>
<v t="leo.20191210154915.2"><vh>stlReadBinary (stlRW.py)</vh></v>
<v t="leo.20191210154915.3"><vh>stlReadAscii (stlRW.py)</vh></v>
<v t="leo.20191210154915.4"><vh>stlRead (stlRW.py)</vh></v>
<v t="leo.20191210154915.5"><vh>stlWriteBinary (stlRW.py)</vh></v>
<v t="leo.20191210154915.6"><vh>writeVector (stlRW.py)</vh></v>
<v t="leo.20191210154915.7"><vh>stlWriteAscii (stlRW.py)</vh></v>
<v t="leo.20191210154915.8"><vh>stlWrite (stlRW.py)</vh></v>
</v>
</v>
</vnodes>
<tnodes>
<t tx="leo.20191210152753.2">@others
@language xml
@tabwidth -4
</t>
<t tx="leo.20191210152908.1">&lt;html&gt;
&lt;title&gt;Split STL mesh&lt;/title&gt;
    @others
&lt;/html&gt;
</t>
<t tx="leo.20191210152908.2">&lt;body&gt;
    @others
&lt;/body&gt;
</t>
<t tx="leo.20191210152908.3">&lt;p&gt;This is a simple piece of javascript (licensed under the MIT license) by
&lt;a href="http://www.thingiverse.com/arpruss/"&gt;Alexander Pruss&lt;/a&gt; that splits an STL mesh file that contains multiple parts into
those multiple parts.&lt;/p&gt;
</t>
<t tx="leo.20191210152908.4">&lt;p&gt;This may well fail if the mesh is defective and has points that are meant to be coincident 
but are merely close together.&lt;/p&gt;
&lt;p&gt;All the processing is done in your browser--your STL is not uploaded to any server.&lt;/p&gt;
</t>
<t tx="leo.20191210152908.5">&lt;p&gt;&lt;b&gt;Warning:&lt;/b&gt; If an object has a cavity surrounded by material on all sides, you will get one mesh for the outer surface
and an inside-out mesh for the cavity. Solving this problem would require significant coding.&lt;/p&gt;
&lt;input type="file" id="file" name="file" /&gt;
</t>
<t tx="leo.20191210152908.6">&lt;ul id="console"&gt;
&lt;/ul&gt;
</t>
<t tx="leo.20191210152908.7">&lt;p id="progress"&gt;
&lt;/p&gt;


</t>
<t tx="leo.20191210152908.8">&lt;script&gt;

var TRIANGLE_SIZE = (3+3*3)*4+2;
var ASCII_MODE = true;
var allSplitMeshes = [];
var baseFilaname = "";
var splitMeshIndex;
var meshes;

function getString(view, position, length) {
    var out = "";

    for (var i=0; i&lt;length; i++) {
        var b = view.getUint8(position + i);
        out += String.fromCharCode(b);
    }

    return out;
}

// For hashing during splitting, ASCII mode is used, where vectors are stored
// as strings. From a binary STL, the vectors are stored as hex strings, and
// from an ASCII STL, they are stored as directly extracted ASCII.

function getVector(view, position) {
    if (ASCII_MODE) {
        function fixZero(a) {
            return a == 0x80000000 ? 0 : a;
        }
        x = fixZero(view.getUint32(position, true));
        y = fixZero(view.getUint32(position+4, true));
        z = fixZero(view.getUint32(position+8, true));
        return x.toString(16)+":"+y.toString(16)+":"+z.toString(16);
    }

    x = view.getFloat32(position, true);
    y = view.getFloat32(position+4, true);
    z = view.getFloat32(position+8, true);
    return [x,y,z]; // x.toString()+","+y.toString()+","+z.toString(); //[x,y,z];
}

function parseVector(vector) {
    if (typeof vector === "string") {
        var data = vector.split(":");
        var buf = new ArrayBuffer(4);
        var view = new DataView(buf);
        function parse(s) {
            view.setUint32(0, parseInt(s,16));
            return view.getFloat32(0);
        }
        return [parse(data[0]),parse(data[1]),parse(data[2])];
    }
    else {
        return vector;
    }
}

function setVector(view, position, vector) {
    if (typeof vector === "string") {
        var data = vector.split(":");
        view.setUint32(position, parseInt(data[0],16), true);
        view.setUint32(position+4, parseInt(data[1],16), true);
        view.setUint32(position+8, parseInt(data[2],16), true);
    }
    else {
        view.setFloat32(position, vector[0], true);
        view.setFloat32(position+4, vector[1], true);
        view.setFloat32(position+8, vector[2], true);
    }
}

function getVectorFromText(line, position) {
    var data = line.substr(position).split(/[\s,]+/);

    if (data.length &lt; 3)
        throw 'Invalid vector';

    if (ASCII_MODE) {
        var buf = new ArrayBuffer(4);
        var view = new DataView(buf);

        function toHex32(number) {
            view.setFloat32(0, parseFloat(number));
            return view.getUint32(0).toString(16);
        }

        return toHex32(data[0])+":"+toHex32(data[1])+":"+toHex32(data[2]);
    }

    return [parseFloat(data[0]), parseFloat(data[1]), parseFloat(data[2])];
}

function message(text) {
    document.getElementById('console').innerHTML += '&lt;li&gt;'+text+'&lt;/li&gt;';
}

function getASCIISTL(text) {
    var triangles = [];

    var triangle = [];
    var normal = [0,0,0];

    var lines = text.split(/[\r\n]+/);

    message(lines.length+" lines of data");

    for (var i = 0 ; i &lt; lines.length ; i++ ) {
        l = lines[i].trim().toLowerCase();
        if (l == 'endfacet') {
            if (triangle.length != 3) 
                throw 'invalid triangle';
            triangles.push([triangle[0],triangle[1],triangle[2],normal]);
            triangle = [];
            normal = [0,0,0];
        }
        else if (l.startsWith('facet')) {
            if (l.length &gt; 6) {
                if (l.substr(6).startsWith('normal'))
                    normal = getVectorFromText(l, 13);
            }
        }
        else if (l.startsWith('vertex')) {
            if (l.length &gt; 7) 
                triangle.push(getVectorFromText(l, 7));
        }
    }

    message(String(triangles.length) + " triangles");

    return triangles;
}

function getBinarySTL(view) {
    var triangles = [];

    var numTriangles = view.getUint32(80, true);

    message(String(numTriangles) + " triangles");

    for (var i = 0 ; i &lt; numTriangles ; i++) {
        position = 84 + TRIANGLE_SIZE*i;

        normal = getVector(view, position);
        v1 = getVector(view, position+12);
        v2 = getVector(view, position+12*2);
        v3 = getVector(view, position+12*3);
        triangles.push( [v1,v2,v3,normal] );
    }

    return triangles;
}

function meshSelection(meshes) {
    message(String(meshes.length)+" meshes extracted");

    out = "&lt;p&gt;Download individual part meshes or combine them with checkmarks:&lt;br/&gt;";

    allSplitMeshes = [];

    for (var i=0; i&lt;meshes.length; i++) {
        allSplitMeshes.push(meshes[i].triangles);
        out += "&lt;input type='checkbox' id='mesh"+i+"'/&gt;&lt;a href='#' onclick='downloadMesh(["+i+"]);'&gt;mesh part "+(i+1)+"&lt;/a&gt; "+describeBounds(meshes[i].bounds)+"&lt;br/&gt;";
    }

    out += "&lt;button onclick='downloadMeshCombo();'&gt;Download combination&lt;/button&gt;&lt;/p&gt;";

    document.getElementById('progress').innerHTML = out;
}

function downloadMeshCombo() {
    list = [];
    for (var i=0; i&lt;allSplitMeshes.length; i++) {
        if (document.getElementById('mesh'+i).checked)
            list.push(i);
    }
    if (list.length == 0)
        return;
    downloadMesh(list);
}

// 分割 Mesh
// 典型的 Javascript closure 設計
function splitMesh(triangles) {
    meshes = [];
    splitMeshIndex = 0;

    function process() {
        var i = splitMeshIndex;
        var t0 = Date.now();

        document.getElementById('progress').innerHTML = "Splitting "+(i/triangles.length*100).toFixed(1)+'% done ('+(meshes.length)+' parts found)';

        for (; i&lt;triangles.length; i++) {
            var t = triangles[i];
            var matches = [];
            
            // j 從 0 到 1, 到 2
            for (var j = 0 ; j &lt; 3 ; j++) {
                // k 則從 0 增量至 meshes.length - 1, 表示逐一拿出 meshs 元素
                for (var k = 0 ; k &lt; meshes.length; k++) {
                    //  若 matches 數列為空, 且 三角形 t 中的點座標, 出現在某一 meshes 
                    if (matches.indexOf(k) == -1 &amp;&amp; t[j] in meshes[k].points) {
                        // 則將 k 序號放入 matches 數列中
                        matches.push(k);
                    } // if
                } // for k
            } // for j

            matches.sort((x,y)=&gt;(x&lt;y ? -1 : (x&gt;y ? 1 : 0)));

            var m;
            // matches 起始
            if (matches.length == 0) {
                m = {points:{}, triangles:[]};
                meshes.push(m);
            }
            else {
                m = meshes[matches[0]];
                for (var j = matches.length - 1 ; j &gt;= 1 ; j--) {
                    mm = meshes[matches[j]];
                    for (var key in mm.points) {
                        if (mm.points.hasOwnProperty(key))
                            m.points[key] = true;
                    }
                    for (var k = 0 ; k &lt; mm.triangles.length; k++) {
                        m.triangles.push(mm.triangles[k]);
                    }
                    meshes.splice(matches[j], 1);
                }
            }
            for (var k = 0 ; k &lt; 3 ; k++) {
                m.points[t[k]] = true;
            }
            m.triangles.push(t);

            if (Date.now() &gt;= t0 + 500) {
                setTimeout(process, 0);
                splitMeshIndex = i+1;
                return;
            }
        } // for i

        for (var i = 0 ; i &lt; meshes.length ; i++) {
            var bounds = [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, 
                    Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY ];

            for (var key in meshes[i].points) {
                if (meshes[i].points.hasOwnProperty(key)) {
                    var v = parseVector(key);
                    for (var k=0; k&lt;3; k++) {
                        bounds[k] = Math.min(bounds[k], v[k]);
                        bounds[3+k] = Math.max(bounds[3+k], v[k]);
                    } // for k
                } // if
            } // for key

            meshes[i].bounds = bounds;
            delete meshes[i].points;
        } // for i

        function compareByBounds(m,mm) {
            for (var i=0; i&lt;6; i++) {
                if (m.bounds[i] &lt; mm.bounds[i]) 
                    return -1;
                else if (mm.bounds[i] &lt; m.bounds[i])
                    return 1;
            } // for i
            return 0;
        } // function compareByBounds

        meshes.sort(compareByBounds);

        document.getElementById('progress').innerHTML = '';
        document.getElementById('file').disabled = false;

        if (meshes.length == 1) {
            message("No splitting done: Only one mesh in file.");
        }
        else if (meshes.length == 0) {
            message("No mesh found in file.");
        }
        else {
            meshSelection(meshes);
        }

        meshes = [];
    } // function process

    process();
} // 典型的 Javascript closure 設計

function downloadBlob(name,blob) {
    var link = document.createElement('a');
    document.body.appendChild(link);
    link.download = name;
    link.href = window.URL.createObjectURL(blob);
    link.onclick = function(e) {
        setTimeout(function() {
            window.URL.revokeObjectURL(link.href);
        }, 1600);
    };
    link.click();
    try {
        link.remove();
    }
    catch(err) {}  
    try {
        document.body.removeChild(link);
    }
    catch(err) {}
}

function makeMeshByteArray(triangleLists) {
    var totalTriangles = 0;

    for (var i=0; i&lt;triangleLists.length; i++)
        totalTriangles += triangleLists[i].length;

    var data = new ArrayBuffer(84 + totalTriangles * TRIANGLE_SIZE);
    var view = new DataView(data);
    view.setUint32(80, totalTriangles, true);
    var offset = 84;
    for (var i=0; i&lt;triangleLists.length; i++) {
        var triangles = triangleLists[i];
        for (var j=0; j&lt;triangles.length; j++) {
            setVector(view, offset, triangles[j][3]); // normal
            setVector(view, offset+12, triangles[j][0]); // v1
            setVector(view, offset+12*2, triangles[j][1]); // v2
            setVector(view, offset+12*3, triangles[j][2]); // v3
            offset += TRIANGLE_SIZE;
        }
    }
    return view.buffer;
}

function downloadMesh(list) {
    if (list.length == 0)
        return;
    var name = baseFilename;
    var toMake = [];
    for (var i=0; i&lt;list.length; i++) {
        name += "-" + (list[i]+1);
        toMake.push(allSplitMeshes[list[i]]);
    }
    downloadBlob(name+".stl", new Blob([makeMeshByteArray(toMake)], {type: "application/octet-stream"}));
}

function describeBounds(bounds) {
    return "("+bounds[0].toFixed(2)+", "+bounds[1].toFixed(2)+", "+bounds[2].toFixed(2)+") - ("+
            bounds[3].toFixed(2)+", "+bounds[4].toFixed(2)+", "+bounds[5].toFixed(2)+")";
}

function processSTL(data) {
    length = data.byteLength;
    view = new DataView(data);

    var header = getString(view, 0, 5);

    var binary = true;
    var text;

    if (header == "solid") {
        // probably ASCII
        text = getString(view, 0, length);
        if (text.includes("endfacet")) {
            binary = false;
        }
    }

    message(binary ? "binary STL" : "ASCII STL");
    triangles = binary ? getBinarySTL(view) : getASCIISTL(text);
    message("data successfully read");    
    splitMesh(triangles);
}

function handleFileSelect(evt) {
    var e = document.getElementById('progress').innerHTML = '';
    var e = document.getElementById('file');
    e.disabled = true;
    allSplitMeshes = [];
    meshes = [];
    document.getElementById('console').innerHTML = '';

    var f = evt.target.files[0];

    message( "reading "+ String(f.size) + ' bytes');

    var n = f.name.split(/[/\\]+/);
    baseFilename = f.name.replace(/.*[/\\]/, "").replace(/\.[sS][tT][lL]$/, "");

    var reader = new FileReader();
    reader.onload = function(event) {
        try {
            processSTL(event.target.result);
        }
        catch(err) {
            message( "Error: "+err);
            var e = document.getElementById('file');
            e.disabled = false;
        }
    }
    reader.readAsArrayBuffer(f);
}

document.getElementById('file').addEventListener('change', handleFileSelect, false);
&lt;/script&gt;
</t>
<t tx="leo.20191210154909.1"># STL reader-writer
#
# copyright 2014 Francesco Santini &lt;francesco.santini@gmail.com&gt;
#
# based on https://github.com/cmpolis/convertSTL by Chris Polis
# and BinarySTL https://github.com/sukhbinder/python by Sukhbinder Singh
#
# Released under the MIT/X license
 
@others
if __name__ == "__main__":
    import sys
    fname = sys.argv[1]
    h,p,n,v1,v2,v3,isAscii = stlRead(fname)
    print(len(n))
    print(v1[0])
    stlWriteBinary("binary.stl", n, v1, v2, v3);
    stlWriteAscii("ascii.stl", n, v1, v2, v3);
@language python
@tabwidth -4
</t>
<t tx="leo.20191210154915.1">import numpy as np
from struct import unpack, pack
 
</t>
<t tx="leo.20191210154915.2">def stlReadBinary(fname):
    fp = open(fname, 'rb')
    Header = fp.read(80)
    nn = fp.read(4)
    Numtri = unpack('i', nn)[0]
    #print nn
    record_dtype = np.dtype([
                  ('normals', np.float32,(3,)),  
                  ('Vertex1', np.float32,(3,)),
                  ('Vertex2', np.float32,(3,)),
                  ('Vertex3', np.float32,(3,)) ,              
                  ('atttr', '&lt;i2',(1,) )
    ])
    data = np.fromfile(fp , dtype = record_dtype , count =Numtri)
    fp.close()
 
    Normals = data['normals']
    Vertex1= data['Vertex1']
    Vertex2= data['Vertex2']
    Vertex3= data['Vertex3']
 
    p = np.append(Vertex1,Vertex2,axis=0)
    p = np.append(p,Vertex3,axis=0) #list(v1)
    Points =np.array(list(set(tuple(p1) for p1 in p)))
 
    return Header,Points,Normals,Vertex1,Vertex2,Vertex3,False
 
</t>
<t tx="leo.20191210154915.3">def stlReadAscii(fname):
    fp = open(fname, 'r')
    Normals = []
    Vertex1 = []
    Vertex2 = []
    Vertex3 = []
    Points = []
    while True:
        line = fp.readline()
        if not line: break
        if line.find("solid") &gt; -1 or line.find("endfacet") &gt; -1: continue
        if line.find("facet normal") &gt; -1:
            normline = line[line.find("facet normal")+len("facet normal"):]
            normal = np.array([float(val.strip()) for val in normline.split()])
            Normals.append(normal)
            vertices = []
            fp.readline() # outer loop
            # read vertices after normal
            for vIndex in range(0,3):
                vLine = fp.readline()
                vLine = vLine[vLine.find("vertex")+len("vertex"):]
                vertices.append(np.array([float(val.strip()) for val in vLine.split()]))
            Vertex1.append(vertices[0])
            Vertex2.append(vertices[1])
            Vertex3.append(vertices[2])
            Points.extend(vertices)
            fp.readline() # endloop
    return "", Points, Normals, Vertex1, Vertex2, Vertex3,True
     
   
</t>
<t tx="leo.20191210154915.4">def stlRead(fname):
    fp = open(fname, "r")
    try:
        if fp.readline().find("solid") &gt; -1:
            fp.close()
            return stlReadAscii(fname)
        else:
            fp.close()
            return stlReadBinary(fname)
    except:
        return stlReadBinary(fname)
     
</t>
<t tx="leo.20191210154915.5">def stlWriteBinary(fname, normals, v1, v2, v3):
    with open(fname, "wb") as fout:
        # write 80 bytes header
        for i in range(0, 80): fout.write(pack("&lt;c", b" "))
        fout.write(pack("&lt;I", len(normals))) # number of triangles
        for i in range(0, len(normals)):
            fout.write(pack("&lt;fff", *normals[i]))
            fout.write(pack("&lt;fff", *v1[i]))
            fout.write(pack("&lt;fff", *v2[i]))
            fout.write(pack("&lt;fff", *v3[i]))
            fout.write(pack("&lt;H", 0)) # attribute
       
</t>
<t tx="leo.20191210154915.6">def writeVector(fd, vec):
    for v in vec:
        fd.write("{:.7e}".format(v))
        fd.write(" ")
       
</t>
<t tx="leo.20191210154915.7">def stlWriteAscii(fname, normals, v1, v2, v3):
    with open(fname, "w") as fout:
        fout.write("solid \n")
        for i in range(0, len(normals)):
            fout.write("  facet normal ")
            writeVector(fout, normals[i])
            fout.write("\n")
            fout.write("    outer loop\n")
            fout.write("      vertex ")
            writeVector(fout, v1[i])
            fout.write("\n")
            fout.write("      vertex ")
            writeVector(fout, v2[i])
            fout.write("\n")
            fout.write("      vertex ")
            writeVector(fout, v3[i])
            fout.write("\n")
            fout.write("    endloop\n")
            fout.write("  endfacet\n")
       
       
</t>
<t tx="leo.20191210154915.8">def stlWrite(fname, normals, v1, v2, v3, isAscii=False):
    if isAscii:
        stlWriteAscii(fname, normals, v1, v2, v3)
    else:
        stlWriteBinary(fname, normals, v1, v2, v3)
       
# test
</t>
<t tx="leo.20191210154950.1">#!/usr/bin/env python
# STL splitter
# splits a STL file containing separate objects
#
# copyright 2014 Francesco Santini &lt;francesco.santini@gmail.com&gt;
#
# based on https://github.com/cmpolis/convertSTL by Chris Polis
# and BinarySTL https://github.com/sukhbinder/python by Sukhbinder Singh
#
# Released under the MIT/X license
 
 
@others
if len(sys.argv) &lt; 2:
    print("Usage: " + sys.argv[0] + " &lt;file.stl&gt;")
    sys.exit(-1)
 
fname = sys.argv[1]
 
print("Reading...")
 
head,points,n,v1,v2,v3,isAscii = stlRW.stlRead(fname)
 
print("Analyzing...")
 
faceTree = []
 
for triangleIndex in range(0, len(v1)):
    triangle = [ v1[triangleIndex], v2[triangleIndex], v3[triangleIndex], n[triangleIndex] ]
    connectedTo = []
    for treeindex in range(0, len(faceTree)):
        for face in faceTree[treeindex]:
            if check_connection(face, triangle):
                connectedTo.append(treeindex) # the triangle is connected to at least one triangle of the current treeIndex
                break
       
    if len(connectedTo) == 0:
        # this is a triangle from a new set
        #print "new set"
        faceTree.append([])
        faceTree[len(faceTree)-1].append(triangle)
    elif len(connectedTo) == 1:
        #print "existing set"
        # the triangle is connected to one set
        faceTree[connectedTo[0]].append(triangle)
    else:
        #print "connecting triangle"
        #this triangle connects two branches of the tree: collapse the branches
        faceTree[connectedTo[0]].append(triangle)
        for i in range(len(connectedTo)-1, 0, -1):
            faceTree[connectedTo[0]].extend(faceTree.pop(connectedTo[i]))
       
print("Number of separate objects: ", len(faceTree))
 
print("Writing files")
 
origFile, origExt = path.splitext(fname)
for i in range(0, len(faceTree)):
    newFile = origFile + "-" + str(i+1) + origExt
    print("Writing ", newFile)
    n = [field[2] for field in faceTree[i]]
    v1 = [field[0] for field in faceTree[i]] 
    v2 = [field[1] for field in faceTree[i]] 
    v3 = [field[2] for field in faceTree[i]]
    stlRW.stlWrite(newFile, n, v1, v2, v3)
@language python
@tabwidth -4
</t>
<t tx="leo.20191210155026.1">import stlRW
import sys
from os import path
 
## functions
 
# maybe insert a tolerance for floating points?
</t>
<t tx="leo.20191210155026.2">def check_connection(tri1, tri2):
    for v1 in tri1[0:2]:
        for v2 in tri2[0:2]:
            if (v1[0] == v2[0] and v1[1] == v2[1] and v1[2] == v2[2]): return True
    return False
     
 
</t>
<t tx="leo.20191210155041.1">https://code.tutsplus.com/tutorials/stop-nesting-functions-but-not-all-of-them--net-22315

https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Closures</t>
<t tx="leo.20191210155056.1"></t>
<t tx="leo.20191210155110.1"></t>
<t tx="leo.20191210160758.1">https://pypi.org/project/trimesh/</t>
</tnodes>
</leo_file>
