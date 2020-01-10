import NXOpen
import NXOpen.UF
 
theSession = NXOpen.Session.GetSession()
theLw = theSession.ListingWindow
theUfSession = NXOpen.UF.UFSession.GetUFSession()    
 
def main(): 
 
    workPart = theSession.Parts.Work
    displayPart = theSession.Parts.Display
 
    markId1 = theSession.SetUndoMark(NXOpen.Session.MarkVisibility.Visible, "body feature group")
    theLw.Open()
 
    # initialize list to hold components
    comps = theSession.Parts.Display.ComponentAssembly.RootComponent.GetChildren()
 
    for x in comps:
        theLw.WriteLine(x.DisplayName)
 
    theLw.Close()
 
 
if __name__ == '__main__':
    main()