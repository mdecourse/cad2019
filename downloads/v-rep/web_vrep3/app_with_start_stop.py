'''
remoteApiConnections.txt file content:

// Let's start a continuous remote API server service on port 19997:
portIndex1_port             = 19997
portIndex1_debug            = false
portIndex1_syncSimTrigger   = true
19998:
portIndex2_port             = 19998
portIndex2_debug            = false
portIndex2_syncSimTrigger   = true
'''
from flask import Flask, render_template, redirect
from vrep_linefollower_with_start_stop import VrepLineFollower

line_follower = VrepLineFollower()

app = Flask(__name__)

@app.route("/")
def index():
  return render_template('controls.html')

@app.route('/do/<direction>')
def do(direction):
  global line_follower
  line_follower.to_direction(direction)
  return redirect('/')


if __name__ == '__main__':
  app.run(host='127.0.0.1')
