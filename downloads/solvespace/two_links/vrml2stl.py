#! /usr/bin/env python
# Translates simple vrml to stl
# There is no support for textures.
# This has been tested on a large vrml file (representing topography) created
# by the tinvrml command in ARC/INFO 8.1, and running with 
# python 2.2.1 under solaris8 unix.
# The one argument is the root name of a .wrl file.
# The output is root.stl
# Version 1.1 does not stop at the first separator.
# Copyleft Harvey Greenberg, University of Washington, hgreen@u.washington.edu
import string
import sys

root = sys.argv[1]
print 'Converting ',root+'.wrl to ',root+'.stl'
f=open(root+'.wrl')
while 1:      # skip through initial stuff
  linney=string.split(f.readline())
# print linney
  if len(linney) == 4:
    if linney[0] == 'translation':
      transx = float(linney[1])
      transy = float(linney[2])
      transz = float(linney[3])
#     print 'xyz',transx,transy,transz # I don't use these values.
  if linney == ['point', '[']:
    break
#print 'Reading vertex coordinates.'
verts = [] # The first triplet is index zero in the wrl file.
while 1:
  xyz = f.readline()
  i = string.find(xyz,',')
  if i < 0:    # end of vertex coordinates
    break
  verts.append(xyz[:i]) # building a list of xyz strings
print 'We have',len(verts)-1,'vertices.'
while 1:     # skip to triplets of vertex numbers
  linney=f.readline()  # linney was a list, now it's a string
  if linney == '      coordIndex [\n':
    break 
g=open(root+'.stl','w') # open stl file for writing.
g.write('solid %s\n' % root)
print 'Reading triangles.'
while 1:
  linney=f.readline()
  if linney == '}\n':
    break     # end of file
  abc = string.split(string.replace(linney,',',' ')) # list of vertex ids
  if len(abc) < 3:
    continue   # separation between groups of triangles
  xyz = string.split(verts[int(abc[0])]) # look up a vertex in the list
  x1 = float(xyz[0]) 
  y1 = float(xyz[1])
  z1 = float(xyz[2])
  xyz = string.split(verts[int(abc[1])])
  x2 = float(xyz[0])
  y2 = float(xyz[1])
  z2 = float(xyz[2])
  xyz = string.split(verts[int(abc[2])])
  x3 = float(xyz[0])
  y3 = float(xyz[1])
  z3 = float(xyz[2])

  dx1 = x1-x3
  dy1 = y1-y3
  dz1 = z1-z3
  dx2 = x2-x3
  dy2 = y2-y3
  dz2 = z2-z3
# print 'dx1=',dx1,'\ndy1=',dy1,'\ndz1=',dz1,'\ndx2=',dx2,'\ndy2=',dy2,'\ndz2=',dz2,'\n'
  vx = dy1*dz2 - dz1*dy2  # take the cross product of two edges
  vy = dz1*dx2 - dx1*dz2
  vz = dx1*dy2 - dy1*dx2
  templength = (vx*vx + vy*vy + vz*vz)**.5
  xn = vx/templength     # normalize the normal vector
  yn = vy/templength
  zn = vz/templength
# print 'Normal  %f,%f,%f\n' % (xn,yn,zn)

  g.write(' facet normal %f %f %f\n  outer loop\n' % (xn,yn,zn))
  g.write('   vertex %d %d %.2f\n' % (x1,y1,z1))
  g.write('   vertex %d %d %.2f\n' % (x2,y2,z2))
  g.write('   vertex %d %d %.2f\n' % (x3,y3,z3))
  g.write('  endloop\n endfacet\n')
g.write('endsolid %s\n' % root)
print 'Thank you.'
