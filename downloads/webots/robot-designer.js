"use strict";

/**
 * @author qiao / https://github.com/qiao
 * @author mrdoob / http://mrdoob.com
 * @author alteredq / http://alteredqualia.com/
 * @author WestLangley / http://github.com/WestLangley
 * @author erich666 / http://erichaines.com
 */
// This set of controls performs orbiting, dollying (zooming), and panning.
// Unlike TrackballControls, it maintains the "up" direction object.up (+Y by default).
//
//    Orbit - left mouse / touch: one-finger move
//    Zoom - middle mouse, or mousewheel / touch: two-finger spread or squish
//    Pan - right mouse, or left mouse + ctrl/meta/shiftKey, or arrow keys / touch: two-finger move
THREE.OrbitControls = function (object, domElement) {
  this.object = object;
  this.domElement = domElement !== undefined ? domElement : document; // Set to false to disable this control

  this.enabled = true; // "target" sets the location of focus, where the object orbits around

  this.target = new THREE.Vector3(); // How far you can dolly in and out ( PerspectiveCamera only )

  this.minDistance = 0;
  this.maxDistance = Infinity; // How far you can zoom in and out ( OrthographicCamera only )

  this.minZoom = 0;
  this.maxZoom = Infinity; // How far you can orbit vertically, upper and lower limits.
  // Range is 0 to Math.PI radians.

  this.minPolarAngle = 0; // radians

  this.maxPolarAngle = Math.PI; // radians
  // How far you can orbit horizontally, upper and lower limits.
  // If set, must be a sub-interval of the interval [ - Math.PI, Math.PI ].

  this.minAzimuthAngle = -Infinity; // radians

  this.maxAzimuthAngle = Infinity; // radians
  // Set to true to enable damping (inertia)
  // If damping is enabled, you must call controls.update() in your animation loop

  this.enableDamping = false;
  this.dampingFactor = 0.25; // This option actually enables dollying in and out; left as "zoom" for backwards compatibility.
  // Set to false to disable zooming

  this.enableZoom = true;
  this.zoomSpeed = 1.0; // Set to false to disable rotating

  this.enableRotate = true;
  this.rotateSpeed = 1.0; // Set to false to disable panning

  this.enablePan = true;
  this.panSpeed = 1.0;
  this.screenSpacePanning = false; // if true, pan in screen-space

  this.keyPanSpeed = 7.0; // pixels moved per arrow key push
  // Set to true to automatically rotate around the target
  // If auto-rotate is enabled, you must call controls.update() in your animation loop

  this.autoRotate = false;
  this.autoRotateSpeed = 2.0; // 30 seconds per round when fps is 60
  // Set to false to disable use of the keys

  this.enableKeys = true; // The four arrow keys

  this.keys = {
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    BOTTOM: 40
  }; // Mouse buttons

  this.mouseButtons = {
    LEFT: THREE.MOUSE.LEFT,
    MIDDLE: THREE.MOUSE.MIDDLE,
    RIGHT: THREE.MOUSE.RIGHT
  }; // for reset

  this.target0 = this.target.clone();
  this.position0 = this.object.position.clone();
  this.zoom0 = this.object.zoom; //
  // public methods
  //

  this.getPolarAngle = function () {
    return spherical.phi;
  };

  this.getAzimuthalAngle = function () {
    return spherical.theta;
  };

  this.saveState = function () {
    scope.target0.copy(scope.target);
    scope.position0.copy(scope.object.position);
    scope.zoom0 = scope.object.zoom;
  };

  this.reset = function () {
    scope.target.copy(scope.target0);
    scope.object.position.copy(scope.position0);
    scope.object.zoom = scope.zoom0;
    scope.object.updateProjectionMatrix();
    scope.dispatchEvent(changeEvent);
    scope.update();
    state = STATE.NONE;
  }; // this method is exposed, but perhaps it would be better if we can make it private...


  this.update = function () {
    var offset = new THREE.Vector3(); // so camera.up is the orbit axis

    var quat = new THREE.Quaternion().setFromUnitVectors(object.up, new THREE.Vector3(0, 1, 0));
    var quatInverse = quat.clone().inverse();
    var lastPosition = new THREE.Vector3();
    var lastQuaternion = new THREE.Quaternion();
    return function update() {
      var position = scope.object.position;
      offset.copy(position).sub(scope.target); // rotate offset to "y-axis-is-up" space

      offset.applyQuaternion(quat); // angle from z-axis around y-axis

      spherical.setFromVector3(offset);

      if (scope.autoRotate && state === STATE.NONE) {
        rotateLeft(getAutoRotationAngle());
      }

      spherical.theta += sphericalDelta.theta;
      spherical.phi += sphericalDelta.phi; // restrict theta to be between desired limits

      spherical.theta = Math.max(scope.minAzimuthAngle, Math.min(scope.maxAzimuthAngle, spherical.theta)); // restrict phi to be between desired limits

      spherical.phi = Math.max(scope.minPolarAngle, Math.min(scope.maxPolarAngle, spherical.phi));
      spherical.makeSafe();
      spherical.radius *= scale; // restrict radius to be between desired limits

      spherical.radius = Math.max(scope.minDistance, Math.min(scope.maxDistance, spherical.radius)); // move target to panned location

      scope.target.add(panOffset);
      offset.setFromSpherical(spherical); // rotate offset back to "camera-up-vector-is-up" space

      offset.applyQuaternion(quatInverse);
      position.copy(scope.target).add(offset);
      scope.object.lookAt(scope.target);

      if (scope.enableDamping === true) {
        sphericalDelta.theta *= 1 - scope.dampingFactor;
        sphericalDelta.phi *= 1 - scope.dampingFactor;
        panOffset.multiplyScalar(1 - scope.dampingFactor);
      } else {
        sphericalDelta.set(0, 0, 0);
        panOffset.set(0, 0, 0);
      }

      scale = 1; // update condition is:
      // min(camera displacement, camera rotation in radians)^2 > EPS
      // using small-angle approximation cos(x/2) = 1 - x^2 / 8

      if (zoomChanged || lastPosition.distanceToSquared(scope.object.position) > EPS || 8 * (1 - lastQuaternion.dot(scope.object.quaternion)) > EPS) {
        scope.dispatchEvent(changeEvent);
        lastPosition.copy(scope.object.position);
        lastQuaternion.copy(scope.object.quaternion);
        zoomChanged = false;
        return true;
      }

      return false;
    };
  }();

  this.dispose = function () {
    scope.domElement.removeEventListener('contextmenu', onContextMenu, false);
    scope.domElement.removeEventListener('mousedown', onMouseDown, false);
    scope.domElement.removeEventListener('wheel', onMouseWheel, false);
    scope.domElement.removeEventListener('touchstart', onTouchStart, false);
    scope.domElement.removeEventListener('touchend', onTouchEnd, false);
    scope.domElement.removeEventListener('touchmove', onTouchMove, false);
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    window.removeEventListener('keydown', onKeyDown, false); //scope.dispatchEvent( { type: 'dispose' } ); // should this be added here?
  }; //
  // internals
  //


  var scope = this;
  var changeEvent = {
    type: 'change'
  };
  var startEvent = {
    type: 'start'
  };
  var endEvent = {
    type: 'end'
  };
  var STATE = {
    NONE: -1,
    ROTATE: 0,
    DOLLY: 1,
    PAN: 2,
    TOUCH_ROTATE: 3,
    TOUCH_DOLLY_PAN: 4
  };
  var state = STATE.NONE;
  var EPS = 0.000001; // current position in spherical coordinates

  var spherical = new THREE.Spherical();
  var sphericalDelta = new THREE.Spherical();
  var scale = 1;
  var panOffset = new THREE.Vector3();
  var zoomChanged = false;
  var rotateStart = new THREE.Vector2();
  var rotateEnd = new THREE.Vector2();
  var rotateDelta = new THREE.Vector2();
  var panStart = new THREE.Vector2();
  var panEnd = new THREE.Vector2();
  var panDelta = new THREE.Vector2();
  var dollyStart = new THREE.Vector2();
  var dollyEnd = new THREE.Vector2();
  var dollyDelta = new THREE.Vector2();

  function getAutoRotationAngle() {
    return 2 * Math.PI / 60 / 60 * scope.autoRotateSpeed;
  }

  function getZoomScale() {
    return Math.pow(0.95, scope.zoomSpeed);
  }

  function rotateLeft(angle) {
    sphericalDelta.theta -= angle;
  }

  function rotateUp(angle) {
    sphericalDelta.phi -= angle;
  }

  var panLeft = function () {
    var v = new THREE.Vector3();
    return function panLeft(distance, objectMatrix) {
      v.setFromMatrixColumn(objectMatrix, 0); // get X column of objectMatrix

      v.multiplyScalar(-distance);
      panOffset.add(v);
    };
  }();

  var panUp = function () {
    var v = new THREE.Vector3();
    return function panUp(distance, objectMatrix) {
      if (scope.screenSpacePanning === true) {
        v.setFromMatrixColumn(objectMatrix, 1);
      } else {
        v.setFromMatrixColumn(objectMatrix, 0);
        v.crossVectors(scope.object.up, v);
      }

      v.multiplyScalar(distance);
      panOffset.add(v);
    };
  }(); // deltaX and deltaY are in pixels; right and down are positive


  var pan = function () {
    var offset = new THREE.Vector3();
    return function pan(deltaX, deltaY) {
      var element = scope.domElement === document ? scope.domElement.body : scope.domElement;

      if (scope.object.isPerspectiveCamera) {
        // perspective
        var position = scope.object.position;
        offset.copy(position).sub(scope.target);
        var targetDistance = offset.length(); // half of the fov is center to top of screen

        targetDistance *= Math.tan(scope.object.fov / 2 * Math.PI / 180.0); // we use only clientHeight here so aspect ratio does not distort speed

        panLeft(2 * deltaX * targetDistance / element.clientHeight, scope.object.matrix);
        panUp(2 * deltaY * targetDistance / element.clientHeight, scope.object.matrix);
      } else if (scope.object.isOrthographicCamera) {
        // orthographic
        panLeft(deltaX * (scope.object.right - scope.object.left) / scope.object.zoom / element.clientWidth, scope.object.matrix);
        panUp(deltaY * (scope.object.top - scope.object.bottom) / scope.object.zoom / element.clientHeight, scope.object.matrix);
      } else {
        // camera neither orthographic nor perspective
        console.warn('WARNING: OrbitControls.js encountered an unknown camera type - pan disabled.');
        scope.enablePan = false;
      }
    };
  }();

  function dollyIn(dollyScale) {
    if (scope.object.isPerspectiveCamera) {
      scale /= dollyScale;
    } else if (scope.object.isOrthographicCamera) {
      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom * dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;
    }
  }

  function dollyOut(dollyScale) {
    if (scope.object.isPerspectiveCamera) {
      scale *= dollyScale;
    } else if (scope.object.isOrthographicCamera) {
      scope.object.zoom = Math.max(scope.minZoom, Math.min(scope.maxZoom, scope.object.zoom / dollyScale));
      scope.object.updateProjectionMatrix();
      zoomChanged = true;
    } else {
      console.warn('WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled.');
      scope.enableZoom = false;
    }
  } //
  // event callbacks - update the object state
  //


  function handleMouseDownRotate(event) {
    //console.log( 'handleMouseDownRotate' );
    rotateStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownDolly(event) {
    //console.log( 'handleMouseDownDolly' );
    dollyStart.set(event.clientX, event.clientY);
  }

  function handleMouseDownPan(event) {
    //console.log( 'handleMouseDownPan' );
    panStart.set(event.clientX, event.clientY);
  }

  function handleMouseMoveRotate(event) {
    //console.log( 'handleMouseMoveRotate' );
    rotateEnd.set(event.clientX, event.clientY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
    rotateStart.copy(rotateEnd);
    scope.update();
  }

  function handleMouseMoveDolly(event) {
    //console.log( 'handleMouseMoveDolly' );
    dollyEnd.set(event.clientX, event.clientY);
    dollyDelta.subVectors(dollyEnd, dollyStart);

    if (dollyDelta.y > 0) {
      dollyIn(getZoomScale());
    } else if (dollyDelta.y < 0) {
      dollyOut(getZoomScale());
    }

    dollyStart.copy(dollyEnd);
    scope.update();
  }

  function handleMouseMovePan(event) {
    //console.log( 'handleMouseMovePan' );
    panEnd.set(event.clientX, event.clientY);
    panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
    pan(panDelta.x, panDelta.y);
    panStart.copy(panEnd);
    scope.update();
  }

  function handleMouseUp(event) {// console.log( 'handleMouseUp' );
  }

  function handleMouseWheel(event) {
    // console.log( 'handleMouseWheel' );
    if (event.deltaY < 0) {
      dollyOut(getZoomScale());
    } else if (event.deltaY > 0) {
      dollyIn(getZoomScale());
    }

    scope.update();
  }

  function handleKeyDown(event) {
    // console.log( 'handleKeyDown' );
    var needsUpdate = false;

    switch (event.keyCode) {
      case scope.keys.UP:
        pan(0, scope.keyPanSpeed);
        needsUpdate = true;
        break;

      case scope.keys.BOTTOM:
        pan(0, -scope.keyPanSpeed);
        needsUpdate = true;
        break;

      case scope.keys.LEFT:
        pan(scope.keyPanSpeed, 0);
        needsUpdate = true;
        break;

      case scope.keys.RIGHT:
        pan(-scope.keyPanSpeed, 0);
        needsUpdate = true;
        break;
    }

    if (needsUpdate) {
      // prevent the browser from scrolling on cursor keys
      event.preventDefault();
      scope.update();
    }
  }

  function handleTouchStartRotate(event) {
    //console.log( 'handleTouchStartRotate' );
    rotateStart.set(event.touches[0].pageX, event.touches[0].pageY);
  }

  function handleTouchStartDollyPan(event) {
    //console.log( 'handleTouchStartDollyPan' );
    if (scope.enableZoom) {
      var dx = event.touches[0].pageX - event.touches[1].pageX;
      var dy = event.touches[0].pageY - event.touches[1].pageY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      dollyStart.set(0, distance);
    }

    if (scope.enablePan) {
      var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      panStart.set(x, y);
    }
  }

  function handleTouchMoveRotate(event) {
    //console.log( 'handleTouchMoveRotate' );
    rotateEnd.set(event.touches[0].pageX, event.touches[0].pageY);
    rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(scope.rotateSpeed);
    var element = scope.domElement === document ? scope.domElement.body : scope.domElement;
    rotateLeft(2 * Math.PI * rotateDelta.x / element.clientHeight); // yes, height

    rotateUp(2 * Math.PI * rotateDelta.y / element.clientHeight);
    rotateStart.copy(rotateEnd);
    scope.update();
  }

  function handleTouchMoveDollyPan(event) {
    //console.log( 'handleTouchMoveDollyPan' );
    if (scope.enableZoom) {
      var dx = event.touches[0].pageX - event.touches[1].pageX;
      var dy = event.touches[0].pageY - event.touches[1].pageY;
      var distance = Math.sqrt(dx * dx + dy * dy);
      dollyEnd.set(0, distance);
      dollyDelta.set(0, Math.pow(dollyEnd.y / dollyStart.y, scope.zoomSpeed));
      dollyIn(dollyDelta.y);
      dollyStart.copy(dollyEnd);
    }

    if (scope.enablePan) {
      var x = 0.5 * (event.touches[0].pageX + event.touches[1].pageX);
      var y = 0.5 * (event.touches[0].pageY + event.touches[1].pageY);
      panEnd.set(x, y);
      panDelta.subVectors(panEnd, panStart).multiplyScalar(scope.panSpeed);
      pan(panDelta.x, panDelta.y);
      panStart.copy(panEnd);
    }

    scope.update();
  }

  function handleTouchEnd(event) {} //console.log( 'handleTouchEnd' );
  //
  // event handlers - FSM: listen for events and reset state
  //


  function onMouseDown(event) {
    if (scope.enabled === false) return; // Prevent the browser from scrolling.

    event.preventDefault(); // Manually set the focus since calling preventDefault above
    // prevents the browser from setting it automatically.

    scope.domElement.focus ? scope.domElement.focus() : window.focus();

    switch (event.button) {
      case scope.mouseButtons.LEFT:
        if (event.ctrlKey || event.metaKey || event.shiftKey) {
          if (scope.enablePan === false) return;
          handleMouseDownPan(event);
          state = STATE.PAN;
        } else {
          if (scope.enableRotate === false) return;
          handleMouseDownRotate(event);
          state = STATE.ROTATE;
        }

        break;

      case scope.mouseButtons.MIDDLE:
        if (scope.enableZoom === false) return;
        handleMouseDownDolly(event);
        state = STATE.DOLLY;
        break;

      case scope.mouseButtons.RIGHT:
        if (scope.enablePan === false) return;
        handleMouseDownPan(event);
        state = STATE.PAN;
        break;
    }

    if (state !== STATE.NONE) {
      document.addEventListener('mousemove', onMouseMove, false);
      document.addEventListener('mouseup', onMouseUp, false);
      scope.dispatchEvent(startEvent);
    }
  }

  function onMouseMove(event) {
    if (scope.enabled === false) return;
    event.preventDefault();

    switch (state) {
      case STATE.ROTATE:
        if (scope.enableRotate === false) return;
        handleMouseMoveRotate(event);
        break;

      case STATE.DOLLY:
        if (scope.enableZoom === false) return;
        handleMouseMoveDolly(event);
        break;

      case STATE.PAN:
        if (scope.enablePan === false) return;
        handleMouseMovePan(event);
        break;
    }
  }

  function onMouseUp(event) {
    if (scope.enabled === false) return;
    handleMouseUp(event);
    document.removeEventListener('mousemove', onMouseMove, false);
    document.removeEventListener('mouseup', onMouseUp, false);
    scope.dispatchEvent(endEvent);
    state = STATE.NONE;
  }

  function onMouseWheel(event) {
    if (scope.enabled === false || scope.enableZoom === false || state !== STATE.NONE && state !== STATE.ROTATE) return;
    event.preventDefault();
    event.stopPropagation();
    scope.dispatchEvent(startEvent);
    handleMouseWheel(event);
    scope.dispatchEvent(endEvent);
  }

  function onKeyDown(event) {
    if (scope.enabled === false || scope.enableKeys === false || scope.enablePan === false) return;
    handleKeyDown(event);
  }

  function onTouchStart(event) {
    if (scope.enabled === false) return;
    event.preventDefault();

    switch (event.touches.length) {
      case 1:
        // one-fingered touch: rotate
        if (scope.enableRotate === false) return;
        handleTouchStartRotate(event);
        state = STATE.TOUCH_ROTATE;
        break;

      case 2:
        // two-fingered touch: dolly-pan
        if (scope.enableZoom === false && scope.enablePan === false) return;
        handleTouchStartDollyPan(event);
        state = STATE.TOUCH_DOLLY_PAN;
        break;

      default:
        state = STATE.NONE;
    }

    if (state !== STATE.NONE) {
      scope.dispatchEvent(startEvent);
    }
  }

  function onTouchMove(event) {
    if (scope.enabled === false) return;
    event.preventDefault();
    event.stopPropagation();

    switch (event.touches.length) {
      case 1:
        // one-fingered touch: rotate
        if (scope.enableRotate === false) return;
        if (state !== STATE.TOUCH_ROTATE) return; // is this needed?

        handleTouchMoveRotate(event);
        break;

      case 2:
        // two-fingered touch: dolly-pan
        if (scope.enableZoom === false && scope.enablePan === false) return;
        if (state !== STATE.TOUCH_DOLLY_PAN) return; // is this needed?

        handleTouchMoveDollyPan(event);
        break;

      default:
        state = STATE.NONE;
    }
  }

  function onTouchEnd(event) {
    if (scope.enabled === false) return;
    handleTouchEnd(event);
    scope.dispatchEvent(endEvent);
    state = STATE.NONE;
  }

  function onContextMenu(event) {
    if (scope.enabled === false) return;
    event.preventDefault();
  } //


  scope.domElement.addEventListener('contextmenu', onContextMenu, false);
  scope.domElement.addEventListener('mousedown', onMouseDown, false);
  scope.domElement.addEventListener('wheel', onMouseWheel, false);
  scope.domElement.addEventListener('touchstart', onTouchStart, false);
  scope.domElement.addEventListener('touchend', onTouchEnd, false);
  scope.domElement.addEventListener('touchmove', onTouchMove, false);
  window.addEventListener('keydown', onKeyDown, false); // force an update at start

  this.update();
};

THREE.OrbitControls.prototype = Object.create(THREE.EventDispatcher.prototype);
THREE.OrbitControls.prototype.constructor = THREE.OrbitControls;
Object.defineProperties(THREE.OrbitControls.prototype, {
  center: {
    get: function get() {
      console.warn('THREE.OrbitControls: .center has been renamed to .target');
      return this.target;
    }
  },
  // backward compatibility
  noZoom: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      return !this.enableZoom;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noZoom has been deprecated. Use .enableZoom instead.');
      this.enableZoom = !value;
    }
  },
  noRotate: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      return !this.enableRotate;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noRotate has been deprecated. Use .enableRotate instead.');
      this.enableRotate = !value;
    }
  },
  noPan: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      return !this.enablePan;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noPan has been deprecated. Use .enablePan instead.');
      this.enablePan = !value;
    }
  },
  noKeys: {
    get: function get() {
      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      return !this.enableKeys;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .noKeys has been deprecated. Use .enableKeys instead.');
      this.enableKeys = !value;
    }
  },
  staticMoving: {
    get: function get() {
      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      return !this.enableDamping;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .staticMoving has been deprecated. Use .enableDamping instead.');
      this.enableDamping = !value;
    }
  },
  dynamicDampingFactor: {
    get: function get() {
      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      return this.dampingFactor;
    },
    set: function set(value) {
      console.warn('THREE.OrbitControls: .dynamicDampingFactor has been renamed. Use .dampingFactor instead.');
      this.dampingFactor = value;
    }
  }
});
"use strict";

/**
 * @author Nikos M. / https://github.com/foo123/
 */
// https://github.com/mrdoob/three.js/issues/5552
// http://en.wikipedia.org/wiki/RGBE_image_format
THREE.RGBELoader = function (manager) {
  this.manager = manager !== undefined ? manager : THREE.DefaultLoadingManager;
  this.type = THREE.UnsignedByteType;
}; // extend THREE.DataTextureLoader


THREE.RGBELoader.prototype = Object.create(THREE.DataTextureLoader.prototype); // adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html

THREE.RGBELoader.prototype._parser = function (buffer) {
  var
  /* return codes for rgbe routines */
  RGBE_RETURN_SUCCESS = 0,
      RGBE_RETURN_FAILURE = -1,

  /* default error routine.  change this to change error handling */
  rgbe_read_error = 1,
      rgbe_write_error = 2,
      rgbe_format_error = 3,
      rgbe_memory_error = 4,
      rgbe_error = function rgbe_error(rgbe_error_code, msg) {
    switch (rgbe_error_code) {
      case rgbe_read_error:
        console.error("THREE.RGBELoader Read Error: " + (msg || ''));
        break;

      case rgbe_write_error:
        console.error("THREE.RGBELoader Write Error: " + (msg || ''));
        break;

      case rgbe_format_error:
        console.error("THREE.RGBELoader Bad File Format: " + (msg || ''));
        break;

      default:
      case rgbe_memory_error:
        console.error("THREE.RGBELoader: Error: " + (msg || ''));
    }

    return RGBE_RETURN_FAILURE;
  },

  /* offsets to red, green, and blue components in a data (float) pixel */
  RGBE_DATA_RED = 0,
      RGBE_DATA_GREEN = 1,
      RGBE_DATA_BLUE = 2,

  /* number of floats per pixel, use 4 since stored in rgba image format */
  RGBE_DATA_SIZE = 4,

  /* flags indicating which fields in an rgbe_header_info are valid */
  RGBE_VALID_PROGRAMTYPE = 1,
      RGBE_VALID_FORMAT = 2,
      RGBE_VALID_DIMENSIONS = 4,
      NEWLINE = "\n",
      fgets = function fgets(buffer, lineLimit, consume) {
    lineLimit = !lineLimit ? 1024 : lineLimit;
    var p = buffer.pos,
        i = -1,
        len = 0,
        s = '',
        chunkSize = 128,
        chunk = String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));

    while (0 > (i = chunk.indexOf(NEWLINE)) && len < lineLimit && p < buffer.byteLength) {
      s += chunk;
      len += chunk.length;
      p += chunkSize;
      chunk += String.fromCharCode.apply(null, new Uint16Array(buffer.subarray(p, p + chunkSize)));
    }

    if (-1 < i) {
      /*for (i=l-1; i>=0; i--) {
      	byteCode = m.charCodeAt(i);
      	if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
      	else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
      	if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
      }*/
      if (false !== consume) buffer.pos += len + i + 1;
      return s + chunk.slice(0, i);
    }

    return false;
  },

  /* minimal header reading.  modify if you want to parse more information */
  RGBE_ReadHeader = function RGBE_ReadHeader(buffer) {
    var line,
        match,
        // regexes to parse header info fields
    magic_token_re = /^#\?(\S+)$/,
        gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
        exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
        format_re = /^\s*FORMAT=(\S+)\s*$/,
        dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,
        // RGBE format header struct
    header = {
      valid: 0,

      /* indicate which fields are valid */
      string: '',

      /* the actual header string */
      comments: '',

      /* comments found in header */
      programtype: 'RGBE',

      /* listed at beginning of file to identify it after "#?". defaults to "RGBE" */
      format: '',

      /* RGBE format, default 32-bit_rle_rgbe */
      gamma: 1.0,

      /* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */
      exposure: 1.0,

      /* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */
      width: 0,
      height: 0
      /* image dimensions, width/height */

    };

    if (buffer.pos >= buffer.byteLength || !(line = fgets(buffer))) {
      return rgbe_error(rgbe_read_error, "no header found");
    }
    /* if you want to require the magic token then uncomment the next line */


    if (!(match = line.match(magic_token_re))) {
      return rgbe_error(rgbe_format_error, "bad initial token");
    }

    header.valid |= RGBE_VALID_PROGRAMTYPE;
    header.programtype = match[1];
    header.string += line + "\n";

    while (true) {
      line = fgets(buffer);
      if (false === line) break;
      header.string += line + "\n";

      if ('#' === line.charAt(0)) {
        header.comments += line + "\n";
        continue; // comment line
      }

      if (match = line.match(gamma_re)) {
        header.gamma = parseFloat(match[1], 10);
      }

      if (match = line.match(exposure_re)) {
        header.exposure = parseFloat(match[1], 10);
      }

      if (match = line.match(format_re)) {
        header.valid |= RGBE_VALID_FORMAT;
        header.format = match[1]; //'32-bit_rle_rgbe';
      }

      if (match = line.match(dimensions_re)) {
        header.valid |= RGBE_VALID_DIMENSIONS;
        header.height = parseInt(match[1], 10);
        header.width = parseInt(match[2], 10);
      }

      if (header.valid & RGBE_VALID_FORMAT && header.valid & RGBE_VALID_DIMENSIONS) break;
    }

    if (!(header.valid & RGBE_VALID_FORMAT)) {
      return rgbe_error(rgbe_format_error, "missing format specifier");
    }

    if (!(header.valid & RGBE_VALID_DIMENSIONS)) {
      return rgbe_error(rgbe_format_error, "missing image size specifier");
    }

    return header;
  },
      RGBE_ReadPixels_RLE = function RGBE_ReadPixels_RLE(buffer, w, h) {
    var data_rgba,
        offset,
        pos,
        count,
        byteValue,
        scanline_buffer,
        ptr,
        ptr_end,
        i,
        l,
        off,
        isEncodedRun,
        scanline_width = w,
        num_scanlines = h,
        rgbeStart;

    if ( // run length encoding is not allowed so read flat
    scanline_width < 8 || scanline_width > 0x7fff || // this file is not run length encoded
    2 !== buffer[0] || 2 !== buffer[1] || buffer[2] & 0x80) {
      // return the flat buffer
      return new Uint8Array(buffer);
    }

    if (scanline_width !== (buffer[2] << 8 | buffer[3])) {
      return rgbe_error(rgbe_format_error, "wrong scanline width");
    }

    data_rgba = new Uint8Array(4 * w * h);

    if (!data_rgba || !data_rgba.length) {
      return rgbe_error(rgbe_memory_error, "unable to allocate buffer space");
    }

    offset = 0;
    pos = 0;
    ptr_end = 4 * scanline_width;
    rgbeStart = new Uint8Array(4);
    scanline_buffer = new Uint8Array(ptr_end); // read in each successive scanline

    while (num_scanlines > 0 && pos < buffer.byteLength) {
      if (pos + 4 > buffer.byteLength) {
        return rgbe_error(rgbe_read_error);
      }

      rgbeStart[0] = buffer[pos++];
      rgbeStart[1] = buffer[pos++];
      rgbeStart[2] = buffer[pos++];
      rgbeStart[3] = buffer[pos++];

      if (2 != rgbeStart[0] || 2 != rgbeStart[1] || (rgbeStart[2] << 8 | rgbeStart[3]) != scanline_width) {
        return rgbe_error(rgbe_format_error, "bad rgbe scanline format");
      } // read each of the four channels for the scanline into the buffer
      // first red, then green, then blue, then exponent


      ptr = 0;

      while (ptr < ptr_end && pos < buffer.byteLength) {
        count = buffer[pos++];
        isEncodedRun = count > 128;
        if (isEncodedRun) count -= 128;

        if (0 === count || ptr + count > ptr_end) {
          return rgbe_error(rgbe_format_error, "bad scanline data");
        }

        if (isEncodedRun) {
          // a (encoded) run of the same value
          byteValue = buffer[pos++];

          for (i = 0; i < count; i++) {
            scanline_buffer[ptr++] = byteValue;
          } //ptr += count;

        } else {
          // a literal-run
          scanline_buffer.set(buffer.subarray(pos, pos + count), ptr);
          ptr += count;
          pos += count;
        }
      } // now convert data from buffer into rgba
      // first red, then green, then blue, then exponent (alpha)


      l = scanline_width; //scanline_buffer.byteLength;

      for (i = 0; i < l; i++) {
        off = 0;
        data_rgba[offset] = scanline_buffer[i + off];
        off += scanline_width; //1;

        data_rgba[offset + 1] = scanline_buffer[i + off];
        off += scanline_width; //1;

        data_rgba[offset + 2] = scanline_buffer[i + off];
        off += scanline_width; //1;

        data_rgba[offset + 3] = scanline_buffer[i + off];
        offset += 4;
      }

      num_scanlines--;
    }

    return data_rgba;
  };

  var byteArray = new Uint8Array(buffer);
  byteArray.pos = 0;
  var rgbe_header_info = RGBE_ReadHeader(byteArray);

  if (RGBE_RETURN_FAILURE !== rgbe_header_info) {
    var w = rgbe_header_info.width,
        h = rgbe_header_info.height,
        image_rgba_data = RGBE_ReadPixels_RLE(byteArray.subarray(byteArray.pos), w, h);

    if (RGBE_RETURN_FAILURE !== image_rgba_data) {
      if (this.type === THREE.UnsignedByteType) {
        var data = image_rgba_data;
        var format = THREE.RGBEFormat; // handled as THREE.RGBAFormat in shaders

        var type = THREE.UnsignedByteType;
      } else if (this.type === THREE.FloatType) {
        var RGBEByteToRGBFloat = function RGBEByteToRGBFloat(sourceArray, sourceOffset, destArray, destOffset) {
          var e = sourceArray[sourceOffset + 3];
          var scale = Math.pow(2.0, e - 128.0) / 255.0;
          destArray[destOffset + 0] = sourceArray[sourceOffset + 0] * scale;
          destArray[destOffset + 1] = sourceArray[sourceOffset + 1] * scale;
          destArray[destOffset + 2] = sourceArray[sourceOffset + 2] * scale;
        };

        var numElements = image_rgba_data.length / 4 * 3;
        var floatArray = new Float32Array(numElements);

        for (var j = 0; j < numElements; j++) {
          RGBEByteToRGBFloat(image_rgba_data, j * 4, floatArray, j * 3);
        }

        var data = floatArray;
        var format = THREE.RGBFormat;
        var type = THREE.FloatType;
      } else {
        console.error('THREE.RGBELoader: unsupported type: ', this.type);
      }

      return {
        width: w,
        height: h,
        data: data,
        header: rgbe_header_info.string,
        gamma: rgbe_header_info.gamma,
        exposure: rgbe_header_info.exposure,
        format: format,
        type: type
      };
    }
  }

  return null;
};

THREE.RGBELoader.prototype.setType = function (value) {
  this.type = value;
  return this;
};
"use strict";

/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 * This class takes the cube lods(corresponding to different roughness values), and creates a single cubeUV
 * Texture. The format for a given roughness set of faces is simply::
 * +X+Y+Z
 * -X-Y-Z
 * For every roughness a mip map chain is also saved, which is essential to remove the texture artifacts due to
 * minification.
 * Right now for every face a PlaneMesh is drawn, which leads to a lot of geometry draw calls, but can be replaced
 * later by drawing a single buffer and by sending the appropriate faceIndex via vertex attributes.
 * The arrangement of the faces is fixed, as assuming this arrangement, the sampling function has been written.
 */
THREE.PMREMCubeUVPacker = function () {
  var camera = new THREE.OrthographicCamera();
  var scene = new THREE.Scene();
  var shader = getShader();

  var PMREMCubeUVPacker = function PMREMCubeUVPacker(cubeTextureLods) {
    this.cubeLods = cubeTextureLods;
    var size = cubeTextureLods[0].width * 4;
    var sourceTexture = cubeTextureLods[0].texture;
    var params = {
      format: sourceTexture.format,
      magFilter: sourceTexture.magFilter,
      minFilter: sourceTexture.minFilter,
      type: sourceTexture.type,
      generateMipmaps: sourceTexture.generateMipmaps,
      anisotropy: sourceTexture.anisotropy,
      encoding: sourceTexture.encoding === THREE.RGBEEncoding ? THREE.RGBM16Encoding : sourceTexture.encoding
    };

    if (params.encoding === THREE.RGBM16Encoding) {
      params.magFilter = THREE.LinearFilter;
      params.minFilter = THREE.LinearFilter;
    }

    this.CubeUVRenderTarget = new THREE.WebGLRenderTarget(size, size, params);
    this.CubeUVRenderTarget.texture.name = "PMREMCubeUVPacker.cubeUv";
    this.CubeUVRenderTarget.texture.mapping = THREE.CubeUVReflectionMapping;
    this.objects = [];
    var geometry = new THREE.PlaneBufferGeometry(1, 1);
    var faceOffsets = [];
    faceOffsets.push(new THREE.Vector2(0, 0));
    faceOffsets.push(new THREE.Vector2(1, 0));
    faceOffsets.push(new THREE.Vector2(2, 0));
    faceOffsets.push(new THREE.Vector2(0, 1));
    faceOffsets.push(new THREE.Vector2(1, 1));
    faceOffsets.push(new THREE.Vector2(2, 1));
    var textureResolution = size;
    size = cubeTextureLods[0].width;
    var offset2 = 0;
    var c = 4.0;
    this.numLods = Math.log(cubeTextureLods[0].width) / Math.log(2) - 2; // IE11 doesn't support Math.log2

    for (var i = 0; i < this.numLods; i++) {
      var offset1 = (textureResolution - textureResolution / c) * 0.5;
      if (size > 16) c *= 2;
      var nMips = size > 16 ? 6 : 1;
      var mipOffsetX = 0;
      var mipOffsetY = 0;
      var mipSize = size;

      for (var j = 0; j < nMips; j++) {
        // Mip Maps
        for (var k = 0; k < 6; k++) {
          // 6 Cube Faces
          var material = shader.clone();
          material.uniforms['envMap'].value = this.cubeLods[i].texture;
          material.envMap = this.cubeLods[i].texture;
          material.uniforms['faceIndex'].value = k;
          material.uniforms['mapSize'].value = mipSize;
          var planeMesh = new THREE.Mesh(geometry, material);
          planeMesh.position.x = faceOffsets[k].x * mipSize - offset1 + mipOffsetX;
          planeMesh.position.y = faceOffsets[k].y * mipSize - offset1 + offset2 + mipOffsetY;
          planeMesh.material.side = THREE.BackSide;
          planeMesh.scale.setScalar(mipSize);
          this.objects.push(planeMesh);
        }

        mipOffsetY += 1.75 * mipSize;
        mipOffsetX += 1.25 * mipSize;
        mipSize /= 2;
      }

      offset2 += 2 * size;
      if (size > 16) size /= 2;
    }
  };

  PMREMCubeUVPacker.prototype = {
    constructor: PMREMCubeUVPacker,
    update: function update(renderer) {
      var size = this.cubeLods[0].width * 4; // top and bottom are swapped for some reason?

      camera.left = -size * 0.5;
      camera.right = size * 0.5;
      camera.top = -size * 0.5;
      camera.bottom = size * 0.5;
      camera.near = 0;
      camera.far = 1;
      camera.updateProjectionMatrix();

      for (var i = 0; i < this.objects.length; i++) {
        scene.add(this.objects[i]);
      }

      var gammaInput = renderer.gammaInput;
      var gammaOutput = renderer.gammaOutput;
      var toneMapping = renderer.toneMapping;
      var toneMappingExposure = renderer.toneMappingExposure;
      var currentRenderTarget = renderer.getRenderTarget();
      renderer.gammaInput = false;
      renderer.gammaOutput = false;
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.setRenderTarget(this.CubeUVRenderTarget);
      renderer.render(scene, camera);
      renderer.setRenderTarget(currentRenderTarget);
      renderer.toneMapping = toneMapping;
      renderer.toneMappingExposure = toneMappingExposure;
      renderer.gammaInput = gammaInput;
      renderer.gammaOutput = gammaOutput;

      for (var i = 0; i < this.objects.length; i++) {
        scene.remove(this.objects[i]);
      }
    },
    dispose: function dispose() {
      for (var i = 0, l = this.objects.length; i < l; i++) {
        this.objects[i].material.dispose();
      }

      this.objects[0].geometry.dispose();
    }
  };

  function getShader() {
    var shaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        "faceIndex": {
          value: 0
        },
        "mapSize": {
          value: 0
        },
        "envMap": {
          value: null
        },
        "testColor": {
          value: new THREE.Vector3(1, 1, 1)
        }
      },
      vertexShader: "precision highp float;\
        varying vec2 vUv;\
        void main() {\
          vUv = uv;\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
        }",
      fragmentShader: "precision highp float;\
        varying vec2 vUv;\
        uniform samplerCube envMap;\
        uniform float mapSize;\
        uniform vec3 testColor;\
        uniform int faceIndex;\
        \
        void main() {\
          vec3 sampleDirection;\
          vec2 uv = vUv;\
          uv = uv * 2.0 - 1.0;\
          uv.y *= -1.0;\
          if(faceIndex == 0) {\
            sampleDirection = normalize(vec3(1.0, uv.y, -uv.x));\
          } else if(faceIndex == 1) {\
            sampleDirection = normalize(vec3(uv.x, 1.0, uv.y));\
          } else if(faceIndex == 2) {\
            sampleDirection = normalize(vec3(uv.x, uv.y, 1.0));\
          } else if(faceIndex == 3) {\
            sampleDirection = normalize(vec3(-1.0, uv.y, uv.x));\
          } else if(faceIndex == 4) {\
            sampleDirection = normalize(vec3(uv.x, -1.0, -uv.y));\
          } else {\
            sampleDirection = normalize(vec3(-uv.x, uv.y, -1.0));\
          }\
          vec4 color = envMapTexelToLinear( textureCube( envMap, sampleDirection ) );\
          gl_FragColor = linearToOutputTexel( color );\
        }",
      blending: THREE.NoBlending
    });
    shaderMaterial.type = 'PMREMCubeUVPacker';
    return shaderMaterial;
  }

  return PMREMCubeUVPacker;
}();
"use strict";

/**
 * @author Prashant Sharma / spidersharma03
 * @author Ben Houston / bhouston, https://clara.io
 *
 * To avoid cube map seams, I create an extra pixel around each face. This way when the cube map is
 * sampled by an application later(with a little care by sampling the centre of the texel), the extra 1 border
 *	of pixels makes sure that there is no seams artifacts present. This works perfectly for cubeUV format as
 *	well where the 6 faces can be arranged in any manner whatsoever.
 * Code in the beginning of fragment shader's main function does this job for a given resolution.
 *	Run Scene_PMREM_Test.html in the examples directory to see the sampling from the cube lods generated
 *	by this class.
 */
THREE.PMREMGenerator = function () {
  var shader = getShader();
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.0, 1000);
  var scene = new THREE.Scene();
  var planeMesh = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2, 0), shader);
  planeMesh.material.side = THREE.DoubleSide;
  scene.add(planeMesh);
  scene.add(camera);

  var PMREMGenerator = function PMREMGenerator(sourceTexture, samplesPerLevel, resolution) {
    this.sourceTexture = sourceTexture;
    this.resolution = resolution !== undefined ? resolution : 256; // NODE: 256 is currently hard coded in the glsl code for performance reasons

    this.samplesPerLevel = samplesPerLevel !== undefined ? samplesPerLevel : 32;
    var monotonicEncoding = this.sourceTexture.encoding === THREE.LinearEncoding || this.sourceTexture.encoding === THREE.GammaEncoding || this.sourceTexture.encoding === THREE.sRGBEncoding;
    this.sourceTexture.minFilter = monotonicEncoding ? THREE.LinearFilter : THREE.NearestFilter;
    this.sourceTexture.magFilter = monotonicEncoding ? THREE.LinearFilter : THREE.NearestFilter;
    this.sourceTexture.generateMipmaps = this.sourceTexture.generateMipmaps && monotonicEncoding;
    this.cubeLods = [];
    var size = this.resolution;
    var params = {
      format: this.sourceTexture.format,
      magFilter: this.sourceTexture.magFilter,
      minFilter: this.sourceTexture.minFilter,
      type: this.sourceTexture.type,
      generateMipmaps: this.sourceTexture.generateMipmaps,
      anisotropy: this.sourceTexture.anisotropy,
      encoding: this.sourceTexture.encoding
    }; // how many LODs fit in the given CubeUV Texture.

    this.numLods = Math.log(size) / Math.log(2) - 2; // IE11 doesn't support Math.log2

    for (var i = 0; i < this.numLods; i++) {
      var renderTarget = new THREE.WebGLRenderTargetCube(size, size, params);
      renderTarget.texture.name = "PMREMGenerator.cube" + i;
      this.cubeLods.push(renderTarget);
      size = Math.max(16, size / 2);
    }
  };

  PMREMGenerator.prototype = {
    constructor: PMREMGenerator,

    /*
     * Prashant Sharma / spidersharma03: More thought and work is needed here.
     * Right now it's a kind of a hack to use the previously convolved map to convolve the current one.
     * I tried to use the original map to convolve all the lods, but for many textures(specially the high frequency)
     * even a high number of samples(1024) dosen't lead to satisfactory results.
     * By using the previous convolved maps, a lower number of samples are generally sufficient(right now 32, which
     * gives okay results unless we see the reflection very carefully, or zoom in too much), however the math
     * goes wrong as the distribution function tries to sample a larger area than what it should be. So I simply scaled
     * the roughness by 0.9(totally empirical) to try to visually match the original result.
     * The condition "if(i <5)" is also an attemt to make the result match the original result.
     * This method requires the most amount of thinking I guess. Here is a paper which we could try to implement in future::
     * https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch20.html
     */
    update: function update(renderer) {
      // Texture should only be flipped for CubeTexture, not for
      // a Texture created via THREE.WebGLRenderTargetCube.
      var tFlip = this.sourceTexture.isCubeTexture ? -1 : 1;
      shader.defines['SAMPLES_PER_LEVEL'] = this.samplesPerLevel;
      shader.uniforms['faceIndex'].value = 0;
      shader.uniforms['envMap'].value = this.sourceTexture;
      shader.envMap = this.sourceTexture;
      shader.needsUpdate = true;
      var gammaInput = renderer.gammaInput;
      var gammaOutput = renderer.gammaOutput;
      var toneMapping = renderer.toneMapping;
      var toneMappingExposure = renderer.toneMappingExposure;
      var currentRenderTarget = renderer.getRenderTarget();
      renderer.toneMapping = THREE.LinearToneMapping;
      renderer.toneMappingExposure = 1.0;
      renderer.gammaInput = false;
      renderer.gammaOutput = false;

      for (var i = 0; i < this.numLods; i++) {
        var r = i / (this.numLods - 1);
        shader.uniforms['roughness'].value = r * 0.9; // see comment above, pragmatic choice
        // Only apply the tFlip for the first LOD

        shader.uniforms['tFlip'].value = i == 0 ? tFlip : 1;
        var size = this.cubeLods[i].width;
        shader.uniforms['mapSize'].value = size;
        this.renderToCubeMapTarget(renderer, this.cubeLods[i]);
        if (i < 5) shader.uniforms['envMap'].value = this.cubeLods[i].texture;
      }

      renderer.setRenderTarget(currentRenderTarget);
      renderer.toneMapping = toneMapping;
      renderer.toneMappingExposure = toneMappingExposure;
      renderer.gammaInput = gammaInput;
      renderer.gammaOutput = gammaOutput;
    },
    renderToCubeMapTarget: function renderToCubeMapTarget(renderer, renderTarget) {
      for (var i = 0; i < 6; i++) {
        this.renderToCubeMapTargetFace(renderer, renderTarget, i);
      }
    },
    renderToCubeMapTargetFace: function renderToCubeMapTargetFace(renderer, renderTarget, faceIndex) {
      shader.uniforms['faceIndex'].value = faceIndex;
      renderer.setRenderTarget(renderTarget, faceIndex);
      renderer.clear();
      renderer.render(scene, camera);
    },
    dispose: function dispose() {
      for (var i = 0, l = this.cubeLods.length; i < l; i++) {
        this.cubeLods[i].dispose();
      }
    }
  };

  function getShader() {
    var shaderMaterial = new THREE.ShaderMaterial({
      defines: {
        "SAMPLES_PER_LEVEL": 20
      },
      uniforms: {
        "faceIndex": {
          value: 0
        },
        "roughness": {
          value: 0.5
        },
        "mapSize": {
          value: 0.5
        },
        "envMap": {
          value: null
        },
        "tFlip": {
          value: -1
        }
      },
      vertexShader: "varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",
      fragmentShader: "#include <common>\n\
				varying vec2 vUv;\n\
				uniform int faceIndex;\n\
				uniform float roughness;\n\
				uniform samplerCube envMap;\n\
				uniform float mapSize;\n\
				uniform float tFlip;\n\
				\n\
				float GGXRoughnessToBlinnExponent( const in float ggxRoughness ) {\n\
					float a = ggxRoughness + 0.0001;\n\
					a *= a;\n\
					return ( 2.0 / a - 2.0 );\n\
				}\n\
				vec3 ImportanceSamplePhong(vec2 uv, mat3 vecSpace, float specPow) {\n\
					float phi = uv.y * 2.0 * PI;\n\
					float cosTheta = pow(1.0 - uv.x, 1.0 / (specPow + 1.0));\n\
					float sinTheta = sqrt(1.0 - cosTheta * cosTheta);\n\
					vec3 sampleDir = vec3(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);\n\
					return vecSpace * sampleDir;\n\
				}\n\
				vec3 ImportanceSampleGGX( vec2 uv, mat3 vecSpace, float Roughness )\n\
				{\n\
					float a = Roughness * Roughness;\n\
					float Phi = 2.0 * PI * uv.x;\n\
					float CosTheta = sqrt( (1.0 - uv.y) / ( 1.0 + (a*a - 1.0) * uv.y ) );\n\
					float SinTheta = sqrt( 1.0 - CosTheta * CosTheta );\n\
					return vecSpace * vec3(SinTheta * cos( Phi ), SinTheta * sin( Phi ), CosTheta);\n\
				}\n\
				mat3 matrixFromVector(vec3 n) {\n\
					float a = 1.0 / (1.0 + n.z);\n\
					float b = -n.x * n.y * a;\n\
					vec3 b1 = vec3(1.0 - n.x * n.x * a, b, -n.x);\n\
					vec3 b2 = vec3(b, 1.0 - n.y * n.y * a, -n.y);\n\
					return mat3(b1, b2, n);\n\
				}\n\
				\n\
				vec4 testColorMap(float Roughness) {\n\
					vec4 color;\n\
					if(faceIndex == 0)\n\
						color = vec4(1.0,0.0,0.0,1.0);\n\
					else if(faceIndex == 1)\n\
						color = vec4(0.0,1.0,0.0,1.0);\n\
					else if(faceIndex == 2)\n\
						color = vec4(0.0,0.0,1.0,1.0);\n\
					else if(faceIndex == 3)\n\
						color = vec4(1.0,1.0,0.0,1.0);\n\
					else if(faceIndex == 4)\n\
						color = vec4(0.0,1.0,1.0,1.0);\n\
					else\n\
						color = vec4(1.0,0.0,1.0,1.0);\n\
					color *= ( 1.0 - Roughness );\n\
					return color;\n\
				}\n\
				void main() {\n\
					vec3 sampleDirection;\n\
					vec2 uv = vUv*2.0 - 1.0;\n\
					float offset = -1.0/mapSize;\n\
					const float a = -1.0;\n\
					const float b = 1.0;\n\
					float c = -1.0 + offset;\n\
					float d = 1.0 - offset;\n\
					float bminusa = b - a;\n\
					uv.x = (uv.x - a)/bminusa * d - (uv.x - b)/bminusa * c;\n\
					uv.y = (uv.y - a)/bminusa * d - (uv.y - b)/bminusa * c;\n\
					if (faceIndex==0) {\n\
						sampleDirection = vec3(1.0, -uv.y, -uv.x);\n\
					} else if (faceIndex==1) {\n\
						sampleDirection = vec3(-1.0, -uv.y, uv.x);\n\
					} else if (faceIndex==2) {\n\
						sampleDirection = vec3(uv.x, 1.0, uv.y);\n\
					} else if (faceIndex==3) {\n\
						sampleDirection = vec3(uv.x, -1.0, -uv.y);\n\
					} else if (faceIndex==4) {\n\
						sampleDirection = vec3(uv.x, -uv.y, 1.0);\n\
					} else {\n\
						sampleDirection = vec3(-uv.x, -uv.y, -1.0);\n\
					}\n\
					vec3 correctedDirection = vec3( tFlip * sampleDirection.x, sampleDirection.yz );\n\
					mat3 vecSpace = matrixFromVector( normalize( correctedDirection ) );\n\
					vec3 rgbColor = vec3(0.0);\n\
					const int NumSamples = SAMPLES_PER_LEVEL;\n\
					vec3 vect;\n\
					float weight = 0.0;\n\
					for( int i = 0; i < NumSamples; i ++ ) {\n\
						float sini = sin(float(i));\n\
						float cosi = cos(float(i));\n\
						float r = rand(vec2(sini, cosi));\n\
						vect = ImportanceSampleGGX(vec2(float(i) / float(NumSamples), r), vecSpace, roughness);\n\
						float dotProd = dot(vect, normalize(sampleDirection));\n\
						weight += dotProd;\n\
						vec3 color = envMapTexelToLinear(textureCube(envMap, vect)).rgb;\n\
						rgbColor.rgb += color;\n\
					}\n\
					rgbColor /= float(NumSamples);\n\
					//rgbColor = testColorMap( roughness ).rgb;\n\
					gl_FragColor = linearToOutputTexel( vec4( rgbColor, 1.0 ) );\n\
				}",
      blending: THREE.NoBlending
    });
    shaderMaterial.type = 'PMREMGenerator';
    return shaderMaterial;
  }

  return PMREMGenerator;
}();
"use strict";

/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */
THREE.CopyShader = {
  uniforms: {
    "tDiffuse": {
      value: null
    },
    "opacity": {
      value: 1.0
    }
  },
  vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),
  fragmentShader: ["uniform float opacity;", "uniform sampler2D tDiffuse;", "varying vec2 vUv;", "void main() {", "vec4 texel = texture2D( tDiffuse, vUv );", "gl_FragColor = opacity * texel;", "}"].join("\n")
};
"use strict";

/**
 * @author alteredq / http://alteredqualia.com/
 * @author davidedc / http://www.sketchpatch.net/
 *
 * NVIDIA FXAA by Timothy Lottes
 * http://timothylottes.blogspot.com/2011/06/fxaa3-source-released.html
 * - WebGL port by @supereggbert
 * http://www.glge.org/demos/fxaa/
 */
THREE.FXAAShader = {
  uniforms: {
    "tDiffuse": {
      value: null
    },
    "resolution": {
      value: new THREE.Vector2(1 / 1024, 1 / 512)
    }
  },
  vertexShader: ["varying vec2 vUv;", "void main() {", "vUv = uv;", "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );", "}"].join("\n"),
  fragmentShader: ["precision highp float;", "", "uniform sampler2D tDiffuse;", "", "uniform vec2 resolution;", "", "varying vec2 vUv;", "", "// FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)", "", "//----------------------------------------------------------------------------------", "// File:        es3-kepler\FXAA\assets\shaders/FXAA_DefaultES.frag", "// SDK Version: v3.00", "// Email:       gameworks@nvidia.com", "// Site:        http://developer.nvidia.com/", "//", "// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.", "//", "// Redistribution and use in source and binary forms, with or without", "// modification, are permitted provided that the following conditions", "// are met:", "//  * Redistributions of source code must retain the above copyright", "//    notice, this list of conditions and the following disclaimer.", "//  * Redistributions in binary form must reproduce the above copyright", "//    notice, this list of conditions and the following disclaimer in the", "//    documentation and/or other materials provided with the distribution.", "//  * Neither the name of NVIDIA CORPORATION nor the names of its", "//    contributors may be used to endorse or promote products derived", "//    from this software without specific prior written permission.", "//", "// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ``AS IS'' AND ANY", "// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE", "// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR", "// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR", "// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,", "// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,", "// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR", "// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY", "// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT", "// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE", "// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.", "//", "//----------------------------------------------------------------------------------", "", "#define FXAA_PC 1", "#define FXAA_GLSL_100 1", "#define FXAA_QUALITY_PRESET 12", "", "#define FXAA_GREEN_AS_LUMA 1", "", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_PC_CONSOLE", "    //", "    // The console algorithm for PC is included", "    // for developers targeting really low spec machines.", "    // Likely better to just run FXAA_PC, and use a really low preset.", "    //", "    #define FXAA_PC_CONSOLE 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_GLSL_120", "    #define FXAA_GLSL_120 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_GLSL_130", "    #define FXAA_GLSL_130 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_HLSL_3", "    #define FXAA_HLSL_3 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_HLSL_4", "    #define FXAA_HLSL_4 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_HLSL_5", "    #define FXAA_HLSL_5 0", "#endif", "/*==========================================================================*/", "#ifndef FXAA_GREEN_AS_LUMA", "    //", "    // For those using non-linear color,", "    // and either not able to get luma in alpha, or not wanting to,", "    // this enables FXAA to run using green as a proxy for luma.", "    // So with this enabled, no need to pack luma in alpha.", "    //", "    // This will turn off AA on anything which lacks some amount of green.", "    // Pure red and blue or combination of only R and B, will get no AA.", "    //", "    // Might want to lower the settings for both,", "    //    fxaaConsoleEdgeThresholdMin", "    //    fxaaQualityEdgeThresholdMin", "    // In order to insure AA does not get turned off on colors", "    // which contain a minor amount of green.", "    //", "    // 1 = On.", "    // 0 = Off.", "    //", "    #define FXAA_GREEN_AS_LUMA 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_EARLY_EXIT", "    //", "    // Controls algorithm's early exit path.", "    // On PS3 turning this ON adds 2 cycles to the shader.", "    // On 360 turning this OFF adds 10ths of a millisecond to the shader.", "    // Turning this off on console will result in a more blurry image.", "    // So this defaults to on.", "    //", "    // 1 = On.", "    // 0 = Off.", "    //", "    #define FXAA_EARLY_EXIT 1", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_DISCARD", "    //", "    // Only valid for PC OpenGL currently.", "    // Probably will not work when FXAA_GREEN_AS_LUMA = 1.", "    //", "    // 1 = Use discard on pixels which don't need AA.", "    //     For APIs which enable concurrent TEX+ROP from same surface.", "    // 0 = Return unchanged color on pixels which don't need AA.", "    //", "    #define FXAA_DISCARD 0", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_FAST_PIXEL_OFFSET", "    //", "    // Used for GLSL 120 only.", "    //", "    // 1 = GL API supports fast pixel offsets", "    // 0 = do not use fast pixel offsets", "    //", "    #ifdef GL_EXT_gpu_shader4", "        #define FXAA_FAST_PIXEL_OFFSET 1", "    #endif", "    #ifdef GL_NV_gpu_shader5", "        #define FXAA_FAST_PIXEL_OFFSET 1", "    #endif", "    #ifdef GL_ARB_gpu_shader5", "        #define FXAA_FAST_PIXEL_OFFSET 1", "    #endif", "    #ifndef FXAA_FAST_PIXEL_OFFSET", "        #define FXAA_FAST_PIXEL_OFFSET 0", "    #endif", "#endif", "/*--------------------------------------------------------------------------*/", "#ifndef FXAA_GATHER4_ALPHA", "    //", "    // 1 = API supports gather4 on alpha channel.", "    // 0 = API does not support gather4 on alpha channel.", "    //", "    #if (FXAA_HLSL_5 == 1)", "        #define FXAA_GATHER4_ALPHA 1", "    #endif", "    #ifdef GL_ARB_gpu_shader5", "        #define FXAA_GATHER4_ALPHA 1", "    #endif", "    #ifdef GL_NV_gpu_shader5", "        #define FXAA_GATHER4_ALPHA 1", "    #endif", "    #ifndef FXAA_GATHER4_ALPHA", "        #define FXAA_GATHER4_ALPHA 0", "    #endif", "#endif", "", "", "/*============================================================================", "                        FXAA QUALITY - TUNING KNOBS", "------------------------------------------------------------------------------", "NOTE the other tuning knobs are now in the shader function inputs!", "============================================================================*/", "#ifndef FXAA_QUALITY_PRESET", "    //", "    // Choose the quality preset.", "    // This needs to be compiled into the shader as it effects code.", "    // Best option to include multiple presets is to", "    // in each shader define the preset, then include this file.", "    //", "    // OPTIONS", "    // -----------------------------------------------------------------------", "    // 10 to 15 - default medium dither (10=fastest, 15=highest quality)", "    // 20 to 29 - less dither, more expensive (20=fastest, 29=highest quality)", "    // 39       - no dither, very expensive", "    //", "    // NOTES", "    // -----------------------------------------------------------------------", "    // 12 = slightly faster then FXAA 3.9 and higher edge quality (default)", "    // 13 = about same speed as FXAA 3.9 and better than 12", "    // 23 = closest to FXAA 3.9 visually and performance wise", "    //  _ = the lowest digit is directly related to performance", "    // _  = the highest digit is directly related to style", "    //", "    #define FXAA_QUALITY_PRESET 12", "#endif", "", "", "/*============================================================================", "", "                           FXAA QUALITY - PRESETS", "", "============================================================================*/", "", "/*============================================================================", "                     FXAA QUALITY - MEDIUM DITHER PRESETS", "============================================================================*/", "#if (FXAA_QUALITY_PRESET == 10)", "    #define FXAA_QUALITY_PS 3", "    #define FXAA_QUALITY_P0 1.5", "    #define FXAA_QUALITY_P1 3.0", "    #define FXAA_QUALITY_P2 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 11)", "    #define FXAA_QUALITY_PS 4", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 3.0", "    #define FXAA_QUALITY_P3 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 12)", "    #define FXAA_QUALITY_PS 5", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 4.0", "    #define FXAA_QUALITY_P4 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 13)", "    #define FXAA_QUALITY_PS 6", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 4.0", "    #define FXAA_QUALITY_P5 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 14)", "    #define FXAA_QUALITY_PS 7", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 4.0", "    #define FXAA_QUALITY_P6 12.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 15)", "    #define FXAA_QUALITY_PS 8", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 4.0", "    #define FXAA_QUALITY_P7 12.0", "#endif", "", "/*============================================================================", "                     FXAA QUALITY - LOW DITHER PRESETS", "============================================================================*/", "#if (FXAA_QUALITY_PRESET == 20)", "    #define FXAA_QUALITY_PS 3", "    #define FXAA_QUALITY_P0 1.5", "    #define FXAA_QUALITY_P1 2.0", "    #define FXAA_QUALITY_P2 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 21)", "    #define FXAA_QUALITY_PS 4", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 22)", "    #define FXAA_QUALITY_PS 5", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 23)", "    #define FXAA_QUALITY_PS 6", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 24)", "    #define FXAA_QUALITY_PS 7", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 3.0", "    #define FXAA_QUALITY_P6 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 25)", "    #define FXAA_QUALITY_PS 8", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 4.0", "    #define FXAA_QUALITY_P7 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 26)", "    #define FXAA_QUALITY_PS 9", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 4.0", "    #define FXAA_QUALITY_P8 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 27)", "    #define FXAA_QUALITY_PS 10", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 4.0", "    #define FXAA_QUALITY_P9 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 28)", "    #define FXAA_QUALITY_PS 11", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 2.0", "    #define FXAA_QUALITY_P9 4.0", "    #define FXAA_QUALITY_P10 8.0", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_QUALITY_PRESET == 29)", "    #define FXAA_QUALITY_PS 12", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.5", "    #define FXAA_QUALITY_P2 2.0", "    #define FXAA_QUALITY_P3 2.0", "    #define FXAA_QUALITY_P4 2.0", "    #define FXAA_QUALITY_P5 2.0", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 2.0", "    #define FXAA_QUALITY_P9 2.0", "    #define FXAA_QUALITY_P10 4.0", "    #define FXAA_QUALITY_P11 8.0", "#endif", "", "/*============================================================================", "                     FXAA QUALITY - EXTREME QUALITY", "============================================================================*/", "#if (FXAA_QUALITY_PRESET == 39)", "    #define FXAA_QUALITY_PS 12", "    #define FXAA_QUALITY_P0 1.0", "    #define FXAA_QUALITY_P1 1.0", "    #define FXAA_QUALITY_P2 1.0", "    #define FXAA_QUALITY_P3 1.0", "    #define FXAA_QUALITY_P4 1.0", "    #define FXAA_QUALITY_P5 1.5", "    #define FXAA_QUALITY_P6 2.0", "    #define FXAA_QUALITY_P7 2.0", "    #define FXAA_QUALITY_P8 2.0", "    #define FXAA_QUALITY_P9 2.0", "    #define FXAA_QUALITY_P10 4.0", "    #define FXAA_QUALITY_P11 8.0", "#endif", "", "", "", "/*============================================================================", "", "                                API PORTING", "", "============================================================================*/", "#if (FXAA_GLSL_100 == 1) || (FXAA_GLSL_120 == 1) || (FXAA_GLSL_130 == 1)", "    #define FxaaBool bool", "    #define FxaaDiscard discard", "    #define FxaaFloat float", "    #define FxaaFloat2 vec2", "    #define FxaaFloat3 vec3", "    #define FxaaFloat4 vec4", "    #define FxaaHalf float", "    #define FxaaHalf2 vec2", "    #define FxaaHalf3 vec3", "    #define FxaaHalf4 vec4", "    #define FxaaInt2 ivec2", "    #define FxaaSat(x) clamp(x, 0.0, 1.0)", "    #define FxaaTex sampler2D", "#else", "    #define FxaaBool bool", "    #define FxaaDiscard clip(-1)", "    #define FxaaFloat float", "    #define FxaaFloat2 float2", "    #define FxaaFloat3 float3", "    #define FxaaFloat4 float4", "    #define FxaaHalf half", "    #define FxaaHalf2 half2", "    #define FxaaHalf3 half3", "    #define FxaaHalf4 half4", "    #define FxaaSat(x) saturate(x)", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_GLSL_100 == 1)", "  #define FxaaTexTop(t, p) texture2D(t, p, 0.0)", "  #define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r), 0.0)", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_GLSL_120 == 1)", "    // Requires,", "    //  #version 120", "    // And at least,", "    //  #extension GL_EXT_gpu_shader4 : enable", "    //  (or set FXAA_FAST_PIXEL_OFFSET 1 to work like DX9)", "    #define FxaaTexTop(t, p) texture2DLod(t, p, 0.0)", "    #if (FXAA_FAST_PIXEL_OFFSET == 1)", "        #define FxaaTexOff(t, p, o, r) texture2DLodOffset(t, p, 0.0, o)", "    #else", "        #define FxaaTexOff(t, p, o, r) texture2DLod(t, p + (o * r), 0.0)", "    #endif", "    #if (FXAA_GATHER4_ALPHA == 1)", "        // use #extension GL_ARB_gpu_shader5 : enable", "        #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)", "        #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)", "        #define FxaaTexGreen4(t, p) textureGather(t, p, 1)", "        #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)", "    #endif", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_GLSL_130 == 1)", "    // Requires \"#version 130\" or better", "    #define FxaaTexTop(t, p) textureLod(t, p, 0.0)", "    #define FxaaTexOff(t, p, o, r) textureLodOffset(t, p, 0.0, o)", "    #if (FXAA_GATHER4_ALPHA == 1)", "        // use #extension GL_ARB_gpu_shader5 : enable", "        #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)", "        #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)", "        #define FxaaTexGreen4(t, p) textureGather(t, p, 1)", "        #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)", "    #endif", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_HLSL_3 == 1)", "    #define FxaaInt2 float2", "    #define FxaaTex sampler2D", "    #define FxaaTexTop(t, p) tex2Dlod(t, float4(p, 0.0, 0.0))", "    #define FxaaTexOff(t, p, o, r) tex2Dlod(t, float4(p + (o * r), 0, 0))", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_HLSL_4 == 1)", "    #define FxaaInt2 int2", "    struct FxaaTex { SamplerState smpl; Texture2D tex; };", "    #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)", "    #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)", "#endif", "/*--------------------------------------------------------------------------*/", "#if (FXAA_HLSL_5 == 1)", "    #define FxaaInt2 int2", "    struct FxaaTex { SamplerState smpl; Texture2D tex; };", "    #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)", "    #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)", "    #define FxaaTexAlpha4(t, p) t.tex.GatherAlpha(t.smpl, p)", "    #define FxaaTexOffAlpha4(t, p, o) t.tex.GatherAlpha(t.smpl, p, o)", "    #define FxaaTexGreen4(t, p) t.tex.GatherGreen(t.smpl, p)", "    #define FxaaTexOffGreen4(t, p, o) t.tex.GatherGreen(t.smpl, p, o)", "#endif", "", "", "/*============================================================================", "                   GREEN AS LUMA OPTION SUPPORT FUNCTION", "============================================================================*/", "#if (FXAA_GREEN_AS_LUMA == 0)", "    FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.w; }", "#else", "    FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.y; }", "#endif", "", "", "", "", "/*============================================================================", "", "                             FXAA3 QUALITY - PC", "", "============================================================================*/", "#if (FXAA_PC == 1)", "/*--------------------------------------------------------------------------*/", "FxaaFloat4 FxaaPixelShader(", "    //", "    // Use noperspective interpolation here (turn off perspective interpolation).", "    // {xy} = center of pixel", "    FxaaFloat2 pos,", "    //", "    // Used only for FXAA Console, and not used on the 360 version.", "    // Use noperspective interpolation here (turn off perspective interpolation).", "    // {xy_} = upper left of pixel", "    // {_zw} = lower right of pixel", "    FxaaFloat4 fxaaConsolePosPos,", "    //", "    // Input color texture.", "    // {rgb_} = color in linear or perceptual color space", "    // if (FXAA_GREEN_AS_LUMA == 0)", "    //     {__a} = luma in perceptual color space (not linear)", "    FxaaTex tex,", "    //", "    // Only used on the optimized 360 version of FXAA Console.", "    // For everything but 360, just use the same input here as for \"tex\".", "    // For 360, same texture, just alias with a 2nd sampler.", "    // This sampler needs to have an exponent bias of -1.", "    FxaaTex fxaaConsole360TexExpBiasNegOne,", "    //", "    // Only used on the optimized 360 version of FXAA Console.", "    // For everything but 360, just use the same input here as for \"tex\".", "    // For 360, same texture, just alias with a 3nd sampler.", "    // This sampler needs to have an exponent bias of -2.", "    FxaaTex fxaaConsole360TexExpBiasNegTwo,", "    //", "    // Only used on FXAA Quality.", "    // This must be from a constant/uniform.", "    // {x_} = 1.0/screenWidthInPixels", "    // {_y} = 1.0/screenHeightInPixels", "    FxaaFloat2 fxaaQualityRcpFrame,", "    //", "    // Only used on FXAA Console.", "    // This must be from a constant/uniform.", "    // This effects sub-pixel AA quality and inversely sharpness.", "    //   Where N ranges between,", "    //     N = 0.50 (default)", "    //     N = 0.33 (sharper)", "    // {x__} = -N/screenWidthInPixels", "    // {_y_} = -N/screenHeightInPixels", "    // {_z_} =  N/screenWidthInPixels", "    // {__w} =  N/screenHeightInPixels", "    FxaaFloat4 fxaaConsoleRcpFrameOpt,", "    //", "    // Only used on FXAA Console.", "    // Not used on 360, but used on PS3 and PC.", "    // This must be from a constant/uniform.", "    // {x__} = -2.0/screenWidthInPixels", "    // {_y_} = -2.0/screenHeightInPixels", "    // {_z_} =  2.0/screenWidthInPixels", "    // {__w} =  2.0/screenHeightInPixels", "    FxaaFloat4 fxaaConsoleRcpFrameOpt2,", "    //", "    // Only used on FXAA Console.", "    // Only used on 360 in place of fxaaConsoleRcpFrameOpt2.", "    // This must be from a constant/uniform.", "    // {x__} =  8.0/screenWidthInPixels", "    // {_y_} =  8.0/screenHeightInPixels", "    // {_z_} = -4.0/screenWidthInPixels", "    // {__w} = -4.0/screenHeightInPixels", "    FxaaFloat4 fxaaConsole360RcpFrameOpt2,", "    //", "    // Only used on FXAA Quality.", "    // This used to be the FXAA_QUALITY_SUBPIX define.", "    // It is here now to allow easier tuning.", "    // Choose the amount of sub-pixel aliasing removal.", "    // This can effect sharpness.", "    //   1.00 - upper limit (softer)", "    //   0.75 - default amount of filtering", "    //   0.50 - lower limit (sharper, less sub-pixel aliasing removal)", "    //   0.25 - almost off", "    //   0.00 - completely off", "    FxaaFloat fxaaQualitySubpix,", "    //", "    // Only used on FXAA Quality.", "    // This used to be the FXAA_QUALITY_EDGE_THRESHOLD define.", "    // It is here now to allow easier tuning.", "    // The minimum amount of local contrast required to apply algorithm.", "    //   0.333 - too little (faster)", "    //   0.250 - low quality", "    //   0.166 - default", "    //   0.125 - high quality", "    //   0.063 - overkill (slower)", "    FxaaFloat fxaaQualityEdgeThreshold,", "    //", "    // Only used on FXAA Quality.", "    // This used to be the FXAA_QUALITY_EDGE_THRESHOLD_MIN define.", "    // It is here now to allow easier tuning.", "    // Trims the algorithm from processing darks.", "    //   0.0833 - upper limit (default, the start of visible unfiltered edges)", "    //   0.0625 - high quality (faster)", "    //   0.0312 - visible limit (slower)", "    // Special notes when using FXAA_GREEN_AS_LUMA,", "    //   Likely want to set this to zero.", "    //   As colors that are mostly not-green", "    //   will appear very dark in the green channel!", "    //   Tune by looking at mostly non-green content,", "    //   then start at zero and increase until aliasing is a problem.", "    FxaaFloat fxaaQualityEdgeThresholdMin,", "    //", "    // Only used on FXAA Console.", "    // This used to be the FXAA_CONSOLE_EDGE_SHARPNESS define.", "    // It is here now to allow easier tuning.", "    // This does not effect PS3, as this needs to be compiled in.", "    //   Use FXAA_CONSOLE_PS3_EDGE_SHARPNESS for PS3.", "    //   Due to the PS3 being ALU bound,", "    //   there are only three safe values here: 2 and 4 and 8.", "    //   These options use the shaders ability to a free *|/ by 2|4|8.", "    // For all other platforms can be a non-power of two.", "    //   8.0 is sharper (default!!!)", "    //   4.0 is softer", "    //   2.0 is really soft (good only for vector graphics inputs)", "    FxaaFloat fxaaConsoleEdgeSharpness,", "    //", "    // Only used on FXAA Console.", "    // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD define.", "    // It is here now to allow easier tuning.", "    // This does not effect PS3, as this needs to be compiled in.", "    //   Use FXAA_CONSOLE_PS3_EDGE_THRESHOLD for PS3.", "    //   Due to the PS3 being ALU bound,", "    //   there are only two safe values here: 1/4 and 1/8.", "    //   These options use the shaders ability to a free *|/ by 2|4|8.", "    // The console setting has a different mapping than the quality setting.", "    // Other platforms can use other values.", "    //   0.125 leaves less aliasing, but is softer (default!!!)", "    //   0.25 leaves more aliasing, and is sharper", "    FxaaFloat fxaaConsoleEdgeThreshold,", "    //", "    // Only used on FXAA Console.", "    // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD_MIN define.", "    // It is here now to allow easier tuning.", "    // Trims the algorithm from processing darks.", "    // The console setting has a different mapping than the quality setting.", "    // This only applies when FXAA_EARLY_EXIT is 1.", "    // This does not apply to PS3,", "    // PS3 was simplified to avoid more shader instructions.", "    //   0.06 - faster but more aliasing in darks", "    //   0.05 - default", "    //   0.04 - slower and less aliasing in darks", "    // Special notes when using FXAA_GREEN_AS_LUMA,", "    //   Likely want to set this to zero.", "    //   As colors that are mostly not-green", "    //   will appear very dark in the green channel!", "    //   Tune by looking at mostly non-green content,", "    //   then start at zero and increase until aliasing is a problem.", "    FxaaFloat fxaaConsoleEdgeThresholdMin,", "    //", "    // Extra constants for 360 FXAA Console only.", "    // Use zeros or anything else for other platforms.", "    // These must be in physical constant registers and NOT immediates.", "    // Immediates will result in compiler un-optimizing.", "    // {xyzw} = float4(1.0, -1.0, 0.25, -0.25)", "    FxaaFloat4 fxaaConsole360ConstDir", ") {", "/*--------------------------------------------------------------------------*/", "    FxaaFloat2 posM;", "    posM.x = pos.x;", "    posM.y = pos.y;", "    #if (FXAA_GATHER4_ALPHA == 1)", "        #if (FXAA_DISCARD == 0)", "            FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);", "            #if (FXAA_GREEN_AS_LUMA == 0)", "                #define lumaM rgbyM.w", "            #else", "                #define lumaM rgbyM.y", "            #endif", "        #endif", "        #if (FXAA_GREEN_AS_LUMA == 0)", "            FxaaFloat4 luma4A = FxaaTexAlpha4(tex, posM);", "            FxaaFloat4 luma4B = FxaaTexOffAlpha4(tex, posM, FxaaInt2(-1, -1));", "        #else", "            FxaaFloat4 luma4A = FxaaTexGreen4(tex, posM);", "            FxaaFloat4 luma4B = FxaaTexOffGreen4(tex, posM, FxaaInt2(-1, -1));", "        #endif", "        #if (FXAA_DISCARD == 1)", "            #define lumaM luma4A.w", "        #endif", "        #define lumaE luma4A.z", "        #define lumaS luma4A.x", "        #define lumaSE luma4A.y", "        #define lumaNW luma4B.w", "        #define lumaN luma4B.z", "        #define lumaW luma4B.x", "    #else", "        FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);", "        #if (FXAA_GREEN_AS_LUMA == 0)", "            #define lumaM rgbyM.w", "        #else", "            #define lumaM rgbyM.y", "        #endif", "        #if (FXAA_GLSL_100 == 1)", "          FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0, 1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 0.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0,-1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 0.0), fxaaQualityRcpFrame.xy));", "        #else", "          FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0, 1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0,-1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 0), fxaaQualityRcpFrame.xy));", "        #endif", "    #endif", "/*--------------------------------------------------------------------------*/", "    FxaaFloat maxSM = max(lumaS, lumaM);", "    FxaaFloat minSM = min(lumaS, lumaM);", "    FxaaFloat maxESM = max(lumaE, maxSM);", "    FxaaFloat minESM = min(lumaE, minSM);", "    FxaaFloat maxWN = max(lumaN, lumaW);", "    FxaaFloat minWN = min(lumaN, lumaW);", "    FxaaFloat rangeMax = max(maxWN, maxESM);", "    FxaaFloat rangeMin = min(minWN, minESM);", "    FxaaFloat rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;", "    FxaaFloat range = rangeMax - rangeMin;", "    FxaaFloat rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);", "    FxaaBool earlyExit = range < rangeMaxClamped;", "/*--------------------------------------------------------------------------*/", "    if(earlyExit)", "        #if (FXAA_DISCARD == 1)", "            FxaaDiscard;", "        #else", "            return rgbyM;", "        #endif", "/*--------------------------------------------------------------------------*/", "    #if (FXAA_GATHER4_ALPHA == 0)", "        #if (FXAA_GLSL_100 == 1)", "          FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0,-1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0,-1.0), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 1.0), fxaaQualityRcpFrame.xy));", "        #else", "          FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1,-1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1,-1), fxaaQualityRcpFrame.xy));", "          FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));", "        #endif", "    #else", "        FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, -1), fxaaQualityRcpFrame.xy));", "        FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));", "    #endif", "/*--------------------------------------------------------------------------*/", "    FxaaFloat lumaNS = lumaN + lumaS;", "    FxaaFloat lumaWE = lumaW + lumaE;", "    FxaaFloat subpixRcpRange = 1.0/range;", "    FxaaFloat subpixNSWE = lumaNS + lumaWE;", "    FxaaFloat edgeHorz1 = (-2.0 * lumaM) + lumaNS;", "    FxaaFloat edgeVert1 = (-2.0 * lumaM) + lumaWE;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat lumaNESE = lumaNE + lumaSE;", "    FxaaFloat lumaNWNE = lumaNW + lumaNE;", "    FxaaFloat edgeHorz2 = (-2.0 * lumaE) + lumaNESE;", "    FxaaFloat edgeVert2 = (-2.0 * lumaN) + lumaNWNE;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat lumaNWSW = lumaNW + lumaSW;", "    FxaaFloat lumaSWSE = lumaSW + lumaSE;", "    FxaaFloat edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);", "    FxaaFloat edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);", "    FxaaFloat edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;", "    FxaaFloat edgeVert3 = (-2.0 * lumaS) + lumaSWSE;", "    FxaaFloat edgeHorz = abs(edgeHorz3) + edgeHorz4;", "    FxaaFloat edgeVert = abs(edgeVert3) + edgeVert4;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat subpixNWSWNESE = lumaNWSW + lumaNESE;", "    FxaaFloat lengthSign = fxaaQualityRcpFrame.x;", "    FxaaBool horzSpan = edgeHorz >= edgeVert;", "    FxaaFloat subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;", "/*--------------------------------------------------------------------------*/", "    if(!horzSpan) lumaN = lumaW;", "    if(!horzSpan) lumaS = lumaE;", "    if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;", "    FxaaFloat subpixB = (subpixA * (1.0/12.0)) - lumaM;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat gradientN = lumaN - lumaM;", "    FxaaFloat gradientS = lumaS - lumaM;", "    FxaaFloat lumaNN = lumaN + lumaM;", "    FxaaFloat lumaSS = lumaS + lumaM;", "    FxaaBool pairN = abs(gradientN) >= abs(gradientS);", "    FxaaFloat gradient = max(abs(gradientN), abs(gradientS));", "    if(pairN) lengthSign = -lengthSign;", "    FxaaFloat subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);", "/*--------------------------------------------------------------------------*/", "    FxaaFloat2 posB;", "    posB.x = posM.x;", "    posB.y = posM.y;", "    FxaaFloat2 offNP;", "    offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;", "    offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;", "    if(!horzSpan) posB.x += lengthSign * 0.5;", "    if( horzSpan) posB.y += lengthSign * 0.5;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat2 posN;", "    posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;", "    posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;", "    FxaaFloat2 posP;", "    posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;", "    posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;", "    FxaaFloat subpixD = ((-2.0)*subpixC) + 3.0;", "    FxaaFloat lumaEndN = FxaaLuma(FxaaTexTop(tex, posN));", "    FxaaFloat subpixE = subpixC * subpixC;", "    FxaaFloat lumaEndP = FxaaLuma(FxaaTexTop(tex, posP));", "/*--------------------------------------------------------------------------*/", "    if(!pairN) lumaNN = lumaSS;", "    FxaaFloat gradientScaled = gradient * 1.0/4.0;", "    FxaaFloat lumaMM = lumaM - lumaNN * 0.5;", "    FxaaFloat subpixF = subpixD * subpixE;", "    FxaaBool lumaMLTZero = lumaMM < 0.0;", "/*--------------------------------------------------------------------------*/", "    lumaEndN -= lumaNN * 0.5;", "    lumaEndP -= lumaNN * 0.5;", "    FxaaBool doneN = abs(lumaEndN) >= gradientScaled;", "    FxaaBool doneP = abs(lumaEndP) >= gradientScaled;", "    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;", "    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;", "    FxaaBool doneNP = (!doneN) || (!doneP);", "    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;", "    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;", "/*--------------------------------------------------------------------------*/", "    if(doneNP) {", "        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "        doneN = abs(lumaEndN) >= gradientScaled;", "        doneP = abs(lumaEndP) >= gradientScaled;", "        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;", "        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;", "        doneNP = (!doneN) || (!doneP);", "        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;", "        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;", "/*--------------------------------------------------------------------------*/", "        #if (FXAA_QUALITY_PS > 3)", "        if(doneNP) {", "            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "            doneN = abs(lumaEndN) >= gradientScaled;", "            doneP = abs(lumaEndP) >= gradientScaled;", "            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;", "            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;", "            doneNP = (!doneN) || (!doneP);", "            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;", "            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;", "/*--------------------------------------------------------------------------*/", "            #if (FXAA_QUALITY_PS > 4)", "            if(doneNP) {", "                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                doneN = abs(lumaEndN) >= gradientScaled;", "                doneP = abs(lumaEndP) >= gradientScaled;", "                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;", "                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;", "                doneNP = (!doneN) || (!doneP);", "                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;", "                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;", "/*--------------------------------------------------------------------------*/", "                #if (FXAA_QUALITY_PS > 5)", "                if(doneNP) {", "                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                    doneN = abs(lumaEndN) >= gradientScaled;", "                    doneP = abs(lumaEndP) >= gradientScaled;", "                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;", "                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;", "                    doneNP = (!doneN) || (!doneP);", "                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;", "                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;", "/*--------------------------------------------------------------------------*/", "                    #if (FXAA_QUALITY_PS > 6)", "                    if(doneNP) {", "                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                        doneN = abs(lumaEndN) >= gradientScaled;", "                        doneP = abs(lumaEndP) >= gradientScaled;", "                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;", "                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;", "                        doneNP = (!doneN) || (!doneP);", "                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;", "                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;", "/*--------------------------------------------------------------------------*/", "                        #if (FXAA_QUALITY_PS > 7)", "                        if(doneNP) {", "                            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                            doneN = abs(lumaEndN) >= gradientScaled;", "                            doneP = abs(lumaEndP) >= gradientScaled;", "                            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;", "                            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;", "                            doneNP = (!doneN) || (!doneP);", "                            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;", "                            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;", "/*--------------------------------------------------------------------------*/", "    #if (FXAA_QUALITY_PS > 8)", "    if(doneNP) {", "        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "        doneN = abs(lumaEndN) >= gradientScaled;", "        doneP = abs(lumaEndP) >= gradientScaled;", "        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;", "        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;", "        doneNP = (!doneN) || (!doneP);", "        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;", "        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;", "/*--------------------------------------------------------------------------*/", "        #if (FXAA_QUALITY_PS > 9)", "        if(doneNP) {", "            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "            doneN = abs(lumaEndN) >= gradientScaled;", "            doneP = abs(lumaEndP) >= gradientScaled;", "            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;", "            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;", "            doneNP = (!doneN) || (!doneP);", "            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;", "            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;", "/*--------------------------------------------------------------------------*/", "            #if (FXAA_QUALITY_PS > 10)", "            if(doneNP) {", "                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                doneN = abs(lumaEndN) >= gradientScaled;", "                doneP = abs(lumaEndP) >= gradientScaled;", "                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;", "                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;", "                doneNP = (!doneN) || (!doneP);", "                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;", "                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;", "/*--------------------------------------------------------------------------*/", "                #if (FXAA_QUALITY_PS > 11)", "                if(doneNP) {", "                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                    doneN = abs(lumaEndN) >= gradientScaled;", "                    doneP = abs(lumaEndP) >= gradientScaled;", "                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;", "                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;", "                    doneNP = (!doneN) || (!doneP);", "                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;", "                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;", "/*--------------------------------------------------------------------------*/", "                    #if (FXAA_QUALITY_PS > 12)", "                    if(doneNP) {", "                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));", "                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));", "                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;", "                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;", "                        doneN = abs(lumaEndN) >= gradientScaled;", "                        doneP = abs(lumaEndP) >= gradientScaled;", "                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;", "                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;", "                        doneNP = (!doneN) || (!doneP);", "                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;", "                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;", "/*--------------------------------------------------------------------------*/", "                    }", "                    #endif", "/*--------------------------------------------------------------------------*/", "                }", "                #endif", "/*--------------------------------------------------------------------------*/", "            }", "            #endif", "/*--------------------------------------------------------------------------*/", "        }", "        #endif", "/*--------------------------------------------------------------------------*/", "    }", "    #endif", "/*--------------------------------------------------------------------------*/", "                        }", "                        #endif", "/*--------------------------------------------------------------------------*/", "                    }", "                    #endif", "/*--------------------------------------------------------------------------*/", "                }", "                #endif", "/*--------------------------------------------------------------------------*/", "            }", "            #endif", "/*--------------------------------------------------------------------------*/", "        }", "        #endif", "/*--------------------------------------------------------------------------*/", "    }", "/*--------------------------------------------------------------------------*/", "    FxaaFloat dstN = posM.x - posN.x;", "    FxaaFloat dstP = posP.x - posM.x;", "    if(!horzSpan) dstN = posM.y - posN.y;", "    if(!horzSpan) dstP = posP.y - posM.y;", "/*--------------------------------------------------------------------------*/", "    FxaaBool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;", "    FxaaFloat spanLength = (dstP + dstN);", "    FxaaBool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;", "    FxaaFloat spanLengthRcp = 1.0/spanLength;", "/*--------------------------------------------------------------------------*/", "    FxaaBool directionN = dstN < dstP;", "    FxaaFloat dst = min(dstN, dstP);", "    FxaaBool goodSpan = directionN ? goodSpanN : goodSpanP;", "    FxaaFloat subpixG = subpixF * subpixF;", "    FxaaFloat pixelOffset = (dst * (-spanLengthRcp)) + 0.5;", "    FxaaFloat subpixH = subpixG * fxaaQualitySubpix;", "/*--------------------------------------------------------------------------*/", "    FxaaFloat pixelOffsetGood = goodSpan ? pixelOffset : 0.0;", "    FxaaFloat pixelOffsetSubpix = max(pixelOffsetGood, subpixH);", "    if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;", "    if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;", "    #if (FXAA_DISCARD == 1)", "        return FxaaTexTop(tex, posM);", "    #else", "        return FxaaFloat4(FxaaTexTop(tex, posM).xyz, lumaM);", "    #endif", "}", "/*==========================================================================*/", "#endif", "", "void main() {", "  gl_FragColor = FxaaPixelShader(", "    vUv,", "    vec4(0.0),", "    tDiffuse,", "    tDiffuse,", "    tDiffuse,", "    resolution,", "    vec4(0.0),", "    vec4(0.0),", "    vec4(0.0),", "    0.75,", "    0.166,", "    0.0833,", "    0.0,", "    0.0,", "    0.0,", "    vec4(0.0)", "  );", "", "  // TODO avoid querying texture twice for same texel", "  gl_FragColor.a = texture2D(tDiffuse, vUv).a;", "}"].join("\n")
};
"use strict";

/**
 * @author alteredq / http://alteredqualia.com/
 */
THREE.EffectComposer = function (renderer, renderTarget) {
  this.renderer = renderer;

  if (renderTarget === undefined) {
    var parameters = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      stencilBuffer: false
    };
    var size = renderer.getSize(new THREE.Vector2());
    this._pixelRatio = renderer.getPixelRatio();
    this._width = size.width;
    this._height = size.height;
    renderTarget = new THREE.WebGLRenderTarget(this._width * this._pixelRatio, this._height * this._pixelRatio, parameters);
    renderTarget.texture.name = 'EffectComposer.rt1';
  } else {
    this._pixelRatio = 1;
    this._width = renderTarget.width;
    this._height = renderTarget.height;
  }

  this.renderTarget1 = renderTarget;
  this.renderTarget2 = renderTarget.clone();
  this.renderTarget2.texture.name = 'EffectComposer.rt2';
  this.writeBuffer = this.renderTarget1;
  this.readBuffer = this.renderTarget2;
  this.renderToScreen = true;
  this.passes = []; // dependencies

  if (THREE.CopyShader === undefined) {
    console.error('THREE.EffectComposer relies on THREE.CopyShader');
  }

  if (THREE.ShaderPass === undefined) {
    console.error('THREE.EffectComposer relies on THREE.ShaderPass');
  }

  this.copyPass = new THREE.ShaderPass(THREE.CopyShader);
  this.clock = new THREE.Clock();
};

Object.assign(THREE.EffectComposer.prototype, {
  swapBuffers: function swapBuffers() {
    var tmp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = tmp;
  },
  addPass: function addPass(pass) {
    this.passes.push(pass);
    var size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    pass.setSize(size.width, size.height);
  },
  insertPass: function insertPass(pass, index) {
    this.passes.splice(index, 0, pass);
  },
  isLastEnabledPass: function isLastEnabledPass(passIndex) {
    for (var i = passIndex + 1; i < this.passes.length; i++) {
      if (this.passes[i].enabled) {
        return false;
      }
    }

    return true;
  },
  render: function render(deltaTime) {
    // deltaTime value is in seconds
    if (deltaTime === undefined) {
      deltaTime = this.clock.getDelta();
    }

    var currentRenderTarget = this.renderer.getRenderTarget();
    var maskActive = false;
    var pass,
        i,
        il = this.passes.length;

    for (i = 0; i < il; i++) {
      pass = this.passes[i];
      if (pass.enabled === false) continue;
      pass.renderToScreen = this.renderToScreen && this.isLastEnabledPass(i);
      pass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive);

      if (pass.needsSwap) {
        if (maskActive) {
          var context = this.renderer.context;
          context.stencilFunc(context.NOTEQUAL, 1, 0xffffffff);
          this.copyPass.render(this.renderer, this.writeBuffer, this.readBuffer, deltaTime);
          context.stencilFunc(context.EQUAL, 1, 0xffffffff);
        }

        this.swapBuffers();
      }

      if (THREE.MaskPass !== undefined) {
        if (pass instanceof THREE.MaskPass) {
          maskActive = true;
        } else if (pass instanceof THREE.ClearMaskPass) {
          maskActive = false;
        }
      }
    }

    this.renderer.setRenderTarget(currentRenderTarget);
  },
  reset: function reset(renderTarget) {
    if (renderTarget === undefined) {
      var size = this.renderer.getSize(new THREE.Vector2());
      this._pixelRatio = this.renderer.getPixelRatio();
      this._width = size.width;
      this._height = size.height;
      renderTarget = this.renderTarget1.clone();
      renderTarget.setSize(this._width * this._pixelRatio, this._height * this._pixelRatio);
    }

    this.renderTarget1.dispose();
    this.renderTarget2.dispose();
    this.renderTarget1 = renderTarget;
    this.renderTarget2 = renderTarget.clone();
    this.writeBuffer = this.renderTarget1;
    this.readBuffer = this.renderTarget2;
  },
  setSize: function setSize(width, height) {
    this._width = width;
    this._height = height;
    var effectiveWidth = this._width * this._pixelRatio;
    var effectiveHeight = this._height * this._pixelRatio;
    this.renderTarget1.setSize(effectiveWidth, effectiveHeight);
    this.renderTarget2.setSize(effectiveWidth, effectiveHeight);

    for (var i = 0; i < this.passes.length; i++) {
      this.passes[i].setSize(effectiveWidth, effectiveHeight);
    }
  },
  setPixelRatio: function setPixelRatio(pixelRatio) {
    this._pixelRatio = pixelRatio;
    this.setSize(this._width, this._height);
  }
});

THREE.Pass = function () {
  // if set to true, the pass is processed by the composer
  this.enabled = true; // if set to true, the pass indicates to swap read and write buffer after rendering

  this.needsSwap = true; // if set to true, the pass clears its buffer before rendering

  this.clear = false; // if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.

  this.renderToScreen = false;
};

Object.assign(THREE.Pass.prototype, {
  setSize: function setSize()
  /* width, height */
  {},
  render: function render()
  /* renderer, writeBuffer, readBuffer, deltaTime, maskActive */
  {
    console.error('THREE.Pass: .render() must be implemented in derived pass.');
  }
}); // Helper for passes that need to fill the viewport with a single quad.

THREE.Pass.FullScreenQuad = function () {
  var camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var geometry = new THREE.PlaneBufferGeometry(2, 2);

  var FullScreenQuad = function FullScreenQuad(material) {
    this._mesh = new THREE.Mesh(geometry, material);
  };

  Object.defineProperty(FullScreenQuad.prototype, 'material', {
    get: function get() {
      return this._mesh.material;
    },
    set: function set(value) {
      this._mesh.material = value;
    }
  });
  Object.assign(FullScreenQuad.prototype, {
    render: function render(renderer) {
      renderer.render(this._mesh, camera);
    }
  });
  return FullScreenQuad;
}();
"use strict";

/**
 * @author alteredq / http://alteredqualia.com/
 */
THREE.RenderPass = function (scene, camera, overrideMaterial, clearColor, clearAlpha) {
  THREE.Pass.call(this);
  this.scene = scene;
  this.camera = camera;
  this.overrideMaterial = overrideMaterial;
  this.clearColor = clearColor;
  this.clearAlpha = clearAlpha !== undefined ? clearAlpha : 0;
  this.clear = true;
  this.clearDepth = false;
  this.needsSwap = false;
};

THREE.RenderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.RenderPass,
  render: function render(renderer, writeBuffer, readBuffer
  /*, deltaTime, maskActive */
  ) {
    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;
    this.scene.overrideMaterial = this.overrideMaterial;
    var oldClearColor, oldClearAlpha;

    if (this.clearColor) {
      oldClearColor = renderer.getClearColor().getHex();
      oldClearAlpha = renderer.getClearAlpha();
      renderer.setClearColor(this.clearColor, this.clearAlpha);
    }

    if (this.clearDepth) {
      renderer.clearDepth();
    }

    renderer.setRenderTarget(this.renderToScreen ? null : readBuffer); // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600

    if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
    renderer.render(this.scene, this.camera);

    if (this.clearColor) {
      renderer.setClearColor(oldClearColor, oldClearAlpha);
    }

    this.scene.overrideMaterial = null;
    renderer.autoClear = oldAutoClear;
  }
});
"use strict";

/**
 * @author alteredq / http://alteredqualia.com/
 */
THREE.ShaderPass = function (shader, textureID) {
  THREE.Pass.call(this);
  this.textureID = textureID !== undefined ? textureID : "tDiffuse";

  if (shader instanceof THREE.ShaderMaterial) {
    this.uniforms = shader.uniforms;
    this.material = shader;
  } else if (shader) {
    this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);
    this.material = new THREE.ShaderMaterial({
      defines: Object.assign({}, shader.defines),
      uniforms: this.uniforms,
      vertexShader: shader.vertexShader,
      fragmentShader: shader.fragmentShader
    });
  }

  this.fsQuad = new THREE.Pass.FullScreenQuad(this.material);
};

THREE.ShaderPass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.ShaderPass,
  render: function render(renderer, writeBuffer, readBuffer
  /*, deltaTime, maskActive */
  ) {
    if (this.uniforms[this.textureID]) {
      this.uniforms[this.textureID].value = readBuffer.texture;
    }

    this.fsQuad.material = this.material;

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(writeBuffer); // TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600

      if (this.clear) renderer.clear(renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil);
      this.fsQuad.render(renderer);
    }
  }
});
'use strict';

function toggleFullScreen() {
  // eslint-disable-line no-unused-vars
  // reference: https://stackoverflow.com/questions/3900701/onclick-go-full-screen
  if (document.fullScreenElement && document.fullScreenElement !== null || !document.mozFullScreen && !document.webkitIsFullScreen) {
    if (document.documentElement.requestFullScreen) document.documentElement.requestFullScreen();else if (document.documentElement.mozRequestFullScreen) document.documentElement.mozRequestFullScreen();else if (document.documentElement.webkitRequestFullScreen) document.documentElement.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
  } else {
    if (document.cancelFullScreen) document.cancelFullScreen();else if (document.mozCancelFullScreen) document.mozCancelFullScreen();else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
  }
}
/* global Map */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Observable =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Observable() {
    _classCallCheck(this, Observable);

    this.observers = new Map();
  }

  _createClass(Observable, [{
    key: "addObserver",
    value: function addObserver(label, callback) {
      this.observers.has(label) || this.observers.set(label, []);
      this.observers.get(label).push(callback);
    }
  }, {
    key: "notify",
    value: function notify(label, e) {
      var observers = this.observers.get(label);

      if (observers && observers.length) {
        observers.forEach(function (callback) {
          callback(e);
        });
      }
    }
  }]);

  return Observable;
}();
/* global THREE */
'use strict';
/**
 * @author spidersharma / http://eduperiment.com/
 */

THREE.OutlinePass = function (resolution, scene, camera, selectedObjects) {
  this.renderScene = scene;
  this.renderCamera = camera;
  this.selectedObjects = selectedObjects !== undefined ? selectedObjects : [];
  this.visibleEdgeColor = new THREE.Color(1, 1, 1);
  this.hiddenEdgeColor = new THREE.Color(0.1, 0.04, 0.02);
  this.edgeGlow = 0.0;
  this.usePatternTexture = false;
  this.edgeThickness = 1.0;
  this.edgeStrength = 3.0;
  this.downSampleRatio = 2;
  this.pulsePeriod = 0;
  THREE.Pass.call(this);
  this.resolution = resolution !== undefined ? new THREE.Vector2(resolution.x, resolution.y) : new THREE.Vector2(256, 256);
  var pars = {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    format: THREE.RGBAFormat
  };
  var resx = Math.round(this.resolution.x / this.downSampleRatio);
  var resy = Math.round(this.resolution.y / this.downSampleRatio);
  this.maskBufferMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });
  this.maskBufferMaterial.side = THREE.DoubleSide;
  this.renderTargetMaskBuffer = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, pars);
  this.renderTargetMaskBuffer.texture.name = 'OutlinePass.mask';
  this.renderTargetMaskBuffer.texture.generateMipmaps = false;
  this.depthMaterial = new THREE.MeshDepthMaterial();
  this.depthMaterial.side = THREE.DoubleSide;
  this.depthMaterial.depthPacking = THREE.RGBADepthPacking;
  this.depthMaterial.blending = THREE.NoBlending;
  this.prepareMaskMaterial = this.getPrepareMaskMaterial();
  this.prepareMaskMaterial.side = THREE.DoubleSide;
  this.prepareMaskMaterial.fragmentShader = replaceDepthToViewZ(this.prepareMaskMaterial.fragmentShader, this.renderCamera);
  this.renderTargetDepthBuffer = new THREE.WebGLRenderTarget(this.resolution.x, this.resolution.y, pars);
  this.renderTargetDepthBuffer.texture.name = 'OutlinePass.depth';
  this.renderTargetDepthBuffer.texture.generateMipmaps = false;
  this.renderTargetMaskDownSampleBuffer = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetMaskDownSampleBuffer.texture.name = 'OutlinePass.depthDownSample';
  this.renderTargetMaskDownSampleBuffer.texture.generateMipmaps = false;
  this.renderTargetBlurBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetBlurBuffer1.texture.name = 'OutlinePass.blur1';
  this.renderTargetBlurBuffer1.texture.generateMipmaps = false;
  this.renderTargetBlurBuffer2 = new THREE.WebGLRenderTarget(Math.round(resx / 2), Math.round(resy / 2), pars);
  this.renderTargetBlurBuffer2.texture.name = 'OutlinePass.blur2';
  this.renderTargetBlurBuffer2.texture.generateMipmaps = false;
  this.edgeDetectionMaterial = this.getEdgeDetectionMaterial();
  this.renderTargetEdgeBuffer1 = new THREE.WebGLRenderTarget(resx, resy, pars);
  this.renderTargetEdgeBuffer1.texture.name = 'OutlinePass.edge1';
  this.renderTargetEdgeBuffer1.texture.generateMipmaps = false;
  this.renderTargetEdgeBuffer2 = new THREE.WebGLRenderTarget(Math.round(resx / 2), Math.round(resy / 2), pars);
  this.renderTargetEdgeBuffer2.texture.name = 'OutlinePass.edge2';
  this.renderTargetEdgeBuffer2.texture.generateMipmaps = false;
  var MAX_EDGE_THICKNESS = 4;
  var MAX_EDGE_GLOW = 4;
  this.separableBlurMaterial1 = this.getSeperableBlurMaterial(MAX_EDGE_THICKNESS);
  this.separableBlurMaterial1.uniforms['texSize'].value = new THREE.Vector2(resx, resy);
  this.separableBlurMaterial1.uniforms['kernelRadius'].value = 1;
  this.separableBlurMaterial2 = this.getSeperableBlurMaterial(MAX_EDGE_GLOW);
  this.separableBlurMaterial2.uniforms['texSize'].value = new THREE.Vector2(Math.round(resx / 2), Math.round(resy / 2));
  this.separableBlurMaterial2.uniforms['kernelRadius'].value = MAX_EDGE_GLOW; // Overlay material

  this.overlayMaterial = this.getOverlayMaterial(); // copy material

  if (THREE.CopyShader === undefined) console.error('THREE.OutlinePass relies on THREE.CopyShader');
  var copyShader = THREE.CopyShader;
  this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
  this.copyUniforms['opacity'].value = 1.0;
  this.materialCopy = new THREE.ShaderMaterial({
    uniforms: this.copyUniforms,
    vertexShader: copyShader.vertexShader,
    fragmentShader: copyShader.fragmentShader,
    blending: THREE.NoBlending,
    depthTest: false,
    depthWrite: false,
    transparent: true
  });
  this.enabled = true;
  this.needsSwap = false;
  this.oldClearColor = new THREE.Color();
  this.oldClearAlpha = 1;
  this.fsQuad = new THREE.Pass.FullScreenQuad(null);
  this.tempPulseColor1 = new THREE.Color();
  this.tempPulseColor2 = new THREE.Color();
  this.textureMatrix = new THREE.Matrix4();

  function replaceDepthToViewZ(string, camera) {
    var type = camera.isPerspectiveCamera ? 'perspective' : 'orthographic';
    return string.replace(/DEPTH_TO_VIEW_Z/g, type + 'DepthToViewZ');
  }
};

THREE.OutlinePass.prototype = Object.assign(Object.create(THREE.Pass.prototype), {
  constructor: THREE.OutlinePass,
  dispose: function dispose() {
    this.renderTargetMaskBuffer.dispose();
    this.renderTargetDepthBuffer.dispose();
    this.renderTargetMaskDownSampleBuffer.dispose();
    this.renderTargetBlurBuffer1.dispose();
    this.renderTargetBlurBuffer2.dispose();
    this.renderTargetEdgeBuffer1.dispose();
    this.renderTargetEdgeBuffer2.dispose();
  },
  setSize: function setSize(width, height) {
    this.renderTargetMaskBuffer.setSize(width, height);
    var resx = Math.round(width / this.downSampleRatio);
    var resy = Math.round(height / this.downSampleRatio);
    this.renderTargetMaskDownSampleBuffer.setSize(resx, resy);
    this.renderTargetBlurBuffer1.setSize(resx, resy);
    this.renderTargetEdgeBuffer1.setSize(resx, resy);
    this.separableBlurMaterial1.uniforms['texSize'].value = new THREE.Vector2(resx, resy);
    resx = Math.round(resx / 2);
    resy = Math.round(resy / 2);
    this.renderTargetBlurBuffer2.setSize(resx, resy);
    this.renderTargetEdgeBuffer2.setSize(resx, resy);
    this.separableBlurMaterial2.uniforms['texSize'].value = new THREE.Vector2(resx, resy);
  },
  changeVisibilityOfSelectedObjects: function changeVisibilityOfSelectedObjects(bVisible) {
    function gatherSelectedMeshesCallBack(object) {
      if (object.isMesh) {
        if (bVisible) {
          object.visible = object.userData.oldVisible;
          delete object.userData.oldVisible;
        } else {
          object.userData.oldVisible = object.visible;
          object.visible = bVisible;
        }
      }
    }

    for (var i = 0; i < this.selectedObjects.length; i++) {
      var selectedObject = this.selectedObjects[i];
      selectedObject.traverse(gatherSelectedMeshesCallBack);
    }
  },
  changeVisibilityOfNonSelectedObjects: function changeVisibilityOfNonSelectedObjects(bVisible) {
    var selectedMeshes = [];

    function gatherSelectedMeshesCallBack(object) {
      if (object.isMesh) selectedMeshes.push(object);
    }

    for (var i = 0; i < this.selectedObjects.length; i++) {
      var selectedObject = this.selectedObjects[i];
      selectedObject.traverse(gatherSelectedMeshesCallBack);
    }

    function VisibilityChangeCallBack(object) {
      if (object.isMesh || object.isLine || object.isSprite || object.isTransformControls) {
        // robot-designer note: this causes issues with the selector mechanism.
        var bFound = false;

        for (var i = 0; i < selectedMeshes.length; i++) {
          var selectedObjectId = selectedMeshes[i].id;

          if (selectedObjectId === object.id) {
            bFound = true;
            break;
          }
        }

        if (!bFound) {
          var visibility = object.visible;
          if (!bVisible || object.bVisible) object.visible = bVisible;
          object.bVisible = visibility;
        }
      }
    }

    this.renderScene.traverse(VisibilityChangeCallBack);
  },
  updateTextureMatrix: function updateTextureMatrix() {
    this.textureMatrix.set(0.5, 0.0, 0.0, 0.5, 0.0, 0.5, 0.0, 0.5, 0.0, 0.0, 0.5, 0.5, 0.0, 0.0, 0.0, 1.0);
    this.textureMatrix.multiply(this.renderCamera.projectionMatrix);
    this.textureMatrix.multiply(this.renderCamera.matrixWorldInverse);
  },
  render: function render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    if (this.selectedObjects.length > 0) {
      this.oldClearColor.copy(renderer.getClearColor());
      this.oldClearAlpha = renderer.getClearAlpha();
      var oldAutoClear = renderer.autoClear;
      renderer.autoClear = false;
      if (maskActive) renderer.context.disable(renderer.context.STENCIL_TEST);
      renderer.setClearColor(0xffffff, 1); // Make selected objects invisible
      // this.changeVisibilityOfSelectedObjects(false); // robot-designer note: this cause issues with the selector mechanism.

      var currentBackground = this.renderScene.background;
      this.renderScene.background = null; // 1. Draw Non Selected objects in the depth buffer

      this.renderScene.overrideMaterial = this.depthMaterial;
      renderer.setRenderTarget(this.renderTargetDepthBuffer);
      renderer.clear();
      renderer.render(this.renderScene, this.renderCamera); // Make selected objects visible
      // this.changeVisibilityOfSelectedObjects(true); // robot-designer note: this cause issues with the selector mechanism.
      // Update Texture Matrix for Depth compare

      this.updateTextureMatrix(); // Make non selected objects invisible, and draw only the selected objects, by comparing the depth buffer of non selected objects

      this.changeVisibilityOfNonSelectedObjects(false);
      this.renderScene.overrideMaterial = this.prepareMaskMaterial;
      this.prepareMaskMaterial.uniforms['cameraNearFar'].value = new THREE.Vector2(this.renderCamera.near, this.renderCamera.far);
      this.prepareMaskMaterial.uniforms['depthTexture'].value = this.renderTargetDepthBuffer.texture;
      this.prepareMaskMaterial.uniforms['textureMatrix'].value = this.textureMatrix;
      renderer.setRenderTarget(this.renderTargetMaskBuffer);
      renderer.clear();
      renderer.render(this.renderScene, this.renderCamera);
      this.renderScene.overrideMaterial = null;
      this.changeVisibilityOfNonSelectedObjects(true);
      this.renderScene.background = currentBackground; // 2. Downsample to Half resolution

      this.fsQuad.material = this.materialCopy;
      this.copyUniforms['tDiffuse'].value = this.renderTargetMaskBuffer.texture;
      renderer.setRenderTarget(this.renderTargetMaskDownSampleBuffer);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.tempPulseColor1.copy(this.visibleEdgeColor);
      this.tempPulseColor2.copy(this.hiddenEdgeColor);

      if (this.pulsePeriod > 0) {
        var scalar = (1 + 0.25) / 2 + Math.cos(performance.now() * 0.01 / this.pulsePeriod) * (1.0 - 0.25) / 2;
        this.tempPulseColor1.multiplyScalar(scalar);
        this.tempPulseColor2.multiplyScalar(scalar);
      } // 3. Apply Edge Detection Pass


      this.fsQuad.material = this.edgeDetectionMaterial;
      this.edgeDetectionMaterial.uniforms['maskTexture'].value = this.renderTargetMaskDownSampleBuffer.texture;
      this.edgeDetectionMaterial.uniforms['texSize'].value = new THREE.Vector2(this.renderTargetMaskDownSampleBuffer.width, this.renderTargetMaskDownSampleBuffer.height);
      this.edgeDetectionMaterial.uniforms['visibleEdgeColor'].value = this.tempPulseColor1;
      this.edgeDetectionMaterial.uniforms['hiddenEdgeColor'].value = this.tempPulseColor2;
      renderer.setRenderTarget(this.renderTargetEdgeBuffer1);
      renderer.clear();
      this.fsQuad.render(renderer); // 4. Apply Blur on Half res

      this.fsQuad.material = this.separableBlurMaterial1;
      this.separableBlurMaterial1.uniforms['colorTexture'].value = this.renderTargetEdgeBuffer1.texture;
      this.separableBlurMaterial1.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionX;
      this.separableBlurMaterial1.uniforms['kernelRadius'].value = this.edgeThickness;
      renderer.setRenderTarget(this.renderTargetBlurBuffer1);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.separableBlurMaterial1.uniforms['colorTexture'].value = this.renderTargetBlurBuffer1.texture;
      this.separableBlurMaterial1.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetEdgeBuffer1);
      renderer.clear();
      this.fsQuad.render(renderer); // Apply Blur on quarter res

      this.fsQuad.material = this.separableBlurMaterial2;
      this.separableBlurMaterial2.uniforms['colorTexture'].value = this.renderTargetEdgeBuffer1.texture;
      this.separableBlurMaterial2.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionX;
      renderer.setRenderTarget(this.renderTargetBlurBuffer2);
      renderer.clear();
      this.fsQuad.render(renderer);
      this.separableBlurMaterial2.uniforms['colorTexture'].value = this.renderTargetBlurBuffer2.texture;
      this.separableBlurMaterial2.uniforms['direction'].value = THREE.OutlinePass.BlurDirectionY;
      renderer.setRenderTarget(this.renderTargetEdgeBuffer2);
      renderer.clear();
      this.fsQuad.render(renderer); // Blend it additively over the input texture

      this.fsQuad.material = this.overlayMaterial;
      this.overlayMaterial.uniforms['maskTexture'].value = this.renderTargetMaskBuffer.texture;
      this.overlayMaterial.uniforms['edgeTexture1'].value = this.renderTargetEdgeBuffer1.texture;
      this.overlayMaterial.uniforms['edgeTexture2'].value = this.renderTargetEdgeBuffer2.texture;
      this.overlayMaterial.uniforms['patternTexture'].value = this.patternTexture;
      this.overlayMaterial.uniforms['edgeStrength'].value = this.edgeStrength;
      this.overlayMaterial.uniforms['edgeGlow'].value = this.edgeGlow;
      this.overlayMaterial.uniforms['usePatternTexture'].value = this.usePatternTexture;
      if (maskActive) renderer.context.enable(renderer.context.STENCIL_TEST);
      renderer.setRenderTarget(readBuffer);
      this.fsQuad.render(renderer);
      renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
      renderer.autoClear = oldAutoClear;
    }

    if (this.renderToScreen) {
      this.fsQuad.material = this.materialCopy;
      this.copyUniforms['tDiffuse'].value = readBuffer.texture;
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    }
  },
  getPrepareMaskMaterial: function getPrepareMaskMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        'depthTexture': {
          value: null
        },
        'cameraNearFar': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'textureMatrix': {
          value: new THREE.Matrix4()
        }
      },
      vertexShader: ['varying vec4 projTexCoord;', 'varying vec4 vPosition;', 'uniform mat4 textureMatrix;', 'void main() {', '  vPosition = modelViewMatrix * vec4(position, 1.0);', '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);', '  projTexCoord = textureMatrix * worldPosition;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['#include <packing>', 'varying vec4 vPosition;', 'varying vec4 projTexCoord;', 'uniform sampler2D depthTexture;', 'uniform vec2 cameraNearFar;', 'void main() {', '  float depth = unpackRGBAToDepth(texture2DProj(depthTexture, projTexCoord));', '  float viewZ = - DEPTH_TO_VIEW_Z(depth, cameraNearFar.x, cameraNearFar.y);', '  float depthTest = (-vPosition.z > viewZ) ? 1.0 : 0.0;', '  gl_FragColor = vec4(0.0, depthTest, 1.0, 1.0);', '}'].join('\n')
    });
  },
  getEdgeDetectionMaterial: function getEdgeDetectionMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        'maskTexture': {
          value: null
        },
        'texSize': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'visibleEdgeColor': {
          value: new THREE.Vector3(1.0, 1.0, 1.0)
        },
        'hiddenEdgeColor': {
          value: new THREE.Vector3(1.0, 1.0, 1.0)
        }
      },
      vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['varying vec2 vUv;', 'uniform sampler2D maskTexture;', 'uniform vec2 texSize;', 'uniform vec3 visibleEdgeColor;', 'uniform vec3 hiddenEdgeColor;', 'void main() {', '  vec2 invSize = 1.0 / texSize;', '  vec4 uvOffset = vec4(1.0, 0.0, 0.0, 1.0) * vec4(invSize, invSize);', '  vec4 c1 = texture2D(maskTexture, vUv + uvOffset.xy);', '  vec4 c2 = texture2D(maskTexture, vUv - uvOffset.xy);', '  vec4 c3 = texture2D(maskTexture, vUv + uvOffset.yw);', '  vec4 c4 = texture2D(maskTexture, vUv - uvOffset.yw);', '  float diff1 = (c1.r - c2.r)*0.5;', '  float diff2 = (c3.r - c4.r)*0.5;', '  float d = length(vec2(diff1, diff2));', '  float a1 = min(c1.g, c2.g);', '  float a2 = min(c3.g, c4.g);', '  float visibilityFactor = min(a1, a2);', '  vec3 edgeColor = 1.0 - visibilityFactor > 0.001 ? visibleEdgeColor : hiddenEdgeColor;', '  gl_FragColor = vec4(edgeColor, 1.0) * vec4(d);', '}'].join('\n')
    });
  },
  getSeperableBlurMaterial: function getSeperableBlurMaterial(maxRadius) {
    return new THREE.ShaderMaterial({
      defines: {
        'MAX_RADIUS': maxRadius
      },
      uniforms: {
        'colorTexture': {
          value: null
        },
        'texSize': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'direction': {
          value: new THREE.Vector2(0.5, 0.5)
        },
        'kernelRadius': {
          value: 1.0
        }
      },
      vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['#include <common>', 'varying vec2 vUv;', 'uniform sampler2D colorTexture;', 'uniform vec2 direction;', 'uniform vec2 texSize;', 'uniform float kernelRadius;', 'float gaussianPdf(in float x, in float sigma) {', '  return 0.39894 * exp(-0.5 * x * x/(sigma * sigma))/sigma;', '}', 'void main() {', '  vec2 invSize = 1.0 / texSize;', '  float weightSum = gaussianPdf(0.0, kernelRadius);', '  vec3 diffuseSum = texture2D(colorTexture, vUv).rgb * weightSum;', '  vec2 delta = direction * invSize * kernelRadius/float(MAX_RADIUS);', '  vec2 uvOffset = delta;', '  for(int i = 1; i <= MAX_RADIUS; i ++) {', '    float w = gaussianPdf(uvOffset.x, kernelRadius);', '    vec3 sample1 = texture2D(colorTexture, vUv + uvOffset).rgb;', '    vec3 sample2 = texture2D(colorTexture, vUv - uvOffset).rgb;', '    diffuseSum += ((sample1 + sample2) * w);', '    weightSum += (2.0 * w);', '    uvOffset += delta;', '  }', '  gl_FragColor = vec4(diffuseSum/weightSum, 1.0);', '}'].join('\n')
    });
  },
  getOverlayMaterial: function getOverlayMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        'maskTexture': {
          value: null
        },
        'edgeTexture1': {
          value: null
        },
        'edgeTexture2': {
          value: null
        },
        'patternTexture': {
          value: null
        },
        'edgeStrength': {
          value: 1.0
        },
        'edgeGlow': {
          value: 1.0
        },
        'usePatternTexture': {
          value: 0.0
        }
      },
      vertexShader: ['varying vec2 vUv;', 'void main() {', '  vUv = uv;', '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);', '}'].join('\n'),
      fragmentShader: ['varying vec2 vUv;', 'uniform sampler2D maskTexture;', 'uniform sampler2D edgeTexture1;', 'uniform sampler2D edgeTexture2;', 'uniform sampler2D patternTexture;', 'uniform float edgeStrength;', 'uniform float edgeGlow;', 'uniform bool usePatternTexture;', 'void main() {', '  vec4 edgeValue1 = texture2D(edgeTexture1, vUv);', '  vec4 edgeValue2 = texture2D(edgeTexture2, vUv);', '  vec4 maskColor = texture2D(maskTexture, vUv);', '  vec4 patternColor = texture2D(patternTexture, 6.0 * vUv);', '  float visibilityFactor = 1.0 - maskColor.g > 0.0 ? 1.0 : 0.5;', '  vec4 edgeValue = edgeValue1 + edgeValue2 * edgeGlow;', '  vec4 finalColor = edgeStrength * maskColor.r * edgeValue;', '  if(usePatternTexture)', '    finalColor += + visibilityFactor * (1.0 - maskColor.r) * (1.0 - patternColor.r);', '  gl_FragColor = finalColor;', '}'].join('\n'),
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true
    });
  }
});
THREE.OutlinePass.BlurDirectionX = new THREE.Vector2(1.0, 0.0);
THREE.OutlinePass.BlurDirectionY = new THREE.Vector2(0.0, 1.0);
/* global THREE */
'use strict';
/**
 * @author arodic / https://github.com/arodic
 * robot-designer: modified to correctly handle the events and adjust the gizmo colors
 */

THREE.TransformControls = function (camera, domElement) {
  THREE.Object3D.call(this);
  domElement = domElement !== undefined ? domElement : document;
  this.visible = false;

  var _gizmo = new THREE.TransformControlsGizmo();

  this.add(_gizmo);

  var _plane = new THREE.TransformControlsPlane();

  this.add(_plane);
  var scope = this; // Define properties with getters/setter
  // Setting the defined property will automatically trigger change event
  // Defined properties are passed down to gizmo and plane

  defineProperty('camera', camera);
  defineProperty('object', undefined);
  defineProperty('enabled', true);
  defineProperty('axis', null);
  defineProperty('mode', 'translate');
  defineProperty('translationSnap', null);
  defineProperty('rotationSnap', null);
  defineProperty('space', 'world');
  defineProperty('size', 1);
  defineProperty('dragging', false);
  defineProperty('showX', true);
  defineProperty('showY', true);
  defineProperty('showZ', true);
  var changeEvent = {
    type: 'change'
  };
  var mouseDownEvent = {
    type: 'mouseDown'
  };
  var mouseUpEvent = {
    type: 'mouseUp',
    mode: scope.mode
  };
  var objectChangeEvent = {
    type: 'objectChange'
  }; // Reusable utility variables

  var ray = new THREE.Raycaster();

  var _tempVector = new THREE.Vector3();

  var _tempVector2 = new THREE.Vector3();

  var _tempQuaternion = new THREE.Quaternion();

  var _unit = {
    X: new THREE.Vector3(1, 0, 0),
    Y: new THREE.Vector3(0, 1, 0),
    Z: new THREE.Vector3(0, 0, 1)
  };
  var pointStart = new THREE.Vector3();
  var pointEnd = new THREE.Vector3();
  var offset = new THREE.Vector3();
  var rotationAxis = new THREE.Vector3();
  var startNorm = new THREE.Vector3();
  var endNorm = new THREE.Vector3();
  var rotationAngle = 0;
  var cameraPosition = new THREE.Vector3();
  var cameraQuaternion = new THREE.Quaternion();
  var cameraScale = new THREE.Vector3();
  var parentPosition = new THREE.Vector3();
  var parentQuaternion = new THREE.Quaternion();
  var parentQuaternionInv = new THREE.Quaternion();
  var parentScale = new THREE.Vector3();
  var worldPositionStart = new THREE.Vector3();
  var worldQuaternionStart = new THREE.Quaternion();
  var worldScaleStart = new THREE.Vector3();
  var worldPosition = new THREE.Vector3();
  var worldQuaternion = new THREE.Quaternion();
  var worldQuaternionInv = new THREE.Quaternion();
  var worldScale = new THREE.Vector3();
  var eye = new THREE.Vector3();
  var positionStart = new THREE.Vector3();
  var quaternionStart = new THREE.Quaternion();
  var scaleStart = new THREE.Vector3(); // TODO: remove properties unused in plane and gizmo

  defineProperty('worldPosition', worldPosition);
  defineProperty('worldPositionStart', worldPositionStart);
  defineProperty('worldQuaternion', worldQuaternion);
  defineProperty('worldQuaternionStart', worldQuaternionStart);
  defineProperty('cameraPosition', cameraPosition);
  defineProperty('cameraQuaternion', cameraQuaternion);
  defineProperty('pointStart', pointStart);
  defineProperty('pointEnd', pointEnd);
  defineProperty('rotationAxis', rotationAxis);
  defineProperty('rotationAngle', rotationAngle);
  defineProperty('eye', eye);
  domElement.addEventListener('mousedown', onPointerDown, false);
  domElement.addEventListener('touchstart', onPointerDown, false);
  domElement.addEventListener('mousemove', onPointerHover, false);
  domElement.addEventListener('touchmove', onPointerHover, false);
  domElement.addEventListener('touchmove', onPointerMove, false);
  document.addEventListener('mouseup', onPointerUp, false);
  domElement.addEventListener('touchend', onPointerUp, false);
  domElement.addEventListener('touchcancel', onPointerUp, false);
  domElement.addEventListener('touchleave', onPointerUp, false);

  this.dispose = function () {
    domElement.removeEventListener('mousedown', onPointerDown);
    domElement.removeEventListener('touchstart', onPointerDown);
    domElement.removeEventListener('mousemove', onPointerHover);
    domElement.removeEventListener('touchmove', onPointerHover);
    domElement.removeEventListener('touchmove', onPointerMove);
    document.removeEventListener('mouseup', onPointerUp);
    domElement.removeEventListener('touchend', onPointerUp);
    domElement.removeEventListener('touchcancel', onPointerUp);
    domElement.removeEventListener('touchleave', onPointerUp);
    this.traverse(function (child) {
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    });
  }; // Set current object


  this.attach = function (object) {
    this.object = object;
    this.visible = true;
  }; // Detatch from object


  this.detach = function () {
    this.object = undefined;
    this.visible = false;
    this.axis = null;
  }; // Defined getter, setter and store for a property


  function defineProperty(propName, defaultValue) {
    var propValue = defaultValue;
    Object.defineProperty(scope, propName, {
      get: function get() {
        return propValue !== undefined ? propValue : defaultValue;
      },
      set: function set(value) {
        if (propValue !== value) {
          propValue = value;
          _plane[propName] = value;
          _gizmo[propName] = value;
          scope.dispatchEvent({
            type: propName + '-changed',
            value: value
          });
          scope.dispatchEvent(changeEvent);
        }
      }
    });
    scope[propName] = defaultValue;
    _plane[propName] = defaultValue;
    _gizmo[propName] = defaultValue;
  } // updateMatrixWorld  updates key transformation variables


  this.updateMatrixWorld = function () {
    if (this.object !== undefined) {
      this.object.updateMatrixWorld();
      this.object.parent.matrixWorld.decompose(parentPosition, parentQuaternion, parentScale);
      this.object.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
      parentQuaternionInv.copy(parentQuaternion).inverse();
      worldQuaternionInv.copy(worldQuaternion).inverse();
    }

    this.camera.updateMatrixWorld();
    this.camera.matrixWorld.decompose(cameraPosition, cameraQuaternion, cameraScale);
    if (this.camera instanceof THREE.PerspectiveCamera) eye.copy(cameraPosition).sub(worldPosition).normalize();else if (this.camera instanceof THREE.OrthographicCamera) eye.copy(cameraPosition).normalize();
    THREE.Object3D.prototype.updateMatrixWorld.call(this);
  };

  this.pointerHover = function (pointer) {
    if (this.object === undefined || this.dragging === true || pointer.button !== undefined && pointer.button !== 0) return;
    ray.setFromCamera(pointer, this.camera);
    var intersect = ray.intersectObjects(_gizmo.picker[this.mode].children, true)[0] || false;
    if (intersect) this.axis = intersect.object.name;else this.axis = null;
  };

  this.pointerDown = function (pointer) {
    if (this.object === undefined || this.dragging === true || pointer.button !== undefined && pointer.button !== 0) return;

    if ((pointer.button === 0 || pointer.button === undefined) && this.axis !== null) {
      ray.setFromCamera(pointer, this.camera);
      var planeIntersect = ray.intersectObjects([_plane], true)[0] || false;

      if (planeIntersect) {
        var space = this.space;
        if (this.mode === 'scale') space = 'local';else if (this.axis === 'E' || this.axis === 'XYZE' || this.axis === 'XYZ') space = 'world';

        if (space === 'local' && this.mode === 'rotate') {
          var snap = this.rotationSnap;
          if (this.axis === 'X' && snap) this.object.rotation.x = Math.round(this.object.rotation.x / snap) * snap;
          if (this.axis === 'Y' && snap) this.object.rotation.y = Math.round(this.object.rotation.y / snap) * snap;
          if (this.axis === 'Z' && snap) this.object.rotation.z = Math.round(this.object.rotation.z / snap) * snap;
        }

        this.object.updateMatrixWorld();
        this.object.parent.updateMatrixWorld();
        positionStart.copy(this.object.position);
        quaternionStart.copy(this.object.quaternion);
        scaleStart.copy(this.object.scale);
        this.object.matrixWorld.decompose(worldPositionStart, worldQuaternionStart, worldScaleStart);
        pointStart.copy(planeIntersect.point).sub(worldPositionStart);
      }

      this.dragging = true;
      mouseDownEvent.mode = this.mode;
      this.dispatchEvent(mouseDownEvent);
    }
  };

  this.pointerMove = function (pointer) {
    var axis = this.axis;
    var mode = this.mode;
    var object = this.object;
    var space = this.space;
    if (mode === 'scale') space = 'local';else if (axis === 'E' || axis === 'XYZE' || axis === 'XYZ') space = 'world';
    if (object === undefined || axis === null || this.dragging === false || pointer.button !== undefined && pointer.button !== 0) return;
    ray.setFromCamera(pointer, this.camera);
    var planeIntersect = ray.intersectObjects([_plane], true)[0] || false;
    if (planeIntersect === false) return;
    pointEnd.copy(planeIntersect.point).sub(worldPositionStart);

    if (mode === 'translate') {
      // Apply translate
      offset.copy(pointEnd).sub(pointStart);
      if (space === 'local' && axis !== 'XYZ') offset.applyQuaternion(worldQuaternionInv);
      if (axis.indexOf('X') === -1) offset.x = 0;
      if (axis.indexOf('Y') === -1) offset.y = 0;
      if (axis.indexOf('Z') === -1) offset.z = 0;
      if (space === 'local' && axis !== 'XYZ') offset.applyQuaternion(quaternionStart).divide(parentScale);else offset.applyQuaternion(parentQuaternionInv).divide(parentScale);
      object.position.copy(offset).add(positionStart); // Apply translation snap

      if (this.translationSnap) {
        if (space === 'local') {
          object.position.applyQuaternion(_tempQuaternion.copy(quaternionStart).inverse());
          if (axis.search('X') !== -1) object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
          if (axis.search('Y') !== -1) object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
          if (axis.search('Z') !== -1) object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
          object.position.applyQuaternion(quaternionStart);
        }

        if (space === 'world') {
          if (object.parent) object.position.add(_tempVector.setFromMatrixPosition(object.parent.matrixWorld));
          if (axis.search('X') !== -1) object.position.x = Math.round(object.position.x / this.translationSnap) * this.translationSnap;
          if (axis.search('Y') !== -1) object.position.y = Math.round(object.position.y / this.translationSnap) * this.translationSnap;
          if (axis.search('Z') !== -1) object.position.z = Math.round(object.position.z / this.translationSnap) * this.translationSnap;
          if (object.parent) object.position.sub(_tempVector.setFromMatrixPosition(object.parent.matrixWorld));
        }
      }
    } else if (mode === 'scale') {
      if (axis.search('XYZ') !== -1) {
        var d = pointEnd.length() / pointStart.length();
        if (pointEnd.dot(pointStart) < 0) d *= -1;

        _tempVector2.set(d, d, d);
      } else {
        _tempVector.copy(pointStart);

        _tempVector2.copy(pointEnd);

        _tempVector.applyQuaternion(worldQuaternionInv);

        _tempVector2.applyQuaternion(worldQuaternionInv);

        _tempVector2.divide(_tempVector);

        if (axis.search('X') === -1) _tempVector2.x = 1;
        if (axis.search('Y') === -1) _tempVector2.y = 1;
        if (axis.search('Z') === -1) _tempVector2.z = 1;
      } // Apply scale


      object.scale.copy(scaleStart).multiply(_tempVector2);
    } else if (mode === 'rotate') {
      offset.copy(pointEnd).sub(pointStart);
      var ROTATION_SPEED = 20 / worldPosition.distanceTo(_tempVector.setFromMatrixPosition(this.camera.matrixWorld));

      if (axis === 'E') {
        rotationAxis.copy(eye);
        rotationAngle = pointEnd.angleTo(pointStart);
        startNorm.copy(pointStart).normalize();
        endNorm.copy(pointEnd).normalize();
        rotationAngle *= endNorm.cross(startNorm).dot(eye) < 0 ? 1 : -1;
      } else if (axis === 'XYZE') {
        rotationAxis.copy(offset).cross(eye).normalize();
        rotationAngle = offset.dot(_tempVector.copy(rotationAxis).cross(this.eye)) * ROTATION_SPEED;
      } else if (axis === 'X' || axis === 'Y' || axis === 'Z') {
        rotationAxis.copy(_unit[axis]);

        _tempVector.copy(_unit[axis]);

        if (space === 'local') _tempVector.applyQuaternion(worldQuaternion);
        rotationAngle = offset.dot(_tempVector.cross(eye).normalize()) * ROTATION_SPEED;
      } // Apply rotation snap


      if (this.rotationSnap) rotationAngle = Math.round(rotationAngle / this.rotationSnap) * this.rotationSnap;
      this.rotationAngle = rotationAngle; // Apply rotate

      if (space === 'local' && axis !== 'E' && axis !== 'XYZE') {
        object.quaternion.copy(quaternionStart);
        object.quaternion.multiply(_tempQuaternion.setFromAxisAngle(rotationAxis, rotationAngle)).normalize();
      } else {
        rotationAxis.applyQuaternion(parentQuaternionInv);
        object.quaternion.copy(_tempQuaternion.setFromAxisAngle(rotationAxis, rotationAngle));
        object.quaternion.multiply(quaternionStart).normalize();
      }
    }

    this.dispatchEvent(changeEvent);
    this.dispatchEvent(objectChangeEvent);
  };

  this.pointerUp = function (pointer) {
    if (pointer.button !== undefined && pointer.button !== 0) return;

    if (this.dragging && this.axis !== null) {
      mouseUpEvent.mode = this.mode;
      this.dispatchEvent(mouseUpEvent);
    }

    this.dragging = false;
    if (pointer.button === undefined) this.axis = null;
  }; // normalize mouse / touch pointer and remap {x,y} to view space.


  function getPointer(event) {
    var pointer = event.changedTouches ? event.changedTouches[0] : event;
    var rect = domElement.getBoundingClientRect();
    return {
      x: (pointer.clientX - rect.left) / rect.width * 2 - 1,
      y: -(pointer.clientY - rect.top) / rect.height * 2 + 1,
      button: event.button
    };
  } // mouse / touch event handlers


  function onPointerHover(event) {
    if (!scope.enabled) return;
    scope.pointerHover(getPointer(event));
  }

  function onPointerDown(event) {
    if (!scope.enabled) return;
    document.addEventListener('mousemove', onPointerMove, false);
    scope.pointerHover(getPointer(event));
    scope.pointerDown(getPointer(event));
  }

  function onPointerMove(event) {
    if (!scope.enabled) return;
    scope.pointerMove(getPointer(event));
  }

  function onPointerUp(event) {
    if (!scope.enabled) return;
    document.removeEventListener('mousemove', onPointerMove, false);
    scope.pointerUp(getPointer(event));
  } // TODO: depricate


  this.getMode = function () {
    return scope.mode;
  };

  this.setMode = function (mode) {
    scope.mode = mode;
  };

  this.setTranslationSnap = function (translationSnap) {
    scope.translationSnap = translationSnap;
  };

  this.setRotationSnap = function (rotationSnap) {
    scope.rotationSnap = rotationSnap;
  };

  this.setSize = function (size) {
    scope.size = size;
  };

  this.setSpace = function (space) {
    scope.space = space;
  };

  this.update = function () {
    console.warn('THREE.TransformControls: update function has been depricated.');
  };
};

THREE.TransformControls.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
  constructor: THREE.TransformControls,
  isTransformControls: true
});

THREE.TransformControlsGizmo = function () {
  'use strict';

  THREE.Object3D.call(this);
  this.type = 'TransformControlsGizmo'; // shared materials

  var gizmoMaterial = new THREE.MeshBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    side: THREE.DoubleSide,
    fog: false
  });
  var gizmoLineMaterial = new THREE.LineBasicMaterial({
    depthTest: false,
    depthWrite: false,
    transparent: true,
    linewidth: 1,
    fog: false
  }); // Make unique material for each axis/color

  var matInvisible = gizmoMaterial.clone();
  matInvisible.opacity = 0.15;
  var matHelper = gizmoMaterial.clone();
  matHelper.opacity = 0.33;
  var matRed = gizmoMaterial.clone();
  matRed.color.set(0xff0000);
  var matGreen = gizmoMaterial.clone();
  matGreen.color.set(0x00ff00);
  var matBlue = gizmoMaterial.clone();
  matBlue.color.set(0x0000ff);
  var matWhiteTransperent = gizmoMaterial.clone();
  matWhiteTransperent.opacity = 0.25;
  var matYellowTransparent = matWhiteTransperent.clone();
  matYellowTransparent.color.set(0xffff00);
  var matCyanTransparent = matWhiteTransperent.clone();
  matCyanTransparent.color.set(0x00ffff);
  var matMagentaTransparent = matWhiteTransperent.clone();
  matMagentaTransparent.color.set(0xff00ff);
  var matYellow = gizmoMaterial.clone();
  matYellow.color.set(0xffff00);
  var matLineRed = gizmoLineMaterial.clone();
  matLineRed.color.set(0xff0000);
  var matLineGreen = gizmoLineMaterial.clone();
  matLineGreen.color.set(0x00ff00);
  var matLineBlue = gizmoLineMaterial.clone();
  matLineBlue.color.set(0x0000ff);
  var matLineCyan = gizmoLineMaterial.clone();
  matLineCyan.color.set(0x00ffff);
  var matLineMagenta = gizmoLineMaterial.clone();
  matLineMagenta.color.set(0xff00ff);
  var matLineYellow = gizmoLineMaterial.clone();
  matLineYellow.color.set(0xffff00);
  var matLineGray = gizmoLineMaterial.clone();
  matLineGray.color.set(0x787878);
  var matLineYellowTransparent = matLineYellow.clone();
  matLineYellowTransparent.opacity = 0.25; // reusable geometry

  var arrowGeometry = new THREE.CylinderBufferGeometry(0, 0.05, 0.2, 12, 1, false);
  var scaleHandleGeometry = new THREE.BoxBufferGeometry(0.125, 0.125, 0.125);
  var lineGeometry = new THREE.BufferGeometry();
  lineGeometry.addAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0], 3));

  var CircleGeometry = function CircleGeometry(radius, arc) {
    var geometry = new THREE.BufferGeometry();
    var vertices = [];

    for (var i = 0; i <= 64 * arc; ++i) {
      vertices.push(0, Math.cos(i / 32 * Math.PI) * radius, Math.sin(i / 32 * Math.PI) * radius);
    }

    geometry.addAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    return geometry;
  }; // Special geometry for transform helper. If scaled with position vector it spans from [0,0,0] to position


  var TranslateHelperGeometry = function TranslateHelperGeometry(radius, arc) {
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1], 3));
    return geometry;
  }; // Gizmo definitions - custom hierarchy definitions for setupGizmo() function


  var gizmoTranslate = {
    X: [[new THREE.Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, -Math.PI / 2], null, 'fwd'], [new THREE.Mesh(arrowGeometry, matRed), [1, 0, 0], [0, 0, Math.PI / 2], null, 'bwd'], [new THREE.Line(lineGeometry, matLineRed)]],
    Y: [[new THREE.Mesh(arrowGeometry, matGreen), [0, 1, 0], null, null, 'fwd'], [new THREE.Mesh(arrowGeometry, matGreen), [0, 1, 0], [Math.PI, 0, 0], null, 'bwd'], [new THREE.Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2]]],
    Z: [[new THREE.Mesh(arrowGeometry, matBlue), [0, 0, 1], [Math.PI / 2, 0, 0], null, 'fwd'], [new THREE.Mesh(arrowGeometry, matBlue), [0, 0, 1], [-Math.PI / 2, 0, 0], null, 'bwd'], [new THREE.Line(lineGeometry, matLineBlue), null, [0, -Math.PI / 2, 0]]],
    XYZ: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.1, 0), matWhiteTransperent), [0, 0, 0], [0, 0, 0]]],
    XY: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.295, 0.295), matYellowTransparent), [0.15, 0.15, 0]], [new THREE.Line(lineGeometry, matLineYellow), [0.18, 0.3, 0], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineYellow), [0.3, 0.18, 0], [0, 0, Math.PI / 2], [0.125, 1, 1]]],
    YZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.295, 0.295), matCyanTransparent), [0, 0.15, 0.15], [0, Math.PI / 2, 0]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.18, 0.3], [0, 0, Math.PI / 2], [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.3, 0.18], [0, -Math.PI / 2, 0], [0.125, 1, 1]]],
    XZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.295, 0.295), matMagentaTransparent), [0.15, 0, 0.15], [-Math.PI / 2, 0, 0]], [new THREE.Line(lineGeometry, matLineMagenta), [0.18, 0, 0.3], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineMagenta), [0.3, 0, 0.18], [0, -Math.PI / 2, 0], [0.125, 1, 1]]]
  };
  var pickerTranslate = {
    X: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0.6, 0, 0], [0, 0, -Math.PI / 2]]],
    Y: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0.6, 0]]],
    Z: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 1, 4, 1, false), matInvisible), [0, 0, 0.6], [Math.PI / 2, 0, 0]]],
    XYZ: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.2, 0), matInvisible)]],
    XY: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0.2, 0]]],
    YZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), matInvisible), [0, 0.2, 0.2], [0, Math.PI / 2, 0]]],
    XZ: [[new THREE.Mesh(new THREE.PlaneBufferGeometry(0.4, 0.4), matInvisible), [0.2, 0, 0.2], [-Math.PI / 2, 0, 0]]]
  };
  var helperTranslate = {
    START: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']],
    END: [[new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.01, 2), matHelper), null, null, null, 'helper']],
    DELTA: [[new THREE.Line(TranslateHelperGeometry(), matHelper), null, null, null, 'helper']],
    X: [[new THREE.Line(lineGeometry, matHelper.clone()), [-1e3, 0, 0], null, [1e6, 1, 1], 'helper']],
    Y: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, -1e3, 0], [0, 0, Math.PI / 2], [1e6, 1, 1], 'helper']],
    Z: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, 0, -1e3], [0, -Math.PI / 2, 0], [1e6, 1, 1], 'helper']]
  };
  var gizmoRotate = {
    X: [[new THREE.Line(CircleGeometry(1, 0.5), matLineRed)], [new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.04, 0), matRed), [0, 0, 0.99], null, [1, 3, 1]]],
    Y: [[new THREE.Line(CircleGeometry(1, 0.5), matLineGreen), null, [0, 0, -Math.PI / 2]], [new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.04, 0), matGreen), [0, 0, 0.99], null, [3, 1, 1]]],
    Z: [[new THREE.Line(CircleGeometry(1, 0.5), matLineBlue), null, [0, Math.PI / 2, 0]], [new THREE.Mesh(new THREE.OctahedronBufferGeometry(0.04, 0), matBlue), [0.99, 0, 0], null, [1, 3, 1]]],
    E: [[new THREE.Line(CircleGeometry(1.25, 1), matLineYellowTransparent), null, [0, Math.PI / 2, 0]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [1.17, 0, 0], [0, 0, -Math.PI / 2], [1, 1, 0.001]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [-1.17, 0, 0], [0, 0, Math.PI / 2], [1, 1, 0.001]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [0, -1.17, 0], [Math.PI, 0, 0], [1, 1, 0.001]], [new THREE.Mesh(new THREE.CylinderBufferGeometry(0.03, 0, 0.15, 4, 1, false), matLineYellowTransparent), [0, 1.17, 0], [0, 0, 0], [1, 1, 0.001]]],
    XYZE: [[new THREE.Line(CircleGeometry(1, 1), matLineGray), null, [0, Math.PI / 2, 0]]]
  };
  var helperRotate = {
    AXIS: [[new THREE.Line(lineGeometry, matHelper.clone()), [-1e3, 0, 0], null, [1e6, 1, 1], 'helper']]
  };
  var pickerRotate = {
    X: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1, 0.1, 4, 24), matInvisible), [0, 0, 0], [0, -Math.PI / 2, -Math.PI / 2]]],
    Y: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1, 0.1, 4, 24), matInvisible), [0, 0, 0], [Math.PI / 2, 0, 0]]],
    Z: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1, 0.1, 4, 24), matInvisible), [0, 0, 0], [0, 0, -Math.PI / 2]]],
    E: [[new THREE.Mesh(new THREE.TorusBufferGeometry(1.25, 0.1, 2, 24), matInvisible)]],
    XYZE: [[new THREE.Mesh(new THREE.SphereBufferGeometry(0.7, 10, 8), matInvisible)]]
  };
  var gizmoScale = {
    X: [[new THREE.Mesh(scaleHandleGeometry, matRed), [0.8, 0, 0], [0, 0, -Math.PI / 2]], [new THREE.Line(lineGeometry, matLineRed), null, null, [0.8, 1, 1]]],
    Y: [[new THREE.Mesh(scaleHandleGeometry, matGreen), [0, 0.8, 0]], [new THREE.Line(lineGeometry, matLineGreen), null, [0, 0, Math.PI / 2], [0.8, 1, 1]]],
    Z: [[new THREE.Mesh(scaleHandleGeometry, matBlue), [0, 0, 0.8], [Math.PI / 2, 0, 0]], [new THREE.Line(lineGeometry, matLineBlue), null, [0, -Math.PI / 2, 0], [0.8, 1, 1]]],
    XY: [[new THREE.Mesh(scaleHandleGeometry, matYellowTransparent), [0.85, 0.85, 0], null, [2, 2, 0.2]], [new THREE.Line(lineGeometry, matLineYellow), [0.855, 0.98, 0], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineYellow), [0.98, 0.855, 0], [0, 0, Math.PI / 2], [0.125, 1, 1]]],
    YZ: [[new THREE.Mesh(scaleHandleGeometry, matCyanTransparent), [0, 0.85, 0.85], null, [0.2, 2, 2]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.855, 0.98], [0, 0, Math.PI / 2], [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineCyan), [0, 0.98, 0.855], [0, -Math.PI / 2, 0], [0.125, 1, 1]]],
    XZ: [[new THREE.Mesh(scaleHandleGeometry, matMagentaTransparent), [0.85, 0, 0.85], null, [2, 0.2, 2]], [new THREE.Line(lineGeometry, matLineMagenta), [0.855, 0, 0.98], null, [0.125, 1, 1]], [new THREE.Line(lineGeometry, matLineMagenta), [0.98, 0, 0.855], [0, -Math.PI / 2, 0], [0.125, 1, 1]]],
    XYZX: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.125, 0.125, 0.125), matWhiteTransperent), [1.1, 0, 0]]],
    XYZY: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.125, 0.125, 0.125), matWhiteTransperent), [0, 1.1, 0]]],
    XYZZ: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.125, 0.125, 0.125), matWhiteTransperent), [0, 0, 1.1]]]
  };
  var pickerScale = {
    X: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible), [0.5, 0, 0], [0, 0, -Math.PI / 2]]],
    Y: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible), [0, 0.5, 0]]],
    Z: [[new THREE.Mesh(new THREE.CylinderBufferGeometry(0.2, 0, 0.8, 4, 1, false), matInvisible), [0, 0, 0.5], [Math.PI / 2, 0, 0]]],
    XY: [[new THREE.Mesh(scaleHandleGeometry, matInvisible), [0.85, 0.85, 0], null, [3, 3, 0.2]]],
    YZ: [[new THREE.Mesh(scaleHandleGeometry, matInvisible), [0, 0.85, 0.85], null, [0.2, 3, 3]]],
    XZ: [[new THREE.Mesh(scaleHandleGeometry, matInvisible), [0.85, 0, 0.85], null, [3, 0.2, 3]]],
    XYZX: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [1.1, 0, 0]]],
    XYZY: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, 1.1, 0]]],
    XYZZ: [[new THREE.Mesh(new THREE.BoxBufferGeometry(0.2, 0.2, 0.2), matInvisible), [0, 0, 1.1]]]
  };
  var helperScale = {
    X: [[new THREE.Line(lineGeometry, matHelper.clone()), [-1e3, 0, 0], null, [1e6, 1, 1], 'helper']],
    Y: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, -1e3, 0], [0, 0, Math.PI / 2], [1e6, 1, 1], 'helper']],
    Z: [[new THREE.Line(lineGeometry, matHelper.clone()), [0, 0, -1e3], [0, -Math.PI / 2, 0], [1e6, 1, 1], 'helper']]
  }; // Creates an Object3D with gizmos described in custom hierarchy definition.

  var setupGizmo = function setupGizmo(gizmoMap) {
    var gizmo = new THREE.Object3D();

    for (var name in gizmoMap) {
      for (var i = gizmoMap[name].length; i--;) {
        var object = gizmoMap[name][i][0].clone();
        var position = gizmoMap[name][i][1];
        var rotation = gizmoMap[name][i][2];
        var scale = gizmoMap[name][i][3];
        var tag = gizmoMap[name][i][4]; // name and tag properties are essential for picking and updating logic.

        object.name = name;
        object.tag = tag;
        if (position) object.position.set(position[0], position[1], position[2]);
        if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);
        if (scale) object.scale.set(scale[0], scale[1], scale[2]);
        object.updateMatrix();
        var tempGeometry = object.geometry.clone();
        tempGeometry.applyMatrix(object.matrix);
        object.geometry = tempGeometry;
        object.renderOrder = Infinity;
        object.position.set(0, 0, 0);
        object.rotation.set(0, 0, 0);
        object.scale.set(1, 1, 1);
        gizmo.add(object);
      }
    }

    return gizmo;
  }; // Reusable utility variables


  var tempVector = new THREE.Vector3(0, 0, 0);
  var tempEuler = new THREE.Euler();
  var alignVector = new THREE.Vector3(0, 1, 0);
  var zeroVector = new THREE.Vector3(0, 0, 0);
  var lookAtMatrix = new THREE.Matrix4();
  var tempQuaternion = new THREE.Quaternion();
  var tempQuaternion2 = new THREE.Quaternion();
  var identityQuaternion = new THREE.Quaternion();
  var unitX = new THREE.Vector3(1, 0, 0);
  var unitY = new THREE.Vector3(0, 1, 0);
  var unitZ = new THREE.Vector3(0, 0, 1); // Gizmo creation

  this.gizmo = {};
  this.picker = {};
  this.helper = {};
  this.add(this.gizmo['translate'] = setupGizmo(gizmoTranslate));
  this.add(this.gizmo['rotate'] = setupGizmo(gizmoRotate));
  this.add(this.gizmo['scale'] = setupGizmo(gizmoScale));
  this.add(this.picker['translate'] = setupGizmo(pickerTranslate));
  this.add(this.picker['rotate'] = setupGizmo(pickerRotate));
  this.add(this.picker['scale'] = setupGizmo(pickerScale));
  this.add(this.helper['translate'] = setupGizmo(helperTranslate));
  this.add(this.helper['rotate'] = setupGizmo(helperRotate));
  this.add(this.helper['scale'] = setupGizmo(helperScale)); // Pickers should be hidden always

  this.picker['translate'].visible = false;
  this.picker['rotate'].visible = false;
  this.picker['scale'].visible = false; // updateMatrixWorld will update transformations and appearance of individual handles

  this.updateMatrixWorld = function () {
    var space = this.space;
    if (this.mode === 'scale') space = 'local'; // scale always oriented to local rotation

    var quaternion = space === 'local' ? this.worldQuaternion : identityQuaternion; // Show only gizmos for current transform mode

    this.gizmo['translate'].visible = this.mode === 'translate';
    this.gizmo['rotate'].visible = this.mode === 'rotate';
    this.gizmo['scale'].visible = this.mode === 'scale';
    this.helper['translate'].visible = this.mode === 'translate';
    this.helper['rotate'].visible = this.mode === 'rotate';
    this.helper['scale'].visible = this.mode === 'scale';
    var handles = [];
    handles = handles.concat(this.picker[this.mode].children);
    handles = handles.concat(this.gizmo[this.mode].children);
    handles = handles.concat(this.helper[this.mode].children);

    for (var i = 0; i < handles.length; i++) {
      var handle = handles[i]; // hide aligned to camera

      handle.visible = true;
      handle.rotation.set(0, 0, 0);
      handle.position.copy(this.worldPosition);
      var eyeDistance = this.worldPosition.distanceTo(this.cameraPosition);
      handle.scale.set(1, 1, 1).multiplyScalar(eyeDistance * this.size / 7); // TODO: simplify helpers and consider decoupling from gizmo

      if (handle.tag === 'helper') {
        handle.visible = false;

        if (handle.name === 'AXIS') {
          handle.position.copy(this.worldPositionStart);
          handle.visible = !!this.axis;

          if (this.axis === 'X') {
            tempQuaternion.setFromEuler(tempEuler.set(0, 0, 0));
            handle.quaternion.copy(quaternion).multiply(tempQuaternion);
            if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) > 0.9) handle.visible = false;
          }

          if (this.axis === 'Y') {
            tempQuaternion.setFromEuler(tempEuler.set(0, 0, Math.PI / 2));
            handle.quaternion.copy(quaternion).multiply(tempQuaternion);
            if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) > 0.9) handle.visible = false;
          }

          if (this.axis === 'Z') {
            tempQuaternion.setFromEuler(tempEuler.set(0, Math.PI / 2, 0));
            handle.quaternion.copy(quaternion).multiply(tempQuaternion);
            if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) > 0.9) handle.visible = false;
          }

          if (this.axis === 'XYZE') {
            tempQuaternion.setFromEuler(tempEuler.set(0, Math.PI / 2, 0));
            alignVector.copy(this.rotationAxis);
            handle.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(zeroVector, alignVector, unitY));
            handle.quaternion.multiply(tempQuaternion);
            handle.visible = this.dragging;
          }

          if (this.axis === 'E') handle.visible = false;
        } else if (handle.name === 'START') {
          handle.position.copy(this.worldPositionStart);
          handle.visible = this.dragging;
        } else if (handle.name === 'END') {
          handle.position.copy(this.worldPosition);
          handle.visible = this.dragging;
        } else if (handle.name === 'DELTA') {
          handle.position.copy(this.worldPositionStart);
          handle.quaternion.copy(this.worldQuaternionStart);
          tempVector.set(1e-10, 1e-10, 1e-10).add(this.worldPositionStart).sub(this.worldPosition).multiplyScalar(-1);
          tempVector.applyQuaternion(this.worldQuaternionStart.clone().inverse());
          handle.scale.copy(tempVector);
          handle.visible = this.dragging;
        } else {
          handle.quaternion.copy(quaternion);
          if (this.dragging) handle.position.copy(this.worldPositionStart);else handle.position.copy(this.worldPosition);
          if (this.axis) handle.visible = this.axis.search(handle.name) !== -1;
        } // If updating helper, skip rest of the loop


        continue;
      } // Align handles to current local or world rotation


      handle.quaternion.copy(quaternion);

      if (this.mode === 'translate' || this.mode === 'scale') {
        // Hide translate and scale axis facing the camera
        var AXIS_HIDE_TRESHOLD = 0.99;
        var PLANE_HIDE_TRESHOLD = 0.2;
        var AXIS_FLIP_TRESHOLD = 0.0;

        if (handle.name === 'X' || handle.name === 'XYZX') {
          if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'Y' || handle.name === 'XYZY') {
          if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'Z' || handle.name === 'XYZZ') {
          if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) > AXIS_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'XY') {
          if (Math.abs(alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'YZ') {
          if (Math.abs(alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        }

        if (handle.name === 'XZ') {
          if (Math.abs(alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye)) < PLANE_HIDE_TRESHOLD) {
            handle.scale.set(1e-10, 1e-10, 1e-10);
            handle.visible = false;
          }
        } // Flip translate and scale axis ocluded behind another axis


        if (handle.name.search('X') !== -1) {
          if (alignVector.copy(unitX).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
            if (handle.tag === 'fwd') handle.visible = false;else handle.scale.x *= -1;
          } else if (handle.tag === 'bwd') handle.visible = false;
        }

        if (handle.name.search('Y') !== -1) {
          if (alignVector.copy(unitY).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
            if (handle.tag === 'fwd') handle.visible = false;else handle.scale.y *= -1;
          } else if (handle.tag === 'bwd') handle.visible = false;
        }

        if (handle.name.search('Z') !== -1) {
          if (alignVector.copy(unitZ).applyQuaternion(quaternion).dot(this.eye) < AXIS_FLIP_TRESHOLD) {
            if (handle.tag === 'fwd') handle.visible = false;else handle.scale.z *= -1;
          } else if (handle.tag === 'bwd') handle.visible = false;
        }
      } else if (this.mode === 'rotate') {
        // Align handles to current local or world rotation
        tempQuaternion2.copy(quaternion);
        alignVector.copy(this.eye).applyQuaternion(tempQuaternion.copy(quaternion).inverse());
        if (handle.name.search('E') !== -1) handle.quaternion.setFromRotationMatrix(lookAtMatrix.lookAt(this.eye, zeroVector, unitY));

        if (handle.name === 'X') {
          tempQuaternion.setFromAxisAngle(unitX, Math.atan2(-alignVector.y, alignVector.z));
          tempQuaternion.multiplyQuaternions(tempQuaternion2, tempQuaternion);
          handle.quaternion.copy(tempQuaternion);
        }

        if (handle.name === 'Y') {
          tempQuaternion.setFromAxisAngle(unitY, Math.atan2(alignVector.x, alignVector.z));
          tempQuaternion.multiplyQuaternions(tempQuaternion2, tempQuaternion);
          handle.quaternion.copy(tempQuaternion);
        }

        if (handle.name === 'Z') {
          tempQuaternion.setFromAxisAngle(unitZ, Math.atan2(alignVector.y, alignVector.x));
          tempQuaternion.multiplyQuaternions(tempQuaternion2, tempQuaternion);
          handle.quaternion.copy(tempQuaternion);
        }
      } // Hide disabled axes


      handle.visible = handle.visible && (handle.name.indexOf('X') === -1 || this.showX);
      handle.visible = handle.visible && (handle.name.indexOf('Y') === -1 || this.showY);
      handle.visible = handle.visible && (handle.name.indexOf('Z') === -1 || this.showZ);
      handle.visible = handle.visible && (handle.name.indexOf('E') === -1 || this.showX && this.showY && this.showZ); // highlight selected axis

      handle.material._opacity = handle.material._opacity || handle.material.opacity;
      handle.material._color = handle.material._color || handle.material.color.clone();
      handle.material.color.copy(handle.material._color);
      handle.material.opacity = handle.material._opacity;

      if (!this.enabled) {
        handle.material.opacity *= 0.5;
        handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
      } else if (this.axis) {
        if (handle.name === this.axis) {
          handle.material.opacity = 1.0;
          handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
        } else if (this.axis.split('').some(function (a) {
          return handle.name === a;
        })) {
          handle.material.opacity = 1.0;
          handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
        } else {
          handle.material.opacity *= 0.25;
          handle.material.color.lerp(new THREE.Color(1, 1, 1), 0.25); // robot-designer: adjust color
        }
      }
    }

    THREE.Object3D.prototype.updateMatrixWorld.call(this);
  };
};

THREE.TransformControlsGizmo.prototype = Object.assign(Object.create(THREE.Object3D.prototype), {
  constructor: THREE.TransformControlsGizmo,
  isTransformControlsGizmo: true
});

THREE.TransformControlsPlane = function () {
  'use strict';

  THREE.Mesh.call(this, new THREE.PlaneBufferGeometry(100000, 100000, 2, 2), new THREE.MeshBasicMaterial({
    visible: false,
    wireframe: true,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.1
  }));
  this.type = 'TransformControlsPlane';
  var unitX = new THREE.Vector3(1, 0, 0);
  var unitY = new THREE.Vector3(0, 1, 0);
  var unitZ = new THREE.Vector3(0, 0, 1);
  var tempVector = new THREE.Vector3();
  var dirVector = new THREE.Vector3();
  var alignVector = new THREE.Vector3();
  var tempMatrix = new THREE.Matrix4();
  var identityQuaternion = new THREE.Quaternion();

  this.updateMatrixWorld = function () {
    var space = this.space;
    this.position.copy(this.worldPosition);
    if (this.mode === 'scale') space = 'local'; // scale always oriented to local rotation

    unitX.set(1, 0, 0).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion);
    unitY.set(0, 1, 0).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion);
    unitZ.set(0, 0, 1).applyQuaternion(space === 'local' ? this.worldQuaternion : identityQuaternion); // Align the plane for current transform mode, axis and space.

    alignVector.copy(unitY);

    switch (this.mode) {
      case 'translate':
      case 'scale':
        switch (this.axis) {
          case 'X':
            alignVector.copy(this.eye).cross(unitX);
            dirVector.copy(unitX).cross(alignVector);
            break;

          case 'Y':
            alignVector.copy(this.eye).cross(unitY);
            dirVector.copy(unitY).cross(alignVector);
            break;

          case 'Z':
            alignVector.copy(this.eye).cross(unitZ);
            dirVector.copy(unitZ).cross(alignVector);
            break;

          case 'XY':
            dirVector.copy(unitZ);
            break;

          case 'YZ':
            dirVector.copy(unitX);
            break;

          case 'XZ':
            alignVector.copy(unitZ);
            dirVector.copy(unitY);
            break;

          case 'XYZ':
          case 'E':
            dirVector.set(0, 0, 0);
            break;
        }

        break;

      case 'rotate':
      default:
        // special case for rotate
        dirVector.set(0, 0, 0);
    }

    if (dirVector.length() === 0) {
      // If in rotate mode, make the plane parallel to camera
      this.quaternion.copy(this.cameraQuaternion);
    } else {
      tempMatrix.lookAt(tempVector.set(0, 0, 0), dirVector, alignVector);
      this.quaternion.setFromRotationMatrix(tempMatrix);
    }

    THREE.Object3D.prototype.updateMatrixWorld.call(this);
  };
};

THREE.TransformControlsPlane.prototype = Object.assign(Object.create(THREE.Mesh.prototype), {
  constructor: THREE.TransformControlsPlane,
  isTransformControlsPlane: true
});
"use strict";

// Source: https://gist.github.com/dsamarin/3050311
function UndoItem(perform, data) {
  this.perform = perform;
  this.data = data;
}
/**
 * UndoStack:
 * Easy undo-redo in JavaScript.
 **/


function UndoStack(self) {
  this.stack = [];
  this.current = -1;
  this.self = self;
}
/**
 * UndoStack#push (action, data);
 * perform(true, data)  -> Function which performs redo based on previous state
 * perform(false, data) -> Function which performs undo based on current state
 * data -> Argument passed to undo/redo functions
 **/


UndoStack.prototype.push = function (perform, data) {
  this.current++; // We need to invalidate all undo items after this new one
  // or people are going to be very confused.

  this.stack.splice(this.current);
  this.stack.push(new UndoItem(perform, data));
};

UndoStack.prototype.undo = function () {
  var item;

  if (this.current >= 0) {
    item = this.stack[this.current];
    item.perform.call(this.self, false, item.data);
    this.current--;
  } else throw new Error('Already at oldest change');
};

UndoStack.prototype.redo = function () {
  var item;
  item = this.stack[this.current + 1];

  if (item) {
    item.perform.call(this.self, true, item.data);
    this.current++;
  } else throw new Error('Already at newest change');
};

UndoStack.prototype.canUndo = function () {
  return this.current >= 0;
};

UndoStack.prototype.canRedo = function () {
  return this.stack[this.current + 1] !== undefined;
};

UndoStack.prototype.invalidateAll = function () {
  this.stack = [];
  this.current = -1;
};
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Asset =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Asset(name, assetData) {
    _classCallCheck(this, Asset);

    this.name = name;
    this.root = assetData.root === true;
    this.proto = assetData.proto;
    this.icon = assetData.icon;
    this.slotType = assetData.slotType;
    this.slots = assetData.slots;
    this.parameters = assetData.parameters;
  }

  _createClass(Asset, [{
    key: "getSlotNames",
    value: function getSlotNames() {
      return Object.keys(this.slots);
    }
  }, {
    key: "getRobotName",
    value: function getRobotName() {
      return this.name.split('/')[0];
    }
  }]);

  return Asset;
}();
/* global Asset, Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var AssetLibrary =
/*#__PURE__*/
function (_Observable) {
  _inherits(AssetLibrary, _Observable);

  // eslint-disable-line no-unused-vars
  function AssetLibrary() {
    var _this;

    var pathPrefix = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

    _classCallCheck(this, AssetLibrary);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(AssetLibrary).call(this));
    _this.pathPrefix = pathPrefix;
    _this.assets = [];
    _this.robotNames = [];
    fetch(_this.pathPrefix + 'robot-designer/assets/assets.json').then(function (response) {
      return response.text();
    }).then(function (txt) {
      return _this._loadAssets(JSON.parse(txt));
    });
    return _this;
  }

  _createClass(AssetLibrary, [{
    key: "getPath",
    value: function getPath() {
      return this.pathPrefix + 'robot-designer/assets/';
    }
  }, {
    key: "getRobotNames",
    value: function getRobotNames() {
      return this.robotNames;
    }
  }, {
    key: "getAssetByName",
    value: function getAssetByName(assetName) {
      for (var a = 0; a < this.assets.length; a++) {
        if (this.assets[a].name === assetName) return this.assets[a];
      }

      return undefined;
    }
  }, {
    key: "_loadAssets",
    value: function _loadAssets(assetsData) {
      var _this2 = this;

      Object.keys(assetsData).forEach(function (assetName) {
        var assetData = assetsData[assetName];
        var asset = new Asset(assetName, assetData);
        asset.icon = _this2.pathPrefix + asset.icon;

        _this2.assets.push(asset);

        var robotName = asset.getRobotName();
        if (!_this2.robotNames.includes(robotName)) _this2.robotNames.push(robotName);
      });
      this.notify('loaded', null);
    }
  }]);

  return AssetLibrary;
}(Observable);
/* global Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Part =
/*#__PURE__*/
function (_Observable) {
  _inherits(Part, _Observable);

  // eslint-disable-line no-unused-vars
  function Part(asset) {
    var _this;

    _classCallCheck(this, Part);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Part).call(this));
    _this.asset = asset;
    _this.name = asset.name;
    _this.translation = [0.0, 0.0, 0.0];
    _this.quaternion = [0.0, 0.0, 0.0, 1.0];
    _this.slots = {};
    asset.getSlotNames().forEach(function (name) {
      _this.slots[name] = null;
    });
    return _this;
  }

  _createClass(Part, [{
    key: "translate",
    value: function translate(translation) {
      this.translation = translation;
      this.notify('Translated', {
        'translation': translation
      });
    }
  }, {
    key: "rotate",
    value: function rotate(quaternion) {
      this.quaternion = quaternion;
      this.notify('Rotated', {
        'quaternion': quaternion
      });
    }
  }, {
    key: "addPart",
    value: function addPart(slotName, part) {
      console.assert(!this.slots[slotName]);
      part.parent = this;
      this.slots[slotName] = part;
      this.notify('PartAdded', {
        'part': part,
        'slotName': slotName
      }); // Notify the creation of the subparts if any.
      // `part` may contain subparts when redo multiple parts at the same time.
      // This notification is required to create the mediators of the sub parts,
      // and so actually create the THREEjs meshes and attach them correctly.

      for (var subSlotName in part.slots) {
        var slot = part.slots[subSlotName];

        if (slot) {
          slot._applyFooRecursively(function (child) {
            child.parent.notify('PartAdded', {
              'part': child,
              'slotName': child.parent.slotName(child)
            });
          });
        }
      }
    }
  }, {
    key: "removePart",
    value: function removePart(part) {
      for (var slotName in this.slots) {
        if (this.slots[slotName] === part) {
          this.slots[slotName] = null;
          this.notify('PartRemoved', {
            'part': part,
            'slotName': slotName
          });
        }
      }
    }
  }, {
    key: "changeColor",
    value: function changeColor(color) {
      this.color = color;
      this.notify('ColorChanged', {
        'color': color
      });
    }
  }, {
    key: "slotName",
    value: function slotName(part) {
      for (var slotName in this.slots) {
        if (this.slots[slotName] === part) return slotName;
      }

      return null;
    }
  }, {
    key: "serialize",
    value: function serialize() {
      var o = {};
      o.modelName = this.name;
      if (this.translation[0] !== 0.0 || this.translation[1] !== 0.0 || this.translation[2] !== 0.0) o.translation = this.translation;
      if (this.quaternion[0] !== 0.0 || this.quaternion[1] !== 0.0 || this.quaternion[2] !== 0.0 || this.quaternion[3] !== 1.0) o.quaternion = this.quaternion;
      if (typeof this.color !== 'undefined') o.color = this.color;
      o.slots = {};

      for (var slotName in this.slots) {
        if (this.slots[slotName]) o.slots[slotName] = this.slots[slotName].serialize();
      }

      return o;
    }
  }, {
    key: "webotsExport",
    value: function webotsExport() {
      var indent = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 0;
      var i = '  '.repeat(indent); // Indentation string.

      var s = this.asset.proto;
      s += ' {\n';
      s += i + '  translation ' + translationToWebotsString(this.translation) + '\n';
      s += i + '  rotation ' + quaternionToWebotsString(this.quaternion) + '\n';
      if (typeof this.color !== 'undefined') s += i + '  color "' + this.color + '"\n';

      for (var slotName in this.slots) {
        if (this.slots[slotName]) s += i + '  ' + slotName + ' ' + this.slots[slotName].webotsExport(indent + 1);
      }

      s += i + '}\n';
      return s;
    }
  }, {
    key: "getAvailableSlotTypes",
    value: function getAvailableSlotTypes() {
      var availableSlotTypes = [];

      for (var slotName in this.slots) {
        if (this.slots[slotName] === null) availableSlotTypes.push(this.asset.slots[slotName].type);else availableSlotTypes = availableSlotTypes.concat(this.slots[slotName].getAvailableSlotTypes());
      }

      return availableSlotTypes;
    }
  }, {
    key: "_applyFooRecursively",
    value: function _applyFooRecursively(foo) {
      foo(this);

      for (var slotName in this.slots) {
        var slot = this.slots[slotName];
        if (slot) slot._applyFooRecursively(foo);
      }
    }
  }]);

  return Part;
}(Observable);

function quaternionToAxisAngle(q) {
  // refrerence: http://schteppe.github.io/cannon.js/docs/files/src_math_Quaternion.js.html
  var axis = [0.0, 1.0, 0.0];
  var angle = 2 * Math.acos(q[3]);
  var s = Math.sqrt(1.0 - q[3] * q[3]); // assuming quaternion normalised then w is less than 1, so term always positive.

  if (s < 0.001) {
    // test to avoid divide by zero, s is always positive due to sqrt
    // if s close to zero then direction of axis not important
    axis[0] = q[0]; // if it is important that axis is normalised then replace with x=1; y=z=0;

    axis[1] = q[1];
    axis[2] = q[2];
  } else {
    axis[0] = q[0] / s; // normalise axis

    axis[1] = q[1] / s;
    axis[2] = q[2] / s;
  }

  return [axis, angle];
}

;

function quaternionToWebotsString(q) {
  var axisAndAngle = quaternionToAxisAngle(q);
  return axisAndAngle[0][0] + ' ' + axisAndAngle[0][1] + ' ' + axisAndAngle[0][2] + ' ' + axisAndAngle[1];
}

function translationToWebotsString(t) {
  return t[0] + ' ' + t[1] + ' ' + t[2];
}
/* global Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Robot =
/*#__PURE__*/
function (_Observable) {
  _inherits(Robot, _Observable);

  // eslint-disable-line no-unused-vars
  function Robot() {
    var _this;

    _classCallCheck(this, Robot);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Robot).call(this));
    _this.rootPart = null;
    return _this;
  }

  _createClass(Robot, [{
    key: "hasRootPart",
    value: function hasRootPart() {
      return this.rootPart !== null;
    }
  }, {
    key: "addRootPart",
    value: function addRootPart(part) {
      part.parent = this;
      this.rootPart = part;
      this.notify('RootPartAdded', part); // Notify the creation of the subparts if any.
      // `part` may contain subparts when redo multiple parts at the same time.
      // This notification is required to create the mediators of the sub parts,
      // and so actually create the THREEjs meshes and attach them correctly.

      for (var subSlotName in part.slots) {
        var slot = part.slots[subSlotName];

        if (slot) {
          slot._applyFooRecursively(function (child) {
            child.parent.notify('PartAdded', {
              'part': child,
              'slotName': child.parent.slotName(child)
            });
          });
        }
      }
    }
  }, {
    key: "removePart",
    value: function removePart() {
      this.rootPart = null;
      this.notify('RootPartRemoved');
    }
  }, {
    key: "serialize",
    value: function serialize() {
      var o = {};
      if (this.rootPart) o.rootPart = this.rootPart.serialize();
      return o;
    }
  }, {
    key: "webotsExport",
    value: function webotsExport() {
      var s = '';
      s += '#VRML_SIM R2019a utf8\n';
      s += 'WorldInfo {\n';
      s += '  basicTimeStep 8\n';
      s += '}\n';
      s += 'Viewpoint {\n';
      s += '  orientation -0.02 -0.96 -0.27 3.0\n';
      s += '  position -0.07 0.43 -0.7\n';
      s += '  follow "Tinkerbots"\n';
      s += '}\n';
      s += 'TexturedBackground {\n';
      s += '  texture "empty_office"\n';
      s += '}\n';
      s += 'TexturedBackgroundLight {\n';
      s += '  texture "empty_office"\n';
      s += '}\n';
      s += 'Floor {\n';
      s += '  size 1000 1000\n';
      s += '}\n';
      if (this.rootPart) s += this.rootPart.webotsExport();
      return s;
    }
  }, {
    key: "getAvailableSlotTypes",
    value: function getAvailableSlotTypes() {
      if (this.rootPart === null) return [];
      var availableSlotTypes = this.rootPart.getAvailableSlotTypes();
      availableSlotTypes = availableSlotTypes.filter(function (v, i, a) {
        return a.indexOf(v) === i;
      }); // unique

      return availableSlotTypes;
    }
  }]);

  return Robot;
}(Observable);
/* global Observable, UndoStack */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var Commands =
/*#__PURE__*/
function (_Observable) {
  _inherits(Commands, _Observable);

  // eslint-disable-line no-unused-vars
  function Commands() {
    var _this;

    _classCallCheck(this, Commands);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(Commands).call(this));
    _this.undoStack = new UndoStack(null);
    return _this;
  }

  _createClass(Commands, [{
    key: "undo",
    value: function undo() {
      if (this.canUndo()) this.undoStack.undo();
      this.notify('updated', null);
    }
  }, {
    key: "redo",
    value: function redo() {
      if (this.canRedo()) this.undoStack.redo();
      this.notify('updated', null);
    }
  }, {
    key: "canUndo",
    value: function canUndo() {
      return this.undoStack.canUndo();
    }
  }, {
    key: "canRedo",
    value: function canRedo() {
      return this.undoStack.canRedo();
    }
  }, {
    key: "_pushAction",
    value: function _pushAction(perform, data) {
      var returnedValue = perform.call(this, true, data);
      this.undoStack.push(perform, data);
      this.notify('updated', null);
      return returnedValue;
    }
  }, {
    key: "addPart",
    value: function addPart(parent, slot, part) {
      var that = this;

      this._pushAction(function (redo, data) {
        if (redo) parent.addPart(slot, part);else {
          parent.removePart(part);
          that.notify('AnyPartRemoved', null);
        }
      }, []);
    }
  }, {
    key: "translatePart",
    value: function translatePart(part, translation) {
      var previousTranslation = part.translation;

      this._pushAction(function (redo, data) {
        if (redo) part.translate(translation);else part.translate(previousTranslation);
      }, []);
    }
  }, {
    key: "rotatePart",
    value: function rotatePart(part, quaternion) {
      var previousQuaternion = part.quaternion;

      this._pushAction(function (redo, data) {
        if (redo) part.rotate(quaternion);else part.rotate(previousQuaternion);
      }, []);
    }
  }, {
    key: "addRootPart",
    value: function addRootPart(robot, part) {
      var that = this;

      this._pushAction(function (redo, data) {
        if (redo) robot.addRootPart(part);else {
          robot.removePart();
          that.notify('AnyPartRemoved', null);
        }
      }, []);
    }
  }, {
    key: "removePart",
    value: function removePart(part) {
      var that = this;
      var parent = part.parent;
      var slotName = parent.slotName(part);

      this._pushAction(function (redo, data) {
        if (redo) {
          parent.removePart(part);
          that.notify('AnyPartRemoved', null);
        } else parent.addPart(slotName, part);
      }, []);
    }
  }, {
    key: "removeRootPart",
    value: function removeRootPart(robot, part) {
      var that = this;

      this._pushAction(function (redo, data) {
        if (redo) {
          robot.removePart();
          that.notify('AnyPartRemoved', null);
        } else robot.addRootPart(part);
      }, []);

      this.notify('AnyPartRemoved', null);
    }
  }, {
    key: "changeColor",
    value: function changeColor(part, color) {
      var previousColor = part.color;

      this._pushAction(function (redo, data) {
        if (redo) part.changeColor(color);else part.changeColor(previousColor);
      }, []);
    }
  }]);

  return Commands;
}(Observable);
/* global Part, THREE */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotController =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotController(assetLibrary, commands, robot) {
    _classCallCheck(this, RobotController);

    this.assetLibrary = assetLibrary;
    this.commands = commands;
    this.robot = robot;
  }

  _createClass(RobotController, [{
    key: "addPart",
    value: function addPart(parent, modelName, closestSlotName) {
      var asset = this.assetLibrary.getAssetByName(modelName);
      var part = new Part(asset);
      if (!parent || parent === this.robot) this.commands.addRootPart(this.robot, part);else this.commands.addPart(parent, closestSlotName, part);
    }
  }, {
    key: "removePart",
    value: function removePart(part) {
      var parent = part.parent;
      if (!parent || parent === this.robot) this.commands.removeRootPart(this.robot, part);else this.commands.removePart(part);
    }
  }, {
    key: "translatePart",
    value: function translatePart(part, translation) {
      var previousTranslation = new THREE.Vector3(part.translation[0], part.translation[1], part.translation[2]);
      if (translation.distanceTo(previousTranslation) > 0.001) this.commands.translatePart(part, [translation.x, translation.y, translation.z]);
    }
  }, {
    key: "rotatePart",
    value: function rotatePart(part, quaternion) {
      var previousQuaternion = new THREE.Quaternion(part.quaternion[0], part.quaternion[1], part.quaternion[2], part.quaternion[3]);
      if (quaternion.angleTo(previousQuaternion) > 0.01) this.commands.rotatePart(part, [quaternion.x, quaternion.y, quaternion.z, quaternion.w]);
    }
  }, {
    key: "changeColor",
    value: function changeColor(part, color) {
      if (color !== part.color) this.commands.changeColor(part, color);
    }
  }]);

  return RobotController;
}();
/* global Ghost, MouseEvents */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Dragger =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Dragger(robotViewer, robotController) {
    _classCallCheck(this, Dragger);

    this.robotViewer = robotViewer;
    this.robotController = robotController;
    this.draggedPartName = null;
    this.draggedPart = undefined;
    this.slotType = null;
    this.ghost = new Ghost(robotViewer.scene);
  }

  _createClass(Dragger, [{
    key: "dragStart",
    value: function dragStart(part, slotType) {
      this.draggedPart = part;
      this.slotType = slotType;
    }
  }, {
    key: "dragEnter",
    value: function dragEnter() {
      this.robotViewer.slotAnchors.showSlots(this.slotType);
      this.ghost.addGhost(this.draggedPart);
    }
  }, {
    key: "dragOver",
    value: function dragOver(x, y) {
      var domElement = this.robotViewer.robotViewerElement;
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, x, y);
      var projection = this.robotViewer.projectScreenPositionOnSlotsAnchors(screenPosition);

      if (projection) {
        var closestSlot = this.robotViewer.getClosestSlot(screenPosition, this.slotType);

        if (closestSlot) {
          this.robotViewer.slotAnchors.highlight(closestSlot);
          this.ghost.moveGhostToSlot(closestSlot);
          return;
        }
      }

      projection = this.robotViewer.projectScreenPositionOnFloor(screenPosition);
      this.ghost.moveGhostToFloor(projection);
    }
  }, {
    key: "dragLeave",
    value: function dragLeave() {
      this.robotViewer.slotAnchors.hideSlots(this.robotViewer.scene);
      this.ghost.removeGhost();
    }
  }, {
    key: "drop",
    value: function drop(x, y) {
      var domElement = this.robotViewer.robotViewerElement;
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, x, y);
      var closestSlot = this.robotViewer.getClosestSlot(screenPosition, this.slotType);

      if (closestSlot) {
        var parent = closestSlot;

        do {
          if (parent.userData.isPartContainer) {
            this.robotController.addPart(parent.mediator.model, this.draggedPart, closestSlot.userData.slotName);
            break;
          }

          parent = parent.parent;
        } while (parent);
      } else this.robotController.addPart(null, this.draggedPart, '');

      this.robotViewer.slotAnchors.hideSlots(this.robotViewer.scene);
      this.ghost.removeGhost();
    }
  }]);

  return Dragger;
}();
/* global THREE */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Ghost =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Ghost(scene) {
    _classCallCheck(this, Ghost);

    this.scene = scene;
    this.ghost = null;
    this.pathPrefix = 'models/';
    if (typeof Ghost.assetsPathPrefix !== 'undefined') this.pathPrefix = Ghost.assetsPathPrefix + this.pathPrefix;
  }

  _createClass(Ghost, [{
    key: "addGhost",
    value: function addGhost(modelName) {
      var _this = this;

      this.ghost = new THREE.Object3D();
      this.ghost.userData.isGhost = true;
      var model = this.pathPrefix + modelName + '/model.x3d';
      var loader = new THREE.X3DLoader();
      loader.load(model, function (object3dList) {
        if (!_this.ghost || !Array.isArray(object3dList) || object3dList.length === 0) return;

        _this.ghost.add(object3dList[0]);

        _this.ghost.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.material.transparent = true;
            child.material.opacity = 0.5;
          }
        });
      });
      this.scene.add(this.ghost);
    }
  }, {
    key: "moveGhostToFloor",
    value: function moveGhostToFloor(projection) {
      if (!this.ghost) return;
      this.scene.add(this.ghost);
      this.ghost.position.copy(projection);
    }
  }, {
    key: "moveGhostToSlot",
    value: function moveGhostToSlot(slot) {
      if (!this.ghost) return;
      this.ghost.position.copy(new THREE.Vector3());
      slot.add(this.ghost);
    }
  }, {
    key: "removeGhost",
    value: function removeGhost() {
      if (!this.ghost) return;
      this.ghost.parent.remove(this.ghost);
      this.ghost = null;
    }
  }]);

  return Ghost;
}();
"use strict";

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

/* global THREE, Part, Robot */
var Handle =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Handle(robotController, domElement, camera, scene, orbitControls) {
    var _this = this;

    _classCallCheck(this, Handle);

    this.robotController = robotController;
    this.scene = scene;
    this.mode = 'select';
    this.part = null;
    this.control = new THREE.TransformControls(camera, domElement);
    this.control.isTransformControls = true; // To be detected correctly by OutlinePass.

    this.control.visible = false;
    this.control.enabled = false;
    this.control.setSpace('local');
    this.control.addEventListener('dragging-changed', function (event) {
      orbitControls.enabled = !event.value;
    });
    this.control.addEventListener('change', function (event) {
      if (!_this.target) return;

      if (_this.part && _this.mode === 'translate') {
        var position = _this.target.position;

        _this.robotController.translatePart(_this.part, position);
      }

      if (_this.part && _this.mode === 'rotate') {
        var quaternion = _this.target.quaternion;

        _this.robotController.rotatePart(_this.part, quaternion);
      }
    });
  }

  _createClass(Handle, [{
    key: "attachToObject",
    value: function attachToObject(object) {
      var _this2 = this;

      this.detach();
      this.part = object.mediator.model;
      this.part.addObserver('Translated', function (d) {
        _this2._updateTargetPosition();
      });
      this.part.addObserver('Rotated', function (d) {
        _this2._updateTargetPosition();
      });
      this.target = new THREE.Object3D();
      this.target.userData.isHandleTarget = true;

      this._updateTargetPosition();

      object.parent.add(this.target);
      this.control.attach(this.target);
      this.setMode(this.mode); // update visibility.
      // Uncomment to visualize the target:
      // var geometry = new THREE.BoxGeometry(0.05, 0.05, 0.05);
      // var material = new THREE.MeshBasicMaterial({color: 0x00ff00, transparent: true, opacity: 0.5});
      // var cube = new THREE.Mesh(geometry, material);
      // this.target.add(cube);
    }
  }, {
    key: "setMode",
    value: function setMode(mode) {
      this.mode = mode;

      if (mode === 'select') {
        this.control.visible = false;
        this.control.enabled = false;
      } else if (mode === 'translate') {
        this.control.visible = true;
        this.control.enabled = true;
        this.control.setMode('translate');
      } else if (mode === 'rotate') {
        this.control.visible = true;
        this.control.enabled = true;
        this.control.setMode('rotate');
      }

      this._updateConstraints();
    }
  }, {
    key: "detach",
    value: function detach() {
      this.control.detach();

      if (this.target) {
        this.target.parent.remove(this.target);
        this.target = null;
      }

      this.part = null;
    }
  }, {
    key: "showHandle",
    value: function showHandle() {
      this.scene.add(this.control);
    }
  }, {
    key: "hideHandle",
    value: function hideHandle() {
      this.scene.remove(this.control);
    }
  }, {
    key: "isDragging",
    value: function isDragging() {
      return this.control.dragging;
    }
  }, {
    key: "_updateTargetPosition",
    value: function _updateTargetPosition() {
      if (!this.target) return;
      this.target.position.copy(new THREE.Vector3(this.part.translation[0], this.part.translation[1], this.part.translation[2]));
      this.target.quaternion.copy(new THREE.Quaternion(this.part.quaternion[0], this.part.quaternion[1], this.part.quaternion[2], this.part.quaternion[3]));
      this.target.updateMatrix();
    }
  }, {
    key: "_updateConstraints",
    value: function _updateConstraints() {
      if (!this.part) return;
      var parentPart = this.part.parent;
      console.assert(parentPart);

      if (this.mode !== 'select') {
        if (parentPart instanceof Robot) {
          this.control.rotationSnap = null;
          this.control.translationSnap = null;
          this.control.showX = true;
          this.control.showY = true;
          this.control.showZ = true;
          return;
        }

        if (parentPart instanceof Part) {
          var slotName = parentPart.slotName(this.part);

          if (slotName) {
            var slotData = parentPart.asset.slots[slotName];
            this.control.rotationSnap = slotData.rotationSnap === -1 ? null : slotData.rotationSnap;
            this.control.translationSnap = slotData.translationSnap === -1 ? null : slotData.translationSnap;

            if (this.mode === 'rotate') {
              if (this.control.rotationSnap === 0) {
                this.control.showX = false;
                this.control.showY = false;
                this.control.showZ = false;
              } else if (slotData.rotationGizmoVisibility === undefined) {
                this.control.showX = true;
                this.control.showY = true;
                this.control.showZ = true;
              } else {
                this.control.showX = slotData.rotationGizmoVisibility[0];
                this.control.showY = slotData.rotationGizmoVisibility[1];
                this.control.showZ = slotData.rotationGizmoVisibility[2];
              }

              return;
            } else if (this.mode === 'translate') {
              if (this.control.translationSnap === 0) {
                this.control.showX = false;
                this.control.showY = false;
                this.control.showZ = false;
              } else if (slotData.translationHandleVisibility === undefined) {
                this.control.showX = true;
                this.control.showY = true;
                this.control.showZ = true;
              } else {
                this.control.showX = slotData.translationHandleVisibility[0];
                this.control.showY = slotData.translationHandleVisibility[1];
                this.control.showZ = slotData.translationHandleVisibility[2];
              }

              return;
            }
          }
        }
      } // select mode or invalid structure.


      this.control.rotationSnap = null;
      this.control.translationSnap = null;
      this.control.showX = false;
      this.control.showY = false;
      this.control.showZ = false;
    }
  }]);

  return Handle;
}();
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Highlightor =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function Highlightor(outlinePass) {
    _classCallCheck(this, Highlightor);

    this.outlinePass = outlinePass;
  }

  _createClass(Highlightor, [{
    key: "highlight",
    value: function highlight(part) {
      var selectedRepresentations = [];
      part.children.forEach(function (child) {
        if (child.userData.isRepresentation) selectedRepresentations.push(child);
      });
      if (selectedRepresentations.length > 0) this.outlinePass.selectedObjects = selectedRepresentations;
    }
  }, {
    key: "clearHighlight",
    value: function clearHighlight() {
      this.outlinePass.selectedObjects = [];
    }
  }]);

  return Highlightor;
}();
/* global THREE, convertStringToVec3, convertStringToQuaternion */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PartMediator =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function PartMediator(part) {
    var _this = this;

    _classCallCheck(this, PartMediator);

    this.model = part;
    this.pathPrefix = 'models/';
    if (typeof PartMediator.assetsPathPrefix !== 'undefined') this.pathPrefix = PartMediator.assetsPathPrefix + this.pathPrefix; // Create the root container.

    this.rootObject = new THREE.Object3D(); // The THREEjs container (contains the slots container and the part representation.)

    this.rootObject.matrixAutoUpdate = false;
    this.rootObject.mediator = this;
    this.rootObject.userData.isPartContainer = true; // Create the representation (async load).

    var model = this.pathPrefix + this.model.name + '/model.x3d';
    var loader = new THREE.X3DLoader();
    loader.load(model, function (object3dList) {
      if (!Array.isArray(object3dList) || object3dList.length === 0) return;
      _this.representation = object3dList[0]; // The THREEjs representation of the part.

      _this.representation.userData.isRepresentation = true;

      _this.rootObject.add(_this.representation);
    }); // Create the slot containers.

    this.childrenSlots = {};
    Object.keys(this.model.asset.slots).forEach(function (slotName) {
      var slot = _this.model.asset.slots[slotName];
      var object = new THREE.Object3D();
      object.userData.isSlotContainer = true;
      object.userData.slotType = slot.type;
      object.userData.slotName = slotName;
      var position = convertStringToVec3(slot.translation ? slot.translation : '0 0 0');
      object.position.copy(position);
      var quaternion = convertStringToQuaternion(slot.rotation ? slot.rotation : '0 1 0 0');
      object.quaternion.copy(quaternion);

      _this.rootObject.add(object);

      _this.childrenSlots[slotName] = object;
    }); // Link signals

    this.model.addObserver('PartAdded', function (d) {
      return _this.onPartAdded(d);
    });
    this.model.addObserver('PartRemoved', function (d) {
      return _this.onPartRemoved(d);
    });
    this.model.addObserver('Translated', function (d) {
      return _this.onTranslated(d);
    });
    this.model.addObserver('Rotated', function (d) {
      return _this.onRotated(d);
    });
    this.model.addObserver('ColorChanged', function (d) {
      return _this.onColorChanged(d);
    }); // Apply initial parameters.

    this.onTranslated({
      'translation': this.model.translation
    });
    this.onRotated({
      'quaternion': this.model.quaternion
    });
    if (typeof this.model.color !== 'undefined') this.onColorChanged({
      'color': this.model.color
    });
  }

  _createClass(PartMediator, [{
    key: "onPartAdded",
    value: function onPartAdded(data) {
      // Create the new part mediator, attach its root parts to this slot.
      var mediator = new PartMediator(data.part);
      this.childrenSlots[data.slotName].add(mediator.rootObject);
    }
  }, {
    key: "onPartRemoved",
    value: function onPartRemoved(data) {
      // Remove the child part containers.
      // The slot container should contain only one part container and eventually the handle target.
      for (var c = this.childrenSlots[data.slotName].children.length - 1; c >= 0; c--) {
        // technique to loop through array while removing array items.
        var child = this.childrenSlots[data.slotName].children[c];
        if (child.userData.isPartContainer) child.parent.remove(child);else console.assert(child.userData.isHandleTarget);
      }
    }
  }, {
    key: "onTranslated",
    value: function onTranslated(data) {
      var translation = new THREE.Vector3(data.translation[0], data.translation[1], data.translation[2]);
      this.rootObject.position.copy(translation);
      this.rootObject.updateMatrix();
    }
  }, {
    key: "onRotated",
    value: function onRotated(data) {
      var quaternion = new THREE.Quaternion(data.quaternion[0], data.quaternion[1], data.quaternion[2], data.quaternion[3]);
      this.rootObject.quaternion.copy(quaternion);
      this.rootObject.updateMatrix();
    }
  }, {
    key: "onColorChanged",
    value: function onColorChanged(data) {
      // TODO: color should not be hardcoded here.
      if (!this.representation) return; // TODO: this.representation may not exists a this point :-(

      this.representation.traverse(function (child) {
        if (child.isMesh) {
          if (data.color === 'yellow') child.material.color = new THREE.Color('rgb(100%, 60%, 0%)');else if (data.color === 'blue') child.material.color = new THREE.Color('rgb(0%, 45%, 100%)');
        }
      });
    }
  }]);

  return PartMediator;
}();
/* global THREE, PartMediator */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotMediator =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotMediator(robot) {
    var _this = this;

    _classCallCheck(this, RobotMediator);

    this.model = robot; // Create the root container.

    this.rootObject = new THREE.Object3D();
    this.rootObject.name = 'robot';
    this.rootObject.model = this;
    this.rootObject.matrixAutoUpdate = false;
    this.rootObject.mediator = this; // Link signals

    this.model.addObserver('RootPartAdded', function (e) {
      return _this.onRootPartAdded(e);
    });
    this.model.addObserver('RootPartRemoved', function (e) {
      return _this.onRootPartRemoved(e);
    });
  }

  _createClass(RobotMediator, [{
    key: "onRootPartAdded",
    value: function onRootPartAdded(part) {
      this.rootPartMediator = new PartMediator(part);
      this.rootObject.add(this.rootPartMediator.rootObject);
    }
  }, {
    key: "onRootPartRemoved",
    value: function onRootPartRemoved() {
      this.rootObject.remove(this.rootPartMediator.rootObject);
      this.rootPartMediator = null;
    }
  }]);

  return RobotMediator;
}();
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PartBrowser =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function PartBrowser(assetLibraryElement, assetLibrary, dragStartCallback) {
    var _this = this;

    _classCallCheck(this, PartBrowser);

    this.assetLibraryElement = assetLibraryElement;
    this.assetLibrary = assetLibrary;
    this.robotsTabDivs = {};
    this.partIconDivs = [];
    this.dragStartCallback = dragStartCallback;
    this.selectElement = document.createElement('select');
    this.selectElement.classList.add('nrp-robot-designer-part-browser-select');
    this.selectElement.addEventListener('change', function () {
      _this.showParts();
    });
    var labelBlock = document.createElement('div');
    labelBlock.classList.add('nrp-robot-designer-part-browser-label');
    labelBlock.innerHTML = '<p>Library</p>';
    labelBlock.appendChild(this.selectElement);
    this.assetLibraryElement.appendChild(labelBlock);
  }

  _createClass(PartBrowser, [{
    key: "loadAssets",
    value: function loadAssets() {
      var _this2 = this;

      // create robots tabs
      this.assetLibrary.getRobotNames().forEach(function (robotName) {
        // content
        var div = document.createElement('div');
        div.id = _this2._capitalize(robotName);
        div.classList.add('nrp-robot-designer-part-browser-content');
        _this2.robotsTabDivs[robotName] = div;

        _this2.assetLibraryElement.appendChild(div); // tab button


        var option = document.createElement('option');
        option.classList.add('nrp-robot-designer-part-browser-option');
        option.setAttribute('value', robotName);
        option.innerHTML = _this2._capitalize(robotName);

        _this2.selectElement.appendChild(option);
      });
      this.assetLibrary.assets.forEach(function (asset) {
        var div = document.createElement('div');
        var iconDiv = document.createElement('div');
        iconDiv.classList.add('part-icon');
        iconDiv.setAttribute('draggable', true);
        iconDiv.setAttribute('part', asset.name);

        if (!asset.root) {
          iconDiv.classList.add('hidden');
          iconDiv.setAttribute('slotType', asset.slotType);
        }

        iconDiv.innerHTML = '<img draggable="false" src="' + asset.icon + '" />';
        iconDiv.addEventListener('dragstart', function (event) {
          _this2.dragStartCallback(event);
        });
        div.appendChild(iconDiv);

        _this2.partIconDivs.push(iconDiv);

        _this2.robotsTabDivs[asset.getRobotName()].appendChild(iconDiv);
      });
      this.showParts(this.selectElement.firstChild, this.assetLibrary.getRobotNames()[0]);
    }
  }, {
    key: "update",
    value: function update(robot) {
      var availableSlotTypes = robot.getAvailableSlotTypes();

      for (var d = 0; d < this.partIconDivs.length; d++) {
        var div = this.partIconDivs[d];

        if (availableSlotTypes.length === 0) {
          if (div.getAttribute('slotType')) div.classList.add('hidden');else div.classList.remove('hidden');
        } else {
          div.classList.remove('hidden');

          if (div.getAttribute('slotType')) {
            if (availableSlotTypes.indexOf(div.getAttribute('slotType')) > -1) {
              div.classList.remove('part-icon-disabled');
              div.draggable = true;
            } else {
              div.classList.add('part-icon-disabled');
              div.draggable = false;
            }
          } else div.classList.add('hidden');
        }
      }
    }
  }, {
    key: "showParts",
    value: function showParts() {
      var robotName = this.selectElement.options[this.selectElement.selectedIndex].value;

      for (var key in this.robotsTabDivs) {
        this.robotsTabDivs[key].style.display = 'none';
      }

      this.robotsTabDivs[robotName].style.display = 'block';
    }
  }, {
    key: "_capitalize",
    value: function _capitalize(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    }
  }]);

  return PartBrowser;
}();
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var PartViewer =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function PartViewer(robotController, element, selector) {
    var _this = this;

    _classCallCheck(this, PartViewer);

    this.robotController = robotController;
    this.element = element;
    selector.addObserver('SelectionChanged', function (d) {
      return _this._showPart(d.part);
    });

    this._cleanupDiv('No selection');
  }

  _createClass(PartViewer, [{
    key: "_showPart",
    value: function _showPart(part) {
      if (part === null) this._cleanupDiv('No selection');else {
        var model = part.mediator.model;
        var asset = model.asset;

        this._populateDiv(model, asset.parameters);
      }
    }
  }, {
    key: "_populateDiv",
    value: function _populateDiv(model, parameters) {
      var _this2 = this;

      this.element.innerHTML = ''; // add name label.

      var nameLabel = document.createElement('p');
      nameLabel.innerHTML = 'Name: <span class="part-name-label">' + model.name + '</span>';
      this.element.appendChild(nameLabel);
      var text = document.createElement('p');

      if (!parameters) {
        text.innerHTML = '<i>No parameters<i>';
        this.element.appendChild(text);
        return;
      } // create parameter forms.


      var form = document.createElement('form');

      if ('color' in parameters) {
        text.style.display = 'inline';
        var textContent = document.createTextNode('Color: ');
        text.appendChild(textContent);
        form.appendChild(text);
        var select = document.createElement('select');
        select.style.display = 'inline';

        for (var c in parameters.color) {
          var option = document.createElement('option');
          var optionText = document.createTextNode(parameters.color[c]);
          var valueAtt = document.createAttribute('value');
          valueAtt.value = parameters.color[c];
          option.setAttributeNode(valueAtt);
          option.appendChild(optionText);
          select.appendChild(option);
        }

        select.addEventListener('change', function (event) {
          var color = event.target.value;

          _this2.robotController.changeColor(model, color);
        });
        form.appendChild(select);
      }

      this.element.appendChild(form);
    }
  }, {
    key: "_cleanupDiv",
    value: function _cleanupDiv(text) {
      this.element.innerHTML = '<p><i>' + text + '</i></p>';
    }
  }]);

  return PartViewer;
}();
/* global THREE, Handle, PartSelector, SlotAnchors, Highlightor */
'use strict'; // 1. dom
// 2. renderer
// 3. resize events
// 4. refresh events
// 5. pass + compose + controls
// 6. mouse interactions

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotViewer =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotViewer(robotViewerElement, robotController, commands, sceneRgbColor) {
    var _this = this;

    _classCallCheck(this, RobotViewer);

    this.robotViewerElement = robotViewerElement;
    this.robotController = robotController;
    this.renderer = new THREE.WebGLRenderer({
      'antialias': false
    });
    this.renderer.setClearColor(0x000, 1.0);
    this.renderer.gammaInput = false;
    this.renderer.gammaOutput = false;
    this.renderer.physicallyCorrectLights = true;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(sceneRgbColor);
    this.camera = new THREE.PerspectiveCamera(45, 0.3, 0.001, 100);
    this.camera.position.x = 0.1;
    this.camera.position.y = 0.1;
    this.camera.position.z = 0.1;
    this.camera.lookAt(this.scene.position);
    var light = new THREE.DirectionalLight(0xffffff, 1.8);
    light.userData = {
      'x3dType': 'DirectionalLight'
    };
    this.scene.add(light);
    var light2 = new THREE.AmbientLight(0x404040);
    this.scene.add(light2);
    var grid = new THREE.GridHelper(5, 50, 0x880088, 0x440044);
    grid.matrixAutoUpdate = false;
    this.scene.add(grid);
    this.controls = new THREE.OrbitControls(this.camera, this.robotViewerElement);
    this.composer = new THREE.EffectComposer(this.renderer);
    var renderPass = new THREE.RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);
    this.hdrResolvePass = new THREE.ShaderPass(THREE.HDRResolveShader);
    this.composer.addPass(this.hdrResolvePass);
    var fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    this.composer.addPass(fxaaPass);
    this.highlightOutlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.composer.addPass(this.highlightOutlinePass);
    this.selectionOutlinePass = new THREE.OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
    this.selectionOutlinePass.visibleEdgeColor.set(0x00BFFF);
    this.selectionOutlinePass.renderToScreen = true;
    this.composer.addPass(this.selectionOutlinePass);

    window.onresize = function () {
      return _this.resize();
    }; // when the window has been resized.


    this.robotViewerElement.appendChild(this.renderer.domElement);
    this.resize();
    this.highlightor = new Highlightor(this.highlightOutlinePass);
    this.selector = new PartSelector(this.selectionOutlinePass);
    this.handle = new Handle(this.robotController, this.robotViewerElement, this.camera, this.scene, this.controls); // reset selection and handles when any part is removed

    commands.addObserver('AnyPartRemoved', function () {
      return _this.clearSelection();
    });
    this.gpuPicker = new THREE.GPUPicker({
      renderer: this.renderer,
      debug: false
    });
    this.gpuPicker.setFilter(function (object) {
      return object instanceof THREE.Mesh && 'x3dType' in object.userData;
    });
    this.slotAnchors = new SlotAnchors(this.scene);
    this.resize();
  }

  _createClass(RobotViewer, [{
    key: "render",
    value: function render() {
      var _this2 = this;

      requestAnimationFrame(function () {
        return _this2.render();
      });
      this.composer.render();
    }
  }, {
    key: "resize",
    value: function resize() {
      var width = this.robotViewerElement.clientWidth;
      var height = this.robotViewerElement.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      if (this.gpuPicker) this.gpuPicker.resizeTexture(width, height);
      this.renderer.setSize(width, height);
      this.composer.setSize(width, height);
      this.render();
    }
  }, {
    key: "getClosestSlot",
    value: function getClosestSlot(screenPosition, slotType) {
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.camera);
      var ray = raycaster.ray;
      var closestSlot = null;
      var closestSqDistance = Number.POSITIVE_INFINITY;
      var robotObject = this.scene.getObjectByName('robot');
      if (!robotObject) return;
      robotObject.traverse(function (obj) {
        if (obj.userData.isSlotContainer && obj.userData.slotType === slotType) {
          var slot = obj;
          var slotGlobalPosition = slot.localToWorld(new THREE.Vector3());
          var sqDistance = ray.distanceSqToPoint(slotGlobalPosition);

          if (closestSqDistance > sqDistance) {
            closestSlot = slot;
            closestSqDistance = sqDistance;
          }
        }
      }); // if Math.sqrt(closestSqDistance) < 0.01)...

      return closestSlot;
    }
  }, {
    key: "projectScreenPositionOnFloor",
    value: function projectScreenPositionOnFloor(screenPosition) {
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.camera);
      var planA = new THREE.Mesh(new THREE.PlaneGeometry(100, 100));
      planA.geometry.rotateX(-Math.PI / 2);
      var planB = new THREE.Mesh(new THREE.PlaneGeometry(100, 100));
      planB.geometry.rotateX(Math.PI / 2);
      var intersects = raycaster.intersectObjects([planA, planB]);
      if (intersects.length > 0) return intersects[0].point;
    }
  }, {
    key: "projectScreenPositionOnSlotsAnchors",
    value: function projectScreenPositionOnSlotsAnchors(screenPosition) {
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.camera);
      var intersects = raycaster.intersectObjects(this.slotAnchors.slots());
      if (intersects.length > 0) return intersects[0].point;
    }
  }, {
    key: "getPartAt",
    value: function getPartAt(relativePosition, screenPosition) {
      if (this.handle.control.pointerHover(screenPosition)) return undefined;
      this.handle.hideHandle();
      this.gpuPicker.setScene(this.scene);
      this.gpuPicker.setCamera(this.camera);
      var raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(screenPosition, this.camera);
      var intersection = this.gpuPicker.pick(relativePosition, raycaster);

      if (intersection && intersection.faceIndex > 0) {
        var parent = intersection.object;

        do {
          if (parent.userData.isPartContainer) {
            this.handle.showHandle();
            return parent;
          }

          parent = parent.parent;
        } while (parent);
      }

      this.handle.showHandle();
      return undefined;
    }
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.selector.clearSelection();
      this.handle.detach();
    }
  }]);

  return RobotViewer;
}();
/* global Observable */
'use strict';

function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

var PartSelector =
/*#__PURE__*/
function (_Observable) {
  _inherits(PartSelector, _Observable);

  // eslint-disable-line no-unused-vars
  function PartSelector(outlinePass) {
    var _this;

    _classCallCheck(this, PartSelector);

    _this = _possibleConstructorReturn(this, _getPrototypeOf(PartSelector).call(this));
    _this.outlinePass = outlinePass;
    _this.selectedPart = null;
    return _this;
  }

  _createClass(PartSelector, [{
    key: "selectPart",
    value: function selectPart(part) {
      var selectedRepresentations = [];
      part.children.forEach(function (child) {
        if (child.userData.isRepresentation) selectedRepresentations.push(child);
      });

      if (selectedRepresentations.length > 0) {
        this.selectedPart = part;
        this.outlinePass.selectedObjects = selectedRepresentations;
        this.notify('SelectionChanged', {
          'part': this.selectedPart
        });
      }
    }
  }, {
    key: "clearSelection",
    value: function clearSelection() {
      this.selectedPart = null;
      this.outlinePass.selectedObjects = [];
      this.notify('SelectionChanged', {
        'part': null
      });
    }
  }]);

  return PartSelector;
}(Observable);
/* global THREE */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var SlotAnchors =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function SlotAnchors(scene) {
    _classCallCheck(this, SlotAnchors);

    this.scene = scene;
    this.slotRepresentation = new THREE.BoxGeometry(0.011, 0.011, 0.011);
    this.regularMaterial = new THREE.MeshBasicMaterial({
      color: 0x10ff30,
      transparent: true,
      opacity: 0.8
    });
    this.highlightedMaterial = new THREE.MeshBasicMaterial({
      color: 0x0040ff,
      transparent: true,
      opacity: 0.8
    });
    this.slotRepresentationList = [];
    this.highlightedMesh = null;
  }

  _createClass(SlotAnchors, [{
    key: "showSlots",
    value: function showSlots(slotType) {
      var _this = this;

      this.hideSlots();
      this.scene.traverse(function (obj) {
        if (obj.userData.isSlotContainer && obj.userData.slotType === slotType && obj.children.length === 0) {
          var mesh = new THREE.Mesh(_this.slotRepresentation, _this.regularMaterial);
          mesh.userData.isSlotRepresentation = true;
          mesh.matrixAutoUpdate = false;
          mesh.name = 'slot representation';
          obj.add(mesh);

          _this.slotRepresentationList.push(mesh);
        }
      });
    }
  }, {
    key: "slots",
    value: function slots() {
      return this.slotRepresentationList;
    }
  }, {
    key: "hideSlots",
    value: function hideSlots(scene) {
      this.unhighlight();
      this.slotRepresentationList.forEach(function (obj) {
        obj.parent.remove(obj);
      });
      this.slotRepresentationList = [];
    }
  }, {
    key: "highlight",
    value: function highlight(slot) {
      this.unhighlight();
      var mesh = slot.getObjectByName('slot representation');

      if (mesh) {
        mesh.material = this.highlightedMaterial;
        this.highlightedMesh = mesh;
      }
    }
  }, {
    key: "unhighlight",
    value: function unhighlight() {
      if (this.highlightedMesh) {
        this.highlightedMesh.material = this.regularMaterial;
        this.highlightedMesh = null;
      }
    }
  }]);

  return SlotAnchors;
}();
/* global AssetLibrary, Commands, Dragger, Ghost, PartBrowser, PartMediator, PartViewer, Robot, RobotController, RobotMediator, RobotViewer */

/* global MouseEvents, TextureLoader */

/* global toggleFullScreen */
'use strict';

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var RobotDesigner =
/*#__PURE__*/
function () {
  // eslint-disable-line no-unused-vars
  function RobotDesigner() {
    var _this = this;

    var domElement = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : undefined;
    var sceneRgbColor = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 0x000;
    var isStandAlone = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : true;

    _classCallCheck(this, RobotDesigner);

    this.pathPrefix = '';
    var scripts = document.getElementsByTagName('script');

    for (var i = 0; i < scripts.length; i++) {
      var url = scripts[i].src;

      if (url && (url.endsWith('robot_designer.js') || url.endsWith('robot-designer.min.js'))) {
        this.pathPrefix = url.substring(0, url.lastIndexOf('/', url.lastIndexOf('/', url.lastIndexOf('/') - 1) - 1) + 1);
        break;
      }
    }

    this._createDomElements(domElement, isStandAlone);

    this.assetLibrary = new AssetLibrary(this.pathPrefix);
    this.partBrowser = new PartBrowser(this.assetLibraryElement, this.assetLibrary, function (event) {
      _this.dragStart(event);
    });
    this.assetLibrary.addObserver('loaded', function () {
      _this.partBrowser.loadAssets();
    });
    TextureLoader.setTexturePathPrefix(this.pathPrefix);
    Ghost.assetsPathPrefix = this.assetLibrary.getPath();
    PartMediator.assetsPathPrefix = this.assetLibrary.getPath();
    this.commands = new Commands();
    this.commands.addObserver('updated', function () {
      return _this._updateUndoRedoButtons();
    });
    this.commands.addObserver('updated', function () {
      return _this.partBrowser.update(_this.robot);
    });
    this.robot = new Robot();
    this.robotMediator = new RobotMediator(this.robot);
    this.robotController = new RobotController(this.assetLibrary, this.commands, this.robot);
    this.robotViewer = new RobotViewer(this.robotViewerElement, this.robotController, this.commands, sceneRgbColor);
    this.robotViewer.scene.add(this.robotMediator.rootObject);
    this.highlightOutlinePass = this.robotViewer.highlightOutlinePass;
    this.dragger = new Dragger(this.robotViewer, this.robotController);
    this.partViewer = new PartViewer(this.robotController, this.partViewerElement, this.robotViewer.selector);
  } // events


  _createClass(RobotDesigner, [{
    key: "resize",
    value: function resize() {
      this.robotViewer.resize();
    }
  }, {
    key: "openExportModal",
    value: function openExportModal() {
      // eslint-disable-line no-unused-vars
      var modal = document.getElementById('nrp-robot-designer-modal-window');
      modal.style.display = 'block';
      var span = document.getElementsByClassName('modal-close-button')[0];

      span.onclick = function () {
        modal.style.display = 'none';
      };

      window.onclick = function (event) {
        if (event.target === modal) modal.style.display = 'none';
      };
    }
  }, {
    key: "exportToFile",
    value: function exportToFile(format) {
      // eslint-disable-line no-unused-vars
      var mimeType = '';
      var data = '';
      var filename = '';

      if (format === 'json') {
        mimeType = 'text/json';
        data = JSON.stringify(this.robot.serialize(), null, 2);
        filename = 'robot.json';
      } else if (format === 'webots') {
        mimeType = 'text/txt';
        data = this.robot.webotsExport();
        filename = 'robot.wbt';
      } else {
        console.assert(false); // Invalid format.

        return;
      }

      if (typeof this.onExport === 'function') {
        this.onExport(data);
        return;
      }

      var blob = new Blob([data], {
        type: mimeType
      });
      var e = document.createEvent('MouseEvents');
      var a = document.createElement('a');
      a.download = filename;
      a.href = window.URL.createObjectURL(blob);
      a.dataset.downloadurl = [mimeType, a.download, a.href].join(':');
      e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
      a.dispatchEvent(e);
    }
  }, {
    key: "changeMode",
    value: function changeMode(mode) {
      this.selectButton.classList.remove('fa-selected');
      this.translateButton.classList.remove('fa-selected');
      this.rotateButton.classList.remove('fa-selected');
      if (mode === 'select') this.selectButton.classList.add('fa-selected');else if (mode === 'translate') this.translateButton.classList.add('fa-selected');else if (mode === 'rotate') this.rotateButton.classList.add('fa-selected');
      this.robotViewer.handle.setMode(mode);
    }
  }, {
    key: "mouseDown",
    value: function mouseDown(ev) {
      var domElement = this.robotViewer.robotViewerElement;
      var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(domElement, ev.clientX, ev.clientY);
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, ev.clientX, ev.clientY); // get picked part that will be selected on mouseUp if the mouse doesn't move

      this.partToBeSelected = this.robotViewer.getPartAt(relativePosition, screenPosition);
      this.mouseDownPosition = {
        x: ev.clientX,
        y: ev.clientY
      };
    }
  }, {
    key: "mouseUp",
    value: function mouseUp(ev) {
      if (typeof this.partToBeSelected === 'undefined' || typeof this.mouseDownPosition === 'undefined') return; // compute Manhattan length

      var length = Math.abs(this.mouseDownPosition.x - ev.clientX) + Math.abs(this.mouseDownPosition.y - ev.clientY);

      if (length < 20) {
        // the mouse was moved by less than 20 pixels (determined empirically)
        // select part
        this.robotViewer.selector.selectPart(this.partToBeSelected);
        this.robotViewer.handle.attachToObject(this.partToBeSelected);
      }

      this.partToBeSelected = undefined;
      this.mouseDownPosition = undefined;
    }
  }, {
    key: "deleteSelectedPart",
    value: function deleteSelectedPart() {
      var mesh = this.robotViewer.selector.selectedPart;

      if (mesh) {
        var parent = mesh;

        do {
          if (parent.userData.isPartContainer) {
            this.robotController.removePart(parent.mediator.model);
            break;
          }

          parent = parent.parent;
        } while (parent);
      }

      this.robotViewer.clearSelection();
    }
  }, {
    key: "mouseMove",
    value: function mouseMove(ev) {
      if (this.robotViewer.handle.isDragging()) return;
      var domElement = this.robotViewer.robotViewerElement;
      var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(domElement, ev.clientX, ev.clientY);
      var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(domElement, ev.clientX, ev.clientY);
      var part = this.robotViewer.getPartAt(relativePosition, screenPosition);
      if (part) this.robotViewer.highlightor.highlight(part);else this.robotViewer.highlightor.clearHighlight();
    }
  }, {
    key: "dragStart",
    value: function dragStart(ev) {
      var part = ev.target.getAttribute('part');
      var slotType = ev.target.getAttribute('slotType');
      ev.dataTransfer.setData('text', part); // Cannot be used on Chrome. Cannot be dropped on Firefox.
      // https://stackoverflow.com/a/40923520/2210777

      var img = document.createElement('img');
      img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      ev.dataTransfer.setDragImage(img, 0, 0);
      this.dragger.dragStart(part, slotType);
    }
  }, {
    key: "dragOver",
    value: function dragOver(ev) {
      ev.preventDefault();
      ev.dataTransfer.getData('text'); // Cannot be used on Chrome. Cannot be dropped on Firefox.

      this.dragger.dragOver(ev.clientX, ev.clientY);
    } // DOM setup

  }, {
    key: "_createDomElements",
    value: function _createDomElements(domElement, isStandAlone) {
      var _this2 = this;

      this.part = document.createElement('div');
      this.part.classList.add('nrp-robot-designer');
      this.part.id = 'nrp-robot-designer';
      if (typeof domElement === 'undefined') document.body.appendChild(this.part);else domElement.appendChild(this.part);

      if (isStandAlone) {
        var header = document.createElement('div');
        header.classList.add('header');
        header.innerHTML = "<span>NRP Robot Designer</span>\n        <i class=\"fas fa-robot\"></i>\n        <span class=\"menu-item\">File</span>\n        <span class=\"menu-item\">Help</span>";
        this.part.appendChild(header);
      }

      this.toolbar = document.createElement('div');
      this.toolbar.classList.add('menu');
      this.toolbar.innerHTML = "\n      <i id=\"nrp-robot-designer-export-button\" class=\"fas fa-file-export\"></i>\n      <span>-</span>\n      <i id=\"nrp-robot-designer-undo-button\" class=\"fas fa-undo fa-disabled\"></i>\n      <i id=\"nrp-robot-designer-redo-button\" class=\"fas fa-redo fa-disabled\"></i>\n      <span>-</span>\n      <i id=\"nrp-robot-designer-select-button\" class=\"fas fa-selected fa-mouse-pointer\"></i>\n      <i id=\"nrp-robot-designer-translate-button\" class=\"fas fa-arrows-alt\"></i>\n      <i id=\"nrp-robot-designer-rotate-button\" class=\"fas fa-sync-alt\"></i>\n      <span>-</span>\n      <i id=\"nrp-robot-designer-delete-button\" class=\"fas fa-trash-alt\"></i>";

      if (isStandAlone) {
        this.toolbar.innerHTML += "\n        <span>-</span>\n        <i id=\"nrp-robot-designer-maximize-button\" class=\"fas fa-window-maximize\"></i>";
      }

      this.part.appendChild(this.toolbar);
      var exportButton = document.getElementById('nrp-robot-designer-export-button');
      exportButton.addEventListener('click', function () {
        _this2.openExportModal();
      });
      this.undoButton = document.getElementById('nrp-robot-designer-undo-button');
      this.undoButton.addEventListener('click', function () {
        _this2.commands.undo();
      });
      this.redoButton = document.getElementById('nrp-robot-designer-redo-button');
      this.redoButton.addEventListener('click', function () {
        _this2.commands.redo();
      });
      this.selectButton = document.getElementById('nrp-robot-designer-select-button');
      this.selectButton.addEventListener('click', function () {
        _this2.changeMode('select');
      });
      this.translateButton = document.getElementById('nrp-robot-designer-translate-button');
      this.translateButton.addEventListener('click', function () {
        _this2.changeMode('translate');
      });
      this.rotateButton = document.getElementById('nrp-robot-designer-rotate-button');
      this.rotateButton.addEventListener('click', function () {
        _this2.changeMode('rotate');
      });
      var deleteButton = document.getElementById('nrp-robot-designer-delete-button');
      deleteButton.addEventListener('click', function () {
        _this2.deleteSelectedPart();
      });
      var maximizeButton = document.getElementById('nrp-robot-designer-maximize-button');
      if (maximizeButton) maximizeButton.addEventListener('click', function () {
        toggleFullScreen();
      });
      this.assetLibraryElement = document.createElement('div');
      this.assetLibraryElement.classList.add('part-browser');
      this.assetLibraryElement.classList.add('designer-group');
      this.part.appendChild(this.assetLibraryElement);
      var partViewerContainer = document.createElement('div');
      partViewerContainer.classList.add('part-viewer');
      partViewerContainer.classList.add('designer-group');
      partViewerContainer.innerHTML = "<p class=\"designer-group-title\">Part viewer</p>";
      this.partViewerElement = document.createElement('div');
      partViewerContainer.appendChild(this.partViewerElement);
      this.part.appendChild(partViewerContainer);
      this.robotViewerElement = document.createElement('div');
      this.robotViewerElement.classList.add('main');
      this.robotViewerElement.addEventListener('drop', function (event) {
        event.preventDefault();

        _this2.dragger.drop(event.clientX, event.clientY);
      });
      this.robotViewerElement.addEventListener('dragenter', function (event) {
        _this2.dragger.dragEnter();
      });
      this.robotViewerElement.addEventListener('dragover', function (event) {
        _this2.dragOver(event);
      });
      this.robotViewerElement.addEventListener('dragleave', function (event) {
        _this2.dragger.dragLeave();
      });
      this.robotViewerElement.addEventListener('mousemove', function (event) {
        _this2.mouseMove(event);
      });
      this.robotViewerElement.addEventListener('mousedown', function (event) {
        _this2.mouseDown(event);
      });
      this.robotViewerElement.addEventListener('mouseup', function (event) {
        _this2.mouseUp(event);
      });
      this.part.appendChild(this.robotViewerElement); // export modal window

      var modalWindow = document.createElement('div');
      modalWindow.id = 'nrp-robot-designer-modal-window';
      modalWindow.classList.add('modal');
      modalWindow.innerHTML = "<div class=\"modal-content\">\n       <span class=\"modal-close-button\">&times;</span>\n       <div class=\"modal-grid\">\n         <button type=\"button\" id=\"nrp-robot-designer-json-export-button\"  class=\"nrp-button\">Export to JSON</button>\n         <button type=\"button\" id=\"nrp-robot-designer-webots-export-button\" class=\"nrp-button\">Export to Webots</button>\n         <button type=\"button\" id=\"nrp-robot-designer-nrp-export-button\" class=\"nrp-button nrp-button-disabled\">Export to NRP</button>\n       </div>\n     </div>";
      this.part.appendChild(modalWindow);
      var jsonExportButton = document.getElementById('nrp-robot-designer-json-export-button');
      jsonExportButton.addEventListener('click', function () {
        _this2.exportToFile('json');
      });
      var webotsExportButton = document.getElementById('nrp-robot-designer-webots-export-button');
      webotsExportButton.addEventListener('click', function () {
        _this2.exportToFile('webots');
      });
      var nrpExportButton = document.getElementById('nrp-robot-designer-nrp-export-button');
      nrpExportButton.addEventListener('click', function () {
        alert('Coming soon...');
      });
    }
  }, {
    key: "_updateUndoRedoButtons",
    value: function _updateUndoRedoButtons() {
      if (this.commands.canRedo()) this.redoButton.classList.remove('fa-disabled');else this.redoButton.classList.add('fa-disabled');
      if (this.commands.canUndo()) this.undoButton.classList.remove('fa-disabled');else this.undoButton.classList.add('fa-disabled');
    }
  }]);

  return RobotDesigner;
}();
