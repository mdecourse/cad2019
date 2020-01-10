'Journal to recursively walk through the assembly structure
' will run on assemblies or piece parts
' will step through all components of the displayed part
'NX 7.5, native
'NXJournaling.com February 24, 2012
 
Option Strict Off
 
Imports System
Imports NXOpen
Imports NXOpen.UF
Imports NXOpen.Assemblies
 
Module NXJournal
 
    Public theSession As Session = Session.GetSession()
    Public ufs As UFSession = UFSession.GetUFSession()
    Public lw As ListingWindow = theSession.ListingWindow
 
    Sub Main()
    Dim workPart As Part = theSession.Parts.Work
    Dim dispPart As Part = theSession.Parts.Display
 
    lw.Open
    Try
        Dim c As ComponentAssembly = dispPart.ComponentAssembly
        'to process the work part rather than the display part,
        '  comment the previous line and uncomment the following line
        'Dim c As ComponentAssembly = workPart.ComponentAssembly
        if not IsNothing(c.RootComponent) then
            '*** insert code to process 'root component' (assembly file)
            lw.WriteLine("Assembly: " & c.RootComponent.DisplayName)
            lw.WriteLine(" + Active Arrangement: " & c.ActiveArrangement.Name)
            '*** end of code to process root component
            ReportComponentChildren(c.RootComponent, 0)
        else
            '*** insert code to process piece part
            lw.WriteLine("Part has no components")
        end if
    Catch e As Exception
        theSession.ListingWindow.WriteLine("Failed: " & e.ToString)
    End Try
    lw.Close
 
    End Sub
 
'**********************************************************
    Sub reportComponentChildren( ByVal comp As Component, _
        ByVal indent As Integer)
 
        For Each child As Component In comp.GetChildren()
            '*** insert code to process component or subassembly
            lw.WriteLine(New String(" ", indent * 2) & child.DisplayName())
            '*** end of code to process component or subassembly
            if child.GetChildren.Length <> 0 then
                '*** this is a subassembly, add code specific to subassemblies
                lw.WriteLine(New String(" ", indent * 2) & _
                    "* subassembly with " & _
                    child.GetChildren.Length & " components")
                lw.WriteLine(New String(" ", indent * 2) & _
                    " + Active Arrangement: " & _
                    child.OwningPart.ComponentAssembly.ActiveArrangement.Name)
                '*** end of code to process subassembly
            else
                'this component has no children (it is a leaf node)
                'add any code specific to bottom level components
            end if
            reportComponentChildren(child, indent + 1)
        Next
    End Sub
'**********************************************************
    Public Function GetUnloadOption(ByVal dummy As String) As Integer
        Return Session.LibraryUnloadOption.Immediately
    End Function
'**********************************************************
 
End Module