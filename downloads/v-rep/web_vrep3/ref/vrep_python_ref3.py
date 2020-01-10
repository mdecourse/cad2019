try:
    import vrep
except:
    print ('--------------------------------------------------------------')
 
import time
 
 
def connectVREP():
  vrep.simxFinish(-1) # just in case, close all opened connections
  clientID=vrep.simxStart('127.0.0.1',19999,True,True,5000,5) # Connect to V-REP
  if clientID!=-1:
    print ('Connected Remote Api')
    vrep.simxStartSimulation(clientID,vrep.simx_opmode_oneshot_wait)
 
    vrep.simxSynchronous(clientID,True)
    return clientID
  else:
    print ('ERROR! Error connecting Remote Api')
    sys.exit(0);
 
def startSim(clientID):
  vrep.simxStartSimulation(clientID,vrep.simx_opmode_oneshot)
 
def stopSim(clientID):
  vrep.simxStopSimulation(clientID,vrep.simx_opmode_oneshot_wait)
 
def disconnectVREP(clientID):
  # Now close the connection to V-REP:
  vrep.simxFinish(clientID)
  print('Connection finished')
 
 
clientID=connectVREP()
 
 
ret,joint1_handler = vrep.simxGetObjectHandle(\
  clientID,"redundantRob_joint1",vrep.simx_opmode_oneshot_wait)
ret,joint1 = vrep.simxGetJointPosition(\
  clientID,joint1_handler,vrep.simx_opmode_streaming)
 
ret,joint2_handler = vrep.simxGetObjectHandle(\
  clientID,"redundantRob_joint2",vrep.simx_opmode_oneshot_wait)
ret,joint2 = vrep.simxGetJointPosition(\
  clientID,joint2_handler,vrep.simx_opmode_streaming)
 
startSim(clientID)
 
ret,joint1 = vrep.simxGetJointPosition(\
  clientID,joint1_handler,vrep.simx_opmode_buffer)
print joint1  #Get position joint 1
ret,joint2 = vrep.simxGetJointPosition(\
  clientID,joint2_handler,vrep.simx_opmode_buffer)
print joint2 #Get position joint 2
 
ret = vrep.simxSetJointPosition(\
  clientID,joint1_handler,pi/2,vrep.simx_opmode_oneshot)  #Set pi/2 to joint 1
 
time.sleep(2)
 
stopSim(clientID)
 
time.sleep(1)
 
disconnectVREP(clientID)  