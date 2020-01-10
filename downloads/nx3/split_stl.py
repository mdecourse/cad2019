from stl import mesh

for m in mesh.Mesh.from_multi_file('solvespace_assembly_ascii.stl'):
#for m in mesh.Mesh.from_file('solvespace_assembly_ascii.stl'):
    print(len(m))