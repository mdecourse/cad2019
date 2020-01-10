from flask import Flask, render_template, redirect
from vrep_linefollower import VrepLineFollower

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
