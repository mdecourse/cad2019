import NXOpen
import NXOpen.UF

theSession = NXOpen.Session.GetSession()
theLw = theSession.ListingWindow
theUI = NXOpen.UI.GetUI()
theUfSession = NXOpen.UF.UFSession.GetUFSession()

def main(*args): 

    workPart = theSession.Parts.BaseWork

    bodies = workPart.Bodies

    for body in bodies:

        (min_corner, directions, distances) = theUfSession.ModlGeneral.AskBoundingBoxExact(body.Tag, 0)

        theLw.Open()
        theLw.WriteLine("Bounding box for " + body.JournalIdentifier)

        theLw.WriteLine("  Min Corner: ")
        theLw.WriteLine("    X: " + str(min_corner[0]))
        theLw.WriteLine("    Y: " + str(min_corner[1]))
        theLw.WriteLine("    Z: " + str(min_corner[2]))

        theLw.WriteLine("  Direction Vectors: ")
        theLw.WriteLine("    X: (" + str(directions[0][0]) + ", " + str(directions[0][1]) + ", " + str(directions[0][2]) + ")")
        theLw.WriteLine("    Y: (" + str(directions[1][0]) + ", " + str(directions[1][1]) + ", " + str(directions[1][2]) + ")")
        theLw.WriteLine("    Z: (" + str(directions[2][0]) + ", " + str(directions[2][1]) + ", " + str(directions[2][2]) + ")")

        theLw.WriteLine("  Distances: ")
        theLw.WriteLine("    X: " + str(distances[0]))
        theLw.WriteLine("    Y: " + str(distances[1]))
        theLw.WriteLine("    Z: " + str(distances[2]))

        theLw.WriteLine("")

# Main program.

if __name__ == "__main__":
    main()





