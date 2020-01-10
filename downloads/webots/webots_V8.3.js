/**
 * Injects a Webots 3D view inside a HTML tag.
 * @class
 * @classdesc
 *   The Webots view object displays a 3D view on a web page.
 *   This view represents a Webots simulation world that may be
 *   connected to a webots instance running on a remote server.
 *   This library depends on the x3dom-full.js library
 * @example
 *   // Example: Initialize from a Webots streaming server
 *   var view = new webots.View(document.getElementById("myDiv"));
 *   view.open("ws://localhost:1234/simple/worlds/simple.wbt");
 *   // or view.open("ws://localhost:1234");
 *   // or view.open("file.x3d");
 *   view.onready = function() {
 *       // the initialization is done
 *   }
 *   view.onclose = function() {
 *       view = null;
 *   }
 */

var webots = {};

webots.WwiUrl = document.currentScript.getAttribute("src");
webots.WwiUrl = webots.WwiUrl.substring(0, webots.WwiUrl.length - 9); // remove "webots.js"

webots.View = function(view3D, log) {
    this.followObject = null;
    this.onerror = function(text) {
        console.log("%c" + text, "color:black");
    }
    this.onstdout = function(text) {
        console.log("%c" + text, "color:blue");
    }
    this.onstderr = function(text) {
        console.log("%c" + text, "color:red");
    }
    this.onmousedown = null;
    this.onworldloaded = null;
    this.view3D = view3D;
    this.view3D.className = view3D.className + " webotsView";
    this.console = new webots.Console(log);
    this.selection = null;
    this.x3dScene = null;
    this.x3dNode = null;
    this.initialMouseX = 0;
    this.initialMouseY = 0;
    this.pickedPoint = null;
    this.animation = null;
    this.enableNavigation = true;
    this.mouseDown = 0;
}

webots.View.prototype.open = function(url) {
    var that = this;
    if (typeof this.url === "undefined") {
        this.url = url;
        initX3Dom();
    } else {
        this.url = url;
        initWorld();
    }
    function initX3Dom() { // load x3dom.css, x3dom-full.js and calls initWorld
        var head = document.getElementsByTagName('head')[0];
        var link  = document.createElement('link');
        link.rel  = 'stylesheet';
        link.type = 'text/css';
        link.href = 'https://www.cyberbotics.com/x3dom/1.7/x3dom.css';
        link.media = 'all';
        head.appendChild(link);
        // source http://stackoverflow.com/questions/950087/include-a-javascript-file-in-another-javascript-file
        var script = document.createElement('script');
        script.src = "https://www.cyberbotics.com/x3dom/1.7/x3dom-full.js";
        script.onload = initWorld;
        script.onerror = function() {
            that.onerror("Error when loading the X3DOM library");
        }
        head.appendChild(script); // fire the loading
    }
    
    function initWorld() {
        if (that.url.startsWith('ws://')) {
            if (! that.x3dScene) {
                createX3DNode(document.createElement("Scene"));
            }
            
            if (that.url.endsWith('.wbt')) {  // url expected form: "ws://localhost:1234/simple/worlds/simple.wbt"
                that.server = new webots.Server(that.url, that, finalize);
            } else { // url expected form: "ws://cyberbotics2.cyberbotics.com:1234"
                that.stream = new webots.Stream(that.url, that, finalize);
            }
        } else { // assuming it's an URL to a .x3d file
            x3dom.runtime.ready = finalize;
            initX3dFile();
        }
    }

    function createX3DNode(scene) {
        that.x3dNode = document.createElement("x3d");
        that.x3dNode.style.width = "100%";
        that.x3dNode.style.height = "100%";
        that.view3D.appendChild(that.x3dNode);
        that.x3dScene = scene;
        that.x3dNode.appendChild(that.x3dScene);
    }

    function initX3dFile() {
        xmlhttp = new XMLHttpRequest();
        xmlhttp.open("GET",that.url, true);
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                createX3DNode(xmlhttp.responseXML.getElementsByTagName("Scene")[0]);
            }
        }
        xmlhttp.send();
    }
    
    function finalize() {
        var lineScale = parseInt(that.x3dScene.getElementsByTagName("WorldInfo")[0].getAttribute("lineScale"));
        if (isNaN(lineScale) || lineScale == 0) {
            that.lineScale = 0.1;
        } else {
            that.lineScale = lineScale;
        }
        addMouseNavigation();
        if (that.animation != null) {
            that.animation.init();
        } else if (that.onready) {
            that.onready();
        }
    }
    
    function addMouseNavigation() {
        that.x3dNode.addEventListener('wheel', function(evt) {
            if (! that.enableNavigation) {
                return;
            }
            var scaleFactor = -0.2 * that.lineScale * ((evt.deltaY < 0) ? -1 : 1); 
            var viewpoint = that.x3dScene.getElementsByTagName("Viewpoint")[0];
            var vp = x3dom.fields.SFVec3f.parse(viewpoint.getAttribute('position'));
            var vo = x3dom.fields.SFVec4f.parse(viewpoint.getAttribute('orientation'));
            var c = Math.cos(vo.w);
            var s = Math.sin(vo.w);
            var tz = (1 - c) * vo.z;
            var roll = new x3dom.fields.SFVec3f(tz * vo.x + s * vo.y, tz * vo.y - s * vo.x, tz * vo.z + c);
            var target = vp.add(roll.multiply(scaleFactor));
            viewpoint.setAttribute('position', target.toString());
        }, true);
        that.x3dNode.addEventListener('mousemove', function(evt) {
            if (! that.enableNavigation) {
                return;
            }
            if (evt.buttons == 0 || that.mouseDown == 0) {
                return;
            }
            if (that.animation && that.animation.sliding) {
                return;
            }
            var dx = evt.clientX - that.initialMouseX;
            var dy = evt.clientY - that.initialMouseY;
            var viewpoint = that.x3dScene.getElementsByTagName("Viewpoint")[0];
            var vp = x3dom.fields.SFVec3f.parse(viewpoint.getAttribute('position'));
            var vo = x3dom.fields.SFVec4f.parse(viewpoint.getAttribute('orientation'));
            var c = Math.cos(vo.w);
            var s = Math.sin(vo.w);
            if (evt.buttons == 1) { // left mouse button to rotate viewpoint
                var halfYawAngle   = -0.005 * dx;
                var halfPitchAngle = -0.005 * dy;
                var sinusYaw = Math.sin(halfYawAngle);
                var sinusPitch = Math.sin(halfPitchAngle);
                var tx = (1 - c) * vo.x;
                var pitch = new x3dom.fields.SFVec3f(tx * vo.x + c, tx * vo.y + s * vo.z, tx * vo.y - s * vo.z);
                var pitchRotation = new x3dom.fields.Quaternion(sinusPitch * pitch.x, sinusPitch * pitch.y, sinusPitch * pitch.z, Math.cos(halfPitchAngle));
                var worldUp = new x3dom.fields.SFVec3f(0,1,0);
                var yawRotation = new x3dom.fields.Quaternion(sinusYaw * worldUp.x, sinusYaw * worldUp.y, sinusYaw * worldUp.z, Math.cos(halfYawAngle));
                var deltaRotation = yawRotation.multiply(pitchRotation);
                var currentPosition = deltaRotation.toMatrix().multMatrixVec(vp.subtract(that.pickedPoint)).add(that.pickedPoint);
                var voq = x3dom.fields.Quaternion.axisAngle(new x3dom.fields.SFVec3f(vo.x, vo.y, vo.z), vo.w);
                var currentOrientation = deltaRotation.multiply(voq);
                viewpoint.setAttribute('position', currentPosition.toString());
                var aa = currentOrientation.toAxisAngle();
                viewpoint.setAttribute('orientation', aa[0].toString() + " " + aa[1]);
            } else if (evt.buttons == 2) { // right mouse button to translate viewpoint
                var targetRight = -0.2 * that.lineScale * dx;
                var targetUp    =  0.2 * that.lineScale * dy;
                var tx = (1 - c) * vo.x;
                var pitch = new x3dom.fields.SFVec3f(tx * vo.x + c, tx * vo.y + s * vo.z, tx * vo.y - s * vo.z);
                var ty = (1 - c) * vo.y;
                var yaw = new x3dom.fields.SFVec3f(ty * vo.x - s * vo.z, ty * vo.y + c, ty * vo.z + s * vo.x);
                var target = vp.add(pitch.multiply(targetRight).add(yaw.multiply(targetUp)));
                viewpoint.setAttribute('position', target.toString());
            } else if (evt.buttons == 3 || evt.buttons == 4) { // both left and right button or middle button to zoom
                var tz = (1 - c) * vo.z;
                var roll = new x3dom.fields.SFVec3f(tz * vo.x + s * vo.y, tz * vo.y - s * vo.x, tz * vo.z + c);
                var target = vp.add(roll.multiply(that.lineScale * 0.5 * dy));
                viewpoint.setAttribute('position', target.toString());
                var zRotation = x3dom.fields.Quaternion.axisAngle(roll, 0.01 * dx);
                var voq = x3dom.fields.Quaternion.axisAngle(new x3dom.fields.SFVec3f(vo.x, vo.y, vo.z), vo.w);
                var aa = zRotation.multiply(voq).toAxisAngle();
                viewpoint.setAttribute('orientation', aa[0].toString() + " " + aa[1]);
            }
            that.initialMouseX = evt.clientX;
            that.initialMouseY = evt.clientY;
        }, true);
        that.x3dNode.addEventListener('mousedown', function(evt) {
            that.mouseDown = evt.buttons;
            unselect();
            that.initialMouseX = evt.clientX;
            that.initialMouseY = evt.clientY;
            if (!that.pickedPoint) {
                that.pickedPoint = new x3dom.fields.SFVec3f(0, 0, 0);
            }
        }, true);
        that.x3dNode.addEventListener('mouseup', function(evt) {
            that.mouseDown = 0;
        }, true);
        that.x3dScene.addEventListener('mousedown', function(evt) {
            var p = evt.hitPnt;
            that.pickedPoint = new x3dom.fields.SFVec3f(p[0], p[1], p[2]);
            select(getTopX3dElement(evt.target));
            if (that.onmousedown) {
                that.onmousedown(evt);
            }
        }, false);
    }
    
    function getTopX3dElement(el) {
        while (el) {
            if (el.parentNode == that.x3dScene) {
                return el;
            }
            el = el.parentNode;
        }
        return null;
    }

    function unselect() {
        if (that.selection) {
            var selectors = that.selection.getElementsByClassName("selector");
            for (var i = 0; i < selectors.length; i++) {
                var selector = selectors[i];
                selector.setAttribute('whichChoice', '-1');
            }
            that.selection = null;
        }
    }

    function select(el) {
        var selectors = el.getElementsByClassName("selector");
        for (var i = 0; i < selectors.length; i++) {
            var selector = selectors[i];
            selector.setAttribute('whichChoice', '0');
        }
        that.selection = el;
    }
}

webots.View.prototype.follow = function(id) {
    this.followObject = id;
}

webots.View.prototype.close = function() {
    if (this.server) {
        this.server.socket.close();
    }
    if (this.stream) {
      this.stream.close();
    }
}

webots.View.prototype.getControllerUrl = function(name) {
    if (!this.server) {
        return;
    }
    this.server.controllers
    var port = 0;
    for(var i = 0; i < this.server.controllers.length; i++) {
        if (this.server.controllers[i].name == name) {
            port = this.server.controllers[i].port;
            break;
        }
    }
    if (port == 0) {
        return;
    }
    return this.url.substring(0, this.url.indexOf(":", 6) + 1) + port;
} 

webots.View.prototype.setAnimation = function(url, gui, loop) {
    if (typeof gui === "undefined") {
        gui = "play";
    }
    if (typeof loop === "undefined") {
        loop = true;
    }
    this.animation = new webots.Animation(url, this, gui, loop);
}

webots.Animation = function(url, view, gui, loop) { // gui may be either "play" or "pause"
    this.url = url;
    this.view = view;
    this.gui = gui;
    this.loop = loop;
    this.sliding = false;
}

webots.Animation.prototype.init = function() {
    var that = this;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open("GET", this.url, true);
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            setup(JSON.parse(xmlhttp.responseText));
        }
    }
    xmlhttp.send();
    function setup(data) {
        that.data = data;
        var div = document.createElement("div");
        div.id = "toolBar";
        that.view.view3D.appendChild(div);
        that.button = document.createElement("button");
        that.button.id = "playPauseButton";
        var action = (that.gui == "play") ? "pause" : "play";
        that.button.style.backgroundImage = "url(" + webots.WwiUrl + action + ".png)";
        that.button.onclick = triggerPlayPauseButton;
        div.appendChild(that.button);
        var slider = document.createElement("div");
        slider.id = "playSlider";
        div.appendChild(slider);
        that.playSlider = $("#playSlider").slider({
            change: function(e, ui) { updateSlider(e, ui) },
            slide: function(e, ui) { updateSlider(e, ui) },
            start: function(e, ui) { that.sliding = true; },
            stop: function(e, ui) { that.sliding = false; }
        });
        that.start = new Date().getTime();
        that.step = 0;
        that.previousStep = 0;
        updateAnimation();
    }

    function elapsedTime() {
        var end = new Date().getTime();
        return end - that.start;
    }

    function triggerPlayPauseButton() {
        that.button.style.backgroundImage = "url(" + webots.WwiUrl + that.gui + ".png)";
        if (that.gui == "play") {
            that.gui = "pause";
            if (that.step < 0 || that.step >= that.data.frames.length) {
                that.start = new Date().getTime();
                updateAnimationState();
            } else {
                that.start = new Date().getTime() - that.data.basicTimeStep * that.step;
            }
        } else {
            that.gui = "play";
            that.start = new Date().getTime()  - that.data.basicTimeStep * that.step;
            requestAnimationFrame(updateAnimation);
        }
    }

    function connectSliderEvents() {
        that.playSlider = that.playSlider.slider({
            change: function(e, ui) { updateSlider(e, ui); },
            slide: function(e, ui) { updateSlider(e, ui); },
            start: function(e, ui) { that.sliding = true; },
            stop: function(e, ui) { that.sliding = false; }
        });
    }

    function disconnectSliderEvents() {
        that.playSlider.slider({change: null, slide: null});
    }

    function updateSlider(e, ui) {
        that.step = that.data.frames.length * ui.value / 100;
        that.start = (new Date().getTime()) - Math.floor(that.data.basicTimeStep * that.step);
        updateAnimationState();
    }

    function applyPose(pose) {
        var id = pose.id;
        el = document.getElementById(id);
        if (el) {
            for (var key in pose) {
                if (key != "id") {
                    value = pose[key];
                    el.setAttribute(key, value);
                }
            }
        }
    }

    function updateAnimationState() {
        that.step = Math.floor(elapsedTime() / that.data.basicTimeStep);
        if (that.step < 0 || that.step >= that.data.frames.length) {
            if (that.loop) {
                if (that.step > that.data.frames.length) {
                    that.step = 0;
                    that.previousStep = 0;
                    that.start = new Date().getTime();
                } else {
                    return;
                }
            } else if (that.gui == "play") {
                triggerPlayPauseButton();
                return;
            } else {
                return;
            }
        }
        var time = that.data.frames[that.step].time;
        var poses = that.data.frames[that.step].poses;
        var appliedIds = [];
        for (var p = 0; p < poses.length; p++) {
            applyPose(poses[p]);
            appliedIds[appliedIds.length] = poses[p].id;
        }
        // lookback mechanism: search in history
        if (that.step != that.previousStep + 1) {
            var allIds = that.data.ids.split(";");
            for (var i = 0; i < allIds.length; i++) {
                var id = parseInt(allIds[i]);
                if (appliedIds.indexOf(id) == -1) {
                    var found = false;
                    outer:
                    for (var f = that.step - 1; f >= 0; f--) {
                        for (var p = 0; p < that.data.frames[f].poses.length; p++) {
                            if (that.data.frames[f].poses[p].id == id) {
                                applyPose(that.data.frames[f].poses[p]);
                                found = true;
                                break outer;
                            }
                        }
                    }
                    if (!found) {
                        console.log("Lookback failed for id " + id);
                    }
                }
            }
        }
        disconnectSliderEvents();
        that.playSlider.slider('option', 'value', 100 * that.step / that.data.frames.length);
        connectSliderEvents();
        that.previousStep = that.step;
    }

    function updateAnimation() {
        if (that.gui == "play") {
            updateAnimationState();
            requestAnimationFrame(updateAnimation);
        }
    }
}

webots.Server = function(url, view, onready) {
    var that = this;
    this.view = view;
    this.onready = onready;
    // url has the following form: "ws://cyberbotics2.cyberbotics.com:1234/simple/worlds/simple.wbt"
    var n = url.indexOf("/", 6);
    var m = url.lastIndexOf("/");
    this.url = url.substring(0, n);             // e.g., "ws://cyberbotics2.cyberbotics.com:1234"
    this.project = url.substring(n + 1, m - 7); // e.g., "simple"
    this.worldFile = url.substring(m + 1);      // e.g., "simple.wbt"
    this.controllers = [];
    view.console.info("Connecting to " + this.url);
    var socket = new WebSocket(this.url + "/client");
    socket.onopen = function(evt) {
        view.console.info("Opening " + that.project + "/worlds/" + that.worldFile);
        this.send('{ "init" : [ "' + that.project + '", "' + that.worldFile + '" ] }');
    }
    socket.onclose = function(evt) {
        view.console.info("Disconnected to the Webots server.")
    }
    socket.onmessage = function(evt) {
        var message = evt.data;
        if (message.indexOf("webots:ws://") == 0) {
            that.stream = new webots.Stream(message.substring(7), that.view, that.onready);
        } else if (message.indexOf("controller:") == 0) {
            var n = message.indexOf(":", 11);
            var controller = {};
            controller.name = message.substring(11, n);
            controller.port = message.substring(n + 1);
            view.console.info("Using controller " + controller.name + " on port " + controller.port);
            that.controllers.push(controller);
        } else if (message.indexOf("queue:") == 0) {
            view.console.error("The server is saturated. Queue to wait: " + message.substring(6) + " client(s).");
        } else if (message == ".") { // received every 5 seconds when Webots is running
            // nothing to do
        } else {
            console.log('Received an unknown message from the Webots server socket: "' + message + '"');
        }
    }
    socket.onerror = function(evt) {
        view.console.error("Cannot connect to the simulation server");
    }
}

webots.Stream = function(url, view, onready) {
    var that = this;
    this.view = view;
    this.onready = onready;

    view.console.info("Connecting to Webots instance at " + url);
    this.socket = new WebSocket(url);
    this.socket.onclose = function(evt) {
        destroyWorld();
        view.onerror("Disconnected from " + url);
        if (view.onclose) {
            view.onclose();
        }
    }
    this.socket.onmessage = function(evt) {
        var data = evt.data;
        if (data.startsWith("application/json:")) {
            data = data.substring(data.indexOf(":") + 1);
            var frame = JSON.parse(data);
            for (var i = 0; i < frame.poses.length; i++) {
                applyPose(frame.poses[i]);
            }
        } else if (data.startsWith("node:")) {
            data = data.substring(data.indexOf(":") + 1);
            var parser = new DOMParser();
            var x3d = parser.parseFromString(data, "text/xml").children[0];
            that.view.x3dScene.appendChild(x3d);
        } else if (data.startsWith("delete:")) {
            data = data.substring(data.indexOf(":") + 1).trim();
            var itemToDelete = document.getElementById(data);
            if (itemToDelete) {
                if (that.selection == itemToDelete) {
                    that.selection = null;
                }
                itemToDelete.parentElement.removeChild(itemToDelete);
            }
        } else if (data.startsWith("model:")) {
            view.console.info("Receiving model");
            destroyWorld();
            data = data.substring(data.indexOf(":") + 1).trim();
            if (!data) {
                // received an empty model case: just destroy the view
                return;
            }
            var parser = new DOMParser();
            var x3d = parser.parseFromString(data, "text/xml");
            var scene = x3d.getElementsByTagName("Scene")[0];
            if (scene) {
                while (scene.hasChildNodes()) {
                    that.view.x3dScene.appendChild(scene.removeChild(scene.firstChild));
                }
            }
            if (that.onready)
                that.onready();
        } else if (data.startsWith("image")) {
            textureUrl = data.substring(data.indexOf("[") + 1, data.indexOf("]"));
            data = data.substring(data.indexOf(":") + 1);
            view.console.info("Receiving image: " + textureUrl);
            // replace in ImageTexture nodes
            var textures = that.view.x3dScene.getElementsByTagName("ImageTexture");
            for (var i = 0; i < textures.length; i++) {
                texture = textures[i];
                if (texture.getAttribute("url") == ('"' + textureUrl + '"')) {
                    texture.setAttribute("url", data);
                }
            }

            // replace in Background nodes
            var backgrounds = that.view.x3dScene.getElementsByTagName("Background");
            var backgroundUrlFieldNames = ["frontUrl", "backUrl", "leftUrl", "rightUrl", "topUrl", "bottomUrl"];
            for (var i = 0; i < backgrounds.length; i++) {
                background = backgrounds[i];
                for (var j = 0; j < backgroundUrlFieldNames.length; j++) {
                    backgroundUrlFieldName = backgroundUrlFieldNames[j];
                    if (background.getAttribute(backgroundUrlFieldName) == ('"' + textureUrl + '"')) {
                        background.setAttribute(backgroundUrlFieldName, data);
                    }
                }
            }
        } else if (data.startsWith("stdout:")) {
            view.console.stdout(data.substring(7));
        } else if (data.startsWith("stderr:")) {
            view.console.stderr(data.substring(7));
        } else {
            console.log("WebSocket error: Unknown message received");
        }
    }
    this.socket.onerror = function(evt) {
        destroyWorld();
        view.onerror("WebSocket error: " + evt.data);
    }
    function destroyWorld() {
        that.view.selection = null;
        if (that.view.x3dScene) {
            while (that.view.x3dScene.hasChildNodes()) {
                that.view.x3dScene.removeChild(that.view.x3dScene.firstChild);
            }
        }
    }
    function applyPose(pose) {
        var id = pose.id;
        el = document.getElementById(id);
        if (el && !el.getAttribute('blockWebotsUpdate')) {
            for (var key in pose) {
                var p;
                var followMe;
                if (that.view.followObject && el.getAttribute('DEF') == that.view.followObject && key == 'translation') {
                    followMe = true;
                    p = x3dom.fields.SFVec3f.parse(el.getAttribute('translation'));
                } else {
                    followMe = false;
                }
                if (key != "id") {
                    el.setAttribute(key, pose[key]);
                }
                if (followMe) {
                    var viewpoints = that.view.x3dScene.getElementsByTagName("Viewpoint");
                    if (viewpoints[0]) {
                        var v = x3dom.fields.SFVec3f.parse(viewpoints[0].getAttribute('position'));
                        var n = x3dom.fields.SFVec3f.parse(pose[key]);
                        var r = v.add(n).subtract(p);
                        viewpoints[0].setAttribute('position', r.toString());
                    }
                }
            }
        }
    }
}

webots.Stream.prototype.close = function() {
    if (this.socket) {
        this.socket.close();
    }
}

webots.Console = function(panel) {
    if (typeof panel === "undefined") {
        this.panel = null;
    } else {
        this.panel = panel;
        this.panel.className = panel.className + " webotsConsole";
    }
}
 
webots.Console.prototype.scrollDown = function() {
    if (this.panel)
        this.panel.scrollTop = this.panel.scrollHeight;
}

webots.Console.prototype.clear = function() {
    if (this.panel) {
        while (this.panel.firstChild) {
            this.panel.removeChild(this.panel.firstChild);
        }
    } else {
        console.clear();
    }
}

webots.Console.prototype.log = function(message, type) {
    var para = document.createElement("p");
    
    var style = 'margin:0;';
    var title = ''
    switch(type) {
    case 0:
        style += 'color:Blue;';
        title = 'Webots stdout';
        break;
    case 1:
        style += 'color:Red;';
        title = 'Webots stderr';
        break;
    case 2:
        style += 'color:Gray;';
        title = 'info';
        break;
    case 3:
        style += 'color:Salmon;';
        title = 'error';
        break;
    }
    if (this.panel) {
        para.style.cssText = style;
        para.title = title + " (" + hourString() + ")";
        var t = document.createTextNode(message);
        para.appendChild(t);
        this.panel.appendChild(para);
        this.scrollDown();
    } else {
        console.log("%c" + message, style);
    }
    function hourString() {
        var d = new Date();
        return d.getHours() + ':' +
             ((d.getMinutes() < 10) ? '0' : '') + d.getMinutes() + ':' +
             ((d.getSeconds() < 10) ? '0' : '') + d.getSeconds();
    }
}

webots.Console.prototype.stdout = function(message) {
    this.log(message, 0)
}

webots.Console.prototype.stderr = function(message) {
    this.log(message, 1)
}

webots.Console.prototype.info = function(message) {
    this.log(message, 2)
}

webots.Console.prototype.error = function(message) {
    this.log(message, 3)
}

webots.defaultPort = function() {
    var a = document.createElement('a');
    a.href = window.location.href;
    return a.port;
}

webots.defaultServer = function() {
    var a = document.createElement('a');
    a.href = window.location.href;
    return a.hostname;
}

webots.defaultUrl = function() {
    var a = document.createElement('a');
    a.href = window.location.href;
    return "ws://" + a.hostname + ":" + a.port;
}

// add startsWith() and endsWith() functions to the String prototype
if (typeof String.prototype.startsWith != "function") {
    String.prototype.startsWith = function (prefix) {
        return this.slice(0, prefix.length) == prefix;
    }
}

if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function (suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}
