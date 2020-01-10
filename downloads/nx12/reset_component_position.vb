Option Strict Off
 
Imports System
Imports NXOpen
Imports NXOpen.UF
Imports NXOpenUI
 
Module componentOriginalPosition
 
	Dim theSession As Session = Session.GetSession()
	Dim workPart As Part = theSession.Parts.Work
 
	Sub Main()
 
        Dim selComp As NXOpen.Assemblies.Component = Nothing
        If SelectComponent(selComp) = Selection.Response.Cancel Then
            Exit Sub
        End If
 
        Dim myInterpartDelay As Boolean = theSession.UpdateManager.InterpartDelay
 
        Dim pt As Point3d
        Dim RotMat As Matrix3x3
 
        Dim pt2 As Vector3d
        Dim RotMat2 As Matrix3x3
 
        selComp.GetPosition(pt, RotMat)
        'msgbox("Translation: " & pt.x & ", " & pt.y & ", " & pt.z)
        'msgbox("Rotation: " & vbcrlf & _
        '	RotMat.xx & ", " & RotMat.xy & ", " & RotMat.xz & vbcrlf & _
        '	RotMat.yx & ", " & RotMat.yy & ", " & RotMat.yz & vbcrlf & _
        '	RotMat.zx & ", " & RotMat.zy & ", " & RotMat.zz)
 
        'no translation of component on first pass
        pt2.X = 0
        pt2.Y = 0
        pt2.Z = 0
 
        'transpose of the rotation matrix, undo any rotations on the component
        RotMat2.Xx = RotMat.Xx
        RotMat2.Xy = RotMat.Yx
        RotMat2.Xz = RotMat.Zx
        RotMat2.Yx = RotMat.Xy
        RotMat2.Yy = RotMat.Yy
        RotMat2.Yz = RotMat.Zy
        RotMat2.Zx = RotMat.Xz
        RotMat2.Zy = RotMat.Yz
        RotMat2.Zz = RotMat.Zz
 
        'avoid problems if the part contains wave links or other interpart data
        theSession.UpdateManager.InterpartDelay = True
 
        'move the component back to the original rotation
        workPart.ComponentAssembly.MoveComponent(selComp, pt2, RotMat2)
 
        'get the translation information again, now that the component has been rotated back to absolute
        selComp.GetPosition(pt, RotMat)
 
        'negate the translations that have been applied to the component
        pt2.X = -pt.X
        pt2.Y = -pt.Y
        pt2.Z = -pt.Z
 
        'set rotation matrix to identity matrix, we want no new rotations on the component
        'or simply use RotMat returned from GetPosition, as it will be the identity matrix
        'after the component has been rotated back to its original position
        RotMat2.Xx = 1
        RotMat2.Xy = 0
        RotMat2.Xz = 0
        RotMat2.Yx = 0
        RotMat2.Yy = 1
        RotMat2.Yz = 0
        RotMat2.Zx = 0
        RotMat2.Zy = 0
        RotMat2.Zz = 1
 
        'translate component back to 0,0,0
        workPart.ComponentAssembly.MoveComponent(selComp, pt2, RotMat2)
 
        'reset interpart delay to original value
        theSession.UpdateManager.InterpartDelay = myInterpartDelay
 
	End Sub
 
    Function SelectComponent(ByRef selObj As TaggedObject) As Selection.Response
 
        Dim theUI As UI = UI.GetUI
        Dim message As String = "Select component to reset position"
        Dim title As String = "Select a Component"
        Dim includeFeatures As Boolean = False
        Dim keepHighlighted As Boolean = False
        Dim selAction As Selection.SelectionAction = Selection.SelectionAction.ClearAndEnableSpecific
        Dim cursor As Point3d
        Dim scope As Selection.SelectionScope = Selection.SelectionScope.AnyInAssembly
        Dim selectionMask_array(0) As Selection.MaskTriple
 
        With selectionMask_array(0)
            .Type = UFConstants.UF_component_type
            .Subtype = UFConstants.UF_all_subtype
        End With
 
        Dim resp As Selection.Response = theUI.SelectionManager.SelectTaggedObject(message, _
         title, scope, selAction, _
         includeFeatures, keepHighlighted, selectionMask_array, _
         selObj, cursor)
        If resp = Selection.Response.ObjectSelected OrElse resp = Selection.Response.ObjectSelectedByName Then
            Return Selection.Response.Ok
        Else
            Return Selection.Response.Cancel
        End If
 
    End Function
 
    Public Function GetUnloadOption(ByVal dummy As String) As Integer
        GetUnloadOption = NXOpen.UF.UFConstants.UF_UNLOAD_IMMEDIATELY
    End Function
 
End Module