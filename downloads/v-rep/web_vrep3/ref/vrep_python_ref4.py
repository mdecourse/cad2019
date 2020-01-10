import threading
import time
import sys
import traceback
 
sys.path.insert(0, 'C:\\Program Files\\V-REP3\\V-REP_PRO_EDU\\programming\\Python')
import vrep
 
class Joint(threading.Thread):
    def __init__(self, joint_name, port):
        threading.Thread.__init__(self)
        self.client_id = -1
        self.port = port
        self.joint_name = joint_name
 
    def run(self):
        try:
            # connect to V-REP server
            self.client_id = vrep.simxStart("127.0.0.1", self.port, False, True, 5000, 5)
            if self.client_id == -1:
                raise Exception('Failed to connect V-REP remote API server.')
 
            # get handle
            res, p = vrep.simxGetObjectHandle(self.client_id, self.joint_name.encode(), vrep.simx_opmode_oneshot_wait)
            if res == vrep.simx_error_noerror:
                print('[Joint %s] handle= %s' % (self.joint_name, p))
            else:
                raise Exception('Error in getting joint handles.')
 
        except Exception as e:
            print('[Joint %s] %s' % (self.joint_name, e.args[0]))
            traceback.print_exc()
 
        finally:
            # disconnect with V-REP server
            vrep.simxFinish(self.client_id)
 
if __name__ == "__main__":
    joints = [Joint("joint1", 19999), Joint("joint2", 19998)]
    for joint in joints:
        joint.start()
        time.sleep(0.1)
    time.sleep(1)
    for joint in joints:
        joint.join()
    print("Done")