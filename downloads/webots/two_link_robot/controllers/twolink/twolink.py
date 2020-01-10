from controller import Robot, Motor

TIME_STEP = 64

# create the Robot instance.
robot = Robot()

# get the motor devices
motor1 = robot.getMotor('motor_1')
motor2 = robot.getMotor('motor_2')
# set the target position of the motors
motor1.setPosition(10.0)
motor2.setPosition(-10.0)

while robot.step(TIME_STEP) != -1:
   pass