import vrep
# for opencv get_image method
import time
import cv2
import numpy as np

class VrepLineFollower:
  def __init__(self):
    vrep.simxFinish(-1) # just in case, close all opened connections
    #self.clientID = vrep.simxStart('127.0.0.1', 19997, True, True, 5000, 5)
    self.clientID = vrep.simxStart('140.130.17.32', 19997, True, True, 5000, 5)

    self.wheelRadius = 0.027
    self.linearVelocityLeft  = 0.1
    self.linearVelocityRight = 0.1

    # vectors [left, right]
    self.direction_v = {
     'up':    [ 0.01,  0.01],
     'down':  [-0.01, -0.01],
     'left':  [-0.01,  0.01],
     'right': [ 0.01, -0.01],
     'start':[1, 0],
     'stop':[0, 1]
    }

    res, self.leftJointDynamic  = vrep.simxGetObjectHandle(self.clientID, "DynamicLeftJoint",  vrep.simx_opmode_oneshot_wait)
    res, self.rightJointDynamic = vrep.simxGetObjectHandle(self.clientID, "DynamicRightJoint", vrep.simx_opmode_oneshot_wait)

  # direction = 'up' | 'down' | 'left' | 'right'
  def to_direction(self, direction):
    if direction == 'start':
      vrep.simxStartSimulation(self.clientID, vrep.simx_opmode_oneshot)
    elif direction == 'stop':
      vrep.simxStopSimulation(self.clientID, vrep.simx_opmode_oneshot)
    elif direction == 'image':
      self.get_image()
    else:      
      direction_vector = self.direction_v[direction]
      self.linearVelocityLeft  += direction_vector[0]
      self.linearVelocityRight += direction_vector[1]
      self.set_motors()

  # private
  def set_motors(self):
    t_left  = self.linearVelocityLeft  / self.wheelRadius
    t_right = self.linearVelocityRight / self.wheelRadius
    vrep.simxSetJointTargetVelocity(self.clientID, self.leftJointDynamic,  t_left,  vrep.simx_opmode_oneshot_wait)
    vrep.simxSetJointTargetVelocity(self.clientID, self.rightJointDynamic, t_right, vrep.simx_opmode_oneshot_wait)
    
  def get_image(self):
    # 使用 port 19998 取得 image sensor 影像
    #clientID = vrep.simxStart('127.0.0.1', 19998, True, True, 5000, 5)
    clientID = vrep.simxStart('140.130.17.32', 19998, True, True, 5000, 5)
    if clientID!=-1:
      #print('Connected to remote API server')
      #print('Vision Sensor object handling')
      res, v1 = vrep.simxGetObjectHandle(clientID, 'vs1', vrep.simx_opmode_oneshot_wait)
      #print('Getting first image')
      err, resolution, image = vrep.simxGetVisionSensorImage(clientID, v1, 0, vrep.simx_opmode_streaming)
      while (vrep.simxGetConnectionId(clientID) != -1):
        err, resolution, image = vrep.simxGetVisionSensorImage(clientID, v1, 0, vrep.simx_opmode_buffer)
        if err == vrep.simx_return_ok:
            #print("image OK!!!")
            img = np.array(image,dtype=np.uint8)
            img.resize([resolution[1],resolution[0],3])
            # 將影像水平反轉
            flipHorizontal = cv2.flip(img, 1)
            cv2.imshow('image', flipHorizontal)
            #cv2.imshow('image',img)
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
        elif err == vrep.simx_return_novalue_flag:
            #print("no image yet")
            pass
        else:
          #print(err)
          pass
    else:
      #print("Failed to connect to remote API Server")
      vrep.simxFinish(clientID)

    cv2.destroyAllWindows()

