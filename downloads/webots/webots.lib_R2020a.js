/**
 * @author Nikos M. / https://github.com/foo123/
 */

// https://github.com/mrdoob/three.js/issues/5552
// http://en.wikipedia.org/wiki/RGBE_image_format

THREE.HDRLoader = THREE.RGBELoader = function ( manager ) {

	this.manager = ( manager !== undefined ) ? manager : THREE.DefaultLoadingManager;
	this.type = THREE.UnsignedByteType;

};

// extend THREE.DataTextureLoader
THREE.RGBELoader.prototype = Object.create( THREE.DataTextureLoader.prototype );

// adapted from http://www.graphics.cornell.edu/~bjw/rgbe.html
THREE.RGBELoader.prototype._parser = function ( buffer ) {

	var
		/* return codes for rgbe routines */
		RGBE_RETURN_SUCCESS = 0,
		RGBE_RETURN_FAILURE = - 1,

		/* default error routine.  change this to change error handling */
		rgbe_read_error = 1,
		rgbe_write_error = 2,
		rgbe_format_error = 3,
		rgbe_memory_error = 4,
		rgbe_error = function ( rgbe_error_code, msg ) {

			switch ( rgbe_error_code ) {

				case rgbe_read_error: console.error( "THREE.RGBELoader Read Error: " + ( msg || '' ) );
					break;
				case rgbe_write_error: console.error( "THREE.RGBELoader Write Error: " + ( msg || '' ) );
					break;
				case rgbe_format_error: console.error( "THREE.RGBELoader Bad File Format: " + ( msg || '' ) );
					break;
				default:
				case rgbe_memory_error: console.error( "THREE.RGBELoader: Error: " + ( msg || '' ) );

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

		fgets = function ( buffer, lineLimit, consume ) {

			lineLimit = ! lineLimit ? 1024 : lineLimit;
			var p = buffer.pos,
				i = - 1, len = 0, s = '', chunkSize = 128,
				chunk = String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) )
			;
			while ( ( 0 > ( i = chunk.indexOf( NEWLINE ) ) ) && ( len < lineLimit ) && ( p < buffer.byteLength ) ) {

				s += chunk; len += chunk.length;
				p += chunkSize;
				chunk += String.fromCharCode.apply( null, new Uint16Array( buffer.subarray( p, p + chunkSize ) ) );

			}

			if ( - 1 < i ) {

				/*for (i=l-1; i>=0; i--) {
					byteCode = m.charCodeAt(i);
					if (byteCode > 0x7f && byteCode <= 0x7ff) byteLen++;
					else if (byteCode > 0x7ff && byteCode <= 0xffff) byteLen += 2;
					if (byteCode >= 0xDC00 && byteCode <= 0xDFFF) i--; //trail surrogate
				}*/
				if ( false !== consume ) buffer.pos += len + i + 1;
				return s + chunk.slice( 0, i );

			}
			return false;

		},

		/* minimal header reading.  modify if you want to parse more information */
		RGBE_ReadHeader = function ( buffer ) {

			var line, match,

				// regexes to parse header info fields
				magic_token_re = /^#\?(\S+)$/,
				gamma_re = /^\s*GAMMA\s*=\s*(\d+(\.\d+)?)\s*$/,
				exposure_re = /^\s*EXPOSURE\s*=\s*(\d+(\.\d+)?)\s*$/,
				format_re = /^\s*FORMAT=(\S+)\s*$/,
				dimensions_re = /^\s*\-Y\s+(\d+)\s+\+X\s+(\d+)\s*$/,

				// RGBE format header struct
				header = {

					valid: 0, /* indicate which fields are valid */

					string: '', /* the actual header string */

					comments: '', /* comments found in header */

					programtype: 'RGBE', /* listed at beginning of file to identify it after "#?". defaults to "RGBE" */

					format: '', /* RGBE format, default 32-bit_rle_rgbe */

					gamma: 1.0, /* image has already been gamma corrected with given gamma. defaults to 1.0 (no correction) */

					exposure: 1.0, /* a value of 1.0 in an image corresponds to <exposure> watts/steradian/m^2. defaults to 1.0 */

					width: 0, height: 0 /* image dimensions, width/height */

				};

			if ( buffer.pos >= buffer.byteLength || ! ( line = fgets( buffer ) ) ) {

				return rgbe_error( rgbe_read_error, "no header found" );

			}
			/* if you want to require the magic token then uncomment the next line */
			if ( ! ( match = line.match( magic_token_re ) ) ) {

				return rgbe_error( rgbe_format_error, "bad initial token" );

			}
			header.valid |= RGBE_VALID_PROGRAMTYPE;
			header.programtype = match[ 1 ];
			header.string += line + "\n";

			while ( true ) {

				line = fgets( buffer );
				if ( false === line ) break;
				header.string += line + "\n";

				if ( '#' === line.charAt( 0 ) ) {

					header.comments += line + "\n";
					continue; // comment line

				}

				if ( match = line.match( gamma_re ) ) {

					header.gamma = parseFloat( match[ 1 ], 10 );

				}
				if ( match = line.match( exposure_re ) ) {

					header.exposure = parseFloat( match[ 1 ], 10 );

				}
				if ( match = line.match( format_re ) ) {

					header.valid |= RGBE_VALID_FORMAT;
					header.format = match[ 1 ];//'32-bit_rle_rgbe';

				}
				if ( match = line.match( dimensions_re ) ) {

					header.valid |= RGBE_VALID_DIMENSIONS;
					header.height = parseInt( match[ 1 ], 10 );
					header.width = parseInt( match[ 2 ], 10 );

				}

				if ( ( header.valid & RGBE_VALID_FORMAT ) && ( header.valid & RGBE_VALID_DIMENSIONS ) ) break;

			}

			if ( ! ( header.valid & RGBE_VALID_FORMAT ) ) {

				return rgbe_error( rgbe_format_error, "missing format specifier" );

			}
			if ( ! ( header.valid & RGBE_VALID_DIMENSIONS ) ) {

				return rgbe_error( rgbe_format_error, "missing image size specifier" );

			}

			return header;

		},

		RGBE_ReadPixels_RLE = function ( buffer, w, h ) {

			var data_rgba, offset, pos, count, byteValue,
				scanline_buffer, ptr, ptr_end, i, l, off, isEncodedRun,
				scanline_width = w, num_scanlines = h, rgbeStart
			;

			if (
				// run length encoding is not allowed so read flat
				( ( scanline_width < 8 ) || ( scanline_width > 0x7fff ) ) ||
				// this file is not run length encoded
				( ( 2 !== buffer[ 0 ] ) || ( 2 !== buffer[ 1 ] ) || ( buffer[ 2 ] & 0x80 ) )
			) {

				// return the flat buffer
				return new Uint8Array( buffer );

			}

			if ( scanline_width !== ( ( buffer[ 2 ] << 8 ) | buffer[ 3 ] ) ) {

				return rgbe_error( rgbe_format_error, "wrong scanline width" );

			}

			data_rgba = new Uint8Array( 4 * w * h );

			if ( ! data_rgba || ! data_rgba.length ) {

				return rgbe_error( rgbe_memory_error, "unable to allocate buffer space" );

			}

			offset = 0; pos = 0; ptr_end = 4 * scanline_width;
			rgbeStart = new Uint8Array( 4 );
			scanline_buffer = new Uint8Array( ptr_end );

			// read in each successive scanline
			while ( ( num_scanlines > 0 ) && ( pos < buffer.byteLength ) ) {

				if ( pos + 4 > buffer.byteLength ) {

					return rgbe_error( rgbe_read_error );

				}

				rgbeStart[ 0 ] = buffer[ pos ++ ];
				rgbeStart[ 1 ] = buffer[ pos ++ ];
				rgbeStart[ 2 ] = buffer[ pos ++ ];
				rgbeStart[ 3 ] = buffer[ pos ++ ];

				if ( ( 2 != rgbeStart[ 0 ] ) || ( 2 != rgbeStart[ 1 ] ) || ( ( ( rgbeStart[ 2 ] << 8 ) | rgbeStart[ 3 ] ) != scanline_width ) ) {

					return rgbe_error( rgbe_format_error, "bad rgbe scanline format" );

				}

				// read each of the four channels for the scanline into the buffer
				// first red, then green, then blue, then exponent
				ptr = 0;
				while ( ( ptr < ptr_end ) && ( pos < buffer.byteLength ) ) {

					count = buffer[ pos ++ ];
					isEncodedRun = count > 128;
					if ( isEncodedRun ) count -= 128;

					if ( ( 0 === count ) || ( ptr + count > ptr_end ) ) {

						return rgbe_error( rgbe_format_error, "bad scanline data" );

					}

					if ( isEncodedRun ) {

						// a (encoded) run of the same value
						byteValue = buffer[ pos ++ ];
						for ( i = 0; i < count; i ++ ) {

							scanline_buffer[ ptr ++ ] = byteValue;

						}
						//ptr += count;

					} else {

						// a literal-run
						scanline_buffer.set( buffer.subarray( pos, pos + count ), ptr );
						ptr += count; pos += count;

					}

				}


				// now convert data from buffer into rgba
				// first red, then green, then blue, then exponent (alpha)
				l = scanline_width; //scanline_buffer.byteLength;
				for ( i = 0; i < l; i ++ ) {

					off = 0;
					data_rgba[ offset ] = scanline_buffer[ i + off ];
					off += scanline_width; //1;
					data_rgba[ offset + 1 ] = scanline_buffer[ i + off ];
					off += scanline_width; //1;
					data_rgba[ offset + 2 ] = scanline_buffer[ i + off ];
					off += scanline_width; //1;
					data_rgba[ offset + 3 ] = scanline_buffer[ i + off ];
					offset += 4;

				}

				num_scanlines --;

			}

			return data_rgba;

		}
	;

	var byteArray = new Uint8Array( buffer ),
		byteLength = byteArray.byteLength;
	byteArray.pos = 0;
	var rgbe_header_info = RGBE_ReadHeader( byteArray );

	if ( RGBE_RETURN_FAILURE !== rgbe_header_info ) {

		var w = rgbe_header_info.width,
			h = rgbe_header_info.height,
			image_rgba_data = RGBE_ReadPixels_RLE( byteArray.subarray( byteArray.pos ), w, h )
		;
		if ( RGBE_RETURN_FAILURE !== image_rgba_data ) {

			if ( this.type === THREE.UnsignedByteType ) {

				var data = image_rgba_data;
				var format = THREE.RGBEFormat; // handled as THREE.RGBAFormat in shaders
				var type = THREE.UnsignedByteType;

			} else if ( this.type === THREE.FloatType ) {

				var RGBEByteToRGBFloat = function ( sourceArray, sourceOffset, destArray, destOffset ) {

					var e = sourceArray[ sourceOffset + 3 ];
					var scale = Math.pow( 2.0, e - 128.0 ) / 255.0;

					destArray[ destOffset + 0 ] = sourceArray[ sourceOffset + 0 ] * scale;
					destArray[ destOffset + 1 ] = sourceArray[ sourceOffset + 1 ] * scale;
					destArray[ destOffset + 2 ] = sourceArray[ sourceOffset + 2 ] * scale;

				};

				var numElements = ( image_rgba_data.length / 4 ) * 3;
				var floatArray = new Float32Array( numElements );

				for ( var j = 0; j < numElements; j ++ ) {

					RGBEByteToRGBFloat( image_rgba_data, j * 4, floatArray, j * 3 );

				}

				var data = floatArray;
				var format = THREE.RGBFormat;
				var type = THREE.FloatType;


			} else {

				console.error( 'THREE.RGBELoader: unsupported type: ', this.type );

			}

			return {
				width: w, height: h,
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

THREE.RGBELoader.prototype.setType = function ( value ) {

	this.type = value;
	return this;

};


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

THREE.PMREMCubeUVPacker = ( function () {

	var camera = new THREE.OrthographicCamera();
	var scene = new THREE.Scene();
	var shader = getShader();

	var PMREMCubeUVPacker = function ( cubeTextureLods ) {

		this.cubeLods = cubeTextureLods;
		var size = cubeTextureLods[ 0 ].width * 4;

		var sourceTexture = cubeTextureLods[ 0 ].texture;
		var params = {
			format: sourceTexture.format,
			magFilter: sourceTexture.magFilter,
			minFilter: sourceTexture.minFilter,
			type: sourceTexture.type,
			generateMipmaps: sourceTexture.generateMipmaps,
			anisotropy: sourceTexture.anisotropy,
			encoding: ( sourceTexture.encoding === THREE.RGBEEncoding ) ? THREE.RGBM16Encoding : sourceTexture.encoding
		};

		if ( params.encoding === THREE.RGBM16Encoding ) {

			params.magFilter = THREE.LinearFilter;
			params.minFilter = THREE.LinearFilter;

		}

		this.CubeUVRenderTarget = new THREE.WebGLRenderTarget( size, size, params );
		this.CubeUVRenderTarget.texture.name = "PMREMCubeUVPacker.cubeUv";
		this.CubeUVRenderTarget.texture.mapping = THREE.CubeUVReflectionMapping;

		this.objects = [];

		var geometry = new THREE.PlaneBufferGeometry( 1, 1 );

		var faceOffsets = [];
		faceOffsets.push( new THREE.Vector2( 0, 0 ) );
		faceOffsets.push( new THREE.Vector2( 1, 0 ) );
		faceOffsets.push( new THREE.Vector2( 2, 0 ) );
		faceOffsets.push( new THREE.Vector2( 0, 1 ) );
		faceOffsets.push( new THREE.Vector2( 1, 1 ) );
		faceOffsets.push( new THREE.Vector2( 2, 1 ) );

		var textureResolution = size;
		size = cubeTextureLods[ 0 ].width;

		var offset2 = 0;
		var c = 4.0;
		this.numLods = Math.log( cubeTextureLods[ 0 ].width ) / Math.log( 2 ) - 2; // IE11 doesn't support Math.log2
		for ( var i = 0; i < this.numLods; i ++ ) {

			var offset1 = ( textureResolution - textureResolution / c ) * 0.5;
			if ( size > 16 ) c *= 2;
			var nMips = size > 16 ? 6 : 1;
			var mipOffsetX = 0;
			var mipOffsetY = 0;
			var mipSize = size;

			for ( var j = 0; j < nMips; j ++ ) {

				// Mip Maps
				for ( var k = 0; k < 6; k ++ ) {

					// 6 Cube Faces
					var material = shader.clone();
					material.uniforms[ 'envMap' ].value = this.cubeLods[ i ].texture;
					material.envMap = this.cubeLods[ i ].texture;
					material.uniforms[ 'faceIndex' ].value = k;
					material.uniforms[ 'mapSize' ].value = mipSize;

					var planeMesh = new THREE.Mesh( geometry, material );
					planeMesh.position.x = faceOffsets[ k ].x * mipSize - offset1 + mipOffsetX;
					planeMesh.position.y = faceOffsets[ k ].y * mipSize - offset1 + offset2 + mipOffsetY;
					planeMesh.material.side = THREE.BackSide;
					planeMesh.scale.setScalar( mipSize );
					this.objects.push( planeMesh );

				}
				mipOffsetY += 1.75 * mipSize;
				mipOffsetX += 1.25 * mipSize;
				mipSize /= 2;

			}
			offset2 += 2 * size;
			if ( size > 16 ) size /= 2;

		}

	};

	PMREMCubeUVPacker.prototype = {

		constructor: PMREMCubeUVPacker,

		update: function ( renderer ) {

			var size = this.cubeLods[ 0 ].width * 4;
			// top and bottom are swapped for some reason?
			camera.left = - size * 0.5;
			camera.right = size * 0.5;
			camera.top = - size * 0.5;
			camera.bottom = size * 0.5;
			camera.near = 0;
			camera.far = 1;
			camera.updateProjectionMatrix();

			for ( var i = 0; i < this.objects.length; i ++ ) {

				scene.add( this.objects[ i ] );

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
			renderer.setRenderTarget( this.CubeUVRenderTarget );
			renderer.render( scene, camera );

			renderer.setRenderTarget( currentRenderTarget );
			renderer.toneMapping = toneMapping;
			renderer.toneMappingExposure = toneMappingExposure;
			renderer.gammaInput = gammaInput;
			renderer.gammaOutput = gammaOutput;

			for ( var i = 0; i < this.objects.length; i ++ ) {

				scene.remove( this.objects[ i ] );

			}

		},

		dispose: function () {

			for ( var i = 0, l = this.objects.length; i < l; i ++ ) {

				this.objects[ i ].material.dispose();

			}

			this.objects[ 0 ].geometry.dispose();

		}

	};

	function getShader() {

		var shaderMaterial = new THREE.ShaderMaterial( {

			uniforms: {
				"faceIndex": { value: 0 },
				"mapSize": { value: 0 },
				"envMap": { value: null },
				"testColor": { value: new THREE.Vector3( 1, 1, 1 ) }
			},

			vertexShader:
        "precision highp float;\
        varying vec2 vUv;\
        void main() {\
          vUv = uv;\
          gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\
        }",

			fragmentShader:
        "precision highp float;\
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

		} );

		shaderMaterial.type = 'PMREMCubeUVPacker';

		return shaderMaterial;

	}


	return PMREMCubeUVPacker;

} )();
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

THREE.PMREMGenerator = ( function () {

	var shader = getShader();
	var camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0.0, 1000 );
	var scene = new THREE.Scene();
	var planeMesh = new THREE.Mesh( new THREE.PlaneBufferGeometry( 2, 2, 0 ), shader );
	planeMesh.material.side = THREE.DoubleSide;
	scene.add( planeMesh );
	scene.add( camera );

	var PMREMGenerator = function ( sourceTexture, samplesPerLevel, resolution ) {

		this.sourceTexture = sourceTexture;
		this.resolution = ( resolution !== undefined ) ? resolution : 256; // NODE: 256 is currently hard coded in the glsl code for performance reasons
		this.samplesPerLevel = ( samplesPerLevel !== undefined ) ? samplesPerLevel : 32;

		var monotonicEncoding = ( this.sourceTexture.encoding === THREE.LinearEncoding ) ||
			( this.sourceTexture.encoding === THREE.GammaEncoding ) || ( this.sourceTexture.encoding === THREE.sRGBEncoding );

		this.sourceTexture.minFilter = ( monotonicEncoding ) ? THREE.LinearFilter : THREE.NearestFilter;
		this.sourceTexture.magFilter = ( monotonicEncoding ) ? THREE.LinearFilter : THREE.NearestFilter;
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
		};

		// how many LODs fit in the given CubeUV Texture.
		this.numLods = Math.log( size ) / Math.log( 2 ) - 2; // IE11 doesn't support Math.log2

		for ( var i = 0; i < this.numLods; i ++ ) {

			var renderTarget = new THREE.WebGLRenderTargetCube( size, size, params );
			renderTarget.texture.name = "PMREMGenerator.cube" + i;
			this.cubeLods.push( renderTarget );
			size = Math.max( 16, size / 2 );

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
		update: function ( renderer ) {

			// Texture should only be flipped for CubeTexture, not for
			// a Texture created via THREE.WebGLRenderTargetCube.
			var tFlip = ( this.sourceTexture.isCubeTexture ) ? - 1 : 1;

			shader.defines[ 'SAMPLES_PER_LEVEL' ] = this.samplesPerLevel;
			shader.uniforms[ 'faceIndex' ].value = 0;
			shader.uniforms[ 'envMap' ].value = this.sourceTexture;
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

			for ( var i = 0; i < this.numLods; i ++ ) {

				var r = i / ( this.numLods - 1 );
				shader.uniforms[ 'roughness' ].value = r * 0.9; // see comment above, pragmatic choice
				// Only apply the tFlip for the first LOD
				shader.uniforms[ 'tFlip' ].value = ( i == 0 ) ? tFlip : 1;
				var size = this.cubeLods[ i ].width;
				shader.uniforms[ 'mapSize' ].value = size;
				this.renderToCubeMapTarget( renderer, this.cubeLods[ i ] );

				if ( i < 5 ) shader.uniforms[ 'envMap' ].value = this.cubeLods[ i ].texture;

			}

			renderer.setRenderTarget( currentRenderTarget );
			renderer.toneMapping = toneMapping;
			renderer.toneMappingExposure = toneMappingExposure;
			renderer.gammaInput = gammaInput;
			renderer.gammaOutput = gammaOutput;

		},

		renderToCubeMapTarget: function ( renderer, renderTarget ) {

			for ( var i = 0; i < 6; i ++ ) {

				this.renderToCubeMapTargetFace( renderer, renderTarget, i );

			}

		},

		renderToCubeMapTargetFace: function ( renderer, renderTarget, faceIndex ) {

			shader.uniforms[ 'faceIndex' ].value = faceIndex;
			renderer.setRenderTarget( renderTarget, faceIndex );
			renderer.clear();
			renderer.render( scene, camera );

		},

		dispose: function () {

			for ( var i = 0, l = this.cubeLods.length; i < l; i ++ ) {

				this.cubeLods[ i ].dispose();

			}

		},

	};

	function getShader() {

		var shaderMaterial = new THREE.ShaderMaterial( {

			defines: {
				"SAMPLES_PER_LEVEL": 20,
			},

			uniforms: {
				"faceIndex": { value: 0 },
				"roughness": { value: 0.5 },
				"mapSize": { value: 0.5 },
				"envMap": { value: null },
				"tFlip": { value: - 1 },
			},

			vertexShader:
				"varying vec2 vUv;\n\
				void main() {\n\
					vUv = uv;\n\
					gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );\n\
				}",

			fragmentShader:
				"#include <common>\n\
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

		} );

		shaderMaterial.type = 'PMREMGenerator';

		return shaderMaterial;

	}

	return PMREMGenerator;

} )();
/**
 * @author alteredq / http://alteredqualia.com/
 *
 * Full-screen textured quad shader
 */

THREE.CopyShader = {

	uniforms: {

		"tDiffuse": { value: null },
		"opacity":  { value: 1.0 }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [

		"uniform float opacity;",

		"uniform sampler2D tDiffuse;",

		"varying vec2 vUv;",

		"void main() {",

			"vec4 texel = texture2D( tDiffuse, vUv );",
			"gl_FragColor = opacity * texel;",

		"}"

	].join( "\n" )

};
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

		"tDiffuse":   { value: null },
		"resolution": { value: new THREE.Vector2( 1 / 1024, 1 / 512 ) }

	},

	vertexShader: [

		"varying vec2 vUv;",

		"void main() {",

			"vUv = uv;",
			"gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

		"}"

	].join( "\n" ),

	fragmentShader: [
        "precision highp float;",
        "",
        "uniform sampler2D tDiffuse;",
        "",
        "uniform vec2 resolution;",
        "",
        "varying vec2 vUv;",
        "",
        "// FXAA 3.11 implementation by NVIDIA, ported to WebGL by Agost Biro (biro@archilogic.com)",
        "",
        "//----------------------------------------------------------------------------------",
        "// File:        es3-kepler\FXAA\assets\shaders/FXAA_DefaultES.frag",
        "// SDK Version: v3.00",
        "// Email:       gameworks@nvidia.com",
        "// Site:        http://developer.nvidia.com/",
        "//",
        "// Copyright (c) 2014-2015, NVIDIA CORPORATION. All rights reserved.",
        "//",
        "// Redistribution and use in source and binary forms, with or without",
        "// modification, are permitted provided that the following conditions",
        "// are met:",
        "//  * Redistributions of source code must retain the above copyright",
        "//    notice, this list of conditions and the following disclaimer.",
        "//  * Redistributions in binary form must reproduce the above copyright",
        "//    notice, this list of conditions and the following disclaimer in the",
        "//    documentation and/or other materials provided with the distribution.",
        "//  * Neither the name of NVIDIA CORPORATION nor the names of its",
        "//    contributors may be used to endorse or promote products derived",
        "//    from this software without specific prior written permission.",
        "//",
        "// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS ``AS IS'' AND ANY",
        "// EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE",
        "// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR",
        "// PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR",
        "// CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,",
        "// EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,",
        "// PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR",
        "// PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY",
        "// OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT",
        "// (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE",
        "// OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.",
        "//",
        "//----------------------------------------------------------------------------------",
        "",
        "#define FXAA_PC 1",
        "#define FXAA_GLSL_100 1",
        "#define FXAA_QUALITY_PRESET 12",
        "",
        "#define FXAA_GREEN_AS_LUMA 1",
        "",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_PC_CONSOLE",
        "    //",
        "    // The console algorithm for PC is included",
        "    // for developers targeting really low spec machines.",
        "    // Likely better to just run FXAA_PC, and use a really low preset.",
        "    //",
        "    #define FXAA_PC_CONSOLE 0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_GLSL_120",
        "    #define FXAA_GLSL_120 0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_GLSL_130",
        "    #define FXAA_GLSL_130 0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_HLSL_3",
        "    #define FXAA_HLSL_3 0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_HLSL_4",
        "    #define FXAA_HLSL_4 0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_HLSL_5",
        "    #define FXAA_HLSL_5 0",
        "#endif",
        "/*==========================================================================*/",
        "#ifndef FXAA_GREEN_AS_LUMA",
        "    //",
        "    // For those using non-linear color,",
        "    // and either not able to get luma in alpha, or not wanting to,",
        "    // this enables FXAA to run using green as a proxy for luma.",
        "    // So with this enabled, no need to pack luma in alpha.",
        "    //",
        "    // This will turn off AA on anything which lacks some amount of green.",
        "    // Pure red and blue or combination of only R and B, will get no AA.",
        "    //",
        "    // Might want to lower the settings for both,",
        "    //    fxaaConsoleEdgeThresholdMin",
        "    //    fxaaQualityEdgeThresholdMin",
        "    // In order to insure AA does not get turned off on colors",
        "    // which contain a minor amount of green.",
        "    //",
        "    // 1 = On.",
        "    // 0 = Off.",
        "    //",
        "    #define FXAA_GREEN_AS_LUMA 0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_EARLY_EXIT",
        "    //",
        "    // Controls algorithm's early exit path.",
        "    // On PS3 turning this ON adds 2 cycles to the shader.",
        "    // On 360 turning this OFF adds 10ths of a millisecond to the shader.",
        "    // Turning this off on console will result in a more blurry image.",
        "    // So this defaults to on.",
        "    //",
        "    // 1 = On.",
        "    // 0 = Off.",
        "    //",
        "    #define FXAA_EARLY_EXIT 1",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_DISCARD",
        "    //",
        "    // Only valid for PC OpenGL currently.",
        "    // Probably will not work when FXAA_GREEN_AS_LUMA = 1.",
        "    //",
        "    // 1 = Use discard on pixels which don't need AA.",
        "    //     For APIs which enable concurrent TEX+ROP from same surface.",
        "    // 0 = Return unchanged color on pixels which don't need AA.",
        "    //",
        "    #define FXAA_DISCARD 0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_FAST_PIXEL_OFFSET",
        "    //",
        "    // Used for GLSL 120 only.",
        "    //",
        "    // 1 = GL API supports fast pixel offsets",
        "    // 0 = do not use fast pixel offsets",
        "    //",
        "    #ifdef GL_EXT_gpu_shader4",
        "        #define FXAA_FAST_PIXEL_OFFSET 1",
        "    #endif",
        "    #ifdef GL_NV_gpu_shader5",
        "        #define FXAA_FAST_PIXEL_OFFSET 1",
        "    #endif",
        "    #ifdef GL_ARB_gpu_shader5",
        "        #define FXAA_FAST_PIXEL_OFFSET 1",
        "    #endif",
        "    #ifndef FXAA_FAST_PIXEL_OFFSET",
        "        #define FXAA_FAST_PIXEL_OFFSET 0",
        "    #endif",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#ifndef FXAA_GATHER4_ALPHA",
        "    //",
        "    // 1 = API supports gather4 on alpha channel.",
        "    // 0 = API does not support gather4 on alpha channel.",
        "    //",
        "    #if (FXAA_HLSL_5 == 1)",
        "        #define FXAA_GATHER4_ALPHA 1",
        "    #endif",
        "    #ifdef GL_ARB_gpu_shader5",
        "        #define FXAA_GATHER4_ALPHA 1",
        "    #endif",
        "    #ifdef GL_NV_gpu_shader5",
        "        #define FXAA_GATHER4_ALPHA 1",
        "    #endif",
        "    #ifndef FXAA_GATHER4_ALPHA",
        "        #define FXAA_GATHER4_ALPHA 0",
        "    #endif",
        "#endif",
        "",
        "",
        "/*============================================================================",
        "                        FXAA QUALITY - TUNING KNOBS",
        "------------------------------------------------------------------------------",
        "NOTE the other tuning knobs are now in the shader function inputs!",
        "============================================================================*/",
        "#ifndef FXAA_QUALITY_PRESET",
        "    //",
        "    // Choose the quality preset.",
        "    // This needs to be compiled into the shader as it effects code.",
        "    // Best option to include multiple presets is to",
        "    // in each shader define the preset, then include this file.",
        "    //",
        "    // OPTIONS",
        "    // -----------------------------------------------------------------------",
        "    // 10 to 15 - default medium dither (10=fastest, 15=highest quality)",
        "    // 20 to 29 - less dither, more expensive (20=fastest, 29=highest quality)",
        "    // 39       - no dither, very expensive",
        "    //",
        "    // NOTES",
        "    // -----------------------------------------------------------------------",
        "    // 12 = slightly faster then FXAA 3.9 and higher edge quality (default)",
        "    // 13 = about same speed as FXAA 3.9 and better than 12",
        "    // 23 = closest to FXAA 3.9 visually and performance wise",
        "    //  _ = the lowest digit is directly related to performance",
        "    // _  = the highest digit is directly related to style",
        "    //",
        "    #define FXAA_QUALITY_PRESET 12",
        "#endif",
        "",
        "",
        "/*============================================================================",
        "",
        "                           FXAA QUALITY - PRESETS",
        "",
        "============================================================================*/",
        "",
        "/*============================================================================",
        "                     FXAA QUALITY - MEDIUM DITHER PRESETS",
        "============================================================================*/",
        "#if (FXAA_QUALITY_PRESET == 10)",
        "    #define FXAA_QUALITY_PS 3",
        "    #define FXAA_QUALITY_P0 1.5",
        "    #define FXAA_QUALITY_P1 3.0",
        "    #define FXAA_QUALITY_P2 12.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 11)",
        "    #define FXAA_QUALITY_PS 4",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 3.0",
        "    #define FXAA_QUALITY_P3 12.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 12)",
        "    #define FXAA_QUALITY_PS 5",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 4.0",
        "    #define FXAA_QUALITY_P4 12.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 13)",
        "    #define FXAA_QUALITY_PS 6",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 4.0",
        "    #define FXAA_QUALITY_P5 12.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 14)",
        "    #define FXAA_QUALITY_PS 7",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 4.0",
        "    #define FXAA_QUALITY_P6 12.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 15)",
        "    #define FXAA_QUALITY_PS 8",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 2.0",
        "    #define FXAA_QUALITY_P6 4.0",
        "    #define FXAA_QUALITY_P7 12.0",
        "#endif",
        "",
        "/*============================================================================",
        "                     FXAA QUALITY - LOW DITHER PRESETS",
        "============================================================================*/",
        "#if (FXAA_QUALITY_PRESET == 20)",
        "    #define FXAA_QUALITY_PS 3",
        "    #define FXAA_QUALITY_P0 1.5",
        "    #define FXAA_QUALITY_P1 2.0",
        "    #define FXAA_QUALITY_P2 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 21)",
        "    #define FXAA_QUALITY_PS 4",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 22)",
        "    #define FXAA_QUALITY_PS 5",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 23)",
        "    #define FXAA_QUALITY_PS 6",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 24)",
        "    #define FXAA_QUALITY_PS 7",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 3.0",
        "    #define FXAA_QUALITY_P6 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 25)",
        "    #define FXAA_QUALITY_PS 8",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 2.0",
        "    #define FXAA_QUALITY_P6 4.0",
        "    #define FXAA_QUALITY_P7 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 26)",
        "    #define FXAA_QUALITY_PS 9",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 2.0",
        "    #define FXAA_QUALITY_P6 2.0",
        "    #define FXAA_QUALITY_P7 4.0",
        "    #define FXAA_QUALITY_P8 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 27)",
        "    #define FXAA_QUALITY_PS 10",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 2.0",
        "    #define FXAA_QUALITY_P6 2.0",
        "    #define FXAA_QUALITY_P7 2.0",
        "    #define FXAA_QUALITY_P8 4.0",
        "    #define FXAA_QUALITY_P9 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 28)",
        "    #define FXAA_QUALITY_PS 11",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 2.0",
        "    #define FXAA_QUALITY_P6 2.0",
        "    #define FXAA_QUALITY_P7 2.0",
        "    #define FXAA_QUALITY_P8 2.0",
        "    #define FXAA_QUALITY_P9 4.0",
        "    #define FXAA_QUALITY_P10 8.0",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_QUALITY_PRESET == 29)",
        "    #define FXAA_QUALITY_PS 12",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.5",
        "    #define FXAA_QUALITY_P2 2.0",
        "    #define FXAA_QUALITY_P3 2.0",
        "    #define FXAA_QUALITY_P4 2.0",
        "    #define FXAA_QUALITY_P5 2.0",
        "    #define FXAA_QUALITY_P6 2.0",
        "    #define FXAA_QUALITY_P7 2.0",
        "    #define FXAA_QUALITY_P8 2.0",
        "    #define FXAA_QUALITY_P9 2.0",
        "    #define FXAA_QUALITY_P10 4.0",
        "    #define FXAA_QUALITY_P11 8.0",
        "#endif",
        "",
        "/*============================================================================",
        "                     FXAA QUALITY - EXTREME QUALITY",
        "============================================================================*/",
        "#if (FXAA_QUALITY_PRESET == 39)",
        "    #define FXAA_QUALITY_PS 12",
        "    #define FXAA_QUALITY_P0 1.0",
        "    #define FXAA_QUALITY_P1 1.0",
        "    #define FXAA_QUALITY_P2 1.0",
        "    #define FXAA_QUALITY_P3 1.0",
        "    #define FXAA_QUALITY_P4 1.0",
        "    #define FXAA_QUALITY_P5 1.5",
        "    #define FXAA_QUALITY_P6 2.0",
        "    #define FXAA_QUALITY_P7 2.0",
        "    #define FXAA_QUALITY_P8 2.0",
        "    #define FXAA_QUALITY_P9 2.0",
        "    #define FXAA_QUALITY_P10 4.0",
        "    #define FXAA_QUALITY_P11 8.0",
        "#endif",
        "",
        "",
        "",
        "/*============================================================================",
        "",
        "                                API PORTING",
        "",
        "============================================================================*/",
        "#if (FXAA_GLSL_100 == 1) || (FXAA_GLSL_120 == 1) || (FXAA_GLSL_130 == 1)",
        "    #define FxaaBool bool",
        "    #define FxaaDiscard discard",
        "    #define FxaaFloat float",
        "    #define FxaaFloat2 vec2",
        "    #define FxaaFloat3 vec3",
        "    #define FxaaFloat4 vec4",
        "    #define FxaaHalf float",
        "    #define FxaaHalf2 vec2",
        "    #define FxaaHalf3 vec3",
        "    #define FxaaHalf4 vec4",
        "    #define FxaaInt2 ivec2",
        "    #define FxaaSat(x) clamp(x, 0.0, 1.0)",
        "    #define FxaaTex sampler2D",
        "#else",
        "    #define FxaaBool bool",
        "    #define FxaaDiscard clip(-1)",
        "    #define FxaaFloat float",
        "    #define FxaaFloat2 float2",
        "    #define FxaaFloat3 float3",
        "    #define FxaaFloat4 float4",
        "    #define FxaaHalf half",
        "    #define FxaaHalf2 half2",
        "    #define FxaaHalf3 half3",
        "    #define FxaaHalf4 half4",
        "    #define FxaaSat(x) saturate(x)",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_GLSL_100 == 1)",
        "  #define FxaaTexTop(t, p) texture2D(t, p, 0.0)",
        "  #define FxaaTexOff(t, p, o, r) texture2D(t, p + (o * r), 0.0)",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_GLSL_120 == 1)",
        "    // Requires,",
        "    //  #version 120",
        "    // And at least,",
        "    //  #extension GL_EXT_gpu_shader4 : enable",
        "    //  (or set FXAA_FAST_PIXEL_OFFSET 1 to work like DX9)",
        "    #define FxaaTexTop(t, p) texture2DLod(t, p, 0.0)",
        "    #if (FXAA_FAST_PIXEL_OFFSET == 1)",
        "        #define FxaaTexOff(t, p, o, r) texture2DLodOffset(t, p, 0.0, o)",
        "    #else",
        "        #define FxaaTexOff(t, p, o, r) texture2DLod(t, p + (o * r), 0.0)",
        "    #endif",
        "    #if (FXAA_GATHER4_ALPHA == 1)",
        "        // use #extension GL_ARB_gpu_shader5 : enable",
        "        #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)",
        "        #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)",
        "        #define FxaaTexGreen4(t, p) textureGather(t, p, 1)",
        "        #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)",
        "    #endif",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_GLSL_130 == 1)",
        "    // Requires \"#version 130\" or better",
        "    #define FxaaTexTop(t, p) textureLod(t, p, 0.0)",
        "    #define FxaaTexOff(t, p, o, r) textureLodOffset(t, p, 0.0, o)",
        "    #if (FXAA_GATHER4_ALPHA == 1)",
        "        // use #extension GL_ARB_gpu_shader5 : enable",
        "        #define FxaaTexAlpha4(t, p) textureGather(t, p, 3)",
        "        #define FxaaTexOffAlpha4(t, p, o) textureGatherOffset(t, p, o, 3)",
        "        #define FxaaTexGreen4(t, p) textureGather(t, p, 1)",
        "        #define FxaaTexOffGreen4(t, p, o) textureGatherOffset(t, p, o, 1)",
        "    #endif",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_HLSL_3 == 1)",
        "    #define FxaaInt2 float2",
        "    #define FxaaTex sampler2D",
        "    #define FxaaTexTop(t, p) tex2Dlod(t, float4(p, 0.0, 0.0))",
        "    #define FxaaTexOff(t, p, o, r) tex2Dlod(t, float4(p + (o * r), 0, 0))",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_HLSL_4 == 1)",
        "    #define FxaaInt2 int2",
        "    struct FxaaTex { SamplerState smpl; Texture2D tex; };",
        "    #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)",
        "    #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)",
        "#endif",
        "/*--------------------------------------------------------------------------*/",
        "#if (FXAA_HLSL_5 == 1)",
        "    #define FxaaInt2 int2",
        "    struct FxaaTex { SamplerState smpl; Texture2D tex; };",
        "    #define FxaaTexTop(t, p) t.tex.SampleLevel(t.smpl, p, 0.0)",
        "    #define FxaaTexOff(t, p, o, r) t.tex.SampleLevel(t.smpl, p, 0.0, o)",
        "    #define FxaaTexAlpha4(t, p) t.tex.GatherAlpha(t.smpl, p)",
        "    #define FxaaTexOffAlpha4(t, p, o) t.tex.GatherAlpha(t.smpl, p, o)",
        "    #define FxaaTexGreen4(t, p) t.tex.GatherGreen(t.smpl, p)",
        "    #define FxaaTexOffGreen4(t, p, o) t.tex.GatherGreen(t.smpl, p, o)",
        "#endif",
        "",
        "",
        "/*============================================================================",
        "                   GREEN AS LUMA OPTION SUPPORT FUNCTION",
        "============================================================================*/",
        "#if (FXAA_GREEN_AS_LUMA == 0)",
        "    FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.w; }",
        "#else",
        "    FxaaFloat FxaaLuma(FxaaFloat4 rgba) { return rgba.y; }",
        "#endif",
        "",
        "",
        "",
        "",
        "/*============================================================================",
        "",
        "                             FXAA3 QUALITY - PC",
        "",
        "============================================================================*/",
        "#if (FXAA_PC == 1)",
        "/*--------------------------------------------------------------------------*/",
        "FxaaFloat4 FxaaPixelShader(",
        "    //",
        "    // Use noperspective interpolation here (turn off perspective interpolation).",
        "    // {xy} = center of pixel",
        "    FxaaFloat2 pos,",
        "    //",
        "    // Used only for FXAA Console, and not used on the 360 version.",
        "    // Use noperspective interpolation here (turn off perspective interpolation).",
        "    // {xy_} = upper left of pixel",
        "    // {_zw} = lower right of pixel",
        "    FxaaFloat4 fxaaConsolePosPos,",
        "    //",
        "    // Input color texture.",
        "    // {rgb_} = color in linear or perceptual color space",
        "    // if (FXAA_GREEN_AS_LUMA == 0)",
        "    //     {__a} = luma in perceptual color space (not linear)",
        "    FxaaTex tex,",
        "    //",
        "    // Only used on the optimized 360 version of FXAA Console.",
        "    // For everything but 360, just use the same input here as for \"tex\".",
        "    // For 360, same texture, just alias with a 2nd sampler.",
        "    // This sampler needs to have an exponent bias of -1.",
        "    FxaaTex fxaaConsole360TexExpBiasNegOne,",
        "    //",
        "    // Only used on the optimized 360 version of FXAA Console.",
        "    // For everything but 360, just use the same input here as for \"tex\".",
        "    // For 360, same texture, just alias with a 3nd sampler.",
        "    // This sampler needs to have an exponent bias of -2.",
        "    FxaaTex fxaaConsole360TexExpBiasNegTwo,",
        "    //",
        "    // Only used on FXAA Quality.",
        "    // This must be from a constant/uniform.",
        "    // {x_} = 1.0/screenWidthInPixels",
        "    // {_y} = 1.0/screenHeightInPixels",
        "    FxaaFloat2 fxaaQualityRcpFrame,",
        "    //",
        "    // Only used on FXAA Console.",
        "    // This must be from a constant/uniform.",
        "    // This effects sub-pixel AA quality and inversely sharpness.",
        "    //   Where N ranges between,",
        "    //     N = 0.50 (default)",
        "    //     N = 0.33 (sharper)",
        "    // {x__} = -N/screenWidthInPixels",
        "    // {_y_} = -N/screenHeightInPixels",
        "    // {_z_} =  N/screenWidthInPixels",
        "    // {__w} =  N/screenHeightInPixels",
        "    FxaaFloat4 fxaaConsoleRcpFrameOpt,",
        "    //",
        "    // Only used on FXAA Console.",
        "    // Not used on 360, but used on PS3 and PC.",
        "    // This must be from a constant/uniform.",
        "    // {x__} = -2.0/screenWidthInPixels",
        "    // {_y_} = -2.0/screenHeightInPixels",
        "    // {_z_} =  2.0/screenWidthInPixels",
        "    // {__w} =  2.0/screenHeightInPixels",
        "    FxaaFloat4 fxaaConsoleRcpFrameOpt2,",
        "    //",
        "    // Only used on FXAA Console.",
        "    // Only used on 360 in place of fxaaConsoleRcpFrameOpt2.",
        "    // This must be from a constant/uniform.",
        "    // {x__} =  8.0/screenWidthInPixels",
        "    // {_y_} =  8.0/screenHeightInPixels",
        "    // {_z_} = -4.0/screenWidthInPixels",
        "    // {__w} = -4.0/screenHeightInPixels",
        "    FxaaFloat4 fxaaConsole360RcpFrameOpt2,",
        "    //",
        "    // Only used on FXAA Quality.",
        "    // This used to be the FXAA_QUALITY_SUBPIX define.",
        "    // It is here now to allow easier tuning.",
        "    // Choose the amount of sub-pixel aliasing removal.",
        "    // This can effect sharpness.",
        "    //   1.00 - upper limit (softer)",
        "    //   0.75 - default amount of filtering",
        "    //   0.50 - lower limit (sharper, less sub-pixel aliasing removal)",
        "    //   0.25 - almost off",
        "    //   0.00 - completely off",
        "    FxaaFloat fxaaQualitySubpix,",
        "    //",
        "    // Only used on FXAA Quality.",
        "    // This used to be the FXAA_QUALITY_EDGE_THRESHOLD define.",
        "    // It is here now to allow easier tuning.",
        "    // The minimum amount of local contrast required to apply algorithm.",
        "    //   0.333 - too little (faster)",
        "    //   0.250 - low quality",
        "    //   0.166 - default",
        "    //   0.125 - high quality",
        "    //   0.063 - overkill (slower)",
        "    FxaaFloat fxaaQualityEdgeThreshold,",
        "    //",
        "    // Only used on FXAA Quality.",
        "    // This used to be the FXAA_QUALITY_EDGE_THRESHOLD_MIN define.",
        "    // It is here now to allow easier tuning.",
        "    // Trims the algorithm from processing darks.",
        "    //   0.0833 - upper limit (default, the start of visible unfiltered edges)",
        "    //   0.0625 - high quality (faster)",
        "    //   0.0312 - visible limit (slower)",
        "    // Special notes when using FXAA_GREEN_AS_LUMA,",
        "    //   Likely want to set this to zero.",
        "    //   As colors that are mostly not-green",
        "    //   will appear very dark in the green channel!",
        "    //   Tune by looking at mostly non-green content,",
        "    //   then start at zero and increase until aliasing is a problem.",
        "    FxaaFloat fxaaQualityEdgeThresholdMin,",
        "    //",
        "    // Only used on FXAA Console.",
        "    // This used to be the FXAA_CONSOLE_EDGE_SHARPNESS define.",
        "    // It is here now to allow easier tuning.",
        "    // This does not effect PS3, as this needs to be compiled in.",
        "    //   Use FXAA_CONSOLE_PS3_EDGE_SHARPNESS for PS3.",
        "    //   Due to the PS3 being ALU bound,",
        "    //   there are only three safe values here: 2 and 4 and 8.",
        "    //   These options use the shaders ability to a free *|/ by 2|4|8.",
        "    // For all other platforms can be a non-power of two.",
        "    //   8.0 is sharper (default!!!)",
        "    //   4.0 is softer",
        "    //   2.0 is really soft (good only for vector graphics inputs)",
        "    FxaaFloat fxaaConsoleEdgeSharpness,",
        "    //",
        "    // Only used on FXAA Console.",
        "    // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD define.",
        "    // It is here now to allow easier tuning.",
        "    // This does not effect PS3, as this needs to be compiled in.",
        "    //   Use FXAA_CONSOLE_PS3_EDGE_THRESHOLD for PS3.",
        "    //   Due to the PS3 being ALU bound,",
        "    //   there are only two safe values here: 1/4 and 1/8.",
        "    //   These options use the shaders ability to a free *|/ by 2|4|8.",
        "    // The console setting has a different mapping than the quality setting.",
        "    // Other platforms can use other values.",
        "    //   0.125 leaves less aliasing, but is softer (default!!!)",
        "    //   0.25 leaves more aliasing, and is sharper",
        "    FxaaFloat fxaaConsoleEdgeThreshold,",
        "    //",
        "    // Only used on FXAA Console.",
        "    // This used to be the FXAA_CONSOLE_EDGE_THRESHOLD_MIN define.",
        "    // It is here now to allow easier tuning.",
        "    // Trims the algorithm from processing darks.",
        "    // The console setting has a different mapping than the quality setting.",
        "    // This only applies when FXAA_EARLY_EXIT is 1.",
        "    // This does not apply to PS3,",
        "    // PS3 was simplified to avoid more shader instructions.",
        "    //   0.06 - faster but more aliasing in darks",
        "    //   0.05 - default",
        "    //   0.04 - slower and less aliasing in darks",
        "    // Special notes when using FXAA_GREEN_AS_LUMA,",
        "    //   Likely want to set this to zero.",
        "    //   As colors that are mostly not-green",
        "    //   will appear very dark in the green channel!",
        "    //   Tune by looking at mostly non-green content,",
        "    //   then start at zero and increase until aliasing is a problem.",
        "    FxaaFloat fxaaConsoleEdgeThresholdMin,",
        "    //",
        "    // Extra constants for 360 FXAA Console only.",
        "    // Use zeros or anything else for other platforms.",
        "    // These must be in physical constant registers and NOT immediates.",
        "    // Immediates will result in compiler un-optimizing.",
        "    // {xyzw} = float4(1.0, -1.0, 0.25, -0.25)",
        "    FxaaFloat4 fxaaConsole360ConstDir",
        ") {",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat2 posM;",
        "    posM.x = pos.x;",
        "    posM.y = pos.y;",
        "    #if (FXAA_GATHER4_ALPHA == 1)",
        "        #if (FXAA_DISCARD == 0)",
        "            FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);",
        "            #if (FXAA_GREEN_AS_LUMA == 0)",
        "                #define lumaM rgbyM.w",
        "            #else",
        "                #define lumaM rgbyM.y",
        "            #endif",
        "        #endif",
        "        #if (FXAA_GREEN_AS_LUMA == 0)",
        "            FxaaFloat4 luma4A = FxaaTexAlpha4(tex, posM);",
        "            FxaaFloat4 luma4B = FxaaTexOffAlpha4(tex, posM, FxaaInt2(-1, -1));",
        "        #else",
        "            FxaaFloat4 luma4A = FxaaTexGreen4(tex, posM);",
        "            FxaaFloat4 luma4B = FxaaTexOffGreen4(tex, posM, FxaaInt2(-1, -1));",
        "        #endif",
        "        #if (FXAA_DISCARD == 1)",
        "            #define lumaM luma4A.w",
        "        #endif",
        "        #define lumaE luma4A.z",
        "        #define lumaS luma4A.x",
        "        #define lumaSE luma4A.y",
        "        #define lumaNW luma4B.w",
        "        #define lumaN luma4B.z",
        "        #define lumaW luma4B.x",
        "    #else",
        "        FxaaFloat4 rgbyM = FxaaTexTop(tex, posM);",
        "        #if (FXAA_GREEN_AS_LUMA == 0)",
        "            #define lumaM rgbyM.w",
        "        #else",
        "            #define lumaM rgbyM.y",
        "        #endif",
        "        #if (FXAA_GLSL_100 == 1)",
        "          FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0, 1.0), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 0.0), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 0.0,-1.0), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 0.0), fxaaQualityRcpFrame.xy));",
        "        #else",
        "          FxaaFloat lumaS = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0, 1), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 0), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaN = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 0,-1), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 0), fxaaQualityRcpFrame.xy));",
        "        #endif",
        "    #endif",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat maxSM = max(lumaS, lumaM);",
        "    FxaaFloat minSM = min(lumaS, lumaM);",
        "    FxaaFloat maxESM = max(lumaE, maxSM);",
        "    FxaaFloat minESM = min(lumaE, minSM);",
        "    FxaaFloat maxWN = max(lumaN, lumaW);",
        "    FxaaFloat minWN = min(lumaN, lumaW);",
        "    FxaaFloat rangeMax = max(maxWN, maxESM);",
        "    FxaaFloat rangeMin = min(minWN, minESM);",
        "    FxaaFloat rangeMaxScaled = rangeMax * fxaaQualityEdgeThreshold;",
        "    FxaaFloat range = rangeMax - rangeMin;",
        "    FxaaFloat rangeMaxClamped = max(fxaaQualityEdgeThresholdMin, rangeMaxScaled);",
        "    FxaaBool earlyExit = range < rangeMaxClamped;",
        "/*--------------------------------------------------------------------------*/",
        "    if(earlyExit)",
        "        #if (FXAA_DISCARD == 1)",
        "            FxaaDiscard;",
        "        #else",
        "            return rgbyM;",
        "        #endif",
        "/*--------------------------------------------------------------------------*/",
        "    #if (FXAA_GATHER4_ALPHA == 0)",
        "        #if (FXAA_GLSL_100 == 1)",
        "          FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0,-1.0), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0, 1.0), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2( 1.0,-1.0), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaFloat2(-1.0, 1.0), fxaaQualityRcpFrame.xy));",
        "        #else",
        "          FxaaFloat lumaNW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1,-1), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaSE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1, 1), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2( 1,-1), fxaaQualityRcpFrame.xy));",
        "          FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));",
        "        #endif",
        "    #else",
        "        FxaaFloat lumaNE = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(1, -1), fxaaQualityRcpFrame.xy));",
        "        FxaaFloat lumaSW = FxaaLuma(FxaaTexOff(tex, posM, FxaaInt2(-1, 1), fxaaQualityRcpFrame.xy));",
        "    #endif",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat lumaNS = lumaN + lumaS;",
        "    FxaaFloat lumaWE = lumaW + lumaE;",
        "    FxaaFloat subpixRcpRange = 1.0/range;",
        "    FxaaFloat subpixNSWE = lumaNS + lumaWE;",
        "    FxaaFloat edgeHorz1 = (-2.0 * lumaM) + lumaNS;",
        "    FxaaFloat edgeVert1 = (-2.0 * lumaM) + lumaWE;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat lumaNESE = lumaNE + lumaSE;",
        "    FxaaFloat lumaNWNE = lumaNW + lumaNE;",
        "    FxaaFloat edgeHorz2 = (-2.0 * lumaE) + lumaNESE;",
        "    FxaaFloat edgeVert2 = (-2.0 * lumaN) + lumaNWNE;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat lumaNWSW = lumaNW + lumaSW;",
        "    FxaaFloat lumaSWSE = lumaSW + lumaSE;",
        "    FxaaFloat edgeHorz4 = (abs(edgeHorz1) * 2.0) + abs(edgeHorz2);",
        "    FxaaFloat edgeVert4 = (abs(edgeVert1) * 2.0) + abs(edgeVert2);",
        "    FxaaFloat edgeHorz3 = (-2.0 * lumaW) + lumaNWSW;",
        "    FxaaFloat edgeVert3 = (-2.0 * lumaS) + lumaSWSE;",
        "    FxaaFloat edgeHorz = abs(edgeHorz3) + edgeHorz4;",
        "    FxaaFloat edgeVert = abs(edgeVert3) + edgeVert4;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat subpixNWSWNESE = lumaNWSW + lumaNESE;",
        "    FxaaFloat lengthSign = fxaaQualityRcpFrame.x;",
        "    FxaaBool horzSpan = edgeHorz >= edgeVert;",
        "    FxaaFloat subpixA = subpixNSWE * 2.0 + subpixNWSWNESE;",
        "/*--------------------------------------------------------------------------*/",
        "    if(!horzSpan) lumaN = lumaW;",
        "    if(!horzSpan) lumaS = lumaE;",
        "    if(horzSpan) lengthSign = fxaaQualityRcpFrame.y;",
        "    FxaaFloat subpixB = (subpixA * (1.0/12.0)) - lumaM;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat gradientN = lumaN - lumaM;",
        "    FxaaFloat gradientS = lumaS - lumaM;",
        "    FxaaFloat lumaNN = lumaN + lumaM;",
        "    FxaaFloat lumaSS = lumaS + lumaM;",
        "    FxaaBool pairN = abs(gradientN) >= abs(gradientS);",
        "    FxaaFloat gradient = max(abs(gradientN), abs(gradientS));",
        "    if(pairN) lengthSign = -lengthSign;",
        "    FxaaFloat subpixC = FxaaSat(abs(subpixB) * subpixRcpRange);",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat2 posB;",
        "    posB.x = posM.x;",
        "    posB.y = posM.y;",
        "    FxaaFloat2 offNP;",
        "    offNP.x = (!horzSpan) ? 0.0 : fxaaQualityRcpFrame.x;",
        "    offNP.y = ( horzSpan) ? 0.0 : fxaaQualityRcpFrame.y;",
        "    if(!horzSpan) posB.x += lengthSign * 0.5;",
        "    if( horzSpan) posB.y += lengthSign * 0.5;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat2 posN;",
        "    posN.x = posB.x - offNP.x * FXAA_QUALITY_P0;",
        "    posN.y = posB.y - offNP.y * FXAA_QUALITY_P0;",
        "    FxaaFloat2 posP;",
        "    posP.x = posB.x + offNP.x * FXAA_QUALITY_P0;",
        "    posP.y = posB.y + offNP.y * FXAA_QUALITY_P0;",
        "    FxaaFloat subpixD = ((-2.0)*subpixC) + 3.0;",
        "    FxaaFloat lumaEndN = FxaaLuma(FxaaTexTop(tex, posN));",
        "    FxaaFloat subpixE = subpixC * subpixC;",
        "    FxaaFloat lumaEndP = FxaaLuma(FxaaTexTop(tex, posP));",
        "/*--------------------------------------------------------------------------*/",
        "    if(!pairN) lumaNN = lumaSS;",
        "    FxaaFloat gradientScaled = gradient * 1.0/4.0;",
        "    FxaaFloat lumaMM = lumaM - lumaNN * 0.5;",
        "    FxaaFloat subpixF = subpixD * subpixE;",
        "    FxaaBool lumaMLTZero = lumaMM < 0.0;",
        "/*--------------------------------------------------------------------------*/",
        "    lumaEndN -= lumaNN * 0.5;",
        "    lumaEndP -= lumaNN * 0.5;",
        "    FxaaBool doneN = abs(lumaEndN) >= gradientScaled;",
        "    FxaaBool doneP = abs(lumaEndP) >= gradientScaled;",
        "    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P1;",
        "    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P1;",
        "    FxaaBool doneNP = (!doneN) || (!doneP);",
        "    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P1;",
        "    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P1;",
        "/*--------------------------------------------------------------------------*/",
        "    if(doneNP) {",
        "        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "        doneN = abs(lumaEndN) >= gradientScaled;",
        "        doneP = abs(lumaEndP) >= gradientScaled;",
        "        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P2;",
        "        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P2;",
        "        doneNP = (!doneN) || (!doneP);",
        "        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P2;",
        "        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P2;",
        "/*--------------------------------------------------------------------------*/",
        "        #if (FXAA_QUALITY_PS > 3)",
        "        if(doneNP) {",
        "            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "            doneN = abs(lumaEndN) >= gradientScaled;",
        "            doneP = abs(lumaEndP) >= gradientScaled;",
        "            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P3;",
        "            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P3;",
        "            doneNP = (!doneN) || (!doneP);",
        "            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P3;",
        "            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P3;",
        "/*--------------------------------------------------------------------------*/",
        "            #if (FXAA_QUALITY_PS > 4)",
        "            if(doneNP) {",
        "                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "                doneN = abs(lumaEndN) >= gradientScaled;",
        "                doneP = abs(lumaEndP) >= gradientScaled;",
        "                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P4;",
        "                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P4;",
        "                doneNP = (!doneN) || (!doneP);",
        "                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P4;",
        "                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P4;",
        "/*--------------------------------------------------------------------------*/",
        "                #if (FXAA_QUALITY_PS > 5)",
        "                if(doneNP) {",
        "                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "                    doneN = abs(lumaEndN) >= gradientScaled;",
        "                    doneP = abs(lumaEndP) >= gradientScaled;",
        "                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P5;",
        "                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P5;",
        "                    doneNP = (!doneN) || (!doneP);",
        "                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P5;",
        "                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P5;",
        "/*--------------------------------------------------------------------------*/",
        "                    #if (FXAA_QUALITY_PS > 6)",
        "                    if(doneNP) {",
        "                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "                        doneN = abs(lumaEndN) >= gradientScaled;",
        "                        doneP = abs(lumaEndP) >= gradientScaled;",
        "                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P6;",
        "                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P6;",
        "                        doneNP = (!doneN) || (!doneP);",
        "                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P6;",
        "                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P6;",
        "/*--------------------------------------------------------------------------*/",
        "                        #if (FXAA_QUALITY_PS > 7)",
        "                        if(doneNP) {",
        "                            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "                            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "                            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "                            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "                            doneN = abs(lumaEndN) >= gradientScaled;",
        "                            doneP = abs(lumaEndP) >= gradientScaled;",
        "                            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P7;",
        "                            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P7;",
        "                            doneNP = (!doneN) || (!doneP);",
        "                            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P7;",
        "                            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P7;",
        "/*--------------------------------------------------------------------------*/",
        "    #if (FXAA_QUALITY_PS > 8)",
        "    if(doneNP) {",
        "        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "        doneN = abs(lumaEndN) >= gradientScaled;",
        "        doneP = abs(lumaEndP) >= gradientScaled;",
        "        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P8;",
        "        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P8;",
        "        doneNP = (!doneN) || (!doneP);",
        "        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P8;",
        "        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P8;",
        "/*--------------------------------------------------------------------------*/",
        "        #if (FXAA_QUALITY_PS > 9)",
        "        if(doneNP) {",
        "            if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "            if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "            if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "            if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "            doneN = abs(lumaEndN) >= gradientScaled;",
        "            doneP = abs(lumaEndP) >= gradientScaled;",
        "            if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P9;",
        "            if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P9;",
        "            doneNP = (!doneN) || (!doneP);",
        "            if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P9;",
        "            if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P9;",
        "/*--------------------------------------------------------------------------*/",
        "            #if (FXAA_QUALITY_PS > 10)",
        "            if(doneNP) {",
        "                if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "                if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "                if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "                if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "                doneN = abs(lumaEndN) >= gradientScaled;",
        "                doneP = abs(lumaEndP) >= gradientScaled;",
        "                if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P10;",
        "                if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P10;",
        "                doneNP = (!doneN) || (!doneP);",
        "                if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P10;",
        "                if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P10;",
        "/*--------------------------------------------------------------------------*/",
        "                #if (FXAA_QUALITY_PS > 11)",
        "                if(doneNP) {",
        "                    if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "                    if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "                    if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "                    if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "                    doneN = abs(lumaEndN) >= gradientScaled;",
        "                    doneP = abs(lumaEndP) >= gradientScaled;",
        "                    if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P11;",
        "                    if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P11;",
        "                    doneNP = (!doneN) || (!doneP);",
        "                    if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P11;",
        "                    if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P11;",
        "/*--------------------------------------------------------------------------*/",
        "                    #if (FXAA_QUALITY_PS > 12)",
        "                    if(doneNP) {",
        "                        if(!doneN) lumaEndN = FxaaLuma(FxaaTexTop(tex, posN.xy));",
        "                        if(!doneP) lumaEndP = FxaaLuma(FxaaTexTop(tex, posP.xy));",
        "                        if(!doneN) lumaEndN = lumaEndN - lumaNN * 0.5;",
        "                        if(!doneP) lumaEndP = lumaEndP - lumaNN * 0.5;",
        "                        doneN = abs(lumaEndN) >= gradientScaled;",
        "                        doneP = abs(lumaEndP) >= gradientScaled;",
        "                        if(!doneN) posN.x -= offNP.x * FXAA_QUALITY_P12;",
        "                        if(!doneN) posN.y -= offNP.y * FXAA_QUALITY_P12;",
        "                        doneNP = (!doneN) || (!doneP);",
        "                        if(!doneP) posP.x += offNP.x * FXAA_QUALITY_P12;",
        "                        if(!doneP) posP.y += offNP.y * FXAA_QUALITY_P12;",
        "/*--------------------------------------------------------------------------*/",
        "                    }",
        "                    #endif",
        "/*--------------------------------------------------------------------------*/",
        "                }",
        "                #endif",
        "/*--------------------------------------------------------------------------*/",
        "            }",
        "            #endif",
        "/*--------------------------------------------------------------------------*/",
        "        }",
        "        #endif",
        "/*--------------------------------------------------------------------------*/",
        "    }",
        "    #endif",
        "/*--------------------------------------------------------------------------*/",
        "                        }",
        "                        #endif",
        "/*--------------------------------------------------------------------------*/",
        "                    }",
        "                    #endif",
        "/*--------------------------------------------------------------------------*/",
        "                }",
        "                #endif",
        "/*--------------------------------------------------------------------------*/",
        "            }",
        "            #endif",
        "/*--------------------------------------------------------------------------*/",
        "        }",
        "        #endif",
        "/*--------------------------------------------------------------------------*/",
        "    }",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat dstN = posM.x - posN.x;",
        "    FxaaFloat dstP = posP.x - posM.x;",
        "    if(!horzSpan) dstN = posM.y - posN.y;",
        "    if(!horzSpan) dstP = posP.y - posM.y;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaBool goodSpanN = (lumaEndN < 0.0) != lumaMLTZero;",
        "    FxaaFloat spanLength = (dstP + dstN);",
        "    FxaaBool goodSpanP = (lumaEndP < 0.0) != lumaMLTZero;",
        "    FxaaFloat spanLengthRcp = 1.0/spanLength;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaBool directionN = dstN < dstP;",
        "    FxaaFloat dst = min(dstN, dstP);",
        "    FxaaBool goodSpan = directionN ? goodSpanN : goodSpanP;",
        "    FxaaFloat subpixG = subpixF * subpixF;",
        "    FxaaFloat pixelOffset = (dst * (-spanLengthRcp)) + 0.5;",
        "    FxaaFloat subpixH = subpixG * fxaaQualitySubpix;",
        "/*--------------------------------------------------------------------------*/",
        "    FxaaFloat pixelOffsetGood = goodSpan ? pixelOffset : 0.0;",
        "    FxaaFloat pixelOffsetSubpix = max(pixelOffsetGood, subpixH);",
        "    if(!horzSpan) posM.x += pixelOffsetSubpix * lengthSign;",
        "    if( horzSpan) posM.y += pixelOffsetSubpix * lengthSign;",
        "    #if (FXAA_DISCARD == 1)",
        "        return FxaaTexTop(tex, posM);",
        "    #else",
        "        return FxaaFloat4(FxaaTexTop(tex, posM).xyz, lumaM);",
        "    #endif",
        "}",
        "/*==========================================================================*/",
        "#endif",
        "",
        "void main() {",
        "  gl_FragColor = FxaaPixelShader(",
        "    vUv,",
        "    vec4(0.0),",
        "    tDiffuse,",
        "    tDiffuse,",
        "    tDiffuse,",
        "    resolution,",
        "    vec4(0.0),",
        "    vec4(0.0),",
        "    vec4(0.0),",
        "    0.75,",
        "    0.166,",
        "    0.0833,",
        "    0.0,",
        "    0.0,",
        "    0.0,",
        "    vec4(0.0)",
        "  );",
        "",
        "  // TODO avoid querying texture twice for same texel",
        "  gl_FragColor.a = texture2D(tDiffuse, vUv).a;",
        "}"
	].join("\n")

};
/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.EffectComposer = function ( renderer, renderTarget ) {

	this.renderer = renderer;

	if ( renderTarget === undefined ) {

		var parameters = {
			minFilter: THREE.LinearFilter,
			magFilter: THREE.LinearFilter,
			format: THREE.RGBAFormat,
			stencilBuffer: false
		};

		var size = renderer.getDrawingBufferSize( new THREE.Vector2() );
		renderTarget = new THREE.WebGLRenderTarget( size.width, size.height, parameters );
		renderTarget.texture.name = 'EffectComposer.rt1';

	}

	this.renderTarget1 = renderTarget;
	this.renderTarget2 = renderTarget.clone();
	this.renderTarget2.texture.name = 'EffectComposer.rt2';

	this.writeBuffer = this.renderTarget1;
	this.readBuffer = this.renderTarget2;

	this.renderToScreen = true;

	this.passes = [];

	// dependencies

	if ( THREE.CopyShader === undefined ) {

		console.error( 'THREE.EffectComposer relies on THREE.CopyShader' );

	}

	if ( THREE.ShaderPass === undefined ) {

		console.error( 'THREE.EffectComposer relies on THREE.ShaderPass' );

	}

	this.copyPass = new THREE.ShaderPass( THREE.CopyShader );

	this._previousFrameTime = Date.now();

};

Object.assign( THREE.EffectComposer.prototype, {

	swapBuffers: function () {

		var tmp = this.readBuffer;
		this.readBuffer = this.writeBuffer;
		this.writeBuffer = tmp;

	},

	addPass: function ( pass ) {

		this.passes.push( pass );

		var size = this.renderer.getDrawingBufferSize( new THREE.Vector2() );
		pass.setSize( size.width, size.height );

	},

	insertPass: function ( pass, index ) {

		this.passes.splice( index, 0, pass );

	},

	isLastEnabledPass: function ( passIndex ) {

		for ( var i = passIndex + 1; i < this.passes.length; i ++ ) {

			if ( this.passes[ i ].enabled ) {

				return false;

			}

		}

		return true;

	},

	render: function ( deltaTime ) {

		// deltaTime value is in seconds

		if ( deltaTime === undefined ) {

			deltaTime = ( Date.now() - this._previousFrameTime ) * 0.001;

		}

		this._previousFrameTime = Date.now();

		var currentRenderTarget = this.renderer.getRenderTarget();

		var maskActive = false;

		var pass, i, il = this.passes.length;

		for ( i = 0; i < il; i ++ ) {

			pass = this.passes[ i ];

			if ( pass.enabled === false ) continue;

			pass.renderToScreen = ( this.renderToScreen && this.isLastEnabledPass( i ) );
			pass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime, maskActive );

			if ( pass.needsSwap ) {

				if ( maskActive ) {

					var context = this.renderer.context;

					context.stencilFunc( context.NOTEQUAL, 1, 0xffffffff );

					this.copyPass.render( this.renderer, this.writeBuffer, this.readBuffer, deltaTime );

					context.stencilFunc( context.EQUAL, 1, 0xffffffff );

				}

				this.swapBuffers();

			}

			if ( THREE.MaskPass !== undefined ) {

				if ( pass instanceof THREE.MaskPass ) {

					maskActive = true;

				} else if ( pass instanceof THREE.ClearMaskPass ) {

					maskActive = false;

				}

			}

		}

		this.renderer.setRenderTarget( currentRenderTarget );

	},

	reset: function ( renderTarget ) {

		if ( renderTarget === undefined ) {

			var size = this.renderer.getDrawingBufferSize( new THREE.Vector2() );

			renderTarget = this.renderTarget1.clone();
			renderTarget.setSize( size.width, size.height );

		}

		this.renderTarget1.dispose();
		this.renderTarget2.dispose();
		this.renderTarget1 = renderTarget;
		this.renderTarget2 = renderTarget.clone();

		this.writeBuffer = this.renderTarget1;
		this.readBuffer = this.renderTarget2;

	},

	setSize: function ( width, height ) {

		this.renderTarget1.setSize( width, height );
		this.renderTarget2.setSize( width, height );

		for ( var i = 0; i < this.passes.length; i ++ ) {

			this.passes[ i ].setSize( width, height );

		}

	}

} );


THREE.Pass = function () {

	// if set to true, the pass is processed by the composer
	this.enabled = true;

	// if set to true, the pass indicates to swap read and write buffer after rendering
	this.needsSwap = true;

	// if set to true, the pass clears its buffer before rendering
	this.clear = false;

	// if set to true, the result of the pass is rendered to screen. This is set automatically by EffectComposer.
	this.renderToScreen = false;

};

Object.assign( THREE.Pass.prototype, {

	setSize: function ( width, height ) {},

	render: function ( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

		console.error( 'THREE.Pass: .render() must be implemented in derived pass.' );

	}

} );

// Helper for passes that need to fill the viewport with a single quad.
THREE.Pass.FullScreenQuad = ( function () {

	var camera = new THREE.OrthographicCamera( - 1, 1, 1, - 1, 0, 1 );
	var geometry = new THREE.PlaneBufferGeometry( 2, 2 );

	var FullScreenQuad = function ( material ) {

		this._mesh = new THREE.Mesh( geometry, material );

	};

	Object.defineProperty( FullScreenQuad.prototype, 'material', {

		get: function () {

			return this._mesh.material;

		},

		set: function ( value ) {

			this._mesh.material = value;

		}

	} );

	Object.assign( FullScreenQuad.prototype, {

		render: function ( renderer ) {

			renderer.render( this._mesh, camera );

		}

	} );

	return FullScreenQuad;

} )();
/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.RenderPass = function ( scene, camera, overrideMaterial, clearColor, clearAlpha ) {

	THREE.Pass.call( this );

	this.scene = scene;
	this.camera = camera;

	this.overrideMaterial = overrideMaterial;

	this.clearColor = clearColor;
	this.clearAlpha = ( clearAlpha !== undefined ) ? clearAlpha : 0;

	this.clear = true;
	this.clearDepth = false;
	this.needsSwap = false;

};

THREE.RenderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.RenderPass,

	render: function ( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

		var oldAutoClear = renderer.autoClear;
		renderer.autoClear = false;

		this.scene.overrideMaterial = this.overrideMaterial;

		var oldClearColor, oldClearAlpha;

		if ( this.clearColor ) {

			oldClearColor = renderer.getClearColor().getHex();
			oldClearAlpha = renderer.getClearAlpha();

			renderer.setClearColor( this.clearColor, this.clearAlpha );

		}

		if ( this.clearDepth ) {

			renderer.clearDepth();

		}

		renderer.setRenderTarget( this.renderToScreen ? null : readBuffer );

		// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
		if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
		renderer.render( this.scene, this.camera );

		if ( this.clearColor ) {

			renderer.setClearColor( oldClearColor, oldClearAlpha );

		}

		this.scene.overrideMaterial = null;
		renderer.autoClear = oldAutoClear;

	}

} );
/**
 * @author alteredq / http://alteredqualia.com/
 */

THREE.ShaderPass = function ( shader, textureID ) {

	THREE.Pass.call( this );

	this.textureID = ( textureID !== undefined ) ? textureID : "tDiffuse";

	if ( shader instanceof THREE.ShaderMaterial ) {

		this.uniforms = shader.uniforms;

		this.material = shader;

	} else if ( shader ) {

		this.uniforms = THREE.UniformsUtils.clone( shader.uniforms );

		this.material = new THREE.ShaderMaterial( {

			defines: Object.assign( {}, shader.defines ),
			uniforms: this.uniforms,
			vertexShader: shader.vertexShader,
			fragmentShader: shader.fragmentShader

		} );

	}

	this.fsQuad = new THREE.Pass.FullScreenQuad( this.material );
};

THREE.ShaderPass.prototype = Object.assign( Object.create( THREE.Pass.prototype ), {

	constructor: THREE.ShaderPass,

	render: function ( renderer, writeBuffer, readBuffer, deltaTime, maskActive ) {

		if ( this.uniforms[ this.textureID ] ) {

			this.uniforms[ this.textureID ].value = readBuffer.texture;

		}

		this.fsQuad.material = this.material;

		if ( this.renderToScreen ) {

			renderer.setRenderTarget( null );
			this.fsQuad.render( renderer );

		} else {

			renderer.setRenderTarget( writeBuffer );
			// TODO: Avoid using autoClear properties, see https://github.com/mrdoob/three.js/pull/15571#issuecomment-465669600
			if ( this.clear ) renderer.clear( renderer.autoClearColor, renderer.autoClearDepth, renderer.autoClearStencil );
			this.fsQuad.render( renderer );

		}

	}

} );
/* global THREE */

// equivalent of: WEBOTS_HOME/resources/wren/shaders/hdr_resolve.frag

THREE.HDRResolveShader = {
  uniforms: {
    'tDiffuse': { value: null },
    'exposure': { value: 1.0 }
  },

  defines: {
    'GAMMA': 2.2
  },

  vertexShader: [
    'varying vec2 vUv;',

    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform float gamma;',
    'uniform float exposure;',
    'varying vec2 vUv;',
    'void main() {',
    '  vec4 tex = texture2D( tDiffuse, vec2( vUv.x, vUv.y ) );',
    '  vec3 mapped = vec3(1.0) - exp(-tex.xyz * exposure);',
    '  mapped = pow(mapped, vec3(1.0 / GAMMA));',
    '  gl_FragColor = vec4(mapped, 1.0);',
    '}'
  ].join('\n')
};
/* global THREE */

// equivalent of: WEBOTS_HOME/resources/wren/shaders/bright_pass.frag

THREE.brightPassShader = {

  uniforms: {
    'tDiffuse': { value: null },
    'threshold': { value: 21.0 },
    'textureSize': { value: new THREE.Vector2(800, 600)}
  },

  vertexShader: [
    'varying vec2 texUv;',

    'void main() {',
    '  texUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
    '}'
  ].join('\n'),

  fragmentShader: [
    'uniform sampler2D tDiffuse;',
    'uniform float threshold;',
    'uniform vec2 textureSize;',

    'varying vec2 texUv;',

    'float luma(vec3 color) {',
    '  return dot(color, vec3(0.299, 0.587, 0.114));',
    '}',

    'bool isnan(float val) {',
    '  return (val <= 0.0 || 0.0 <= val) ? false : true;',
    '}',

    'void main() {',
    '  vec4 color = texture2D( tDiffuse, texUv );',
    '  float totalLuma = luma( color.xyz );',

    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(0, 1) / textureSize).rgb);',
    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(0, -1) / textureSize).rgb);',
    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(-1, 0) / textureSize).rgb);',
    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(1, 0) / textureSize).rgb);',
    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(1, 1) / textureSize).rgb);',
    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(1, -1) / textureSize).rgb);',
    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(-1, 1) / textureSize).rgb);',
    '  totalLuma += luma(texture2D(tDiffuse, texUv + vec2(-1, -1) / textureSize).rgb);',
    '  totalLuma /= 9.0;',

    ' if (totalLuma < threshold)',
    '   gl_FragColor = vec4(vec3(0.0), 1.0);',
    ' else {',
    '   gl_FragColor.r = min(color.r, 4000.0);',
    '   gl_FragColor.g = min(color.g, 4000.0);',
    '   gl_FragColor.b = min(color.b, 4000.0);',
    '   gl_FragColor.a = 1.0;',
    ' }',
    '}'
  ].join('\n')
};
/* global THREE */

// equivalent of: WEBOTS_HOME/resources/wren/shaders/blend_bloom.frag

THREE.blendBloomShader = {

  uniforms: {
    'blurTexture1': { value: null },
    'blurTexture2': { value: null },
    'blurTexture3': { value: null },
    'blurTexture4': { value: null },
    'blurTexture5': { value: null },
    'blurTexture6': { value: null }
  },

  vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n'),

  fragmentShader: [
    'varying vec2 vUv;',
    'uniform sampler2D blurTexture1;',
    'uniform sampler2D blurTexture2;',
    'uniform sampler2D blurTexture3;',
    'uniform sampler2D blurTexture4;',
    'uniform sampler2D blurTexture5;',
    'uniform sampler2D blurTexture6;',

    'void main() {',
    '  gl_FragColor = vec4(0.1 * vec3(',
    '    0.1 * texture2D(blurTexture1, vUv).rgb + ',
    '    0.2 * texture2D(blurTexture2, vUv).rgb + ',
    '    0.4 * texture2D(blurTexture3, vUv).rgb + ',
    '    0.8 * texture2D(blurTexture4, vUv).rgb + ',
    '    1.6 * texture2D(blurTexture5, vUv).rgb + ',
    '    3.2 * texture2D(blurTexture6, vUv).rgb',
    '  ), 1.0);',
    '}'
  ].join('\n')
};
/* global THREE */

// equivalent of: WEBOTS_HOME/resources/wren/shaders/gaussian_blur_13_tap.frag

THREE.gaussianBlur13Tap = {
  defines: {
    'KERNEL_RADIUS': 1,
    'SIGMA': 1
  },

  uniforms: {
    'colorTexture': { value: null },
    'texSize': { value: new THREE.Vector2(0.5, 0.5) },
    'direction': { value: new THREE.Vector2(0.5, 0.5) }
  },

  vertexShader: [
    'varying vec2 vUv;',
    'void main() {',
    '  vUv = uv;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n'),
  fragmentShader: [
    'varying vec2 vUv;',
    'uniform sampler2D colorTexture;',
    'uniform vec2 texSize;',
    'uniform vec2 direction;',

    'float gaussianPdf(in float x, in float sigma) {',
    '  return 0.39894 * exp(-0.5 * x * x/(sigma * sigma))/sigma;',
    '}',

    'void main() {',
    '  vec2 invSize = 1.0 / texSize;',
    '  float fSigma = float(SIGMA);',
    '  float weightSum = gaussianPdf(0.0, fSigma);',
    '  vec3 diffuseSum = texture2D(colorTexture, vUv).rgb * weightSum;',
    '  for(int i = 1; i < KERNEL_RADIUS; i ++) {',
    '    float x = float(i);',
    '    float w = gaussianPdf(x, fSigma);',
    '    vec2 uvOffset = direction * invSize * x;',
    '    vec3 sample1 = texture2D(colorTexture, vUv + uvOffset).rgb;',
    '    vec3 sample2 = texture2D(colorTexture, vUv - uvOffset).rgb;',
    '    diffuseSum += (sample1 + sample2) * w;',
    '    weightSum += 2.0 * w;',
    '  }',
    '  gl_FragColor = vec4(diffuseSum/weightSum, 1.0);',
    '}'
  ].join('\n')
};
/* global THREE */

THREE.Bloom = class Bloom extends THREE.Pass {
  constructor(resolution = new THREE.Vector2(256, 256), threshold = 21.0) {
    super();

    this.threshold = threshold;
    this.resolution = resolution.clone();

    // create color only once here, reuse it later inside the render function
    this.clearColor = new THREE.Color(0, 0, 0);

    // render targets
    var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, type: THREE.FloatType };
    this.renderTargetsHorizontal = [];
    this.renderTargetsVertical = [];
    var resx = Math.round(this.resolution.x / 2);
    var resy = Math.round(this.resolution.y / 2);

    this.renderTargetBright = new THREE.WebGLRenderTarget(resx, resy, pars);
    this.renderTargetBright.texture.name = 'Bloom.bright';
    this.renderTargetBright.texture.generateMipmaps = false;

    for (let i = 0; i < 6; i++) {
      var renderTargetHorizonal = new THREE.WebGLRenderTarget(resx, resy, pars);

      renderTargetHorizonal.texture.name = 'Bloom.h' + i;
      renderTargetHorizonal.texture.generateMipmaps = false;

      this.renderTargetsHorizontal.push(renderTargetHorizonal);

      var renderTargetVertical = new THREE.WebGLRenderTarget(resx, resy, pars);

      renderTargetVertical.texture.name = 'Bloom.v' + i;
      renderTargetVertical.texture.generateMipmaps = false;

      this.renderTargetsVertical.push(renderTargetVertical);

      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }

    // luminosity high pass material

    if (THREE.brightPassShader === undefined)
      console.error('Bloom relies on THREE.brightPassShader');

    var brightPassShader = THREE.brightPassShader;
    this.brightPassUniforms = THREE.UniformsUtils.clone(brightPassShader.uniforms);
    this.brightPassUniforms[ 'threshold' ].value = this.threshold;
    this.brightPassUniforms[ 'textureSize' ].value = this.resolution;

    this.materialBrightPass = new THREE.ShaderMaterial({
      uniforms: this.brightPassUniforms,
      vertexShader: brightPassShader.vertexShader,
      fragmentShader: brightPassShader.fragmentShader,
      defines: {}
    });

    // Gaussian Blur Materials
    if (THREE.gaussianBlur13Tap === undefined)
      console.error('Bloom relies on THREE.gaussianBlur13Tap');

    this.separableBlurMaterials = [];
    resx = Math.round(this.resolution.x / 2);
    resy = Math.round(this.resolution.y / 2);

    for (let i = 0; i < 6; i++) {
      this.separableBlurMaterials.push(new THREE.ShaderMaterial(THREE.gaussianBlur13Tap));
      this.separableBlurMaterials[ i ].uniforms[ 'texSize' ].value = new THREE.Vector2(resx, resy);

      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }

    // Composite material
    if (THREE.brightPassShader === undefined)
      console.error('Bloom relies on THREE.blendBloomShader');
    this.compositeMaterial = new THREE.ShaderMaterial(THREE.blendBloomShader);
    this.compositeMaterial.uniforms[ 'blurTexture1' ].value = this.renderTargetsVertical[ 0 ].texture;
    this.compositeMaterial.uniforms[ 'blurTexture2' ].value = this.renderTargetsVertical[ 1 ].texture;
    this.compositeMaterial.uniforms[ 'blurTexture3' ].value = this.renderTargetsVertical[ 2 ].texture;
    this.compositeMaterial.uniforms[ 'blurTexture4' ].value = this.renderTargetsVertical[ 3 ].texture;
    this.compositeMaterial.uniforms[ 'blurTexture5' ].value = this.renderTargetsVertical[ 4 ].texture;
    this.compositeMaterial.uniforms[ 'blurTexture6' ].value = this.renderTargetsVertical[ 5 ].texture;
    this.compositeMaterial.needsUpdate = true;

    // copy material
    if (THREE.CopyShader === undefined)
      console.error('THREE.BloomPass relies on THREE.CopyShader');

    var copyShader = THREE.CopyShader;

    this.copyUniforms = THREE.UniformsUtils.clone(copyShader.uniforms);
    this.copyUniforms[ 'opacity' ].value = 1.0;

    this.materialCopy = new THREE.ShaderMaterial({
      uniforms: this.copyUniforms,
      vertexShader: copyShader.vertexShader,
      fragmentShader: copyShader.fragmentShader,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      transparent: true
    });

    this.enabled = true;
    this.needsSwap = false;

    this.oldClearColor = new THREE.Color();
    this.oldClearAlpha = 1;

    this.basic = new THREE.MeshBasicMaterial();

    this.fsQuad = new THREE.Pass.FullScreenQuad(null);
  }

  dispose() {
    for (let i = 0; i < this.renderTargetsHorizontal.length; i++)
      this.renderTargetsHorizontal[ i ].dispose();

    for (let i = 0; i < this.renderTargetsVertical.length; i++)
      this.renderTargetsVertical[ i ].dispose();

    this.renderTargetBright.dispose();
  }

  setSize(width, height) {
    var resx = Math.round(width / 2);
    var resy = Math.round(height / 2);

    this.renderTargetBright.setSize(resx, resy);
    this.brightPassUniforms[ 'textureSize' ].value = new THREE.Vector2(width, height);

    for (let i = 0; i < 6; i++) {
      this.renderTargetsHorizontal[ i ].setSize(resx, resy);
      this.renderTargetsVertical[ i ].setSize(resx, resy);

      this.separableBlurMaterials[ i ].uniforms[ 'texSize' ].value = new THREE.Vector2(resx, resy);

      resx = Math.round(resx / 2);
      resy = Math.round(resy / 2);
    }
  }

  render(renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
    this.oldClearColor.copy(renderer.getClearColor());
    this.oldClearAlpha = renderer.getClearAlpha();
    var oldAutoClear = renderer.autoClear;
    renderer.autoClear = false;

    renderer.setClearColor(this.clearColor, 0);

    if (maskActive)
      renderer.context.disable(renderer.context.STENCIL_TEST);

    // Render input to screen
    if (this.renderToScreen) {
      this.fsQuad.material = this.basic;
      this.basic.map = readBuffer.texture;

      renderer.setRenderTarget(null);
      renderer.clear();
      this.fsQuad.render(renderer);
    }

    // 1. Extract Bright Areas

    this.brightPassUniforms[ 'tDiffuse' ].value = readBuffer.texture;
    this.brightPassUniforms[ 'threshold' ].value = this.threshold;
    this.fsQuad.material = this.materialBrightPass;

    renderer.setRenderTarget(this.renderTargetBright);
    renderer.clear();
    this.fsQuad.render(renderer);

    /*
    // Code to debug bloom passes.
    if (this.debugMaterial) {
      var width = renderer.getSize().x / 2;
      var height = renderer.getSize().y / 2;
      var texture = new THREE.DataTexture(undefined, width, height, THREE.RGBFormat);
      texture.needsUpdate = true;
      renderer.copyFramebufferToTexture(new THREE.Vector2(), texture);
      this.debugMaterial.map = texture;
      this.debugMaterial.needsUpdate = true;
    }
    */

    // 2. Blur All the mips progressively

    var inputRenderTarget = this.renderTargetBright;
    for (let i = 0; i < 6; i++) {
      this.fsQuad.material = this.separableBlurMaterials[ i ];

      this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = inputRenderTarget.texture;
      this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = new THREE.Vector2(1.0, 0.0);
      renderer.setRenderTarget(this.renderTargetsHorizontal[ i ]);
      renderer.clear();
      this.fsQuad.render(renderer);

      this.separableBlurMaterials[ i ].uniforms[ 'colorTexture' ].value = this.renderTargetsHorizontal[ i ].texture;
      this.separableBlurMaterials[ i ].uniforms[ 'direction' ].value = new THREE.Vector2(0.0, 1.0);
      renderer.setRenderTarget(this.renderTargetsVertical[ i ]);
      renderer.clear();
      this.fsQuad.render(renderer);

      inputRenderTarget = this.renderTargetsVertical[ i ];
    }

    // Composite All the mips

    this.fsQuad.material = this.compositeMaterial;
    renderer.setRenderTarget(this.renderTargetsHorizontal[ 0 ]);
    renderer.clear();
    this.fsQuad.render(renderer);

    // Blend it additively over the input texture

    this.fsQuad.material = this.materialCopy;
    this.copyUniforms[ 'tDiffuse' ].value = this.renderTargetsHorizontal[ 0 ].texture;

    if (maskActive)
      renderer.context.enable(renderer.context.STENCIL_TEST);

    if (this.renderToScreen) {
      renderer.setRenderTarget(null);
      this.fsQuad.render(renderer);
    } else {
      renderer.setRenderTarget(readBuffer);
      this.fsQuad.render(renderer);
    }

    // Restore renderer settings

    renderer.setClearColor(this.oldClearColor, this.oldClearAlpha);
    renderer.autoClear = oldAutoClear;
  }
};
/* global THREE */

'use strict';

// Inspiration:
// https://github.com/lkolbly/threejs-x3dloader/blob/master/X3DLoader.js
// @author https://github.com/brianxu

THREE.FaceIDShader = {
  vertexShader: [
    'attribute float id;',

    'uniform float size;',
    'uniform float scale;',
    'uniform float baseId;',

    'varying vec4 worldId;',

    'void main() {',
    '  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);',
    '  gl_PointSize = size * (scale / length(mvPosition.xyz));',
    '  float i = baseId + id;',
    '  vec3 a = fract(vec3(1.0 / 255.0, 1.0 / (255.0 * 255.0), 1.0 / (255.0 * 255.0 * 255.0)) * i);',
    '  a -= a.xxy * vec3(0.0, 1.0 / 255.0, 1.0 / 255.0);',
    '  worldId = vec4(a, 1);',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);',
    '}'
  ].join('\n'),
  fragmentShader: [
    '#ifdef GL_ES',
    'precision highp float;',
    '#endif',

    'varying vec4 worldId;',

    'void main() {',
    '  gl_FragColor = worldId;',
    '}'
  ].join('\n')
};

THREE.FaceIDMaterial = class FaceIDMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        baseId: {
          type: 'f',
          value: 0
        },
        size: {
          type: 'f',
          value: 0.01
        },
        scale: {
          type: 'f',
          value: 400
        }
      },
      vertexShader: THREE.FaceIDShader.vertexShader,
      fragmentShader: THREE.FaceIDShader.fragmentShader
    });
  }

  setBaseID(baseId) {
    this.uniforms.baseId.value = baseId;
  }
  setPointSize(size) {
    this.uniforms.size.value = size;
  }
  setPointScale(scale) {
    this.uniforms.scale.value = scale;
  }
};

THREE.GPUPicker = class GPUPicker {
  constructor(option = {}) {
    this.pickingScene = new THREE.Scene();
    this.pickingTexture = new THREE.WebGLRenderTarget();
    this.pickingTexture.texture.minFilter = THREE.LinearFilter;
    this.pickingTexture.texture.generateMipmaps = false;
    this.lineShell = typeof option.lineShell !== 'undefined' ? option.lineShell : 4;
    this.pointShell = typeof option.pointShell !== 'undefined' ? option.pointShell : 0.1;
    this.needUpdate = true;

    if (option.renderer)
      this.setRenderer(option.renderer);

    // array of original objects
    this.container = [];
    this.objectsMap = {};

    // default filter
    this.setFilter();
  }

  setRenderer(renderer) {
    this.renderer = renderer;
    var size = new THREE.Vector2();
    renderer.getSize(size);
    this.resizeTexture(size.x, size.y);
    this.needUpdate = true;
  }

  resizeTexture(width, height) {
    this.pickingTexture.setSize(width, height);
    this.pixelBuffer = new Uint8Array(4 * width * height);
    this.needUpdate = true;
  }

  setCamera(camera) {
    this.camera = camera;
    this.needUpdate = true;
  }

  update() {
    if (this.needUpdate) {
      var rt = this.renderer.getRenderTarget();
      this.renderer.setRenderTarget(this.pickingTexture);
      this.renderer.render(this.pickingScene, this.camera);
      // read the rendering texture
      this.renderer.readRenderTargetPixels(this.pickingTexture, 0, 0, this.pickingTexture.width, this.pickingTexture.height, this.pixelBuffer);
      this.renderer.setRenderTarget(rt);
      this.needUpdate = false;
    }
  }

  setFilter(func) {
    if (func instanceof Function)
      this.filterFunc = func;
    else {
      // default filter
      this.filterFunc = (object) => {
        return true;
      };
    }
  }

  setScene(scene) {
    this.pickingScene = scene.clone();
    this._processObject(this.pickingScene, 0);
    this.needUpdate = true;
  }

  pick(mouse, raycaster) {
    this.update();
    var index = mouse.x + (this.pickingTexture.height - mouse.y) * this.pickingTexture.width;
    // interpret the pixel as an ID
    var id = (this.pixelBuffer[index * 4 + 2] * 255 * 255) + (this.pixelBuffer[index * 4 + 1] * 255) + (this.pixelBuffer[index * 4 + 0]);
    var result = this._getObject(this.pickingScene, 0, id);
    var object = result[1];
    var elementId = id - result[0];
    if (object) {
      if (object.raycastWithID) {
        var intersect = object.raycastWithID(elementId, raycaster);
        if (intersect)
          intersect.object = object.originalObject;
        return intersect;
      }
    }
  }

  // get object by id
  _getObject(object, baseId, id) {
    if (typeof object.elementsCount !== 'undefined' && id >= baseId && id < baseId + object.elementsCount)
      return [baseId, object];
    if (typeof object.elementsCount !== 'undefined')
      baseId += object.elementsCount;
    var result = [baseId, undefined];
    for (let i = 0; i < object.children.length; i++) {
      result = this._getObject(object.children[i], result[0], id);
      if (result[1] !== undefined)
        break;
    }
    return result;
  }

  // process the object to add elementId information
  _processObject(object, baseId) {
    baseId += this._addElementID(object, baseId);
    for (let i = 0; i < object.children.length; i++)
      baseId = this._processObject(object.children[i], baseId);
    return baseId;
  }

  _addElementID(object, baseId) {
    if (!this.filterFunc(object) && typeof object.geometry !== 'undefined') {
      object.visible = false;
      return 0;
    }

    if (object.geometry) {
      var __pickingGeometry;
      // check if geometry has cached geometry for picking
      if (object.geometry.__pickingGeometry)
        __pickingGeometry = object.geometry.__pickingGeometry;
      else {
        __pickingGeometry = object.geometry;
        // convert geometry to buffer geometry
        if (object.geometry instanceof THREE.Geometry)
          __pickingGeometry = new THREE.BufferGeometry().setFromObject(object);
        var units = 1;
        if (object instanceof THREE.Points)
          units = 1;
        else if (object instanceof THREE.Line)
          units = 2;
        else if (object instanceof THREE.Mesh)
          units = 3;
        var el, el3, elementsCount, i, indices, positionBuffer, vertex3, verts, vertexIndex3;
        if (__pickingGeometry.index !== null) {
          __pickingGeometry = __pickingGeometry.clone();
          indices = __pickingGeometry.index.array;
          verts = __pickingGeometry.attributes.position.array;
          delete __pickingGeometry.attributes.position;
          __pickingGeometry.index = null;
          delete __pickingGeometry.attributes.normal;
          elementsCount = indices.length / units;
          positionBuffer = new Float32Array(elementsCount * 3 * units);

          __pickingGeometry.addAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));
          for (el = 0; el < elementsCount; ++el) {
            el3 = units * el;
            for (i = 0; i < units; ++i) {
              vertexIndex3 = 3 * indices[el3 + i];
              vertex3 = 3 * (el3 + i);
              positionBuffer[vertex3] = verts[vertexIndex3];
              positionBuffer[vertex3 + 1] = verts[vertexIndex3 + 1];
              positionBuffer[vertex3 + 2] = verts[vertexIndex3 + 2];
            }
          }

          __pickingGeometry.computeVertexNormals();
        }
        if (object instanceof THREE.Line && !(object instanceof THREE.LineSegments)) {
          verts = __pickingGeometry.attributes.position.array;
          delete __pickingGeometry.attributes.position;
          elementsCount = verts.length / 3 - 1;
          positionBuffer = new Float32Array(elementsCount * units * 3);

          __pickingGeometry.addAttribute('position', new THREE.BufferAttribute(positionBuffer, 3));
          for (el = 0; el < elementsCount; ++el) {
            el3 = 3 * el;
            vertexIndex3 = el3;
            vertex3 = el3 * 2;
            positionBuffer[vertex3] = verts[vertexIndex3];
            positionBuffer[vertex3 + 1] = verts[vertexIndex3 + 1];
            positionBuffer[vertex3 + 2] = verts[vertexIndex3 + 2];
            positionBuffer[vertex3 + 3] = verts[vertexIndex3 + 3];
            positionBuffer[vertex3 + 4] = verts[vertexIndex3 + 4];
            positionBuffer[vertex3 + 5] = verts[vertexIndex3 + 5];
          }

          __pickingGeometry.computeVertexNormals();

          // make the renderer render as line segments
          object.__proto__ = THREE.LineSegments.prototype; // eslint-disable-line
        }
        var attributes = __pickingGeometry.attributes;
        var positions = attributes.position.array;
        var vertexCount = positions.length / 3;
        var ids = new THREE.Float32BufferAttribute(vertexCount, 1);
        // set vertex id color

        for (let i = 0, il = vertexCount / units; i < il; i++) {
          for (let j = 0; j < units; ++j)
            ids.array[i * units + j] = i;
        }
        __pickingGeometry.addAttribute('id', ids);
        __pickingGeometry.elementsCount = vertexCount / units;
        // cache __pickingGeometry inside geometry
        object.geometry.__pickingGeometry = __pickingGeometry;
      }

      // use __pickingGeometry in the picking mesh
      object.geometry = __pickingGeometry;
      object.elementsCount = __pickingGeometry.elementsCount; // elements count

      var pointSize = object.material.size || 0.01;
      var linewidth = object.material.linewidth || 1;
      object.material = new THREE.FaceIDMaterial();
      object.material.linewidth = linewidth + this.lineShell; // make the line a little wider to hit
      object.material.setBaseID(baseId);
      object.material.setPointSize(pointSize + this.pointShell); // make the point a little wider to hit
      var size = new THREE.Vector2();
      this.renderer.getSize(size);
      object.material.setPointScale(size.y * this.renderer.getPixelRatio() / 2);
      return object.elementsCount;
    }
    return 0;
  };
};

(function(THREE) {
  // add a originalObject to Object3D
  (function(clone) {
    THREE.Object3D.prototype.clone = function(recursive) {
      var object = clone.call(this, recursive);
      // keep a ref to originalObject
      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  }(THREE.Object3D.prototype.clone));
  // add a originalObject to Points
  (function(clone) {
    THREE.Points.prototype.clone = function(recursive) {
      var object = clone.call(this, recursive);
      // keep a ref to originalObject
      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  }(THREE.Points.prototype.clone));
  // add a originalObject to Mesh
  (function(clone) {
    THREE.Mesh.prototype.clone = function() {
      var object = clone.call(this);
      // keep a ref to originalObject
      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  }(THREE.Mesh.prototype.clone));
  // add a originalObject to Line
  (function(clone) {
    THREE.Line.prototype.clone = function() {
      var object = clone.call(this);
      // keep a ref to originalObject
      object.originalObject = this;
      object.priority = this.priority;
      return object;
    };
  }(THREE.Line.prototype.clone));

  THREE.Mesh.prototype.raycastWithID = (function() {
    var vA = new THREE.Vector3();
    var vB = new THREE.Vector3();
    var vC = new THREE.Vector3();
    var inverseMatrix = new THREE.Matrix4();
    var ray = new THREE.Ray();
    var intersectionPointWorld = new THREE.Vector3();
    var intersectionPoint = new THREE.Vector3();

    function checkIntersection(object, raycaster, ray, pA, pB, pC, point) {
      var intersect;
      intersect = ray.intersectTriangle(pC, pB, pA, false, point);
      var plane = new THREE.Plane();
      plane.setFromCoplanarPoints(pA, pB, pC);
      intersect = ray.intersectPlane(plane, new THREE.Vector3());
      if (intersect === null)
        return null;
      intersectionPointWorld.copy(point);
      intersectionPointWorld.applyMatrix4(object.matrixWorld);
      var distance = raycaster.ray.origin.distanceTo(intersectionPointWorld);
      if (distance < raycaster.near || distance > raycaster.far)
        return null;
      return {
        distance: distance,
        point: intersectionPointWorld.clone(),
        object: object
      };
    }

    return function(elID, raycaster) {
      var geometry = this.geometry;
      var attributes = geometry.attributes;
      inverseMatrix.getInverse(this.matrixWorld);
      ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);
      var a, b, c;
      if (geometry.index !== null)
        console.log('WARNING: raycastWithID does not support indexed vertices');
      else {
        var position = attributes.position;
        var j = elID * 3;
        a = j;
        b = j + 1;
        c = j + 2;
        vA.fromBufferAttribute(position, a);
        vB.fromBufferAttribute(position, b);
        vC.fromBufferAttribute(position, c);
      }
      var intersection = checkIntersection(this, raycaster, ray, vA, vB, vC, intersectionPoint);
      if (intersection === null) {
        console.log('WARNING: intersectionPoint missing');
        return;
      }

      var face = new THREE.Face3(a, b, c);
      THREE.Triangle.getNormal(vA, vB, vC, face.normal);

      intersection.face = face;
      intersection.faceIndex = a;
      return intersection;
    };
  }());

  THREE.Line.prototype.raycastWithID = (function() {
    var inverseMatrix = new THREE.Matrix4();
    var ray = new THREE.Ray();
    var vStart = new THREE.Vector3();
    var vEnd = new THREE.Vector3();
    var interSegment = new THREE.Vector3();
    var interRay = new THREE.Vector3();

    return function(elID, raycaster) {
      inverseMatrix.getInverse(this.matrixWorld);
      ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);
      var geometry = this.geometry;
      if (geometry instanceof THREE.BufferGeometry) {
        var attributes = geometry.attributes;

        if (geometry.index !== null)
          console.log('WARNING: raycastWithID does not support indexed vertices');
        else {
          var positions = attributes.position.array;
          var i = elID * 6;
          vStart.fromArray(positions, i);
          vEnd.fromArray(positions, i + 3);

          var distance = ray.origin.distanceTo(interRay);

          if (distance < raycaster.near || distance > raycaster.far)
            return;

          var intersect = {

            distance: distance,
            // What do we want? intersection point on the ray or on the segment??
            // point: raycaster.ray.at( distance ),
            point: interSegment.clone().applyMatrix4(this.matrixWorld),
            index: i,
            face: null,
            faceIndex: null,
            object: this

          };
          return intersect;
        }
      }
    };
  })();

  THREE.Points.prototype.raycastWithID = (function() {
    var inverseMatrix = new THREE.Matrix4();
    var ray = new THREE.Ray();

    return function(elID, raycaster) {
      var object = this;
      var geometry = object.geometry;

      inverseMatrix.getInverse(this.matrixWorld);
      ray.copy(raycaster.ray).applyMatrix4(inverseMatrix);
      var position = new THREE.Vector3();

      var testPoint = function(point, index) {
        var rayPointDistance = ray.distanceToPoint(point);
        var intersectPoint = ray.closestPointToPoint(point);
        intersectPoint.applyMatrix4(object.matrixWorld);

        var distance = raycaster.ray.origin.distanceTo(intersectPoint);

        if (distance < raycaster.near || distance > raycaster.far)
          return;

        var intersect = {
          distance: distance,
          distanceToRay: rayPointDistance,
          point: intersectPoint.clone(),
          index: index,
          face: null,
          object: object
        };
        return intersect;
      };
      var attributes = geometry.attributes;
      var positions = attributes.position.array;
      position.fromArray(positions, elID * 3);

      return testPoint(position, elID);
    };
  }());
}(THREE));
/* global THREE */
/* eslint no-extend-native: ["error", { "exceptions": ["String"] }] */

var webots = window.webots || {};

webots.quaternionToAxisAngle = (quaternion) => {
  var angle, axis;
  var q = quaternion.clone();
  if (q.w > 1.0)
    q.normalize();
  if (q.w >= 1.0)
    angle = 0.0;
  else if (q.w <= -1.0)
    angle = 2.0 * Math.PI;
  else
    angle = 2.0 * Math.acos(q.w);
  if (angle < 0.001) {
    // if the angle is close to zero, then the direction of the axis is not important
    axis = new THREE.Vector3(0.0, 1.0, 0.0);
    angle = 0;
  } else {
    // normalize axes
    var inv = 1.0 / Math.sqrt(q.x * q.x + q.y * q.y + q.z * q.z);
    axis = new THREE.Vector3(q.x * inv, q.y * inv, q.z * inv);
  }
  return { 'axis': axis, 'angle': angle};
};

webots.parseMillisecondsIntoReadableTime = (milliseconds) => {
  var hours = (milliseconds + 0.9) / (1000 * 60 * 60);
  var absoluteHours = Math.floor(hours);
  var h = absoluteHours > 9 ? absoluteHours : '0' + absoluteHours;
  var minutes = (hours - absoluteHours) * 60;
  var absoluteMinutes = Math.floor(minutes);
  var m = absoluteMinutes > 9 ? absoluteMinutes : '0' + absoluteMinutes;
  var seconds = (minutes - absoluteMinutes) * 60;
  var absoluteSeconds = Math.floor(seconds);
  var s = absoluteSeconds > 9 ? absoluteSeconds : '0' + absoluteSeconds;
  var ms = Math.floor((seconds - absoluteSeconds) * 1000);
  if (ms < 10)
    ms = '00' + ms;
  else if (ms < 100)
    ms = '0' + ms;
  return h + ':' + m + ':' + s + ':' + ms;
};

// add startsWith() and endsWith() functions to the String prototype
if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = (prefix) => {
    return this.slice(0, prefix.length) === prefix;
  };
}

if (typeof String.prototype.endsWith !== 'function') {
  String.prototype.endsWith = (suffix) => {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
  };
}
/* exported SystemInfo */

class SystemInfo {
  static isMacOS() {
    // https://stackoverflow.com/questions/10527983/best-way-to-detect-mac-os-x-or-windows-computers-with-javascript-or-jquery
    return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  }

  static isIOS() {
    // https://stackoverflow.com/questions/9038625/detect-if-device-is-ios
    return !!navigator.platform && /iPad|iPhone|iPod/.test(navigator.platform);
  }

  static isMobileDevice() {
    // https://stackoverflow.com/questions/11381673/detecting-a-mobile-browser
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }
}
/* global webots */
'use strict';

class DialogWindow { // eslint-disable-line no-unused-vars
  constructor(parent, mobile) {
    this.mobile = mobile;
    this.parent = parent;
    this.panel = document.createElement('div');
    parent.appendChild(this.panel);

    this.params = {
      appendTo: parent,
      open: () => { DialogWindow.openDialog(this.panel); },
      autoOpen: false,
      resizeStart: DialogWindow.disablePointerEvents,
      resizeStop: DialogWindow.enablePointerEvents,
      dragStart: DialogWindow.disablePointerEvents,
      dragStop: DialogWindow.enablePointerEvents
    };
    if (this.mobile)
      DialogWindow.addMobileDialogAttributes(this.params, this.panel);
  }

  static clampDialogSize(preferredGeometry) {
    if (typeof $('#playerDiv').height === 'undefined' || typeof $('#playerDiv').width === 'undefined')
      return preferredGeometry;

    var maxHeight = $('#playerDiv').height() - preferredGeometry.top - $('#toolBar').height() - 20; // 20 is chosen arbitrarily
    var maxWidth = $('#playerDiv').width() - preferredGeometry.left - 20; // 20 is chosen arbitrarily
    var height = preferredGeometry.height;
    var width = preferredGeometry.width;
    if (maxHeight < height)
      height = maxHeight;
    if (maxWidth < width)
      width = maxWidth;
    return {width: width, height: height};
  }

  static openDialog(dialog) {
    DialogWindow.resizeDialogOnOpen(dialog);
    $(dialog).parent().css('opacity', 0.9);
    $(dialog).parent().hover(() => {
      $(dialog).css('opacity', 0.99);
    }, (event) => {
      $(dialog).css('opacity', 0.9);
    });
  }

  static resizeDialogOnOpen(dialog) {
    var w = $(dialog).parent().width();
    var h = $(dialog).parent().height();
    var clampedSize = DialogWindow.clampDialogSize({left: 0, top: 0, width: w, height: h});
    if (clampedSize.width < w)
      $(dialog).dialog('option', 'width', clampedSize.width);
    if (clampedSize.height < h)
      $(dialog).dialog('option', 'height', clampedSize.height);
  }

  static createMobileDialog() {
    // mobile only setup
    var closeButton = $('button:contains("WbClose")');
    closeButton.html('');
    closeButton.removeClass('ui-button-text-only');
    closeButton.addClass('mobile-dialog-close-button');
    closeButton.addClass('ui-button-icon-primary');
    closeButton.prepend('<span class="ui-icon ui-icon-closethick"></span>');
  }

  static addMobileDialogAttributes(params, panel) {
    params.dialogClass = 'mobile-no-default-buttons';
    params.create = DialogWindow.createMobileDialog;
    params.buttons = { 'WbClose': () => { $(panel).dialog('close'); } };
  }

  // The following two functions are used to make the resize and drag of the dialog
  // steady (i.e., not loose the grab while resizing/dragging the dialog quickly).
  static disablePointerEvents() {
    document.body.style['pointer-events'] = 'none';
  }

  static enablePointerEvents() {
    document.body.style['pointer-events'] = 'auto';
  }
}

webots.alert = (title, message, callback) => {
  webots.currentView.ondialogwindow(true);
  var parent = webots.currentView.view3D;
  var panel = document.getElementById('webotsAlert');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'webotsAlert';
    parent.appendChild(panel);
  }
  panel.innerHTML = message;
  $('#webotsAlert').dialog({
    title: title,
    resizeStart: DialogWindow.disablePointerEvents,
    resizeStop: DialogWindow.enablePointerEvents,
    dragStart: DialogWindow.disablePointerEvents,
    dragStop: DialogWindow.enablePointerEvents,
    appendTo: parent,
    open: () => { DialogWindow.openDialog(panel); },
    modal: true,
    width: 400, // enough room to display the social network buttons in a line
    buttons: {
      Ok: () => { $('#webotsAlert').dialog('close'); }
    },
    close: () => {
      if (typeof callback === 'function')
        callback();
      webots.currentView.ondialogwindow(false);
      $('#webotsAlert').remove();
    }
  });
};

webots.confirm = (title, message, okCallback, closeCallback) => {
  webots.currentView.ondialogwindow(true);
  var parent = webots.currentView.view3D;
  var panel = document.createElement('div');
  panel.id = 'webotsConfirm';
  panel.innerHTML = message;
  parent.appendChild(panel);
  $('#webotsConfirm').dialog({
    title: title,
    resizeStart: DialogWindow.disablePointerEvents,
    resizeStop: DialogWindow.enablePointerEvents,
    dragStart: DialogWindow.disablePointerEvents,
    dragStop: DialogWindow.enablePointerEvents,
    appendTo: parent,
    open: () => { DialogWindow.openDialog(panel); },
    modal: true,
    width: 400, // enough room to display the social network buttons in a line
    buttons: {
      Ok: () => {
        $('#webotsConfirm').dialog('close');
        if (typeof okCallback === 'function')
          okCallback();
      },
      Cancel: () => { $('#webotsConfirm').dialog('close'); }
    },
    close: () => {
      $('#webotsConfirm').dialog('destroy').remove();
      webots.currentView.ondialogwindow(false);
      if (typeof closeCallback === 'function')
        closeCallback();
    }});
};
/* global DialogWindow, DefaultUrl */
'use strict';

class Console extends DialogWindow { // eslint-disable-line no-unused-vars
  constructor(parent, mobile) {
    super(parent, mobile);

    this.panel.id = 'webotsConsole';
    this.panel.className = 'webotsConsole';

    var clampedSize = DialogWindow.clampDialogSize({left: 0, top: 0, width: 600, height: 400});
    this.params.width = clampedSize.width;
    this.params.height = clampedSize.height;
    this.params.close = () => { $('#consoleButton').removeClass('toolBarButtonActive'); };
    this.params.title = 'Console';

    $(this.panel).dialog(this.params).dialogExtend({maximizable: !mobile});

    var buttons = document.createElement('div');
    buttons.className = 'webotsConsoleButtons';
    this.logs = document.createElement('div');
    this.logs.className = 'webotsConsoleLogs';
    var clearButtonIcon = document.createElement('img');
    clearButtonIcon.className = 'webotsConsoleButtonIcon';
    clearButtonIcon.setAttribute('src', DefaultUrl.wwiImagesUrl() + 'trash.png');
    this.clearButton = document.createElement('button');
    this.clearButton.className = 'webotsConsoleButton';
    this.clearButton.disabled = true;
    this.clearButton.title = 'Clear the console';
    this.clearButton.appendChild(clearButtonIcon);
    this.clearButton.addEventListener('click', () => {
      this.clear();
    });
    buttons.appendChild(this.clearButton);
    this.panel.appendChild(buttons);
    this.panel.appendChild(this.logs);
  }

  scrollDown() {
    if (this.panel)
      this.panel.scrollTop = this.panel.scrollHeight;
  }

  // Remove all the logs.
  clear() {
    if (this.logs) {
      while (this.logs.firstChild)
        this.logs.removeChild(this.logs.firstChild);
    } else
      console.clear();
    this.clearButton.disabled = true;
  }

  // Remove the oldest logs.
  purge() {
    const historySize = 100; // defines the maximum size of the log.
    if (this.logs) {
      while (this.logs.firstChild && this.logs.childElementCount > historySize)
        this.logs.removeChild(this.logs.firstChild);
    }
  }

  stdout(message) {
    this._log(message, 0);
  }

  stderr(message) {
    this._log(message, 1);
  }

  info(message) {
    this._log(message, 2);
  }

  error(message) {
    this._log(message, 3);
  }

  // private functions
  _log(message, type) {
    var para = document.createElement('p');
    var style = 'margin:0;';
    var title = '';
    switch (type) {
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
    if (this.logs) {
      para.style.cssText = style;
      para.title = title + ' (' + this._hourString() + ')';
      var t = document.createTextNode(message);
      para.appendChild(t);
      this.logs.appendChild(para);
      this.purge();
      this.scrollDown();
      this.clearButton.disabled = false;
    } else
      console.log('%c' + message, style);
  }

  _hourString() {
    var d = new Date();
    return d.getHours() + ':' +
         ((d.getMinutes() < 10) ? '0' : '') + d.getMinutes() + ':' +
         ((d.getSeconds() < 10) ? '0' : '') + d.getSeconds();
  }
}
/* global DialogWindow, DefaultUrl, webots */
'use strict';

class HelpWindow extends DialogWindow { // eslint-disable-line no-unused-vars
  constructor(parent, mobile, webotsDocUrl) {
    super(parent, mobile);

    this.panel.id = 'webotsHelp';
    this.panel.style.overflow = 'hidden';
    this.panel.className += 'webotsTabContainer';
    this.tabs = document.createElement('div');
    this.tabs.id = 'webotsHelpTabs';
    this.tabs.className += 'webotsTabs';
    this.tabsHeader = document.createElement('ul');
    this.tabs.appendChild(this.tabsHeader);
    this.panel.appendChild(this.tabs);

    if (webotsDocUrl) {
      var header = document.createElement('li');
      header.innerHTML = '<a href="#webotsHelpReference">Webots Reference Manual</a>';
      this.tabsHeader.appendChild(header);
      var page = document.createElement('div');
      page.id = 'webotsHelpReference';
      page.innerHTML = '<iframe src="' + webotsDocUrl + '"></iframe>';
      this.tabs.appendChild(page);
      $('#webotsHelpTabs').tabs();
    }

    var clampedSize = DialogWindow.clampDialogSize({left: 5, top: 5, width: 600, height: 600});
    this.params.width = clampedSize.width;
    this.params.height = clampedSize.height;
    this.params.close = () => { $('#helpButton').removeClass('toolBarButtonActive'); };
    this.params.position = {at: 'right-5 top+5', my: 'right top', of: this.parent};
    this.params.title = 'Help';

    $(this.panel).dialog(this.params).dialogExtend({maximizable: !mobile});

    var finalize = () => {
      $('#webotsHelpTabs').tabs('refresh');
      $('#webotsHelpTabs').tabs('option', 'active', 0);
      $(this.panel).dialog('open');
    };
    var currentUrl = DefaultUrl.currentScriptUrl();
    var query = '';
    if (webots.showRun)
      query = '?run=true';
    $.ajax({
      url: currentUrl + 'help.php' + query,
      success: (data) => {
        // Fix the img src relative URLs.
        var html = data.replace(/ src="images/g, ' src="' + currentUrl + '/images');
        var header = document.createElement('li');
        header.innerHTML = '<a href="#webotsHelpGuide">User Guide</a>';
        $(this.tabsHeader).prepend(header);
        var page = document.createElement('div');
        page.id = 'webotsHelpGuide';
        page.innerHTML = html;
        if (document.getElementById('webotsHelpReference'))
          $('#webotsHelpReference').before(page);
        else {
          this.tabs.appendChild(page);
          $('#webotsHelpTabs').tabs();
        }
        finalize();
      },
      error: finalize
    });
  }
}
/* global webots, DialogWindow */
'use strict';

class RobotWindow extends DialogWindow { // eslint-disable-line no-unused-vars
  constructor(parent, mobile, name) {
    super(parent, mobile);
    this.name = name;
    this.panel.id = name;
    this.panel.className = 'webotsTabContainer';

    var clampedSize = DialogWindow.clampDialogSize({left: 5, top: 5, width: 400, height: 400});
    this.params.width = clampedSize.width;
    this.params.height = clampedSize.height;
    this.params.close = null;
    this.params.position = {at: 'left+5 top+5', my: 'left top', of: this.parent};
    this.params.title = 'Robot Window';

    $(this.panel).dialog(this.params).dialogExtend({maximizable: !mobile});
  }

  setProperties(properties) {
    $(this.panel).dialog(properties);
  }

  geometry() {
    var webotsTabs = this.panel.getElementsByClassName('webotsTabs');
    var activeTabIndex = -1;
    if (webotsTabs.length > 0)
      activeTabIndex = $(webotsTabs[0]).tabs('option', 'active');
    return {
      width: $(this.panel).dialog('option', 'width'),
      height: $(this.panel).dialog('option', 'height'),
      position: $(this.panel).dialog('option', 'position'),
      activeTabIndex: activeTabIndex,
      open: this.isOpen()
    };
  }

  restoreGeometry(data) {
    $(this.panel).dialog({
      width: data.width,
      height: data.height,
      position: data.position
    });
    var webotsTabs = this.panel.getElementsByClassName('webotsTabs');
    if (data.activeTabIndex >= 0 && webotsTabs.length > 0)
      $(webotsTabs[0]).tabs('option', 'active', data.activeTabIndex);
  }

  destroy() {
    this.close();
    this.panel.parentNode.removeChild(this.panel);
    this.panel = null;
  }

  setContent(content) {
    $(this.panel).html(content);
  }

  open() {
    $(this.panel).dialog('open');
  }

  isOpen() {
    return $(this.panel).dialog('isOpen');
  }

  close() {
    $(this.panel).dialog('close');
  }

  send(message, robot) {
    webots.currentView.sendRobotMessage(message, robot);
  }

  receive(message, robot) { // to be overriden
    console.log("Robot window '" + this.name + "' received message from Robot '" + robot + "': " + message);
  }
}
/* global webots, DialogWindow, HelpWindow, DefaultUrl */

class Toolbar { // eslint-disable-line no-unused-vars
  constructor(parent, view) {
    this.view = view;

    this.domElement = document.createElement('div');
    this.domElement.id = 'toolBar';
    this.domElement.left = document.createElement('div');
    this.domElement.left.className = 'toolBarLeft';

    if (typeof webots.showQuit === 'undefined' || webots.showQuit) { // enabled by default
      this.domElement.left.appendChild(this.createToolBarButton('quit', 'Quit the simulation'));
      this.quitButton.onclick = () => { this.requestQuit(); };
    }

    this.domElement.left.appendChild(this.createToolBarButton('info', 'Open the information window'));
    this.infoButton.onclick = () => { this.toggleInfo(); };

    this.worldSelectionDiv = document.createElement('div');
    this.worldSelectionDiv.id = 'worldSelectionDiv';
    this.domElement.left.appendChild(this.worldSelectionDiv);

    if (webots.showRevert) { // disabled by default
      this.domElement.left.appendChild(this.createToolBarButton('revert', 'Save controllers and revert the simulation'));
      this.revertButton.addEventListener('click', () => { this.reset(true); });
    }

    this.domElement.left.appendChild(this.createToolBarButton('reset', 'Save controllers and reset the simulation'));
    this.resetButton.addEventListener('click', () => { this.reset(false); });

    this.domElement.left.appendChild(this.createToolBarButton('step', 'Perform one simulation step'));
    this.stepButton.onclick = () => { this.step(); };

    this.domElement.left.appendChild(this.createToolBarButton('real_time', 'Run the simulation in real time'));
    this.real_timeButton.onclick = () => { this.realTime(); };

    this.domElement.left.appendChild(this.createToolBarButton('pause', 'Pause the simulation'));
    this.pauseButton.onclick = () => { this.pause(); };
    this.pauseButton.style.display = 'none';

    if (webots.showRun) { // disabled by default
      this.domElement.left.appendChild(this.createToolBarButton('run', 'Run the simulation as fast as possible'));
      this.runButton.onclick = () => { this.run(); };
    }

    var div = document.createElement('div');
    div.className = 'webotsTime';
    var clock = document.createElement('span');
    clock.id = 'webotsClock';
    clock.title = 'Current simulation time';
    clock.innerHTML = webots.parseMillisecondsIntoReadableTime(0);
    div.appendChild(clock);
    var timeout = document.createElement('span');
    timeout.id = 'webotsTimeout';
    timeout.title = 'Simulation time out';
    timeout.innerHTML = webots.parseMillisecondsIntoReadableTime(this.view.timeout >= 0 ? this.view.timeout : 0);
    div.appendChild(document.createElement('br'));
    div.appendChild(timeout);
    this.domElement.left.appendChild(div);

    this.domElement.left.appendChild(this.createToolBarButton('console', 'Open the console window'));
    this.consoleButton.onclick = () => { this.toggleConsole(); };

    this.domElement.right = document.createElement('div');
    this.domElement.right.className = 'toolBarRight';
    this.domElement.right.appendChild(this.createToolBarButton('help', 'Get help on the simulator'));
    this.helpButton.onclick = () => { this.toggleHelp(); };

    if (this.view.fullscreenEnabled) {
      this.domElement.right.appendChild(this.createToolBarButton('exit_fullscreen', 'Exit fullscreen'));
      this.exit_fullscreenButton.onclick = () => { this.exitFullscreen(); };
      this.exit_fullscreenButton.style.display = 'none';
      this.domElement.right.appendChild(this.createToolBarButton('fullscreen', 'Enter fullscreen'));
      this.fullscreenButton.onclick = () => { this.requestFullscreen(); };
    }

    this.domElement.appendChild(this.domElement.left);
    this.domElement.appendChild(this.domElement.right);
    parent.appendChild(this.domElement);

    this.enableToolBarButtons(false);
    if (this.view.broadcast && this.quitButton) {
      this.quitButton.disabled = true;
      this.quitButton.classList.add('toolBarButtonDisabled');
      this.view.contextMenu.disableEdit();
    }

    document.addEventListener('fullscreenchange', () => { this.onFullscreenChange(); });
    document.addEventListener('webkitfullscreenchange', () => { this.onFullscreenChange(); });
    document.addEventListener('mozfullscreenchange', () => { this.onFullscreenChange(); });
    document.addEventListener('MSFullscreenChange', () => { this.onFullscreenChange(); });
  }

  toggleInfo() {
    this.view.contextMenu.hide();
    if (!this.view.infoWindow)
      return;
    if (this.view.infoWindow.isOpen()) {
      this.view.infoWindow.close();
      this.infoButton.classList.remove('toolBarButtonActive');
    } else {
      this.view.infoWindow.open();
      this.infoButton.classList.add('toolBarButtonActive');
    }
  }

  toggleConsole() {
    this.view.contextMenu.hide();
    if ($('#webotsConsole').is(':visible')) {
      $('#webotsConsole').dialog('close');
      this.consoleButton.classList.remove('toolBarButtonActive');
    } else {
      $('#webotsConsole').dialog('open');
      this.consoleButton.classList.add('toolBarButtonActive');
    }
  }

  toggleHelp() {
    this.view.contextMenu.hide();
    if (!this.view.helpWindow) {
      if (!this.view.broadcast && webots.webotsDocUrl)
        var webotsDocUrl = webots.webotsDocUrl;
      this.view.helpWindow = new HelpWindow(this.view.view3D, this.view.mobileDevice, webotsDocUrl);
      this.helpButton.classList.add('toolBarButtonActive');
    } else if ($('#webotsHelp').is(':visible')) {
      $('#webotsHelp').dialog('close');
      this.helpButton.classList.remove('toolBarButtonActive');
    } else {
      $('#webotsHelp').dialog('open');
      this.helpButton.classList.add('toolBarButtonActive');
    }
  }

  exitFullscreen() {
    this.view.contextMenu.hide();
    if (document.exitFullscreen)
      document.exitFullscreen();
    else if (document.msExitFullscreen)
      document.msExitFullscreen();
    else if (document.mozCancelFullScreen)
      document.mozCancelFullScreen();
    else if (document.webkitExitFullscreen)
      document.webkitExitFullscreen();
  }

  requestFullscreen() {
    this.view.contextMenu.hide();
    var elem = this.view.view3D;
    if (elem.requestFullscreen)
      elem.requestFullscreen();
    else if (elem.msRequestFullscreen)
      elem.msRequestFullscreen();
    else if (elem.mozRequestFullScreen)
      elem.mozRequestFullScreen();
    else if (elem.webkitRequestFullscreen)
      elem.webkitRequestFullscreen();
  }

  onFullscreenChange(event) {
    var element = document.fullScreenElement || document.mozFullScreenElement || document.webkitFullScreenElement || document.msFullScreenElement || document.webkitCurrentFullScreenElement;
    if (element != null) {
      this.fullscreenButton.style.display = 'none';
      this.exit_fullscreenButton.style.display = 'inline';
    } else {
      this.fullscreenButton.style.display = 'inline';
      this.exit_fullscreenButton.style.display = 'none';
    }
  }

  requestQuit() {
    if (this.view.editor.hasUnsavedChanges()) {
      var text;
      if (this.view.editor.unloggedFileModified || typeof webots.User1Id === 'undefined' || webots.User1Id === '')
        text = 'Your changes to the robot controller will be lost because you are not logged in.';
      else
        text = 'Your unsaved changes to the robot controller will be lost.';
      var quitDialog = document.getElementById('quitDialog');
      if (!quitDialog) {
        quitDialog = document.createElement('div');
        quitDialog.id = 'quitDialog';
        $(quitDialog).html(text);
        this.view.view3D.appendChild(quitDialog);
        $(quitDialog).dialog({
          title: 'Quit the simulation?',
          modal: true,
          resizable: false,
          appendTo: this.view.view3D,
          open: () => { DialogWindow.openDialog(quitDialog); },
          buttons: {
            'Cancel': () => {
              $(quitDialog).dialog('close');
            },
            'Quit': () => {
              $(quitDialog).dialog('close');
              this.view.quitSimulation();
            }
          }
        });
      } else
        $(quitDialog).dialog('open');
      return;
    }
    this.view.quitSimulation();
  }

  reset(revert = false) {
    if (this.view.broadcast)
      return;
    this.time = 0; // reset time to correctly compute the initial deadline
    if (revert)
      $('#webotsProgressMessage').html('Reverting simulation...');
    else
      $('#webotsProgressMessage').html('Restarting simulation...');
    $('#webotsProgress').show();
    this.runOnLoad = this.pauseButton.style.display === 'inline';
    this.pause();
    for (let i in this.view.editor.filenames) {
      this.view.editor.save(i);
      if (this.view.editor.needToUploadFiles[i])
        this.view.editor.upload(i);
    }
    this.view.onrobotwindowsdestroy();
    if (this.view.timeout >= 0) {
      this.view.deadline = this.view.timeout;
      $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(this.view.timeout));
    } else
      $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(0));
    this.enableToolBarButtons(false);
    if (revert)
      this.view.stream.socket.send('revert');
    else
      this.view.stream.socket.send('reset');
  }

  isPaused() {
    return this.real_timeButton.style.display === 'inline';
  }

  pause() {
    if (this.view.broadcast)
      return;
    this.view.contextMenu.hide();
    this.view.stream.socket.send('pause');
  }

  realTime() {
    if (this.view.broadcast)
      return;
    this.view.contextMenu.hide();
    this.view.stream.socket.send('real-time:' + this.view.timeout);
    this.pauseButton.style.display = 'inline';
    this.real_timeButton.style.display = 'none';
    if (typeof this.runButton !== 'undefined')
      this.runButton.style.display = 'inline';
  }

  run() {
    if (this.view.broadcast)
      return;
    this.view.contextMenu.hide();
    this.view.stream.socket.send('fast:' + this.view.timeout);
    this.pauseButton.style.display = 'inline';
    this.real_timeButton.style.display = 'inline';
    this.runButton.style.display = 'none';
  }

  step() {
    if (this.view.broadcast)
      return;
    this.view.contextMenu.hide();
    this.pauseButton.style.display = 'none';
    this.real_timeButton.style.display = 'inline';
    if (typeof this.runButton !== 'undefined')
      this.runButton.style.display = 'inline';
    this.view.stream.socket.send('step');
  }

  enableToolBarButtons(enabled) {
    var buttons = [this.infoButton, this.revertButton, this.resetButton, this.stepButton, this.real_timeButton, this.runButton, this.pauseButton, this.consoleButton, this.worldSelect];
    for (let i in buttons) {
      if (buttons[i]) {
        if (enabled && (!this.view.broadcast || buttons[i] === this.consoleButton)) {
          buttons[i].disabled = false;
          buttons[i].classList.remove('toolBarButtonDisabled');
        } else {
          buttons[i].disabled = true;
          buttons[i].classList.add('toolBarButtonDisabled');
        }
      }
    }
  }

  createToolBarButton(name, tooltip) {
    var buttonName = name + 'Button';
    this[buttonName] = document.createElement('button');
    this[buttonName].id = buttonName;
    this[buttonName].className = 'toolBarButton';
    this[buttonName].title = tooltip;
    this[buttonName].style.backgroundImage = 'url(' + DefaultUrl.wwiImagesUrl() + name + '.png)';
    return this[buttonName];
  }

  setMode(mode) {
    var runEnabled = typeof this.runButton !== 'undefined';
    if (mode === 'pause') {
      this.pauseButton.style.display = 'none';
      this.real_timeButton.style.display = 'inline';
      if (runEnabled)
        this.runButton.style.display = 'inline';
      return;
    }

    this.pauseButton.style.display = 'inline';
    if (runEnabled && (mode === 'run' || mode === 'fast')) {
      this.runButton.style.display = 'none';
      this.real_timeButton.style.display = 'inline';
    } else {
      if (runEnabled)
        this.runButton.style.display = 'inline';
      this.real_timeButton.style.display = 'none';
    }
  }
}
/* global ace, webots, DialogWindow, DefaultUrl, SystemInfo */
'use strict';

class Editor extends DialogWindow { // eslint-disable-line no-unused-vars
  constructor(parent, mobile, view) {
    super(parent, mobile);

    this.panel.id = 'webotsEditor';
    this.panel.className = 'webotsTabContainer';

    this.view = view;
    this.filenames = [];
    this.needToUploadFiles = [];
    this.sessions = [];

    var edit = document.createElement('div');
    edit.id = 'webotsEditorTab';
    edit.className = 'webotsTab';
    this.editor = ace.edit(edit);
    this.sessions[0] = this.editor.getSession();
    this.currentSession = 0;

    this.tabs = document.createElement('div');
    this.tabs.id = 'webotsEditorTabs';
    this.tabs.className = 'webotsTabs';
    this.tabsHeader = document.createElement('ul');
    this.tabs.appendChild(this.tabsHeader);
    this.tabs.appendChild(edit);
    $(this.tabs).tabs({
      activate: (event, ui) => {
        this.currentSession = parseInt(ui.newTab.attr('id').substr(5)); // skip 'file-'
        this.editor.setSession(this.sessions[this.currentSession]);
      }
    });
    this.panel.appendChild(this.tabs);

    this.menu = document.createElement('div');
    this.menu.id = 'webotsEditorMenu';
    var saveShortcut;
    if (SystemInfo.isMacOS())
      saveShortcut = 'Cmd-S';
    else
      saveShortcut = 'Ctrl-S';
    this.menu.innerHTML = '<input type="image" id="webotsEditorMenuImage" width="17px" src="' + DefaultUrl.wwiImagesUrl() + 'menu.png">' +
                          '<div id="webotsEditorMenuContent">' +
                          '<div id="webotsEditorSaveAction" class="webotsEditorMenuContentItem" title="Save current file">Save<span style="float:right"><i><small>' + saveShortcut + '</small></i></span></div>' +
                          '<div id="webotsEditorSaveAllAction" class="webotsEditorMenuContentItem" title="Save all the files">Save All</div>' +
                          '<div id="webotsEditorResetAction" class="webotsEditorMenuContentItem" title="Reset current file to the original version">Reset</div>' +
                          '<div id="webotsEditorResetAllAction" class="webotsEditorMenuContentItem" title="Reset all the files to the original version">Reset All</div>' +
                          '</div>';
    this.panel.appendChild(this.menu);

    var clampedSize = DialogWindow.clampDialogSize({left: 0, top: 0, width: 800, height: 600});
    this.params.width = clampedSize.width;
    this.params.height = clampedSize.height;
    this.params.close = null;
    this.params.resize = () => { this._resize(); };
    this.params.open = () => { DialogWindow.resizeDialogOnOpen(this.panel); };
    this.params.title = 'Editor';

    $(this.panel).dialog(this.params).dialogExtend({maximizable: !mobile});

    this.editor.commands.addCommand({
      name: 'save',
      bindKey: {win: 'Ctrl-S', mac: 'Cmd-S'},
      exec: (editor) => { this.save(this.currentSession); }
    });
    $('#webotsEditorSaveAction').click(() => {
      this.save(this.currentSession);
      this._hideMenu();
    });
    $('#webotsEditorSaveAllAction').click(() => {
      for (let i in this.filenames)
        this.save(i);
      this._hideMenu();
    });
    $('#webotsEditorResetAction').click(() => {
      this._openResetConfirmDialog(false);
    });
    $('#webotsEditorResetAllAction').click(() => {
      this._openResetConfirmDialog(true);
    });
    $('#webotsEditorMenuImage').click(() => {
      if ($('#webotsEditorMenu').hasClass('pressed'))
        $('#webotsEditorMenu').removeClass('pressed');
      else
        $('#webotsEditorMenu').addClass('pressed');
    });
    $('#webotsEditorMenu').focusout(() => {
      // Let the time to handle the menu actions if needed.
      window.setTimeout(() => {
        if ($('.webotsEditorMenuContentItem:hover').length > 0)
          return;
        if ($('#webotsEditorMenu').hasClass('pressed'))
          $('#webotsEditorMenu').removeClass('pressed');
      }, 100);
    });
  }

  hasUnsavedChanges() {
    if (this.unloggedFileModified)
      return true;
    for (let i in this.filenames) {
      if ($('#filename-' + i).html().endsWith('*'))
        return true;
    }
    return false;
  }

  // Upload file to the simulation server.
  upload(i) {
    this.view.stream.socket.send('set controller:' +
      this.dirname + '/' +
      this.filenames[i] + ':' +
      this.sessions[i].getLength() + '\n' +
      this.sessions[i].getValue());
    this.needToUploadFiles[i] = false;
  }

  // Save file to the web site.
  save(i) {
    if ($('#filename-' + i).html().endsWith('*')) { // file was modified
      $('#filename-' + i).html(this.filenames[i]);
      this.needToUploadFiles[i] = true;
      if ((typeof webots.User1Id !== 'undefined' || webots.User1Id !== '') && webots.User1Authentication) // user logged in
        this._storeUserFile(i);
      else
        this.unloggedFileModified = true;

      if (this.view.time === 0)
        this.upload(i);
      else {
        if (typeof this.statusMessage === 'undefined') {
          this.statusMessage = document.createElement('div');
          this.statusMessage.id = 'webotsEditorStatusMessage';
          this.statusMessage.className = 'webotsEditorStatusMessage';
          this.statusMessage.innerHTML = '<font size="2">Reset the simulation to apply the changes.</font>';
        }
        this.panel.appendChild(this.statusMessage);
        setTimeout(() => { $('#webotsEditorStatusMessage').remove(); }, 1500);
      }
    }
  }

  addFile(filename, content) {
    var index = this.filenames.indexOf(filename);
    if (index >= 0) {
      this.needToUploadFiles[index] = false; // just received from the simulation server
      this.sessions[index].setValue(content);
      if ($('#filename-' + index).html().endsWith('*'))
        $('#filename-' + index).html(filename);
      if (webots.User1Authentication && (typeof webots.User1Id !== 'undefined' || webots.User1Id !== ''))
        this.storeUserFile(index);
      return;
    }

    index = this.filenames.length;
    this.filenames.push(filename);
    this.needToUploadFiles[index] = false;
    if (index === 0) {
      this.sessions[index].setMode(this._aceMode(filename));
      this.sessions[index].setValue(content);
      $('#webotsEditorMenu').show();
      $('#webotsEditorTabs').show();
    } else
      this.sessions.push(ace.createEditSession(content, this._aceMode(filename)));
    this.sessions[index].on('change', (e) => { this._textChange(index); });
    $('div#webotsEditorTabs ul').append('<li id="file-' + index + '"><a href="#webotsEditorTab" id="filename-' + index + '">' + filename + '</a></li>');
    $('div#webotsEditorTabs').tabs('refresh');
    if (index === 0)
      $('div#webotsEditorTabs').tabs('option', 'active', index);
  }

  closeAllTabs() {
    this.editor.setSession(ace.createEditSession('', ''));
    this.filenames = [];
    this.needToUploadFiles = [];
    this.sessions = [];
    this.sessions[0] = this.editor.getSession();
    this.currentSession = 0;
    $('div#webotsEditorTabs ul').empty();
    $('#webotsEditorMenu').hide();
    $('#webotsEditorTabs').hide();
  }

  // private functions
  _resize() {
    var padding = $('#webotsEditorTab').outerHeight() - $('#webotsEditorTab').height();
    $('#webotsEditorTab').height(this.tabs.clientHeight - this.tabsHeader.scrollHeight - padding);
    this.editor.resize();
  }

  _hideMenu() {
    if ($('#webotsEditorMenu').hasClass('pressed'))
      $('#webotsEditorMenu').removeClass('pressed');
  }

  _openResetConfirmDialog(allFiles) {
    this.resetAllFiles = allFiles;
    var titleText, message;
    message = 'Permanently reset ';
    if (allFiles) {
      message += 'all the files';
      titleText = 'Reset files?';
    } else {
      message += 'this file';
      titleText = 'Reset file?';
    }
    message += ' to the original version?';
    message += '<br/><br/>Your modifications will be lost.';
    var confirmDialog = document.createElement('div');
    this.panel.appendChild(confirmDialog);
    $(confirmDialog).html(message);
    $(confirmDialog).dialog({
      title: titleText,
      modal: true,
      autoOpen: true,
      resizable: false,
      dialogClass: 'alert',
      open: () => { DialogWindow.openDialog(confirmDialog); },
      appendTo: this.parent,
      buttons: {
        'Cancel': () => {
          $(confirmDialog).dialog('close');
          $('#webotsEditorConfirmDialog').remove();
        },
        'Reset': () => {
          $(confirmDialog).dialog('close');
          $('#webotsEditorConfirmDialog').remove();
          if (this.resetAllFiles) {
            this.filenames.forEach((filename) => {
              this.view.server.resetController(this.dirname + '/' + filename);
            });
          } else
            this.view.server.resetController(this.dirname + '/' + this.filenames[this.currentSession]);
        }
      }
    });
    this._hideMenu();
  }

  _textChange(index) {
    if (!$('#filename-' + index).html().endsWith('*') && this.editor.curOp && this.editor.curOp.command.name) { // user change
      $('#filename-' + index).html(this.filenames[index] + '*');
    }
  }

  _aceMode(filename) {
    if (filename.toLowerCase() === 'makefile')
      return 'ace/mode/makefile';
    var extension = filename.split('.').pop().toLowerCase();
    if (extension === 'py')
      return 'ace/mode/python';
    if (extension === 'c' || extension === 'cpp' || extension === 'c++' || extension === 'cxx' || extension === 'cc' ||
        extension === 'h' || extension === 'hpp' || extension === 'h++' || extension === 'hxx' || extension === 'hh')
      return 'ace/mode/c_cpp';
    if (extension === 'java')
      return 'ace/mode/java';
    if (extension === 'm')
      return 'ace/mode/matlab';
    if (extension === 'json')
      return 'ace/mode/json';
    if (extension === 'xml')
      return 'ace/mode/xml';
    if (extension === 'yaml')
      return 'ace/mode/yaml';
    if (extension === 'ini')
      return 'ace/mode/ini';
    if (extension === 'html')
      return 'ace/mode/html';
    if (extension === 'js')
      return 'ace/mode/javascript';
    if (extension === 'css')
      return 'ace/mode/css';
    return 'ace/mode/text';
  }

  _storeUserFile(i) {
    var formData = new FormData();
    formData.append('dirname', this.view.server.project + '/controllers/' + this.dirname);
    formData.append('filename', this.filenames[i]);
    formData.append('content', this.sessions[i].getValue());
    $.ajax({
      url: '/ajax/upload-file.php',
      type: 'POST',
      data: formData,
      processData: false,
      contentType: false,
      success: (data) => {
        if (data !== 'OK')
          this.alert('File saving error', data);
      }
    });
  }
}
'use strict';

class ContextMenu { // eslint-disable-line no-unused-vars
  constructor(authenticatedUser, parentObject, selection) {
    this.object = null;
    this.visible = false;
    this.authenticatedUser = authenticatedUser;

    // Callbacks
    this.onFollowObject = null;
    this.onEditController = null;
    this.onOpenRobotWindow = null;
    this.isFollowedObject = null;
    this.isRobotWindowValid = null;

    // Create context menu.
    var domElement = document.createElement('ul');
    domElement.id = 'contextMenu';
    domElement.innerHTML = "<li class='ui-widget-header'><div id='contextMenuTitle'>Object</div></li>" +
                           "<li id='contextMenuFollow'><div>Follow</div></li>" +
                           "<li id='contextMenuUnfollow'><div>Unfollow</div></li>" +
                           "<li><div class='ui-state-disabled'>Zoom</div></li>" +
                           '<hr>' +
                           "<li id='contextMenuRobotWindow'><div id='contextMenuRobotWindowDiv'>Robot window</div></li>" +
                           "<li id='contextMenuEditController'><div id='contextMenuEditControllerDiv'>Edit controller</div></li>" +
                           "<li><div class='ui-state-disabled'>Delete</div></li>" +
                           "<li><div class='ui-state-disabled'>Properties</div></li>" +
                           '<hr>' +
                           "<li id='contextMenuHelp'><div id='contextMenuHelpDiv' class='ui-state-disabled'>Help...</div></li>";
    $(parentObject).append(domElement);
    $('#contextMenu').menu({items: '> :not(.ui-widget-header)'});
    $('#contextMenu').css('position', 'absolute');
    $('#contextMenu').css('z-index', 1);
    $('#contextMenu').css('display', 'none');

    $('#contextMenu').on('menuselect', (event, ui) => {
      if (ui.item.children().hasClass('ui-state-disabled'))
        return;
      var id = ui.item.attr('id');
      if (id === 'contextMenuFollow') {
        if (typeof this.onFollowObject === 'function')
          this.onFollowObject(this.object.name);
      } else if (id === 'contextMenuUnfollow') {
        if (typeof this.onFollowObject === 'function')
          this.onFollowObject('none');
      } else if (id === 'contextMenuEditController') {
        var controller = this.object.userData.controller;
        $('#webotsEditor').dialog('open');
        $('#webotsEditor').dialog('option', 'title', 'Controller: ' + controller);
        if (typeof this.onEditController === 'function')
          this.onEditController(controller);
      } else if (id === 'contextMenuRobotWindow') {
        var robotName = this.object.userData.name;
        if (typeof this.onOpenRobotWindow === 'function')
          this.onOpenRobotWindow(robotName);
      } else if (id === 'contextMenuHelp')
        window.open(this.object.userData.docUrl, '_blank');
      else
        console.log('Unknown menu item: ' + id);
      $('#contextMenu').css('display', 'none');
    });
  }

  disableEdit() {
    $('#contextMenuRobotWindowDiv').addClass('ui-state-disabled');
    $('#contextMenuEditControllerDiv').addClass('ui-state-disabled');
  }

  toggle() {
    var visible = this.visible;
    if (visible)
      this.hide();
    return visible;
  }

  hide() {
    $('#contextMenu').css('display', 'none');
    this.visible = false;
  }

  show(object, position) {
    this.object = object;
    if (typeof object === 'undefined')
      return;

    var title = object.userData.name;
    if (title == null || title === '')
      title = 'Object';

    $('#contextMenuTitle').html(title);
    var controller = object.userData.controller;
    if (controller && controller !== '') { // the current selection is a robot
      $('#contextMenuEditController').css('display', 'inline');
      if (controller === 'void' || controller.length === 0 || !this.authenticatedUser)
        $('#contextMenuEditController').children().addClass('ui-state-disabled');
      var robotName = object.userData.name;
      var isValid = false;
      if (typeof this.isRobotWindowValid === 'function')
        this.isRobotWindowValid(robotName, (result) => { isValid = result; });
      if (isValid)
        $('#contextMenuRobotWindow').css('display', 'inline');
      else
        $('#contextMenuRobotWindow').css('display', 'none');
    } else {
      $('#contextMenuEditController').css('display', 'none');
      $('#contextMenuRobotWindow').css('display', 'none');
    }

    var isFollowed = false;
    if (typeof this.isFollowedObject === 'function')
      this.isFollowedObject(object, (result) => { isFollowed = result; });
    if (isFollowed) {
      $('#contextMenuFollow').css('display', 'none');
      $('#contextMenuUnfollow').css('display', 'inline');
    } else {
      $('#contextMenuFollow').css('display', 'inline');
      $('#contextMenuUnfollow').css('display', 'none');
    }

    if (this.object.userData.docUrl)
      $('#contextMenuHelpDiv').removeClass('ui-state-disabled');
    else
      $('#contextMenuHelpDiv').addClass('ui-state-disabled');

    // Ensure that the context menu is completely visible.
    var w = $('#contextMenu').width();
    var h = $('#contextMenu').height();
    var maxWidth = $('#playerDiv').width();
    var maxHeight = $('#playerDiv').height();
    var left;
    var top;
    if (maxWidth != null && (w + position.x) > maxWidth)
      left = maxWidth - w;
    else
      left = position.x;
    if (maxHeight != null && (h + position.y) > maxHeight)
      top = maxHeight - h - $('#toolBar').height();
    else
      top = position.y;
    $('#contextMenu').css('left', left + 'px');
    $('#contextMenu').css('top', top + 'px');
    $('#contextMenu').css('display', 'block');
    this.visible = true;
  }
}
/* global THREE */
'use strict';

class Viewpoint { // eslint-disable-line no-unused-vars
  constructor() {
    this.onCameraParametersChanged = null;
    // After initialization 'followedObjectId' contains the id ('n<id>') of the followed node
    // or 'none' if no object is followed.
    this.followedObjectId = null;
    // If the followed object has moved since the last time we updated the viewpoint position, this field will contain a
    // vector with the translation applied to the object.
    this.followedObjectDeltaPosition = null;
    this.viewpointMass = 1.0; // Mass of the viewpoint used during the object following algorithm.
    this.viewpointFriction = 0.05; // Friction applied to the viewpoint whenever it is going faster than the followed object.
    this.viewpointForce = null; // Vector with the force that will be applied to the viewpoint for the next delta T.
    this.viewpointVelocity = null; // Current velocity of the viewpoint.
    this.viewpointLastUpdate = undefined; // Last time we updated the position of the viewpoint.

    // Initialize default camera.
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.001, 400);
    this.camera.position.x = 10;
    this.camera.position.y = 10;
    this.camera.position.z = 10;
  }

  reset(time) {
    this.camera.position.copy(this.initialViewpointPosition);
    this.camera.quaternion.copy(this.initialViewpointOrientation);
    this.updateViewpointPosition(true, time);
    this.notifyCameraParametersChanged();
  }

  isFollowedObject(object) {
    return this.followedObjectId &&
           (object.name === this.followedObjectId || object.userData.name === this.followedObjectId);
  }

  resetFollow() {
    this.followedObjectId = null;
  }

  initFollowParameters() {
    this.initialViewpointPosition = this.camera.position.clone();
    this.initialViewpointOrientation = this.camera.quaternion.clone();
    if (this.camera.userData.followSmoothness != null)
      this.setViewpointMass(this.camera.userData.followSmoothness);
    if (this.camera.userData.followedId != null)
      this.follow(this.camera.userData.followedId);
    else
      this.follow.followedObjectId = 'none';
  }

  follow(objectId) {
    this.followedObjectId = objectId;
    this.viewpointForce = new THREE.Vector3(0.0, 0.0, 0.0);
    this.viewpointVelocity = new THREE.Vector3(0.0, 0.0, 0.0);
  }

  setViewpointMass(mass) {
    this.viewpointMass = mass;
    if (this.viewpointMass <= 0.05)
      this.viewpointMass = 0.0;
    else {
      if (this.viewpointMass > 1.0)
        this.viewpointMass = 1.0;
      this.friction = 0.05 / this.viewpointMass;
    }
  }

  setFollowedObjectDeltaPosition(newPosition, previousPosition) {
    this.followedObjectDeltaPosition = new THREE.Vector3();
    this.followedObjectDeltaPosition.subVectors(newPosition, previousPosition);
  }

  updateViewpointPosition(forcePosition, time) {
    if (this.followedObjectId == null || this.followedObjectId === 'none' || typeof time === 'undefined')
      return false;
    if (typeof this.viewpointLastUpdate === 'undefined')
      this.viewpointLastUpdate = time;

    var timeInterval = Math.abs(time - this.viewpointLastUpdate) / 1000;

    if (timeInterval > 0 && this.camera) {
      this.viewpointLastUpdate = time;
      var viewpointDeltaPosition = null;
      if (this.followedObjectDeltaPosition != null)
        this.viewpointForce.add(this.followedObjectDeltaPosition);

      // Special case: if the mass is 0 we simply move the viewpoint to its equilibrium position.
      // If timeInterval is too large (longer than 1/10 of a second), the progression won't be smooth either way,
      // so in this case we simply move the viewpoint to the equilibrium position as well.
      if (forcePosition || this.viewpointMass === 0 || (timeInterval > 0.1 && this.animation == null)) {
        viewpointDeltaPosition = this.viewpointForce.clone();
        this.viewpointVelocity = new THREE.Vector3(0.0, 0.0, 0.0);
      } else {
        var acceleration = this.viewpointForce.clone();
        acceleration.multiplyScalar(timeInterval / this.viewpointMass);
        this.viewpointVelocity.add(acceleration);
        var scalarVelocity = this.viewpointVelocity.length();

        // Velocity of the object projected onto the velocity of the viewpoint.
        var scalarObjectVelocityProjection;
        if (this.followedObjectDeltaPosition != null) {
          var objectVelocity = this.followedObjectDeltaPosition.clone();
          objectVelocity.divideScalar(timeInterval);
          scalarObjectVelocityProjection = objectVelocity.dot(this.viewpointVelocity) / scalarVelocity;
        } else
          scalarObjectVelocityProjection = 0;

        // The viewpoint is going "faster" than the object, to prevent oscillations we apply a slowing force.
        if (this.viewpointFriction > 0 && scalarVelocity > scalarObjectVelocityProjection) {
          // We apply a friction based on the extra velocity.
          var velocityFactor = (scalarVelocity - (scalarVelocity - scalarObjectVelocityProjection) * this.viewpointFriction) / scalarVelocity;
          this.viewpointVelocity.multiplyScalar(velocityFactor);
        }
        viewpointDeltaPosition = this.viewpointVelocity.clone();
        viewpointDeltaPosition.multiplyScalar(timeInterval);
      }
      this.viewpointForce.sub(viewpointDeltaPosition);
      this.camera.position.add(viewpointDeltaPosition);
      this.followedObjectDeltaPosition = null;
      return true;
    }

    return false;
  }

  rotate(params) {
    var yawAngle = -0.005 * params.dx;
    var pitchAngle = -0.005 * params.dy;
    if (params.pickPosition == null) {
      yawAngle /= -8;
      pitchAngle /= -8;
    }
    var voMatrix = new THREE.Matrix4();
    var pitch = new THREE.Vector3();
    var yaw = new THREE.Vector3();
    voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(pitch, yaw, new THREE.Vector3());
    var pitchRotation = new THREE.Quaternion();
    pitchRotation.setFromAxisAngle(pitch, pitchAngle * 2);
    var worldYawRotation = new THREE.Quaternion();
    worldYawRotation.setFromAxisAngle(new THREE.Vector3(0, 1, 0), yawAngle * 2); // axis: world up
    var deltaRotation = worldYawRotation.multiply(pitchRotation);
    if (params.pickPosition)
      this.camera.position.sub(params.pickPosition).applyQuaternion(deltaRotation).add(params.pickPosition);
    this.camera.quaternion.premultiply(deltaRotation);

    this.notifyCameraParametersChanged();
  }

  translate(params) {
    var voMatrix = new THREE.Matrix4();
    var pitch = new THREE.Vector3();
    var yaw = new THREE.Vector3();
    voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(pitch, yaw, new THREE.Vector3());
    var targetRight = -params.scaleFactor * params.dx;
    var targetUp = params.scaleFactor * params.dy;
    this.camera.position.addVectors(params.initialCameraPosition, pitch.multiplyScalar(targetRight).add(yaw.multiplyScalar(targetUp)));

    this.notifyCameraParametersChanged();
  }

  zoomAndTilt(params) {
    var voMatrix = new THREE.Matrix4();
    var roll = new THREE.Vector3();
    voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(new THREE.Vector3(), new THREE.Vector3(), roll);

    this.camera.position.add(roll.clone().multiplyScalar(params.zoomScale));

    var zRotation = new THREE.Quaternion();
    zRotation.setFromAxisAngle(roll, params.tiltAngle);
    this.camera.quaternion.premultiply(zRotation);

    this.notifyCameraParametersChanged();
  }

  zoom(distance, deltaY) {
    var scaleFactor = 0.02 * distance * ((deltaY < 0) ? -1 : 1);
    var voMatrix = new THREE.Matrix4();
    var roll = new THREE.Vector3();
    voMatrix.makeRotationFromQuaternion(this.camera.quaternion).extractBasis(new THREE.Vector3(), new THREE.Vector3(), roll);

    this.camera.position.add(roll.multiplyScalar(scaleFactor));
    this.notifyCameraParametersChanged();
  }

  notifyCameraParametersChanged(updateScene = true) {
    if (typeof this.onCameraParametersChanged === 'function')
      this.onCameraParametersChanged(updateScene);
  }
}
'use strict';

class Selector { // eslint-disable-line no-unused-vars
  constructor() {
    this.selectedObject = null;
    this.selectedRepresentations = [];
    this.onSelectionChange = null;
  }

  select(object) {
    if (this.selectedObject === object)
      return;

    this.clearSelection();

    if (!object) {
      if (typeof this.onSelectionChange === 'function')
        this.onSelectionChange();
      return;
    }

    var children = [object];
    while (children.length > 0) {
      var child = children.pop();
      if (child.userData && child.userData.x3dType === 'Switch') {
        child.visible = true;
        this.selectedRepresentations.push(child);
      }
      if (child.children)
        children = children.concat(child.children);
    }
    if (this.selectedRepresentations.length > 0)
      this.selectedObject = object;
    if (typeof this.onSelectionChange === 'function')
      this.onSelectionChange();
  }

  clearSelection() {
    this.selectedRepresentations.forEach((representation) => {
      representation.visible = false;
    });
    this.selectedRepresentations = [];
    this.selectedObject = null;
  }
}
/* global webots, THREE, SystemInfo */
'use strict';

class MouseEvents { // eslint-disable-line no-unused-vars
  constructor(scene, contextMenu, domElement, mobileDevice) {
    this.scene = scene;
    this.contextMenu = contextMenu;
    this.domElement = domElement;
    this.mobileDevice = mobileDevice;

    this.state = {
      'initialized': false,
      'mouseDown': 0,
      'moved': false,
      'wheelFocus': false,
      'wheelTimeout': null,
      'hiddenContextMenu': false
    };
    this.moveParams = {};
    this.enableNavigation = true;

    this.onmousemove = (event) => { this._onMouseMove(event); };
    this.onmouseup = (event) => { this._onMouseUp(event); };
    this.ontouchmove = (event) => { this._onTouchMove(event); };
    this.ontouchend = (event) => { this._onTouchEnd(event); };
    domElement.addEventListener('mousedown', (event) => { this._onMouseDown(event); }, false);
    domElement.addEventListener('mouseover', (event) => { this._onMouseOver(event); }, false);
    domElement.addEventListener('mouseleave', (event) => { this._onMouseLeave(event); }, false);
    domElement.addEventListener('wheel', (event) => { this._onMouseWheel(event); }, false);
    domElement.addEventListener('touchstart', (event) => { this._onTouchStart(event); }, true);
    domElement.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);

    // Prevent '#playerDiv' to raise the context menu of the browser.
    // This bug has been seen on Windows 10 / Firefox only.
    domElement.parentNode.addEventListener('contextmenu', (event) => { event.preventDefault(); }, false);
  }

  _onMouseDown(event) {
    this.state.wheelFocus = true;
    this._initMouseMove(event);

    switch (event.button) {
      case THREE.MOUSE.LEFT:
        this.state.mouseDown |= 1;
        break;
      case THREE.MOUSE.MIDDLE:
        this.state.mouseDown |= 4;
        break;
      case THREE.MOUSE.RIGHT:
        this.state.mouseDown |= 2;
        break;
    }
    if (SystemInfo.isMacOS() && 'ctrlKey' in event && event['ctrlKey'] && this.state.mouseDown === 1)
      // On macOS, "Ctrl + left click" should be dealt as a right click.
      this.state.mouseDown = 2;

    if (this.state.mouseDown !== 0) {
      this._setupMoveParameters(event);
      this.state.initialX = event.clientX;
      this.state.initialY = event.clientY;
      document.addEventListener('mousemove', this.onmousemove, false);
      document.addEventListener('mouseup', this.onmouseup, false);
    }

    if (typeof webots.currentView.onmousedown === 'function')
      webots.currentView.onmousedown(event);
  }

  _onMouseMove(event) {
    if (!this.enableNavigation && event.button === 0) {
      if (typeof webots.currentView.onmousemove === 'function')
        webots.currentView.onmousemove(event);
      return;
    }

    if (typeof this.state.x === 'undefined')
      // mousedown event has not been called yet.
      // This could happen for example when another application has focus while loading the scene.
      return;
    if ('buttons' in event)
      this.state.mouseDown = event.buttons;
    else if ('which' in event) { // Safari only
      switch (event.which) {
        case 0: this.state.mouseDown = 0; break;
        case 1: this.state.mouseDown = 1; break;
        case 2: this.state.pressedButton = 4; break;
        case 3: this.state.pressedButton = 2; break;
        default: this.state.pressedButton = 0; break;
      }
    }
    if (SystemInfo.isMacOS() && 'ctrlKey' in event && event['ctrlKey'] && this.state.mouseDown === 1)
      // On macOS, "Ctrl + left click" should be dealt as a right click.
      this.state.mouseDown = 2;

    if (this.state.mouseDown === 0)
      return;

    if (this.state.initialTimeStamp === null)
      // Prevent applying mouse move action before drag initialization in mousedrag event.
      return;

    this.moveParams.dx = event.clientX - this.state.x;
    this.moveParams.dy = event.clientY - this.state.y;

    if (this.state.mouseDown === 1) { // left mouse button to rotate viewpoint
      this.scene.viewpoint.rotate(this.moveParams);
    } else {
      if (this.state.mouseDown === 2) { // right mouse button to translate viewpoint
        this.moveParams.dx = event.clientX - this.state.initialX;
        this.moveParams.dy = event.clientY - this.state.initialY;
        this.scene.viewpoint.translate(this.moveParams);
      } else if (this.state.mouseDown === 3 || this.state.mouseDown === 4) { // both left and right button or middle button to zoom
        this.moveParams.tiltAngle = 0.01 * this.moveParams.dx;
        this.moveParams.zoomScale = this.moveParams.scaleFactor * 5 * this.moveParams.dy;
        this.scene.viewpoint.zoomAndTilt(this.moveParams, true);
      }
    }
    this.state.moved = event.clientX !== this.state.x || event.clientY !== this.state.y;
    this.state.x = event.clientX;
    this.state.y = event.clientY;

    if (typeof webots.currentView.onmousemove === 'function')
      webots.currentView.onmousemove(event);
    if (typeof webots.currentView.onmousedrag === 'function')
      webots.currentView.onmousedrag(event);
  }

  _onMouseUp(event) {
    this._clearMouseMove();
    this._selectAndHandleClick();

    document.removeEventListener('mousemove', this.onmousemove, false);
    document.removeEventListener('mouseup', this.onmouseup, false);

    if (typeof webots.currentView.onmouseup === 'function')
      webots.currentView.onmouseup(event);
  }

  _onMouseWheel(event) {
    event.preventDefault(); // do not scroll page
    if (!('initialCameraPosition' in this.moveParams))
      this._setupMoveParameters(event);
    // else another drag event is already active

    if (!this.enableNavigation || this.state.wheelFocus === false) {
      var offset = event.deltaY;
      if (event.deltaMode === 1)
        offset *= 40; // standard line height in pixel
      window.scroll(0, window.pageYOffset + offset);
      if (this.state.wheelTimeout) { // you have to rest at least 1.5 seconds over the x3d canvas
        clearTimeout(this.state.wheelTimeout); // so that the wheel focus will get enabled and
        this.state.wheelTimeout = setTimeout((event) => { this._wheelTimeoutCallback(event); }, 1500); // allow you to zoom in/out.
      }
      return;
    }
    this.scene.viewpoint.zoom(this.moveParams.distanceToPickPosition, event.deltaY);

    if (typeof webots.currentView.onmousewheel === 'function')
      webots.currentView.onmousewheel(event);
  }

  _wheelTimeoutCallback(event) {
    this.state.wheelTimeout = null;
    this.state.wheelFocus = true;
  }

  _onMouseOver(event) {
    this.state.wheelTimeout = setTimeout((event) => { this._wheelTimeoutCallback(event); }, 1500);
  }

  _onMouseLeave(event) {
    if (this.state.wheelTimeout != null) {
      clearTimeout(this.state.wheelTimeout);
      this.state.wheelTimeout = null;
    }
    this.state.wheelFocus = false;

    if (typeof webots.currentView.onmouseleave === 'function')
      webots.currentView.onmouseleave(event);
  }

  _onTouchMove(event) {
    if (!this.enableNavigation || event.targetTouches.length === 0 || event.targetTouches.length > 2)
      return;
    if (this.state.initialTimeStamp === null)
      // Prevent applying mouse move action before drag initialization in mousedrag event.
      return;
    if ((this.state.mouseDown !== 2) !== (event.targetTouches.length > 1))
      // Gesture single/multi touch changed after initialization.
      return;

    var touch = event.targetTouches['0'];
    var x = Math.round(touch.clientX); // discard decimal values returned on android
    var y = Math.round(touch.clientY);

    if (this.state.mouseDown === 2) { // translation
      this.moveParams.dx = x - this.state.x;
      this.moveParams.dy = y - this.state.y;

      // On small phone screens (Android) this is needed to correctly detect clicks and longClicks.
      if (this.state.initialX == null && this.state.initialY == null) {
        this.state.initialX = Math.round(this.state.x);
        this.state.initialY = Math.round(this.state.y);
      }
      if (Math.abs(this.moveParams.dx) < 2 && Math.abs(this.moveParams.dy) < 2 &&
        Math.abs(this.state.initialX - x) < 5 && Math.abs(this.state.initialY - y) < 5)
        this.state.moved = false;
      else
        this.state.moved = true;

      this.moveParams.dx = x - this.state.initialX;
      this.moveParams.dy = y - this.state.initialY;
      this.scene.viewpoint.translate(this.moveParams);
    } else {
      var touch1 = event.targetTouches['1'];
      var x1 = Math.round(touch1.clientX);
      var y1 = Math.round(touch1.clientY);
      var distanceX = x - x1;
      var distanceY = y - y1;
      var newTouchDistance = distanceX * distanceX + distanceY * distanceY;
      var pinchSize = this.state.touchDistance - newTouchDistance;

      var moveX1 = x - this.state.x;
      var moveX2 = x1 - this.state.x1;
      var moveY1 = y - this.state.y;
      var moveY2 = y1 - this.state.y1;
      var ratio = window.devicePixelRatio || 1;

      if (Math.abs(pinchSize) > 500 * ratio) { // zoom and tilt
        var d;
        if (Math.abs(moveX2) < Math.abs(moveX1))
          d = moveX1;
        else
          d = moveX2;
        this.moveParams.tiltAngle = 0.0004 * d;
        this.moveParams.zoomScale = this.moveParams.scaleFactor * 0.015 * pinchSize;
        this.scene.viewpoint.zoomAndTilt(this.moveParams);
      } else if (Math.abs(moveY2 - moveY1) < 3 * ratio && Math.abs(moveX2 - moveX1) < 3 * ratio) { // rotation (pitch and yaw)
        this.moveParams.dx = moveX1 * 0.8;
        this.moveParams.dy = moveY1 * 0.5;
        this.scene.viewpoint.rotate(this.moveParams);
      }

      this.state.touchDistance = newTouchDistance;
      this.state.moved = true;
    }

    this.state.x = x;
    this.state.y = y;
    this.state.x1 = x1;
    this.state.y1 = y1;

    if (typeof webots.currentView.ontouchmove === 'function')
      webots.currentView.ontouchmove(event);
  }

  _onTouchStart(event) {
    this._initMouseMove(event.targetTouches['0']);
    if (event.targetTouches.length === 2) {
      var touch1 = event.targetTouches['1'];
      this.state.x1 = touch1.clientX;
      this.state.y1 = touch1.clientY;
      var distanceX = this.state.x - this.state.x1;
      var distanceY = this.state.y - this.state.y1;
      this.state.touchDistance = distanceX * distanceX + distanceY * distanceY;
      this.state.touchOrientation = Math.atan2(this.state.y1 - this.state.y, this.state.x1 - this.state.x);
      this.state.mouseDown = 3; // two fingers: rotation, tilt, zoom
    } else
      this.state.mouseDown = 2; // 1 finger: translation or single click

    this._setupMoveParameters(event.targetTouches['0']);
    this.domElement.addEventListener('touchend', this.ontouchend, true);
    this.domElement.addEventListener('touchmove', this.ontouchmove, true);

    if (typeof webots.currentView.ontouchstart === 'function')
      webots.currentView.ontouchstart(event);
  }

  _onTouchEnd(event) {
    this._clearMouseMove();
    this._selectAndHandleClick();

    this.domElement.removeEventListener('touchend', this.ontouchend, true);
    this.domElement.removeEventListener('touchmove', this.ontouchmove, true);

    if (typeof webots.currentView.ontouchend === 'function')
      webots.currentView.ontouchend(event);
  }

  _initMouseMove(event) {
    this.state.x = event.clientX;
    this.state.y = event.clientY;
    this.state.initialX = null;
    this.state.initialY = null;
    this.state.moved = false;
    this.state.initialTimeStamp = Date.now();
    this.state.longClick = false;
    if (this.contextMenu)
      this.hiddenContextMenu = this.contextMenu.toggle();
  }

  _setupMoveParameters(event) {
    this.moveParams = {};
    var relativePosition = MouseEvents.convertMouseEventPositionToRelativePosition(this.scene.renderer.domElement, event.clientX, event.clientY);
    var screenPosition = MouseEvents.convertMouseEventPositionToScreenPosition(this.scene.renderer.domElement, event.clientX, event.clientY);
    this.intersection = this.scene.pick(relativePosition, screenPosition);

    if (this.intersection && this.intersection.object)
      this.moveParams.pickPosition = this.intersection.point;
    else
      this.moveParams.pickPosition = null;

    if (this.intersection == null) {
      var cameraPosition = new THREE.Vector3();
      this.scene.viewpoint.camera.getWorldPosition(cameraPosition);
      this.moveParams.distanceToPickPosition = cameraPosition.length();
    } else
      this.moveParams.distanceToPickPosition = this.intersection.distance;
    if (this.moveParams.distanceToPickPosition < 0.001) // 1 mm
      this.moveParams.distanceToPickPosition = 0.001;

    // Webots mFieldOfView corresponds to the horizontal FOV, i.e. viewpoint.fovX.
    this.moveParams.scaleFactor = this.moveParams.distanceToPickPosition * 2 * Math.tan(0.5 * this.scene.viewpoint.camera.fovX);
    var viewHeight = parseFloat($(this.scene.domElement).css('height').slice(0, -2));
    var viewWidth = parseFloat($(this.scene.domElement).css('width').slice(0, -2));
    this.moveParams.scaleFactor /= Math.max(viewHeight, viewWidth);

    this.moveParams.initialCameraPosition = this.scene.viewpoint.camera.position.clone();
  }

  _clearMouseMove() {
    const timeDelay = this.mobileDevice ? 100 : 1000;
    this.state.longClick = Date.now() - this.state.initialTimeStamp >= timeDelay;
    if (this.state.moved === false)
      this.previousSelection = this.selection;
    else
      this.previousSelection = null;
    this.state.previousMouseDown = this.state.mouseDown;
    this.state.mouseDown = 0;
    this.state.initialTimeStamp = null;
    this.state.initialX = null;
    this.state.initialY = null;
    this.moveParams = {};
  }

  _selectAndHandleClick() {
    if (this.state.moved === false && (!this.state.longClick || this.mobileDevice)) {
      var object;
      if (this.intersection) {
        object = this.intersection.object;
        if (object)
          object = this.scene.getTopX3dNode(object);
      }
      this.scene.selector.select(object);

      if (((this.mobileDevice && this.state.longClick) || (!this.mobileDevice && this.state.previousMouseDown === 2)) &&
        this.hiddenContextMenu === false && this.contextMenu)
        // Right click: show popup menu.
        this.contextMenu.show(object, {x: this.state.x, y: this.state.y});
    }
  }
}

MouseEvents.convertMouseEventPositionToScreenPosition = (element, eventX, eventY) => {
  var rect = element.getBoundingClientRect();
  var pos = new THREE.Vector2();
  pos.x = ((eventX - rect.left) / (rect.right - rect.left)) * 2 - 1;
  pos.y = -((eventY - rect.top) / (rect.bottom - rect.top)) * 2 + 1;
  return pos;
};

MouseEvents.convertMouseEventPositionToRelativePosition = (element, eventX, eventY) => {
  var rect = element.getBoundingClientRect();
  var pos = new THREE.Vector2();
  pos.x = Math.round(eventX - rect.left);
  pos.y = Math.round(eventY - rect.top);
  return pos;
};
/* global THREE */
/* exported TextureLoader, TextureData */
'use strict';

var TextureLoader = {
  createEmptyTexture: function(name) {
    if (hasHDRExtension(name)) {
      var texture = new THREE.DataTexture();
      texture.encoding = THREE.RGBEEncoding;
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.flipY = true;
      return texture;
    }
    return new THREE.Texture();
  },

  applyTextureTransform: function(texture, transformData) {
    this._getInstance().applyTextureTransform(texture, transformData);
  },

  createColoredCubeTexture: function(color, width = 1, height = 1) {
    // Create an off-screen canvas.
    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    // Create RGB values.
    var r = Math.floor(color.r * 255);
    var g = Math.floor(color.g * 255);
    var b = Math.floor(color.b * 255);

    // Push pixels.
    var data = context.createImageData(width, height);
    var size = width * height;
    for (let i = 0; i < size; i++) {
      let stride = i * 4;
      data.data[stride + 0] = r;
      data.data[stride + 1] = g;
      data.data[stride + 2] = b;
      data.data[stride + 3] = 255;
    }
    context.putImageData(data, 0, 0);

    // Create the CubeTexture.
    var src = canvas.toDataURL();
    var loader = new THREE.CubeTextureLoader();
    return loader.load([src, src, src, src, src, src]);
  },

  createOrRetrieveTexture: function(filename, textureData) {
    console.assert(typeof filename === 'string', 'TextureLoader.createOrRetrieveTexture: name is not a string.');
    return this._getInstance().createOrRetrieveTexture(filename, textureData);
  },

  loadOrRetrieveImage: function(filename, texture, cubeTextureIndex = undefined, onLoad = undefined) {
    console.assert(typeof filename === 'string', 'TextureLoader.loadOrRetrieveImage: name is not a string.');
    if (typeof filename === 'undefined' || filename === '')
      return undefined;
    return this._getInstance().loadOrRetrieveImage(filename, texture, cubeTextureIndex, onLoad);
  },

  setOnTextureLoad: function(onLoad) {
    this._getInstance().onTextureLoad = onLoad;
  },

  setTexturePathPrefix: function(texturePathPrefix) {
    this._getInstance().texturePathPrefix = texturePathPrefix;
  },

  hasPendingData: function() {
    return this._getInstance().hasPendingData;
  },

  _getInstance: function() {
    if (typeof this.instance === 'undefined')
      this.instance = new _TextureLoaderObject();
    return this.instance;
  }
};

class TextureData {
  constructor(transparent, wrap, anisotropy, transform) {
    this.transparent = transparent;
    this.wrap = wrap;
    this.anisotropy = anisotropy;
    this.transform = transform;
  }

  equals(other) {
    return this.transparent === other.transparent &&
           this.anisotropy === other.anisotropy &&
           JSON.stringify(this.wrap) === JSON.stringify(other.wrap) &&
           JSON.stringify(this.transform) === JSON.stringify(other.transform);
  }
};

class _TextureLoaderObject {
  constructor() {
    this.images = []; // list of image names
    this.textures = {}; // dictionary <texture file name, array <[texture data, texture object]>
    this.loadingTextures = {}; // dictionary <texture file name, dictionary <'objects': [texture objects], 'onLoad': [callback functions] > >
    this.loadingCubeTextureObjects = {}; // dictionary <cube texture object, dictionary < image name: [cube image index] > >
    this.onTextureLoad = undefined;
    this.texturePathPrefix = '';
    this.hasPendingData = false;
  }

  createOrRetrieveTexture(filename, textureData) {
    let textures = this.textures[filename];
    if (textures) {
      for (let i in textures) {
        if (textures[i][0].equals(textureData))
          return textures[i][1];
      }
    } else
      this.textures[filename] = [];

    // Create THREE.Texture or THREE.DataTexture based on image extension.
    let newTexture = TextureLoader.createEmptyTexture(filename);
    this.textures[filename].push([textureData, newTexture]);

    // Look for already loaded texture or load the texture in an asynchronous way.
    var image = this.loadOrRetrieveImage(filename, newTexture);
    if (typeof image !== 'undefined') { // else it could be updated later
      newTexture.image = image;
      newTexture.needsUpdate = true;
    }

    newTexture.userData = {
      'isTransparent': textureData.transparent,
      'url': filename,
      'transform': textureData.transform
    };
    newTexture.wrapS = textureData.wrap.s === 'true' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    newTexture.wrapT = textureData.wrap.t === 'true' ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    newTexture.anisotropy = textureData.anisotropy;

    if (typeof textureData.transform !== 'undefined')
      this.applyTextureTransform(newTexture, textureData.transform);
    // This is the encoding used in Webots.
    newTexture.encoding = THREE.sRGBEncoding;
    return newTexture;
  }

  applyTextureTransform(texture, transformData) {
    if (transformData !== 'undefined') {
      texture.matrixAutoUpdate = false;
      texture.onUpdate = () => {
        // X3D UV transform matrix differs from THREE.js default one
        // http://www.web3d.org/documents/specifications/19775-1/V3.2/Part01/components/texturing.html#TextureTransform
        var c = Math.cos(-transformData.rotation);
        var s = Math.sin(-transformData.rotation);
        var sx = transformData.scale.x;
        var sy = transformData.scale.y;
        var cx = transformData.center.x;
        var cy = transformData.center.y;
        var tx = transformData.translation.x;
        var ty = transformData.translation.y;
        texture.matrix.set(
          sx * c, sx * s, sx * (tx * c + ty * s + cx * c + cy * s) - cx,
          -sy * s, sy * c, sy * (-tx * s + ty * c - cx * s + cy * c) - cy,
          0, 0, 1
        );
      };
    } else {
      texture.matrixAutoUpdate = true;
      texture.onUpdate = null;
    }
    texture.needsUpdate = true;
  }

  loadOrRetrieveImage(name, texture, cubeTextureIndex = undefined, onLoad = undefined) {
    if (this.texturePathPrefix)
      name = this.texturePathPrefix + name;
    if (this.images[name]) {
      if (typeof onLoad !== 'undefined')
        onLoad(this.images[name]);
      return this.images[name];
    }

    if (texture instanceof THREE.CubeTexture) {
      var missingImages;
      if (this.loadingCubeTextureObjects[texture]) {
        missingImages = this.loadingCubeTextureObjects[texture];
        if (missingImages[name])
          missingImages[name].push(cubeTextureIndex);
        else
          missingImages[name] = [cubeTextureIndex];
      } else {
        missingImages = {};
        missingImages[name] = [cubeTextureIndex];
        this.loadingCubeTextureObjects[texture] = missingImages;
      }
    }

    if (this.loadingTextures[name]) {
      if (typeof texture !== 'undefined')
        this.loadingTextures[name].objects.push(texture);
      if (typeof onLoad !== 'undefined')
        this.loadingTextures[name].onLoad.push(onLoad);
      return undefined; // texture is already loading
    }

    this.loadingTextures[name] = {objects: [], onLoad: []};
    if (typeof texture !== 'undefined')
      this.loadingTextures[name].objects.push(texture);
    if (typeof onLoad !== 'undefined')
      this.loadingTextures[name].onLoad.push(onLoad);
    this.hasPendingData = true;
    this._setTimeout();

    // Load from url.
    var loader;
    var isHDR = hasHDRExtension(name);
    if (isHDR) {
      loader = new THREE.RGBELoader();
      loader.type = THREE.FloatType;
    } else
      loader = new THREE.ImageLoader();
    loader.load(
      name,
      (data) => {
        if (this.loadingTextures[name]) {
          this.loadingTextures[name].data = data;
          this._onImageLoaded(name);
        } // else image already loaded
      },
      undefined, // onProgress callback
      function(err) { // onError callback
        console.error('An error happened when loading the texure "' + name + '": ' + err);
        // else image could be received later
      }
    );
    return undefined;
  }

  _onImageLoaded(name) {
    if (!this.loadingTextures[name])
      return;

    var image = this.loadingTextures[name].data;
    this.images[name] = image;
    var textureObjects = this.loadingTextures[name].objects;
    // JPEGs can't have an alpha channel, so memory can be saved by storing them as RGB.
    var isJPEG = hasJPEGExtension(name);
    var isHDR = isJPEG ? false : hasHDRExtension(name);
    textureObjects.forEach((textureObject) => {
      if (textureObject instanceof THREE.CubeTexture) {
        var missingImages = this.loadingCubeTextureObjects[textureObject];
        var indices = missingImages[name];
        indices.forEach((indice) => {
          if (indice === 2 || indice === 3) {
            // Flip the top and bottom images of the cubemap to ensure a similar projection as the Webots one.
            if (isHDR)
              flipHDRImage(image.image);
            else
              flipRegularImage(image);
          }
          textureObject.images[indice] = image;
        });
        delete missingImages[name];
        if (Object.keys(missingImages).length === 0) {
          textureObject.needsUpdate = true;
          delete this.loadingCubeTextureObjects[textureObject];
        }
      } else {
        if (!isHDR)
          textureObject.format = isJPEG ? THREE.RGBFormat : THREE.RGBAFormat;
        textureObject.image = image;
        textureObject.needsUpdate = true;
      }
    });

    var callbackFunctions = this.loadingTextures[name].onLoad;
    callbackFunctions.forEach((callback) => {
      if (typeof callback === 'function')
        callback(image);
    });
    delete this.loadingTextures[name];

    if (typeof this.onTextureLoad === 'function')
      this.onTextureLoad();

    this._evaluatePendingData();
  }

  _setTimeout() {
    // Set texture loading timeout.
    // If after some time no new textures are loaded, the hasPendingData variable is automatically
    // reset to false in order to handle not found textures.
    // The `this.loadingTextures` dictionary is not reset so that it is still possible to load late textures.
    if (this.timeoutHandle)
      window.clearTimeout(this.timeoutHandle);

    this.timeoutHandle = window.setTimeout(() => {
      var message = 'ERROR: Texture loader timeout elapsed. The following textures could not be loaded: \n';
      for (let key in this.loadingTextures)
        message += key + '\n';
      console.error(message);
      this.hasPendingData = false;

      if (typeof this.onTextureLoad === 'function')
        this.onTextureLoad();
    }, 10000); // wait 10 seconds
  }

  _evaluatePendingData() {
    this.hasPendingData = false;
    for (let key in this.loadingTextures) {
      if (this.loadingTextures.hasOwnProperty(key)) {
        this.hasPendingData = true;
        break;
      }
    }

    if (this.hasPendingData)
      this._setTimeout();
    else if (this.timeoutHandle)
      window.clearTimeout(this.timeoutHandle);
  }
};

// Inspired from: https://stackoverflow.com/questions/17040360/javascript-function-to-rotate-a-base-64-image-by-x-degrees-and-return-new-base64
// Flip a base64 image by 180 degrees.
function flipRegularImage(base64Image) {
  // Create an off-screen canvas.
  var offScreenCanvas = document.createElement('canvas');
  var context = offScreenCanvas.getContext('2d');

  // Set its dimension to rotated size.
  offScreenCanvas.width = base64Image.width;
  offScreenCanvas.height = base64Image.height;

  // Rotate and draw source image into the off-screen canvas.
  context.scale(-1, -1);
  context.translate(-offScreenCanvas.height, -offScreenCanvas.width);
  context.drawImage(base64Image, 0, 0);

  // Encode the image to data-uri with base64:
  base64Image.src = offScreenCanvas.toDataURL('image/jpeg', 95);
}

function flipHDRImage(image) {
  let size = image.width * image.height;
  let d = new Float32Array(3 * size);
  let max = 3 * (size - 1);
  let i = 0;
  let c = 0;
  for (i = 0; i < 3 * size; i += 3) {
    let m = max - i;
    for (c = 0; c < 3; c++)
      d[i + c] = image.data[m + c];
  }
  image.data = d;
}

function hasJPEGExtension(name) {
  return name.search(/\.jpe?g($|\?)/i) > 0 || name.search(/^data:image\/jpeg/) === 0;
}

function hasHDRExtension(name) {
  return name.search(/\.hdr($|\?)/i) > 0 || name.search(/^data:image\/hdr/) === 0;
}
/* exported DefaultUrl */
'use strict';

var DefaultUrl = {
  wwiUrl: function() {
    if (typeof this._wwiUrl === 'undefined') {
      this._wwiUrl = '';
      var scripts = document.getElementsByTagName('script');
      for (let i = scripts.length - 1; i >= 0; i--) {
        var src = scripts[i].src;
        if (src.indexOf('?') > 0)
          src = src.substring(0, src.indexOf('?'));
        if (src.endsWith('webots.js') || src.endsWith('webots.min.js')) {
          this._wwiUrl = src.substr(0, src.lastIndexOf('/') + 1); // remove "webots.js"
          break;
        }
      }
    }
    return this._wwiUrl;
  },

  wwiImagesUrl: function(name) {
    return this.wwiUrl() + 'images/';
  },

  currentScriptUrl: function() {
    // Get the directory path to the currently executing script file
    // for example: https://cyberbotics.com/wwi/8.6/
    var scripts = document.querySelectorAll('script[src]');
    for (let i in scripts) {
      var src = scripts[i].src;
      var index = src.indexOf('?');
      if (index > 0)
        src = src.substring(0, index); // remove query string
      if (!src.endsWith('webots.js') && !src.endsWith('webots.min.js'))
        continue;
      index = src.lastIndexOf('/');
      return src.substring(0, index + 1);
    }
    return '';
  }
};
/* global webots, Stream, TextureLoader */
'use strict';

class Server { // eslint-disable-line no-unused-vars
  constructor(url, view, onready) {
    this.view = view;
    this.onready = onready;

    // url has the following form: "ws(s)://cyberbotics2.cyberbotics.com:80/simple/worlds/simple.wbt"
    var n = url.indexOf('/', 6);
    var m = url.lastIndexOf('/');
    this.url = 'http' + url.substring(2, n); // e.g., "http(s)://cyberbotics2.cyberbotics.com:80"
    this.project = url.substring(n + 1, m - 7); // e.g., "simple"
    this.worldFile = url.substring(m + 1); // e.g., "simple.wbt"
    this.controllers = [];
  }

  connect() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', this.url + '/session', true);
    $('#webotsProgressMessage').html('Connecting to session server...');
    xhr.onreadystatechange = (e) => {
      if (xhr.readyState !== 4)
        return;
      if (xhr.status !== 200)
        return;
      var data = xhr.responseText;
      if (data.startsWith('Error:')) {
        $('#webotsProgress').hide();
        var errorMessage = data.substring(6).trim();
        errorMessage = errorMessage.charAt(0).toUpperCase() + errorMessage.substring(1);
        webots.alert('Session server error', errorMessage);
        return;
      }
      this.socket = new WebSocket(data + '/client');
      this.socket.onopen = (event) => { this.onOpen(event); };
      this.socket.onmessage = (event) => { this.onMessage(event); };
      this.socket.onclose = (event) => {
        this.view.console.info('Disconnected to the Webots server.');
      };
      this.socket.onerror = (event) => {
        this.view.console.error('Cannot connect to the simulation server');
      };
    };
    xhr.send();
  }

  onOpen(event) {
    var host = location.protocol + '//' + location.host.replace(/^www./, ''); // remove 'www' prefix
    if (typeof webots.User1Id === 'undefined')
      webots.User1Id = '';
    if (typeof webots.User1Name === 'undefined')
      webots.User1Name = '';
    if (typeof webots.User1Authentication === 'undefined')
      webots.User1Authentication = '';
    if (typeof webots.User2Id === 'undefined')
      webots.User2Id = '';
    if (typeof webots.User2Name === 'undefined')
      webots.User2Name = '';
    if (typeof webots.CustomData === 'undefined')
      webots.CustomData = '';
    this.socket.send('{ "init" : [ "' + host + '", "' + this.project + '", "' + this.worldFile + '", "' +
              webots.User1Id + '", "' + webots.User1Name + '", "' + webots.User1Authentication + '", "' +
              webots.User2Id + '", "' + webots.User2Name + '", "' + webots.CustomData + '" ] }');
    $('#webotsProgressMessage').html('Starting simulation...');
  }

  onMessage(event) {
    var message = event.data;
    if (message.indexOf('webots:ws://') === 0 || message.indexOf('webots:wss://') === 0) {
      var url = message.substring(7);
      var httpServerUrl = url.replace(/ws/, 'http'); // Serve the texture images. SSL prefix is supported.
      TextureLoader.setTexturePathPrefix(httpServerUrl + '/');
      this.view.stream = new Stream(url, this.view, this.onready);
      this.view.stream.connect();
    } else if (message.indexOf('controller:') === 0) {
      var n = message.indexOf(':', 11);
      var controller = {};
      controller.name = message.substring(11, n);
      controller.port = message.substring(n + 1);
      this.view.console.info('Using controller ' + controller.name + ' on port ' + controller.port);
      this.controllers.push(controller);
    } else if (message.indexOf('queue:') === 0)
      this.view.console.error('The server is saturated. Queue to wait: ' + message.substring(6) + ' client(s).');
    else if (message === '.') { // received every 5 seconds when Webots is running
      // nothing to do
    } else if (message.indexOf('reset controller:') === 0)
      this.view.stream.socket.send('sync controller:' + message.substring(18).trim());
    else
      console.log('Received an unknown message from the Webots server socket: "' + message + '"');
  }

  resetController(filename) {
    this.socket.send('{ "reset controller" : "' + filename + '" }');
  }
}
/* global webots */
'use strict';

class Stream { // eslint-disable-line no-unused-vars
  constructor(wsServer, view, onready) {
    this.wsServer = wsServer;
    this.view = view;
    this.onready = onready;
    this.socket = null;
    this.videoStream = null;
  }

  connect() {
    this.socket = new WebSocket(this.wsServer);
    $('#webotsProgressMessage').html('Connecting to Webots instance...');
    this.socket.onopen = (event) => { this.onSocketOpen(event); };
    this.socket.onmessage = (event) => { this.onSocketMessage(event); };
    this.socket.onclose = (event) => { this.onSocketClose(event); };
    this.socket.onerror = (event) => {
      this.view.destroyWorld();
      this.view.onerror('WebSocket error: ' + event.data);
    };
  }

  close() {
    if (this.socket)
      this.socket.close();
    if (this.videoStream)
      this.videoStream.close();
  }

  onSocketOpen(event) {
    var mode = this.view.mode;
    if (mode === 'video')
      mode += ': ' + this.view.video.width + 'x' + this.view.video.height;
    else if (this.view.broadcast)
      mode += ';broadcast';
    this.socket.send(mode);
  }

  onSocketClose(event) {
    this.view.onerror('Disconnected from ' + this.wsServer + ' (' + event.code + ')');
    if ((event.code > 1001 && event.code < 1016) || (event.code === 1001 && this.view.quitting === false)) { // https://tools.ietf.org/html/rfc6455#section-7.4.1
      webots.alert('Streaming server error',
        'Connection closed abnormally.<br>(Error code: ' + event.code + ')<br><br>' +
        'Please reset the simulation by clicking ' +
        '<a href="' + window.location.href + '">here</a>.');
    }
    this.view.destroyWorld();
    if (typeof this.view.onclose === 'function')
      this.view.onclose();
  }

  onSocketMessage(event) {
    var lines, i;
    var data = event.data;
    if (data.startsWith('robot:') ||
        data.startsWith('stdout:') ||
        data.startsWith('stderr:')) {
      lines = data.split('\n'); // in that case, we support one message per line
      for (i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line === '') // FIXME: should not happen
          continue;
        if (line.startsWith('stdout:'))
          this.view.console.stdout(line.substring(7));
        else if (line.startsWith('stderr:'))
          this.view.console.stderr(line.substring(7));
        else if (line.startsWith('robot:')) {
          var secondColonIndex = line.indexOf(':', 6);
          var robot = line.substring(6, secondColonIndex);
          var message = line.substring(secondColonIndex + 1);
          this.view.onrobotmessage(robot, message);
        }
      }
    } else if (data.startsWith('application/json:')) {
      if (typeof this.view.time !== 'undefined') { // otherwise ignore late updates until the scene loading is completed
        data = data.substring(data.indexOf(':') + 1);
        var frame = JSON.parse(data);
        this.view.time = frame.time;
        $('#webotsClock').html(webots.parseMillisecondsIntoReadableTime(frame.time));
        if (frame.hasOwnProperty('poses')) {
          for (i = 0; i < frame.poses.length; i++)
            this.view.x3dScene.applyPose(frame.poses[i]);
        }
        if (this.view.x3dScene.viewpoint.updateViewpointPosition(null, this.view.time))
          this.view.x3dScene.viewpoint.notifyCameraParametersChanged(false);
        this.view.x3dScene.onSceneUpdate();
      }
    } else if (data.startsWith('node:')) {
      data = data.substring(data.indexOf(':') + 1);
      var parentId = data.split(':')[0];
      data = data.substring(data.indexOf(':') + 1);
      this.view.x3dScene.loadObject(data, parentId);
    } else if (data.startsWith('delete:')) {
      data = data.substring(data.indexOf(':') + 1).trim();
      this.view.x3dScene.deleteObject(data);
    } else if (data.startsWith('model:')) {
      $('#webotsProgressMessage').html('Loading 3D scene...');
      $('#webotsProgressPercent').html('');
      this.view.destroyWorld();
      data = data.substring(data.indexOf(':') + 1).trim();
      if (!data) // received an empty model case: just destroy the view
        return;
      this.view.x3dScene.loadObject(data);
    } else if (data.startsWith('world:')) {
      data = data.substring(data.indexOf(':') + 1).trim();
      var currentWorld = data.substring(0, data.indexOf(':')).trim();
      data = data.substring(data.indexOf(':') + 1).trim();
      this.view.updateWorldList(currentWorld, data.split(';'));
    } else if (data.startsWith('video: ')) {
      console.log('Received data = ' + data);
      var list = data.split(' ');
      var url = list[1];
      var streamId = list[2];
      console.log('Received video message on ' + url + ' stream = ' + streamId);
      this.videoStream = new webots.VideoStream(url, this.view.video, document.getElementById('BitrateViewer'), streamId);
      if (typeof this.onready === 'function')
        this.onready();
    } else if (data.startsWith('set controller:')) {
      var slash = data.indexOf('/', 15);
      var dirname = data.substring(15, slash);
      var filename = data.substring(slash + 1, data.indexOf(':', slash + 1));
      if (this.view.editor.dirname === dirname)
        this.view.editor.addFile(filename, data.substring(data.indexOf('\n') + 1)); // remove the first line
      else
        console.log('Warning: ' + filename + ' not in controller directory: ' + dirname + ' != ' + this.view.editor.dirname);
    } else if (data === 'pause' || data === 'paused by client') {
      this.view.toolBar.setMode('pause');
      // Update timeout.
      if (data === 'pause')
        this.view.isAutomaticallyPaused = undefined;
      if (this.view.timeout > 0 && !this.view.isAutomaticallyPaused) {
        this.view.deadline = this.view.timeout;
        if (typeof this.view.time !== 'undefined')
          this.view.deadline += this.view.time;
        $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(this.view.deadline));
      }
    } else if (data === 'real-time' || data === 'run' || data === 'fast') {
      this.view.toolBar.setMode(data);
      if (this.view.timeout >= 0)
        this.view.stream.socket.send('timeout:' + this.view.timeout);
    } else if (data.startsWith('loading:')) {
      data = data.substring(data.indexOf(':') + 1).trim();
      var loadingStatus = data.substring(0, data.indexOf(':')).trim();
      data = data.substring(data.indexOf(':') + 1).trim();
      $('#webotsProgressMessage').html('Loading: ' + loadingStatus);
      $('#webotsProgressPercent').html('<progress value="' + data + '" max="100"></progress>');
    } else if (data === 'scene load completed') {
      this.view.time = 0;
      $('#webotsClock').html(webots.parseMillisecondsIntoReadableTime(0));
      if (typeof this.onready === 'function')
        this.onready();
    } else if (data === 'reset finished') {
      this.view.resetSimulation();
      if (typeof this.onready === 'function')
        this.onready();
    } else if (data.startsWith('label')) {
      var semiColon = data.indexOf(';');
      var id = data.substring(data.indexOf(':'), semiColon);
      var previousSemiColon;
      var labelProperties = []; // ['font', 'color', 'size', 'x', 'y', 'text']
      for (i = 0; i < 5; i++) {
        previousSemiColon = semiColon + 1;
        semiColon = data.indexOf(';', previousSemiColon);
        labelProperties.push(data.substring(previousSemiColon, semiColon));
      }
      this.view.setLabel({
        id: id,
        text: data.substring(semiColon + 1, data.length),
        font: labelProperties[0],
        color: labelProperties[1],
        size: labelProperties[2],
        x: labelProperties[3],
        y: labelProperties[4]
      });
    } else
      console.log('WebSocket error: Unknown message received: "' + data + '"');
  }
}
'use strict';

class Video { // eslint-disable-line no-unused-vars
  constructor(parentObject, mouseEvents, stream) {
    this.domElement = document.createElement('video');
    this.domElement.style.background = 'grey';
    this.domElement.id = 'remoteVideo';
    this.domElement.class = 'rounded centered';
    this.domElement.autoplay = 'true';
    this.domElement.width = 800;
    this.domElement.height = 600;
    parentObject.appendChild(this.domElement);
    this.mouseEvents = mouseEvents;
    this.stream = stream;

    this.onmousemove = (e) => { this._onMouseMove(e); };
  }

  finalize(onready) {
    this.domElement.addEventListener('mousedown', (e) => { this._onMouseDown(e); }, false);
    this.domElement.addEventListener('mouseup', (e) => { this._onMouseUp(e); }, false);
    this.domElement.addEventListener('wheel', (e) => { this._onWheel(e); }, false);
    this.domElement.addEventListener('contextmenu', (e) => { this._onContextMenu(e); }, false);
    if (typeof onready === 'function')
      onready();
  }

  sendMouseEvent(type, event, wheel) {
    var socket = this.stream.socket;
    if (!socket || socket.readyState !== 1)
      return;
    var modifier = (event.shiftKey ? 1 : 0) + (event.ctrlKey ? 2 : 0) + (event.altKey ? 4 : 0);
    socket.send('mouse ' + type + ' ' + event.button + ' ' + this.mouseEvents.mouseState.mouseDown + ' ' +
                event.offsetX + ' ' + event.offsetY + ' ' + modifier + ' ' + wheel);
  }

  resize(width, height) {
    this.domElement.width = width;
    this.domElement.height = height;
    this.stream.socket.send('resize: ' + width + 'x' + height);
  }

  _onMouseDown(event) {
    event.target.addEventListener('mousemove', this.onmousemove, false);
    this.sendMouseEvent(-1, event, 0);
    event.preventDefault();
    return false;
  }

  _onMouseMove(event) {
    if (this.mouseEvents.mouseState.mouseDown === 0) {
      event.target.removeEventListener('mousemove', this.onmousemove, false);
      return false;
    }
    this.sendMouseEvent(0, event, 0);
    return false;
  }

  _onMouseUp(event) {
    event.target.removeEventListener('mousemove', this.onmousemove, false);
    this.sendMouseEvent(1, event, 0);
    event.preventDefault();
    return false;
  }

  _onWheel(event) {
    this.sendMouseEvent(2, event, Math.sign(event.deltaY));
    return false;
  }

  _onContextMenu(event) {
    event.preventDefault();
    return false;
  }
}
/* global THREE, ActiveXObject, TextureLoader, TextureData */
'use strict';

// Inspiration: https://github.com/lkolbly/threejs-x3dloader/blob/master/X3DLoader.js

THREE.X3DLoader = class X3DLoader {
  constructor(scene) {
    this.scene = scene;
    this.parsedObjects = [];
    this.directionalLights = [];
  };

  load(url, onLoad, onProgress, onError) {
    console.log('X3D: Loading ' + url);
    var scope = this;
    var loader = new THREE.FileLoader(scope.manager);
    loader.load(url, (text) => {
      if (typeof onLoad !== 'undefined')
        onLoad(scope.parse(text));
    });
  }

  parse(text, parentObject = undefined) {
    this.directionalLights = [];
    var object;

    console.log('X3D: Parsing');

    var xml = null;
    if (window.DOMParser) {
      var parser = new DOMParser();
      xml = parser.parseFromString(text, 'text/xml');
    } else { // Internet Explorer
      xml = new ActiveXObject('Microsoft.XMLDOM');
      xml.async = false;
      xml.loadXML(text);
    }

    // Parse scene.
    var scene = xml.getElementsByTagName('Scene')[0];
    if (typeof scene !== 'undefined') {
      object = new THREE.Group();
      object.userData.x3dType = 'Group';
      object.name = 'n0';
      this.parsedObjects.push(object); // push before parsing to let _getDefNode work correctly
      this.parseNode(object, scene);
      return this.parsedObjects;
    }

    // Parse objects.
    var rootObjects = [];
    xml.childNodes.forEach((n) => {
      if (n.tagName === 'nodes')
        n.childNodes.forEach((child) => { rootObjects.push(child); });
      else
        rootObjects.push(n);
    });
    while (rootObjects.length > 0) {
      var node = rootObjects.shift(); // get and remove first item
      if (parentObject)
        object = parentObject;
      else
        object = new THREE.Group();
      this.parsedObjects.push(object); // push before parsing
      this.parseNode(object, node);
    }
    return this.parsedObjects;
  }

  parseNode(parentObject, node) {
    var object = this._getDefNode(node);
    if (typeof object !== 'undefined') {
      var useObject = object.clone();
      this._setCustomId(node, useObject, object);
      parentObject.add(useObject);
      return;
    }

    var hasChildren = false;
    var helperNodes = [];
    if (node.tagName === 'Transform') {
      object = this.parseTransform(node);
      hasChildren = true;
    } else if (node.tagName === 'Shape')
      object = this.parseShape(node);
    else if (node.tagName === 'DirectionalLight')
      object = this.parseDirectionalLight(node);
    else if (node.tagName === 'PointLight')
      object = this.parsePointLight(node);
    else if (node.tagName === 'SpotLight')
      object = this.parseSpotLight(node, helperNodes);
    else if (node.tagName === 'Group') {
      object = new THREE.Object3D();
      object.userData.x3dType = 'Group';
      hasChildren = true;
    } else if (node.tagName === 'Switch') {
      object = new THREE.Object3D();
      object.visible = getNodeAttribute(node, 'whichChoice', '-1') !== '-1';
      object.userData.x3dType = 'Switch';
      hasChildren = true;
    } else if (node.tagName === 'Fog')
      this.parseFog(node);
    else if (node.tagName === 'Viewpoint')
      object = this.parseViewpoint(node);
    else if (node.tagName === 'Background')
      object = this.parseBackground(node);
    else if (node.tagName === 'WorldInfo') {
      this.parseWorldInfo(node);
      return;
    } else if (node.tagName === 'Appearance') {
      if (!parentObject.isMesh) {
        console.error("X3DLoader:parsenode: cannot add 'Appearance' node to '" + parentObject.userData.x3dType + "' parent node.");
        return;
      }
      let material = this.parseAppearance(node);
      if (typeof material !== 'undefined')
        parentObject.material = material;
    } else if (node.tagName === 'PBRAppearance') {
      if (!parentObject.isMesh) {
        console.error("X3DLoader:parsenode: cannot add 'Appearance' node to '" + parentObject.userData.x3dType + "' parent node.");
        return;
      }
      let material = this.parsePBRAppearance(node);
      if (typeof material !== 'undefined')
        parentObject.material = material;
    } else if (node.tagName === 'TextureTransform')
      X3DLoader.applyTextureTransformToMaterial(parentObject, this.parseTextureTransform(node));
    else {
      let geometry = this.parseGeometry(node);
      if (typeof geometry !== 'undefined') {
        if (!parentObject.isMesh) {
          console.error("X3DLoader:parsenode: cannot add 'Appearance' node to '" + parentObject.userData.x3dType + "' parent node.");
          return;
        }
        parentObject.geometry = geometry;
      } else {
        // generic node type
        this.parseChildren(node, parentObject);
        return;
      }
    }

    if (typeof object !== 'undefined') {
      if (object.isObject3D) {
        let isInvisible = getNodeAttribute(node, 'render', 'true').toLowerCase() === 'false';
        if (isInvisible && object.visible)
          object.visible = false;
        this._setCustomId(node, object);
        parentObject.add(object);
      }
      let docUrl = getNodeAttribute(node, 'docUrl', '');
      if (docUrl)
        object.userData.docUrl = docUrl;
    }

    if (helperNodes.length > 0) {
      helperNodes.forEach((o) => {
        parentObject.add(o);
      });
    }

    if (hasChildren)
      this.parseChildren(node, object);
  }

  parseChildren(node, currentObject) {
    for (let i = 0; i < node.childNodes.length; i++) {
      var child = node.childNodes[i];
      if (typeof child.tagName !== 'undefined')
        this.parseNode(currentObject, child);
    }
  }

  parseTransform(transform) {
    var object = new THREE.Object3D();
    object.userData.x3dType = 'Transform';
    object.userData.solid = getNodeAttribute(transform, 'solid', 'false').toLowerCase() === 'true';
    object.userData.window = getNodeAttribute(transform, 'window', '');
    var controller = getNodeAttribute(transform, 'controller', undefined);
    if (typeof controller !== 'undefined')
      object.userData.controller = controller;
    object.userData.name = getNodeAttribute(transform, 'name', '');

    var position = convertStringToVec3(getNodeAttribute(transform, 'translation', '0 0 0'));
    object.position.copy(position);
    var scale = convertStringToVec3(getNodeAttribute(transform, 'scale', '1 1 1'));
    object.scale.copy(scale);
    var quaternion = convertStringToQuaternion(getNodeAttribute(transform, 'rotation', '0 1 0 0'));
    object.quaternion.copy(quaternion);

    return object;
  }

  parseShape(shape) {
    var geometry;
    var material;

    for (let i = 0; i < shape.childNodes.length; i++) {
      var child = shape.childNodes[i];
      if (typeof child.tagName === 'undefined')
        continue;

      // Check if USE node and return the DEF node.
      var defObject = this._getDefNode(child);
      if (typeof defObject !== 'undefined') {
        if (defObject.isGeometry || defObject.isBufferGeometry)
          geometry = defObject;
        else if (defObject.isMaterial)
          material = defObject;
        // else error
        continue;
      }

      if (typeof material === 'undefined') {
        if (child.tagName === 'Appearance') {
          // If a sibling PBRAppearance is detected, prefer it.
          var pbrAppearanceChild = false;
          for (let j = 0; j < shape.childNodes.length; j++) {
            var child0 = shape.childNodes[j];
            if (child0.tagName === 'PBRAppearance') {
              pbrAppearanceChild = true;
              break;
            }
          }
          if (pbrAppearanceChild)
            continue;
          material = this.parseAppearance(child);
        } else if (child.tagName === 'PBRAppearance')
          material = this.parsePBRAppearance(child);
        if (typeof material !== 'undefined')
          continue;
      }

      if (typeof geometry === 'undefined') {
        geometry = this.parseGeometry(child);
        if (typeof geometry !== 'undefined')
          continue;
      }

      console.log('X3dLoader: Unknown node: ' + child.tagName);
    }

    // Apply default geometry and/or material.
    if (typeof geometry === 'undefined')
      geometry = createDefaultGeometry();
    if (typeof material === 'undefined')
      material = createDefaultMaterial(geometry);

    var mesh;
    if (geometry.userData.x3dType === 'IndexedLineSet')
      mesh = new THREE.LineSegments(geometry, material);
    else if (geometry.userData.x3dType === 'PointSet')
      mesh = new THREE.Points(geometry, material);
    else
      mesh = new THREE.Mesh(geometry, material);
    mesh.userData.x3dType = 'Shape';

    if (!material.transparent && !material.userData.hasTransparentTexture)
      // Webots transparent object don't cast shadows.
      mesh.castShadow = getNodeAttribute(shape, 'castShadows', 'false').toLowerCase() === 'true';
    mesh.receiveShadow = true;
    mesh.userData.isPickable = getNodeAttribute(shape, 'isPickable', 'true').toLowerCase() === 'true';
    return mesh;
  }

  parseGeometry(node) {
    var geometry;
    if (node.tagName === 'Box')
      geometry = this.parseBox(node);
    else if (node.tagName === 'Cone')
      geometry = this.parseCone(node);
    else if (node.tagName === 'Cylinder')
      geometry = this.parseCylinder(node);
    else if (node.tagName === 'IndexedFaceSet')
      geometry = this.parseIndexedFaceSet(node);
    else if (node.tagName === 'Sphere')
      geometry = this.parseSphere(node);
    else if (node.tagName === 'Plane')
      geometry = this.parsePlane(node);
    else if (node.tagName === 'ElevationGrid')
      geometry = this.parseElevationGrid(node);
    else if (node.tagName === 'IndexedLineSet')
      geometry = this.parseIndexedLineSet(node);
    else if (node.tagName === 'PointSet')
      geometry = this.parsePointSet(node);

    if (typeof geometry !== 'undefined')
      this._setCustomId(node, geometry);
    return geometry;
  }

  parseAppearance(appearance) {
    var mat = new THREE.MeshBasicMaterial({color: 0xffffff});
    mat.userData.x3dType = 'Appearance';

    // Get the Material tag.
    var material = appearance.getElementsByTagName('Material')[0];

    var materialSpecifications = {};
    if (typeof material !== 'undefined') {
      var defMaterial = this._getDefNode(material);
      if (typeof defMaterial !== 'undefined') {
        materialSpecifications = {
          'color': defMaterial.color,
          'specular': defMaterial.specular,
          'emissive': defMaterial.emissive,
          'shininess': defMaterial.shininess
        };
      } else {
        // Pull out the standard colors.
        materialSpecifications = {
          'color': convertStringToColor(getNodeAttribute(material, 'diffuseColor', '0.8 0.8 0.8'), false),
          'specular': convertStringToColor(getNodeAttribute(material, 'specularColor', '0 0 0'), false),
          'emissive': convertStringToColor(getNodeAttribute(material, 'emissiveColor', '0 0 0'), false),
          'shininess': parseFloat(getNodeAttribute(material, 'shininess', '0.2')),
          'transparent': getNodeAttribute(appearance, 'sortType', 'auto') === 'transparent'
        };
      }
    }

    // Check to see if there is a texture.
    var imageTexture = appearance.getElementsByTagName('ImageTexture');
    var colorMap;
    if (imageTexture.length > 0) {
      colorMap = this.parseImageTexture(imageTexture[0], appearance.getElementsByTagName('TextureTransform'));
      if (typeof colorMap !== 'undefined') {
        materialSpecifications.map = colorMap;
        if (colorMap.userData.isTransparent) {
          materialSpecifications.transparent = true;
          materialSpecifications.alphaTest = 0.5; // FIXME needed for example for the target.png in robot_programming.wbt
        }
      }
    }

    mat = new THREE.MeshPhongMaterial(materialSpecifications);
    mat.userData.x3dType = 'Appearance';
    mat.userData.hasTransparentTexture = colorMap && colorMap.userData.isTransparent;
    if (typeof material !== 'undefined')
      this._setCustomId(material, mat);
    this._setCustomId(appearance, mat);
    return mat;
  }

  parsePBRAppearance(pbrAppearance) {
    const roughnessFactor = 2.0; // This factor has been empirically found to match the Webots rendering.

    var isTransparent = false;

    var baseColor = convertStringToColor(getNodeAttribute(pbrAppearance, 'baseColor', '1 1 1'));
    var roughness = parseFloat(getNodeAttribute(pbrAppearance, 'roughness', '0')) * roughnessFactor;
    var metalness = parseFloat(getNodeAttribute(pbrAppearance, 'metalness', '1'));
    var emissiveColor = convertStringToColor(getNodeAttribute(pbrAppearance, 'emissiveColor', '0 0 0'));
    var transparency = parseFloat(getNodeAttribute(pbrAppearance, 'transparency', '0'));
    var materialSpecifications = {
      color: baseColor,
      roughness: roughness,
      metalness: metalness,
      emissive: emissiveColor
    };

    if (transparency) {
      materialSpecifications.opacity = 1.0 - transparency;
      isTransparent = true;
    }

    var textureTransform = pbrAppearance.getElementsByTagName('TextureTransform');
    var imageTextures = pbrAppearance.getElementsByTagName('ImageTexture');
    for (let t = 0; t < imageTextures.length; t++) {
      var imageTexture = imageTextures[t];
      var type = getNodeAttribute(imageTexture, 'type', undefined);
      if (type === 'baseColor') {
        materialSpecifications.map = this.parseImageTexture(imageTexture, textureTransform);
        if (typeof materialSpecifications.map !== 'undefined' && materialSpecifications.map.userData.isTransparent) {
          isTransparent = true;
          materialSpecifications.alphaTest = 0.5; // FIXME needed for example for the target.png in robot_programming.wbt
        }
      } else if (type === 'roughness') {
        materialSpecifications.roughnessMap = this.parseImageTexture(imageTexture, textureTransform);
        if (roughness <= 0.0)
          materialSpecifications.roughness = roughnessFactor;
      } else if (type === 'metalness')
        materialSpecifications.metalnessMap = this.parseImageTexture(imageTexture, textureTransform);
      else if (type === 'normal')
        materialSpecifications.normalMap = this.parseImageTexture(imageTexture, textureTransform);
      else if (type === 'emissiveColor') {
        materialSpecifications.emissiveMap = this.parseImageTexture(imageTexture, textureTransform);
        materialSpecifications.emissive = new THREE.Color(0xffffff);
      }
      /* Ambient occlusion not fully working
      else if (type === 'occlusion')
        materialSpecifications.aoMap = this.parseImageTexture(imageTexture, textureTransform);
      */
    }

    var mat = new THREE.MeshStandardMaterial(materialSpecifications);
    mat.userData.x3dType = 'PBRAppearance';
    if (isTransparent)
      mat.transparent = true;
    mat.userData.hasTransparentTexture = materialSpecifications.map && materialSpecifications.map.userData.isTransparent;
    this._setCustomId(pbrAppearance, mat);
    return mat;
  }

  parseImageTexture(imageTexture, textureTransform, mat) {
    // Issues with DEF and USE image texture with different image transform.
    var texture = this._getDefNode(imageTexture);
    if (typeof texture !== 'undefined')
      return texture;

    var filename = getNodeAttribute(imageTexture, 'url', '');
    filename = filename.split(/['"\s]/).filter((n) => { return n; });
    if (filename[0] == null)
      return undefined;

    let transformData;
    if (textureTransform && textureTransform[0]) {
      var defTexture = this._getDefNode(textureTransform[0]);
      if (typeof defTexture !== 'undefined')
        transformData = defTexture.userData.transform;
      else
        transformData = this.parseTextureTransform(textureTransform[0]);
    }

    // Map ImageTexture.TextureProperties.anisotropicDegree to THREE.Texture.anisotropy.
    let anisotropy = 8; // matches with the default value: `ImageTexture.filtering = 4`
    let textureProperties = imageTexture.getElementsByTagName('TextureProperties');
    if (textureProperties.length > 0)
      anisotropy = parseFloat(getNodeAttribute(textureProperties[0], 'anisotropicDegree', '8'));

    texture = TextureLoader.createOrRetrieveTexture(filename[0], new TextureData(
      getNodeAttribute(imageTexture, 'isTransparent', 'false').toLowerCase() === 'true',
      { 's': getNodeAttribute(imageTexture, 'repeatS', 'true').toLowerCase(),
        't': getNodeAttribute(imageTexture, 'repeatT', 'true').toLowerCase() },
      anisotropy,
      transformData
    ));

    if (textureTransform && textureTransform[0])
      this._setCustomId(textureTransform[0], texture);
    this._setCustomId(imageTexture, texture);
    return texture;
  }

  parseTextureTransform(textureTransform, textureObject = undefined) {
    var transformData = {
      'center': convertStringToVec2(getNodeAttribute(textureTransform, 'center', '0 0')),
      'rotation': parseFloat(getNodeAttribute(textureTransform, 'rotation', '0')),
      'scale': convertStringToVec2(getNodeAttribute(textureTransform, 'scale', '1 1')),
      'translation': convertStringToVec2(getNodeAttribute(textureTransform, 'translation', '0 0'))
    };
    if (typeof textureObject !== 'undefined' && textureObject.isTexture)
      TextureLoader.applyTextureTransform(textureObject, transformData);
    return transformData;
  }

  parseIndexedFaceSet(ifs) {
    var coordinate = ifs.getElementsByTagName('Coordinate')[0];
    var textureCoordinate = ifs.getElementsByTagName('TextureCoordinate')[0];
    var normal = ifs.getElementsByTagName('Normal')[0];

    if (typeof coordinate !== 'undefined' && 'USE' in coordinate.attributes) {
      console.error("X3DLoader:parseIndexedFaceSet: USE 'Coordinate' node not supported.");
      coordinate = undefined;
    }
    if (typeof textureCoordinate !== 'undefined' && 'USE' in textureCoordinate.attributes) {
      console.error("X3DLoader:parseIndexedFaceSet: USE 'TextureCoordinate' node not supported.");
      textureCoordinate = undefined;
    }
    if (typeof normal !== 'undefined' && 'USE' in normal.attributes) {
      console.error("X3DLoader:parseIndexedFaceSet: USE 'Normal' node not supported.");
      normal = undefined;
    }

    var geometry = new THREE.Geometry();
    var x3dType = getNodeAttribute(ifs, 'x3dType', undefined);
    geometry.userData = { 'x3dType': (typeof x3dType === 'undefined' ? 'IndexedFaceSet' : x3dType) };
    if (typeof coordinate === 'undefined')
      return geometry;

    var indicesStr = getNodeAttribute(ifs, 'coordIndex', '').split(/\s/);
    var verticesStr = getNodeAttribute(coordinate, 'point', '').split(/\s/);
    var hasTexCoord = 'texCoordIndex' in ifs.attributes;
    var texcoordIndexStr = hasTexCoord ? getNodeAttribute(ifs, 'texCoordIndex', '') : '';
    var texcoordsStr = hasTexCoord ? getNodeAttribute(textureCoordinate, 'point', '') : '';

    for (let i = 0; i < verticesStr.length; i += 3) {
      var v = new THREE.Vector3();
      v.x = parseFloat(verticesStr[i + 0]);
      v.y = parseFloat(verticesStr[i + 1]);
      v.z = parseFloat(verticesStr[i + 2]);
      geometry.vertices.push(v);
    }

    var normalArray, normalIndicesStr;
    if (typeof normal !== 'undefined') {
      var normalStr = getNodeAttribute(normal, 'vector', '').split(/[\s,]+/);
      normalIndicesStr = getNodeAttribute(ifs, 'normalIndex', '').split(/\s/);
      normalArray = [];
      for (let i = 0; i < normalStr.length; i += 3) {
        normalArray.push(new THREE.Vector3(
          parseFloat(normalStr[i + 0]),
          parseFloat(normalStr[i + 1]),
          parseFloat(normalStr[i + 2])));
      }
    }

    if (hasTexCoord) {
      var isDefaultMapping = getNodeAttribute(ifs, 'defaultMapping', 'false').toLowerCase() === 'true';
      var texcoords = texcoordsStr.split(/\s/);
      var uvs = [];
      for (let i = 0; i < texcoords.length; i += 2) {
        v = new THREE.Vector2();
        v.x = parseFloat(texcoords[i + 0]);
        v.y = parseFloat(texcoords[i + 1]);
        if (isDefaultMapping) {
          // add small offset to avoid using the exact same texture coordinates for a face
          // (i.e. mapping to a line or a point) that is causing a rendering issue
          // https://github.com/cyberbotics/webots/issues/752
          v.x += 0.01 * Math.random();
          v.y += 0.01 * Math.random();
        }
        uvs.push(v);
      }
    }

    // Now pull out the face indices.
    if (hasTexCoord)
      var texIndices = texcoordIndexStr.split(/\s/);
    for (let i = 0; i < indicesStr.length; i++) {
      var faceIndices = [];
      var uvIndices = [];
      var normalIndices = [];
      while (parseFloat(indicesStr[i]) >= 0) {
        faceIndices.push(parseFloat(indicesStr[i]));
        if (hasTexCoord)
          uvIndices.push(parseFloat(texIndices[i]));
        if (typeof normalIndicesStr !== 'undefined')
          normalIndices.push(parseFloat(normalIndicesStr[i]));
        i++;
      }

      var faceNormal;
      while (faceIndices.length > 3) {
        // Take the last three, make a triangle, and remove the
        // middle one (works for convex & continuously wrapped).
        if (hasTexCoord) {
          // Add to the UV layer.
          geometry.faceVertexUvs[0].push([
            uvs[parseFloat(uvIndices[uvIndices.length - 3])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 2])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 1])].clone()
          ]);
          // Remove the second-to-last vertex.
          var tmp = uvIndices[uvIndices.length - 1];
          uvIndices.pop();
          uvIndices[uvIndices.length - 1] = tmp;
        }

        faceNormal = undefined;
        if (typeof normal !== 'undefined') {
          faceNormal = [
            normalArray[normalIndices[faceIndices.length - 3]],
            normalArray[normalIndices[faceIndices.length - 2]],
            normalArray[normalIndices[faceIndices.length - 1]]];
        }

        // Make a face.
        geometry.faces.push(new THREE.Face3(
          faceIndices[faceIndices.length - 3],
          faceIndices[faceIndices.length - 2],
          faceIndices[faceIndices.length - 1],
          faceNormal
        ));
        // Remove the second-to-last vertex.
        tmp = faceIndices[faceIndices.length - 1];
        faceIndices.pop();
        faceIndices[faceIndices.length - 1] = tmp;
      }

      // Make a face with the final three.
      if (faceIndices.length === 3) {
        if (hasTexCoord) {
          geometry.faceVertexUvs[0].push([
            uvs[parseFloat(uvIndices[uvIndices.length - 3])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 2])].clone(),
            uvs[parseFloat(uvIndices[uvIndices.length - 1])].clone()
          ]);
        }

        if (typeof normal !== 'undefined') {
          faceNormal = [
            normalArray[normalIndices[faceIndices.length - 3]],
            normalArray[normalIndices[faceIndices.length - 2]],
            normalArray[normalIndices[faceIndices.length - 1]]];
        }

        geometry.faces.push(new THREE.Face3(
          faceIndices[0], faceIndices[1], faceIndices[2], faceNormal
        ));
      }
    }

    geometry.computeBoundingSphere();
    if (typeof normal === 'undefined')
      geometry.computeVertexNormals();

    this._setCustomId(coordinate, geometry);
    if (hasTexCoord)
      this._setCustomId(textureCoordinate, geometry);

    return geometry;
  }

  parseIndexedLineSet(ils) {
    var coordinate = ils.getElementsByTagName('Coordinate')[0];
    if (typeof coordinate !== 'undefined' && 'USE' in coordinate.attributes) {
      console.error("X3DLoader:parseIndexedLineSet: USE 'Coordinate' node not supported.");
      coordinate = undefined;
    }

    var geometry = new THREE.BufferGeometry();
    geometry.userData = { 'x3dType': 'IndexedLineSet' };
    if (typeof coordinate === 'undefined')
      return geometry;

    var indicesStr = getNodeAttribute(ils, 'coordIndex', '').trim().split(/\s/);
    var verticesStr = getNodeAttribute(coordinate, 'point', '').trim().split(/\s/);

    var positions = new Float32Array(verticesStr.length * 3);
    for (let i = 0; i < verticesStr.length; i += 3) {
      positions[i] = parseFloat(verticesStr[i + 0]);
      positions[i + 1] = parseFloat(verticesStr[i + 1]);
      positions[i + 2] = parseFloat(verticesStr[i + 2]);
    }

    var indices = [];
    for (let i = 0; i < indicesStr.length; i++) {
      while (parseFloat(indicesStr[i]) >= 0) {
        indices.push(parseFloat(indicesStr[i]));
        i++;
      }
    }

    geometry.setIndex(new THREE.BufferAttribute(new Uint16Array(indices), 1));
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeBoundingSphere();

    this._setCustomId(coordinate, geometry);

    return geometry;
  }

  parseElevationGrid(eg) {
    var heightStr = getNodeAttribute(eg, 'height', undefined);
    var xDimension = parseInt(getNodeAttribute(eg, 'xDimension', '0'));
    var xSpacing = parseFloat(getNodeAttribute(eg, 'xSpacing', '1'));
    var zDimension = parseInt(getNodeAttribute(eg, 'zDimension', '0'));
    var zSpacing = parseFloat(getNodeAttribute(eg, 'zSpacing', '1'));

    var width = (xDimension - 1) * xSpacing;
    var depth = (zDimension - 1) * zSpacing;

    var geometry = new THREE.PlaneBufferGeometry(width, depth, xDimension - 1, zDimension - 1);
    geometry.userData = { 'x3dType': 'ElevationGrid' };
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(width / 2, 0, depth / 2); // center located in the corner
    if (typeof heightStr === 'undefined')
      return geometry;

    // Set height and adjust uv mappings.
    var heightArray = heightStr.trim().split(/\s/);
    var vertices = geometry.getAttribute('position').array;
    var uv = geometry.getAttribute('uv').array;
    var maxIndex = heightArray.length;
    var i = 0;
    var v = 1;
    for (let dx = 0; dx < xDimension; dx++) {
      for (let dz = 0; dz < zDimension; dz++) {
        var index = xDimension * dx + dz;
        if (index < maxIndex)
          vertices[i + 1] = parseFloat(heightArray[index]);
        uv[v] = -uv[v];
        i += 3;
        v += 2;
      }
    }

    geometry.computeVertexNormals();

    return geometry;
  }

  parseBox(box) {
    var size = convertStringToVec3(getNodeAttribute(box, 'size', '2 2 2'));
    var boxGeometry = new THREE.BoxBufferGeometry(size.x, size.y, size.z);
    boxGeometry.userData = { 'x3dType': 'Box' };
    return boxGeometry;
  }

  parseCone(cone) {
    var radius = getNodeAttribute(cone, 'bottomRadius', '1');
    var height = getNodeAttribute(cone, 'height', '2');
    var subdivision = getNodeAttribute(cone, 'subdivision', '32');
    var side = getNodeAttribute(cone, 'side', 'true').toLowerCase() === 'true';
    var bottom = getNodeAttribute(cone, 'bottom', 'true').toLowerCase() === 'true';
    // Note: the three.js Cone is created with thetaStart = Math.PI / 2 to match X3D texture mapping.
    var coneGeometry;
    if (side && bottom)
      coneGeometry = new THREE.ConeBufferGeometry(radius, height, subdivision, 1, false, Math.PI / 2);
    else {
      coneGeometry = new THREE.Geometry();
      if (side) {
        var sideGeometry = new THREE.ConeGeometry(radius, height, subdivision, 1, true, Math.PI / 2);
        coneGeometry.merge(sideGeometry);
      }
      if (bottom) {
        var bottomGeometry = new THREE.CircleGeometry(radius, subdivision);
        var bottomMatrix = new THREE.Matrix4();
        bottomMatrix.makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2));
        bottomMatrix.setPosition(new THREE.Vector3(0, -height / 2, 0));
        coneGeometry.merge(bottomGeometry, bottomMatrix);
      }
    }
    coneGeometry.userData = { 'x3dType': 'Cone' };
    coneGeometry.rotateY(Math.PI / 2);
    return coneGeometry;
  }

  parseCylinder(cylinder) {
    var radius = getNodeAttribute(cylinder, 'radius', '1');
    var height = getNodeAttribute(cylinder, 'height', '2');
    var subdivision = getNodeAttribute(cylinder, 'subdivision', '32');
    var bottom = getNodeAttribute(cylinder, 'bottom', 'true').toLowerCase() === 'true';
    var side = getNodeAttribute(cylinder, 'side', 'true').toLowerCase() === 'true';
    var top = getNodeAttribute(cylinder, 'top', 'true').toLowerCase() === 'true';
    // Note: the three.js Cylinder is created with thetaStart = Math.PI / 2 to match X3D texture mapping.
    var cylinderGeometry;
    if (bottom && side && top)
      cylinderGeometry = new THREE.CylinderBufferGeometry(radius, radius, height, subdivision, 1, false, Math.PI / 2);
    else {
      cylinderGeometry = new THREE.Geometry();
      if (side) {
        var sideGeometry = new THREE.CylinderGeometry(radius, radius, height, subdivision, 1, true, Math.PI / 2);
        cylinderGeometry.merge(sideGeometry);
      }
      if (top) {
        var topGeometry = new THREE.CircleGeometry(radius, subdivision);
        var topMatrix = new THREE.Matrix4();
        topMatrix.makeRotationFromEuler(new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2));
        topMatrix.setPosition(new THREE.Vector3(0, height / 2, 0));
        cylinderGeometry.merge(topGeometry, topMatrix);
      }
      if (bottom) {
        var bottomGeometry = new THREE.CircleGeometry(radius, subdivision);
        var bottomMatrix = new THREE.Matrix4();
        bottomMatrix.makeRotationFromEuler(new THREE.Euler(Math.PI / 2, 0, Math.PI / 2));
        bottomMatrix.setPosition(new THREE.Vector3(0, -height / 2, 0));
        cylinderGeometry.merge(bottomGeometry, bottomMatrix);
      }
    }
    cylinderGeometry.userData = { 'x3dType': 'Cylinder' };
    cylinderGeometry.rotateY(Math.PI / 2);
    return cylinderGeometry;
  }

  parseSphere(sphere) {
    var radius = getNodeAttribute(sphere, 'radius', '1');
    var subdivision = getNodeAttribute(sphere, 'subdivision', '8,8').split(',');
    var ico = getNodeAttribute(sphere, 'ico', 'false').toLowerCase() === 'true';
    var sphereGeometry;
    if (ico) {
      sphereGeometry = new THREE.IcosahedronBufferGeometry(radius, subdivision[0]);
      sphereGeometry.rotateY(Math.PI / 2);
    } else
      sphereGeometry = new THREE.SphereBufferGeometry(radius, subdivision[0], subdivision[1], -Math.PI / 2); // thetaStart: -Math.PI/2
    sphereGeometry.userData = { 'x3dType': 'Sphere' };
    return sphereGeometry;
  }

  parsePlane(plane) {
    var size = convertStringToVec2(getNodeAttribute(plane, 'size', '1,1'));
    var planeGeometry = new THREE.PlaneBufferGeometry(size.x, size.y);
    planeGeometry.userData = { 'x3dType': 'Plane' };
    planeGeometry.rotateX(-Math.PI / 2);
    return planeGeometry;
  }

  parsePointSet(pointSet) {
    var coordinate = pointSet.getElementsByTagName('Coordinate')[0];
    var geometry = new THREE.BufferGeometry();
    geometry.userData = { 'x3dType': 'PointSet' };
    if (typeof coordinate === 'undefined')
      return geometry;

    var coordStrArray = getNodeAttribute(coordinate, 'point', '').trim().split(/\s/);
    var color = pointSet.getElementsByTagName('Color')[0];

    var count = coordStrArray.length;
    var colorStrArray;
    geometry.userData.isColorPerVertex = false;
    if (typeof color !== 'undefined') {
      colorStrArray = getNodeAttribute(color, 'color', '').trim().split(/\s/);
      if (typeof colorStrArray !== 'undefined') {
        if (count !== colorStrArray.length) {
          count = Math.min(count, colorStrArray.length);
          console.error("X3DLoader:parsePointSet: 'coord' and 'color' fields size doesn't match.");
        }
        geometry.userData.isColorPerVertex = true;
      }
    }

    var positions = new Float32Array(count);
    for (let i = 0; i < count; i++)
      positions[i] = parseFloat(coordStrArray[i]);
    geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));

    if (geometry.userData.isColorPerVertex) {
      var colors = new Float32Array(count);
      for (let i = 0; i < count; i++)
        colors[i] = parseFloat(colorStrArray[i]);
      geometry.addAttribute('color', new THREE.BufferAttribute(colors, 3));
    }

    geometry.computeBoundingBox();
    return geometry;
  }

  parseDirectionalLight(light) {
    var on = getNodeAttribute(light, 'on', 'true').toLowerCase() === 'true';
    if (!on)
      return;

    var color = convertStringToColor(getNodeAttribute(light, 'color', '1 1 1'), false);
    var direction = convertStringToVec3(getNodeAttribute(light, 'direction', '0 0 -1'));
    var intensity = parseFloat(getNodeAttribute(light, 'intensity', '1'));
    var castShadows = getNodeAttribute(light, 'castShadows', 'false').toLowerCase() === 'true';

    var lightObject = new THREE.DirectionalLight(color.getHex(), intensity);
    if (castShadows) {
      lightObject.castShadow = true;
      var shadowMapSize = parseFloat(getNodeAttribute(light, 'shadowMapSize', '1024'));
      lightObject.shadow.mapSize.width = shadowMapSize;
      lightObject.shadow.mapSize.height = shadowMapSize;
      lightObject.shadow.radius = parseFloat(getNodeAttribute(light, 'shadowsRadius', '1.5'));
      lightObject.shadow.bias = parseFloat(getNodeAttribute(light, 'shadowBias', '0.000001'));
      lightObject.shadow.camera.near = parseFloat(getNodeAttribute(light, 'zNear', '0.001;'));
      lightObject.shadow.camera.far = parseFloat(getNodeAttribute(light, 'zFar', '2000'));
    }
    lightObject.position.set(-direction.x, -direction.y, -direction.z);
    lightObject.userData = { 'x3dType': 'DirectionalLight' };
    // Position of the directional light will be adjusted at the end of the load
    // based on the size of the scene so that all the objects are illuminated by this light.
    this.directionalLights.push(lightObject);
    return lightObject;
  }

  parsePointLight(light) {
    var on = getNodeAttribute(light, 'on', 'true').toLowerCase() === 'true';
    if (!on)
      return;

    var attenuation = convertStringToVec3(getNodeAttribute(light, 'attenuation', '1 0 0'));
    var color = convertStringToColor(getNodeAttribute(light, 'color', '1 1 1'), false);
    var intensity = parseFloat(getNodeAttribute(light, 'intensity', '1'));
    var location = convertStringToVec3(getNodeAttribute(light, 'location', '0 0 0'));
    var radius = parseFloat(getNodeAttribute(light, 'radius', '100'));
    var castShadows = getNodeAttribute(light, 'castShadows', 'false').toLowerCase() === 'true';

    var lightObject = new THREE.PointLight(color.getHex());

    // Tradeoff to let cohabit VRML light attenuation and the three.js light "physically correct mode".
    // - The intensity is attenuated by the total amount of the VRML attenuation.
    // - The biggest attenuation component defines the `decay` "exponent".
    lightObject.intensity = intensity / attenuation.manhattanLength();
    if (attenuation.x > 0)
      lightObject.decay = 0;
    if (attenuation.y > 0)
      lightObject.decay = 1;
    if (attenuation.z > 0)
      lightObject.decay = 2;
    lightObject.distance = radius;

    if (castShadows) {
      lightObject.castShadow = true;
      var shadowMapSize = parseFloat(getNodeAttribute(light, 'shadowMapSize', '512'));
      lightObject.shadow.mapSize.width = shadowMapSize;
      lightObject.shadow.mapSize.height = shadowMapSize;
      lightObject.shadow.radius = parseFloat(getNodeAttribute(light, 'shadowsRadius', '1'));
      lightObject.shadow.bias = parseFloat(getNodeAttribute(light, 'shadowBias', '0'));
      lightObject.shadow.camera.near = parseFloat(getNodeAttribute(light, 'zNear', '0.001;'));
      lightObject.shadow.camera.far = radius;
    }
    lightObject.position.copy(location);
    lightObject.userData = { 'x3dType': 'PointLight' };
    return lightObject;
  }

  parseSpotLight(light, helperNodes) {
    var on = getNodeAttribute(light, 'on', 'true').toLowerCase() === 'true';
    if (!on)
      return;

    var attenuation = convertStringToVec3(getNodeAttribute(light, 'attenuation', '1 0 0'));
    var beamWidth = parseFloat(getNodeAttribute(light, 'beamWidth', '0.785'));
    var color = convertStringToColor(getNodeAttribute(light, 'color', '1 1 1'), false);
    var cutOffAngle = parseFloat(getNodeAttribute(light, 'cutOffAngle', '0.785'));
    var direction = convertStringToVec3(getNodeAttribute(light, 'direction', '0 0 -1'));
    var intensity = parseFloat(getNodeAttribute(light, 'intensity', '1'));
    var location = convertStringToVec3(getNodeAttribute(light, 'location', '0 0 0'));
    var radius = parseFloat(getNodeAttribute(light, 'radius', '100'));
    var castShadows = getNodeAttribute(light, 'castShadows', 'false').toLowerCase() === 'true';

    var lightObject = new THREE.SpotLight(color.getHex());

    lightObject.intensity = intensity / attenuation.manhattanLength();
    if (attenuation.x > 0)
      lightObject.decay = 0;
    if (attenuation.y > 0)
      lightObject.decay = 1;
    if (attenuation.z > 0)
      lightObject.decay = 2;
    lightObject.distance = radius;

    lightObject.angle = cutOffAngle;
    if (beamWidth > cutOffAngle)
      lightObject.penumbra = 0.0;
    else
      lightObject.penumbra = 1.0 - (beamWidth / cutOffAngle);

    if (castShadows) {
      lightObject.castShadow = true;
      var shadowMapSize = parseFloat(getNodeAttribute(light, 'shadowMapSize', '512'));
      lightObject.shadow.mapSize.width = shadowMapSize;
      lightObject.shadow.mapSize.height = shadowMapSize;
      lightObject.shadow.radius = parseFloat(getNodeAttribute(light, 'shadowsRadius', '1'));
      lightObject.shadow.bias = parseFloat(getNodeAttribute(light, 'shadowBias', '0'));
      lightObject.shadow.camera.near = parseFloat(getNodeAttribute(light, 'zNear', '0.001;'));
      lightObject.shadow.camera.far = radius;
    }
    lightObject.position.copy(location);
    lightObject.target = new THREE.Object3D();
    lightObject.target.position.addVectors(lightObject.position, direction);
    lightObject.target.userData.x3dType = 'LightTarget';
    helperNodes.push(lightObject.target);
    lightObject.userData = { 'x3dType': 'SpotLight' };
    return lightObject;
  }

  parseBackground(background) {
    this.scene.scene.background = convertStringToColor(getNodeAttribute(background, 'skyColor', '0 0 0'));
    this.scene.scene.userData.luminosity = parseFloat(getNodeAttribute(background, 'luminosity', '1.0'));
    this.scene.scene.irradiance = undefined;

    var backgroundEnabled = false;
    var irradianceEnabled = false;

    var backgroundFields = ['leftUrl', 'rightUrl', 'topUrl', 'bottomUrl', 'backUrl', 'frontUrl'];
    var irradianceFields = ['leftIrradianceUrl', 'rightIrradianceUrl', 'topIrradianceUrl', 'bottomIrradianceUrl', 'backIrradianceUrl', 'frontIrradianceUrl'];

    var backgroundURLs = [];
    var irradianceURLs = [];
    for (let i = 0; i < 6; i++) {
      let url = getNodeAttribute(background, backgroundFields[i], undefined);
      if (typeof url !== 'undefined') {
        backgroundEnabled = true;
        url = url.split(/['"\s]/).filter((n) => { return n; })[0];
      }
      backgroundURLs.push(url);

      url = getNodeAttribute(background, irradianceFields[i], undefined);
      if (typeof url !== 'undefined') {
        irradianceEnabled = true;
        url = url.split(/['"\s]/).filter((n) => { return n; })[0];
      }
      irradianceURLs.push(url);
    }

    if (backgroundEnabled) {
      let cubeTexture = new THREE.CubeTexture();
      cubeTexture.encoding = THREE.sRGBEncoding;

      for (let i = 0; i < 6; i++) {
        if (typeof backgroundURLs[i] === 'undefined')
          continue;
        // Look for already loaded texture or load the texture in an asynchronous way.
        TextureLoader.loadOrRetrieveImage(backgroundURLs[i], cubeTexture, i);
      }
      this.scene.scene.background = cubeTexture;
      cubeTexture.needsUpdate = true;
    }

    if (irradianceEnabled) {
      let cubeTexture = new THREE.CubeTexture();
      cubeTexture.format = THREE.RGBFormat;
      cubeTexture.type = THREE.FloatType;

      for (let i = 0; i < 6; i++) {
        if (typeof irradianceURLs[i] === 'undefined')
          continue;
        // Look for already loaded texture or load the texture in an asynchronous way.
        TextureLoader.loadOrRetrieveImage(irradianceURLs[i], cubeTexture, i);
      }
      this.scene.scene.userData.irradiance = cubeTexture;
      cubeTexture.needsUpdate = true;
    }

    // Light offset: empirically found to match the Webots rendering.
    var ambientLight = new THREE.AmbientLight(0xffffff);
    this.scene.scene.add(ambientLight);

    return undefined;
  }

  parseViewpoint(viewpoint) {
    var fov = parseFloat(getNodeAttribute(viewpoint, 'fieldOfView', '0.785'));
    var near = parseFloat(getNodeAttribute(viewpoint, 'zNear', '0.1'));
    var far = parseFloat(getNodeAttribute(viewpoint, 'zFar', '2000'));
    if (typeof this.scene.viewpoint !== 'undefined') {
      this.scene.viewpoint.camera.near = near;
      this.scene.viewpoint.camera.far = far;
    } else {
      console.log('Parse Viewpoint: error camera');
      // Set default aspect ratio to 1. It will be updated on window resize.
      this.scene.viewpoint.camera = new THREE.PerspectiveCamera(0.785, 1, near, far);
    }

    // camera.fov should be updated at each window resize.
    this.scene.viewpoint.camera.fovX = fov; // radians
    this.scene.viewpoint.camera.fov = THREE.Math.radToDeg(horizontalToVerticalFieldOfView(fov, this.scene.viewpoint.camera.aspect)); // degrees

    if ('position' in viewpoint.attributes) {
      var position = getNodeAttribute(viewpoint, 'position', '0 0 10');
      this.scene.viewpoint.camera.position.copy(convertStringToVec3(position));
    }
    if ('orientation' in viewpoint.attributes) {
      var quaternion = convertStringToQuaternion(getNodeAttribute(viewpoint, 'orientation', '0 1 0 0'));
      this.scene.viewpoint.camera.quaternion.copy(quaternion);
    }
    this.scene.viewpoint.camera.updateProjectionMatrix();

    // Set Webots specific attributes.
    this.scene.viewpoint.camera.userData.x3dType = 'Viewpoint';
    this.scene.viewpoint.camera.userData.followedId = getNodeAttribute(viewpoint, 'followedId', null);
    this.scene.viewpoint.camera.userData.followSmoothness = getNodeAttribute(viewpoint, 'followSmoothness', null);
    this.scene.viewpoint.camera.userData.exposure = parseFloat(getNodeAttribute(viewpoint, 'exposure', '1.0'));
    return undefined;
  }

  parseWorldInfo(worldInfo) {
    this.scene.worldInfo.title = getNodeAttribute(worldInfo, 'title', '');
    this.scene.worldInfo.window = getNodeAttribute(worldInfo, 'window', '');
  }

  parseFog(fog) {
    var colorInt = convertStringToColor(getNodeAttribute(fog, 'color', '1 1 1'), false).getHex();
    var visibilityRange = parseFloat(getNodeAttribute(fog, 'visibilityRange', '0'));

    var fogObject = null;
    var fogType = getNodeAttribute(fog, 'fogType', 'LINEAR');
    if (fogType === 'LINEAR')
      fogObject = new THREE.Fog(colorInt, 0.001, visibilityRange);
    else
      fogObject = new THREE.FogExp2(colorInt, 1.0 / visibilityRange);
    this.scene.scene.fog = fogObject;
    return undefined;
  }

  _setCustomId(node, object, defNode) {
    // Some THREE.js nodes, like the material and IndexedFaceSet, merges multiple X3D nodes.
    // In order to be able to retrieve the node to be updated, we need to assign to the object all the ids of the merged X3D nodes.
    if (!node || !object)
      return;
    var id = getNodeAttribute(node, 'id', undefined);
    if (typeof id !== 'undefined') {
      if (object.name !== '')
        object.name = object.name + ';' + String(id);
      else
        object.name = String(id);
      if (defNode) {
        if (typeof defNode.userData.USE === 'undefined')
          defNode.userData.USE = String(id);
        else
          defNode.userData.USE = defNode.userData.USE + ';' + String(id);
      }
    }
  }

  _getDefNode(node) {
    var useNodeId = getNodeAttribute(node, 'USE', undefined);
    if (typeof useNodeId === 'undefined')
      return undefined;

    // Look for node in previously parsed objects
    var defNode = this.scene.getObjectById(useNodeId, false, this.parsedObjects);
    if (typeof defNode !== 'undefined')
      return defNode;

    // Look for node in the already loaded scene
    defNode = this.scene.getObjectById(useNodeId, false, this.scene.root);
    if (typeof defNode === 'undefined')
      console.error('X3dLoader: no matching DEF node "' + useNodeId + '" node.');
    return defNode;
  }

  static applyTextureTransformToMaterial(material, textureTransform) {
    if (typeof material === 'undefined' || !material.isMaterial) {
      console.error('X3DLoader:parseTextureTransform: invalid parent object.');
      return;
    }
    var maps = [material.map, material.roughnessMap, material.metalnessMap, material.normalMap, material.emissiveMap, material.aoMap];
    maps.forEach((map) => {
      if (map && map.isTexture)
        TextureLoader.applyTextureTransform(map, textureTransform);
    });
  }
};

function getNodeAttribute(node, attributeName, defaultValue) {
  console.assert(node && node.attributes);
  if (attributeName in node.attributes)
    return node.attributes.getNamedItem(attributeName).value;
  return defaultValue;
}

function createDefaultGeometry() {
  var geometry = new THREE.Geometry();
  geometry.userData = { 'x3dType': 'unknown' };
  return geometry;
};

function createDefaultMaterial(geometry) {
  var material;
  if (typeof geometry !== 'undefined' && geometry.userData.x3dType === 'PointSet' && geometry.userData.isColorPerVertex)
    material = new THREE.PointsMaterial({ size: 4, sizeAttenuation: false, vertexColors: THREE.VertexColors });
  else
    material = new THREE.MeshBasicMaterial({color: 0xffffff});
  return material;
};

function convertStringToVec2(s) {
  s = s.split(/\s/);
  var v = new THREE.Vector2(parseFloat(s[0]), parseFloat(s[1]));
  return v;
}

function convertStringToVec3(s) {
  s = s.split(/\s/);
  var v = new THREE.Vector3(parseFloat(s[0]), parseFloat(s[1]), parseFloat(s[2]));
  return v;
}

function convertStringToQuaternion(s) {
  var pos = s.split(/\s/);
  var q = new THREE.Quaternion();
  q.setFromAxisAngle(
    new THREE.Vector3(parseFloat(pos[0]), parseFloat(pos[1]), parseFloat(pos[2])),
    parseFloat(pos[3])
  );
  return q;
}

function convertStringToColor(s, sRGB = true) {
  var v = convertStringToVec3(s);
  var color = new THREE.Color(v.x, v.y, v.z);
  if (sRGB)
    color.convertSRGBToLinear();
  return color;
}

function horizontalToVerticalFieldOfView(hFov, aspectRatio) {
  // Units of the angles: radians.
  // reference: WbViewpoint::updateFieldOfViewY()

  // According to VRML standards, the meaning of mFieldOfView depends on the aspect ratio:
  // the view angle is taken with respect to the largest dimension

  if (aspectRatio < 1.0)
    return hFov;

  return 2.0 * Math.atan(Math.tan(0.5 * hFov) / aspectRatio);
}

THREE.X3DLoader.textures = {};
/* global THREE, Selector, TextureLoader, Viewpoint */
/* global convertStringToVec2, convertStringToVec3, convertStringToQuaternion, convertStringToColor, horizontalToVerticalFieldOfView */
/* global createDefaultGeometry, createDefaultMaterial */
'use strict';

class X3dScene { // eslint-disable-line no-unused-vars
  constructor(domElement) {
    this.domElement = domElement;
    this.root = undefined;
    this.worldInfo = {};
    this.viewpoint = undefined;
    this.sceneModified = false;
    this.useNodeCache = {};
    this.objectsIdCache = {};
  }

  init(texturePathPrefix = '') {
    this.renderer = new THREE.WebGLRenderer({'antialias': false});
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0xffffff, 1.0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
    this.renderer.gammaInput = false;
    this.renderer.gammaOutput = false;
    this.renderer.physicallyCorrectLights = true;
    this.domElement.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.renderAllAtLoad = false;

    this.viewpoint = new Viewpoint();
    this.viewpoint.onCameraParametersChanged = (updateScene) => {
      if (this.gpuPicker)
        this.gpuPicker.needUpdate = true;
      if (updateScene)
        this.render();
    };

    this.selector = new Selector();
    this.selector.onSelectionChange = () => { this.render(); };

    this.gpuPicker = new THREE.GPUPicker({renderer: this.renderer, debug: false});
    this.gpuPicker.setFilter((object) => {
      return object.isMesh &&
             'x3dType' in object.userData &&
             object.userData.isPickable !== false; // true or undefined
    });
    this.gpuPicker.setScene(this.scene);
    this.gpuPicker.setCamera(this.viewpoint.camera);

    // add antialiasing post-processing effects
    this.composer = new THREE.EffectComposer(this.renderer);
    let renderPass = new THREE.RenderPass(this.scene, this.viewpoint.camera);
    this.composer.addPass(renderPass);
    this.bloomPass = new THREE.Bloom(new THREE.Vector2(window.innerWidth, window.innerHeight));
    this.composer.addPass(this.bloomPass);
    this.hdrResolvePass = new THREE.ShaderPass(THREE.HDRResolveShader);
    this.composer.addPass(this.hdrResolvePass);
    var fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
    this.composer.addPass(fxaaPass);

    this.resize();

    this.destroyWorld();

    TextureLoader.setTexturePathPrefix(texturePathPrefix);
    TextureLoader.setOnTextureLoad(() => {
      if (this.renderAllAtLoad && !TextureLoader.hasPendingData()) {
        this.renderAllAtLoad = false;
        this.scene.traverse((object) => { object.frustumCulled = true; });
      }
      this.render();
    });
  }

  render() {
    // Apply pass uniforms.
    this.hdrResolvePass.material.uniforms['exposure'].value = 2.0 * this.viewpoint.camera.userData.exposure; // Factor empirically found to match the Webots rendering.
    this.bloomPass.threshold = this.viewpoint.camera.userData.bloomThreshold;
    this.bloomPass.enabled = this.bloomPass.threshold >= 0;

    if (typeof this.preRender === 'function')
      this.preRender(this.scene, this.viewpoint.camera);
    this.composer.render();
    if (typeof this.postRender === 'function')
      this.postRender(this.scene, this.viewpoint.camera);
  }

  resize() {
    var width = this.domElement.clientWidth;
    var height = this.domElement.clientHeight;
    this.viewpoint.camera.aspect = width / height;
    if (this.viewpoint.camera.fovX)
      this.viewpoint.camera.fov = THREE.Math.radToDeg(horizontalToVerticalFieldOfView(this.viewpoint.camera.fovX, this.viewpoint.camera.aspect));
    this.viewpoint.camera.updateProjectionMatrix();
    this.gpuPicker.resizeTexture(width, height);
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.render();
  }

  onSceneUpdate() {
    this.sceneModified = true;
    this.render();
  }

  destroyWorld() {
    this.selector.clearSelection();
    if (!this.scene)
      return;
    for (let i = this.scene.children.length - 1; i >= 0; i--)
      this.scene.remove(this.scene.children[i]);
    this.objectsIdCache = {};
    this.useNodeCache = {};
    this.root = undefined;
    this.scene.background = new THREE.Color(0, 0, 0);

    /*
    // Code to debug bloom passes.
    var geometry = new THREE.PlaneGeometry(5, 5);
    var material = new THREE.MeshStandardMaterial({color: 0xffffff, side: THREE.DoubleSide});
    this.bloomPass.debugMaterial = material;
    var plane = new THREE.Mesh(geometry, material);
    this.scene.add(plane);
    */

    this.onSceneUpdate();
    this.render();
  }

  deleteObject(id) {
    var context = {};
    var object = this.getObjectById('n' + id, false, 'scene', context);
    if (typeof object !== 'undefined') {
      var parent;
      if (typeof context !== 'undefined' && typeof context.field !== 'undefined') {
        parent = context.parent;
        if (object.isMaterial)
          parent[context.field] = createDefaultMaterial(parent.geometry);
        else if (object.isGeometry || object.isBufferGeometry)
          parent[context.field] = createDefaultGeometry();
        else
          parent[context.field] = undefined;
      } else {
        parent = object.parent;
        object.parent.remove(object);
      }
      delete this.objectsIdCache[id];
      if (typeof parent !== 'undefined')
        this._updateUseNodesIfNeeded(parent, parent.name.split(';'));
    }
    if (object === this.root)
      this.root = undefined;
    this.onSceneUpdate();
    this.render();
  }

  loadWorldFile(url, onLoad) {
    this.objectsIdCache = {};
    var loader = new THREE.X3DLoader(this);
    loader.load(url, (object3d) => {
      if (object3d.length > 0) {
        this.scene.add(object3d[0]);
        this.root = object3d[0];
      }
      this._setupLights(loader.directionalLights);
      this._setupEnvironmentMap();
      if (this.gpuPicker) {
        this.gpuPicker.setScene(this.scene);
        this.sceneModified = false;
      }

      // Render all the objects at scene load.
      // The frustumCulled parameter will be set back to TRUE once all the textures are loaded.
      this.scene.traverse((o) => {
        o.frustumCulled = false;
      });
      this.renderAllAtLoad = true;

      this.onSceneUpdate();
      if (typeof onLoad === 'function')
        onLoad();
    });
  }

  loadObject(x3dObject, parentId) {
    var parentObject;
    if (parentId && parentId !== 0)
      parentObject = this.getObjectById('n' + parentId);
    var loader = new THREE.X3DLoader(this);
    var objects = loader.parse(x3dObject, parentObject);
    if (typeof parentObject !== 'undefined')
      this._updateUseNodesIfNeeded(parentObject, parentObject.name.split(';'));
    else {
      console.assert(objects.length <= 1 && typeof this.root === 'undefined'); // only one root object is supported
      objects.forEach((o) => { this.scene.add(o); });
      this.root = objects[0];
    }
    this._setupLights(loader.directionalLights);
    this._setupEnvironmentMap();
    if (typeof parentObject === 'undefined') {
      // Render all the objects at scene load.
      // The frustumCulled parameter will be set back to TRUE once all the textures are loaded.
      this.scene.traverse((o) => {
        o.frustumCulled = false;
      });
      this.renderAllAtLoad = true;
    }
    this.onSceneUpdate();
  }

  applyPose(pose, appliedFields = []) {
    var id = pose.id;
    var fields = appliedFields;
    for (let key in pose) {
      if (key === 'id')
        continue;
      if (fields.indexOf(key) !== -1)
        continue;
      var newValue = pose[key];
      var object = this.getObjectById('n' + id, true);
      if (typeof object === 'undefined')
        continue; // error

      var valid = true;
      if (key === 'translation') {
        if (object.isTexture) {
          var translation = convertStringToVec2(newValue);
          if (object.userData && object.userData.transform) {
            object.userData.transform.translation = translation;
            object.needsUpdate = true;
            this.sceneModified = true;
          }
        } else if (object.isObject3D) {
          var newPosition = convertStringToVec3(newValue);
          // Followed object moved.
          if (this.viewpoint.followedObjectId &&
              (id === this.viewpoint.followedObjectId || // animation case
               ('n' + id) === this.viewpoint.followedObjectId || // streaming case
               object.userData.name === this.viewpoint.followedObjectId)) {
            // If this is the followed object, we save a vector with the translation applied
            // to the object to compute the new position of the viewpoint.
            this.viewpoint.setFollowedObjectDeltaPosition(newPosition, object.position);
          }
          object.position.copy(newPosition);
          this.sceneModified = true;
        }
      } else if (key === 'rotation' && object.isObject3D) { // Transform node
        var quaternion = convertStringToQuaternion(newValue);
        object.quaternion.copy(quaternion);
        this.sceneModified = true;
      } else if (object.isMaterial) {
        if (key === 'baseColor')
          object.color = convertStringToColor(newValue); // PBRAppearance node
        else if (key === 'diffuseColor')
          object.color = convertStringToColor(newValue, false); // Appearance node
        else if (key === 'emissiveColor')
          object.emissive = convertStringToColor(newValue, object.userData.x3dType === 'PBRAppearance');
      } else if (key === 'render' && object.isObject3D)
        object.visible = newValue.toLowerCase() === 'true';
      else
        valid = false;

      if (valid)
        fields.push(key);

      this._updateUseNodesIfNeeded(object, id);
    }
    return fields;
  }

  pick(relativePosition, screenPosition) {
    if (this.sceneModified) {
      this.gpuPicker.setScene(this.scene);
      this.sceneModified = false;
    }

    var raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(screenPosition, this.viewpoint.camera);
    return this.gpuPicker.pick(relativePosition, raycaster);
  }

  getCamera() {
    return this.viewpoint.camera;
  }

  getTopX3dNode(node) {
    // If it exists, return the upmost Solid, otherwise the top node.
    var upmostSolid;
    while (node) {
      if (node.userData && node.userData.solid)
        upmostSolid = node;
      if (node.parent === this.scene)
        break;
      node = node.parent;
    }
    if (typeof upmostSolid !== 'undefined')
      return upmostSolid;
    return node;
  }

  getObjectById(id, skipBoundingObject = false, object = 'scene', context = {}) {
    // @param 'object':
    //     Global case: object is the root object in which to search for.
    //     Special case to have a good default value: if object === 'scene', then the scene is used.
    if (object === 'scene')
      object = this.scene;

    if (!object ||
        (skipBoundingObject && typeof object.userData !== 'undefined' && object.userData.x3dType === 'Switch')) {
      context.parent = undefined;
      return undefined;
    }

    if (Array.isArray(object)) {
      for (let i = 0, l = object.length; i < l; i++) {
        var o = this.getObjectById(id, skipBoundingObject, object[i], context);
        if (typeof o !== 'undefined')
          return o;
      }
    }

    if (typeof this.objectsIdCache[id] !== 'undefined') {
      context.field = this.objectsIdCache[id].context.field;
      context.parent = this.objectsIdCache[id].context.parent;
      return this.objectsIdCache[id].object;
    }

    if (object.name && object.name.includes(id)) {
      this.objectsIdCache[id] = { 'object': object, 'context': context };
      return object;
    }

    var childObject;
    if (object.children) {
      for (let childIndex in object.children) {
        context.parent = object;
        childObject = this.getObjectById(id, skipBoundingObject, object.children[childIndex], context);
        if (typeof childObject !== 'undefined')
          return childObject;
      };
    }
    if (object.isMesh || object.isLineSegments || object.isPoint) {
      if (object.material) {
        childObject = this.getObjectById(id, skipBoundingObject, object.material, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'material';
          context.parent = object;
          return childObject;
        }
      }
      if (object.geometry) {
        childObject = this.getObjectById(id, skipBoundingObject, object.geometry, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'geometry';
          context.parent = object;
          return childObject;
        }
      }
    } else if (object.isMaterial) {
      if (object.map) {
        childObject = this.getObjectById(id, skipBoundingObject, object.map, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'map';
          context.parent = object;
          return childObject;
        }
      }
      if (object.aoMap) {
        childObject = this.getObjectById(id, skipBoundingObject, object.aoMap, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'aoMap';
          context.parent = object;
          return childObject;
        }
      }
      if (object.roughnessMap) {
        childObject = this.getObjectById(id, skipBoundingObject, object.roughnessMap, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'roughnessMap';
          context.parent = object;
          return childObject;
        }
      }
      if (object.metalnessMap) {
        childObject = this.getObjectById(id, skipBoundingObject, object.metalnessMap, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'metalnessMap';
          context.parent = object;
          return childObject;
        }
      }
      if (object.normalMap) {
        childObject = this.getObjectById(id, skipBoundingObject, object.normalMap, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'normalMap';
          context.parent = object;
          return childObject;
        }
      }
      if (object.emissiveMap) {
        childObject = this.getObjectById(id, skipBoundingObject, object.emissiveMap, context);
        if (typeof childObject !== 'undefined') {
          context.field = 'emissiveMap';
          context.parent = object;
          return childObject;
        }
      }
      // only fields set in x3d.js are checked
    }
    return undefined;
  }

  // private functions
  _setupLights(directionalLights) {
    if (!this.root)
      return;

    var sceneBox = new THREE.Box3();
    sceneBox.setFromObject(this.root);
    var boxSize = new THREE.Vector3();
    sceneBox.getSize(boxSize);
    var boxCenter = new THREE.Vector3();
    sceneBox.getCenter(boxCenter);
    var halfWidth = boxSize.x / 2 + boxCenter.x;
    var halfDepth = boxSize.z / 2 + boxCenter.z;
    var maxSize = 2 * Math.max(halfWidth, boxSize.y / 2 + boxCenter.y, halfDepth);
    directionalLights.forEach((light) => {
      light.position.multiplyScalar(maxSize);
      light.shadow.camera.far = Math.max(maxSize, light.shadow.camera.far);
      light.shadow.camera.left = -maxSize;
      light.shadow.camera.right = maxSize;
      light.shadow.camera.top = maxSize;
      light.shadow.camera.bottom = -maxSize;
    });
  }

  _setupEnvironmentMap() {
    var isHDR = false;
    var backgroundMap;
    if (this.scene.background) {
      if (this.scene.background.isColor) {
        let color = this.scene.background.clone();
        color.convertLinearToSRGB();
        backgroundMap = TextureLoader.createColoredCubeTexture(color);
      } else
        backgroundMap = this.scene.background;
    }

    if (typeof this.scene.userData.irradiance !== 'undefined') {
      isHDR = true;
      backgroundMap = this.scene.userData.irradiance;
    }

    this.scene.traverse((child) => {
      if (child.isMesh && child.material && child.material.isMeshStandardMaterial) {
        var material = child.material;
        material.envMap = backgroundMap;
        material.envMapIntensity = isHDR ? 0.6 : 1.0; // Factor empirically found to match the Webots rendering.
        if (typeof this.scene.userData.luminosity !== 'undefined')
          material.envMapIntensity *= this.scene.userData.luminosity;
        material.needsUpdate = true;
      }
    });
  }

  _updateUseNodesIfNeeded(object, id) {
    if (!object)
      return;

    if (Array.isArray(id)) {
      if (id.length > 1)
        id.forEach((item) => this._updateUseNodesIfNeeded(object, item));
      else
        id = id[0];
    }

    if (typeof this.useNodeCache[id] === 'undefined') {
      var node = object;
      var source;
      while (node && node !== this.root) {
        if (typeof node.userData.USE !== 'undefined')
          source = node;
        node = node.parent;
      }
      this.useNodeCache[id] = { 'source': source };
      if (typeof source !== 'undefined') {
        this.useNodeCache[id].target = [];
        source.userData.USE.split(';').forEach((useId) => {
          var useObject = this.getObjectById(useId);
          if (typeof useObject !== 'undefined')
            this.useNodeCache[id].target.push(useObject);
        });
      }
    }
    if (typeof this.useNodeCache[id].source !== 'undefined') {
      // clone again changed DEF node instance
      var sourceNode = this.useNodeCache[id].source;
      var targetNodes = this.useNodeCache[id].target;
      var newTargetNodes = [];
      for (let i = 0, l = targetNodes.length; i < l; i++) {
        var target = targetNodes[i];
        var newClone = sourceNode.clone();
        newClone.name = target.name;
        var parent = target.parent;
        var index = parent.children.indexOf(target);
        parent.remove(target);

        // manually add new child to keep the same child index.
        parent.children.splice(index, 0, newClone);
        newClone.parent = parent;
        object.dispatchEvent({ type: 'added' });

        newTargetNodes.push(newClone);
      }
      this.useNodeCache[id].target = newTargetNodes;
    }
  }
}
/* global DefaultUrl, TextureLoader */
'use strict';

class Animation { // eslint-disable-line no-unused-vars
  constructor(url, scene, view, gui, loop) {
    this.url = url;
    this.scene = scene;
    this.view = view;
    this.gui = typeof gui === 'undefined' || gui === 'play' ? 'real_time' : 'pause';
    this.loop = typeof loop === 'undefined' ? true : loop;
    this.sliding = false;
    this.onReady = null;
  };

  init(onReady) {
    this.onReady = onReady;
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.open('GET', this.url, true);
    xmlhttp.overrideMimeType('application/json');
    xmlhttp.onreadystatechange = () => {
      if (xmlhttp.readyState === 4 && xmlhttp.status === 200)
        this._setup(JSON.parse(xmlhttp.responseText));
    };
    xmlhttp.send();
  }

  // Return the animation status: play or pause.
  // This should be used to store the current animation status and restore it later when calling webots.View.setAnimation().
  // This is for example used in robotbenchmark.net benchmark page.
  getStatus() {
    return this.gui === 'real_time' ? 'play' : 'pause';
  }

  // private methods
  _setup(data) {
    this.data = data;
    // extract animated node ids: remove empty items and convert to integer
    this.allIds = this.data.ids.split(';').filter(Boolean).map(s => parseInt(s));

    // Automatically start the animation only when all the textures are loaded.
    if (this.gui === 'real_time' && TextureLoader.hasPendingData())
      this.gui = 'play_on_load'; // wait for textures loading

    // Create play bar.
    var div = document.createElement('div');
    div.id = 'playBar';
    this.view.view3D.appendChild(div);

    this.button = document.createElement('button');
    this.button.id = 'playPauseButton';
    var action = (this.gui === 'real_time') ? 'pause' : 'real_time';
    this.button.style.backgroundImage = 'url(' + DefaultUrl.wwiImagesUrl() + action + '.png)';
    this.button.style.padding = '0';
    this.button.addEventListener('click', () => { this._triggerPlayPauseButton(); });
    div.appendChild(this.button);

    var slider = document.createElement('div');
    slider.id = 'playSlider';
    div.appendChild(slider);
    this.playSlider = $('#playSlider').slider();
    this._connectSliderEvents();

    // Initialize animation data.
    this.start = new Date().getTime();
    this.step = 0;
    this.previousStep = 0;
    this._updateAnimation();

    // Notify creation completed.
    if (typeof this.onReady === 'function')
      this.onReady();
  }

  _elapsedTime() {
    var end = new Date().getTime();
    return end - this.start;
  }

  _triggerPlayPauseButton() {
    this.button.style.backgroundImage = 'url(' + DefaultUrl.wwiImagesUrl() + this._getIconBaseName(this.gui) + '.png)';
    if (this.gui === 'real_time') {
      this.gui = 'pause';
      if (this.step < 0 || this.step >= this.data.frames.length) {
        this.start = new Date().getTime();
        this._updateAnimationState();
      } else
        this.start = new Date().getTime() - this.data.basicTimeStep * this.step;
    } else {
      this.gui = 'real_time';
      this.start = new Date().getTime() - this.data.basicTimeStep * this.step;
      window.requestAnimationFrame(() => { this._updateAnimation(); });
    }
  }

  _connectSliderEvents() {
    this.playSlider = this.playSlider.slider({
      change: (e, ui) => {
        this._updateSlider(ui.value);
        // continue running the animation
        this._updateAnimation();
      },
      slide: (e, ui) => { this._updateSlider(ui.value); },
      start: (e, ui) => { this.sliding = true; },
      stop: (e, ui) => { this.sliding = false; }
    });
  }

  _disconnectSliderEvents() {
    this.playSlider.slider({change: null, slide: null});
  }

  _updateSlider(value) {
    var clampedValued = Math.min(value, 99); // set maximum value to get valid step index
    var requestedStep = Math.floor(this.data.frames.length * clampedValued / 100);
    this.start = (new Date().getTime()) - Math.floor(this.data.basicTimeStep * this.step);
    this._updateAnimationState(requestedStep);
  }

  _updateAnimationState(requestedStep = undefined) {
    var automaticMove = typeof requestedStep === 'undefined';
    if (automaticMove) {
      requestedStep = Math.floor(this._elapsedTime() / this.data.basicTimeStep);
      if (requestedStep < 0 || requestedStep >= this.data.frames.length) {
        if (this.loop) {
          if (requestedStep > this.data.frames.length) {
            requestedStep = 0;
            this.previousStep = 0;
            this.start = new Date().getTime();
          } else
            return;
        } else if (this.gui === 'real_time') {
          this._triggerPlayPauseButton();
          return;
        } else
          return;
      }
    }
    if (requestedStep === this.step)
      return;
    this.step = requestedStep;

    var p;
    var appliedIds = [];
    if (this.data.frames[this.step].hasOwnProperty('poses')) {
      var poses = this.data.frames[this.step].poses;
      for (p = 0; p < poses.length; p++)
        appliedIds[poses[p].id] = this.scene.applyPose(poses[p]);
    }
    var x3dScene = this.view.x3dScene;
    // lookback mechanism: search in history
    if (this.step !== this.previousStep + 1) {
      var previousPoseStep;
      if (this.step > this.previousStep)
        // in forward animation check only the changes since last pose
        previousPoseStep = this.previousStep;
      else
        previousPoseStep = 0;
      for (let i in this.allIds) {
        var id = this.allIds[i];
        var appliedFields = appliedIds[id];
        for (let f = this.step - 1; f >= previousPoseStep; f--) {
          if (this.data.frames[f].poses) {
            for (p = 0; p < this.data.frames[f].poses.length; p++) {
              if (this.data.frames[f].poses[p].id === id)
                appliedFields = x3dScene.applyPose(this.data.frames[f].poses[p], appliedFields);
            }
          }
        }
      }
    }
    if (automaticMove) {
      this._disconnectSliderEvents();
      this.playSlider.slider('option', 'value', 100 * this.step / this.data.frames.length);
      this._connectSliderEvents();
    }
    this.previousStep = this.step;
    this.view.time = this.data.frames[this.step].time;
    x3dScene.viewpoint.updateViewpointPosition(!automaticMove | this.step === 0, this.view.time);
    x3dScene.viewpoint.notifyCameraParametersChanged();
  }

  _updateAnimation() {
    if (this.gui === 'real_time' && !this.sliding) {
      this._updateAnimationState();
      window.requestAnimationFrame(() => { this._updateAnimation(); });
    } else if (this.gui === 'play_on_load') {
      if (!TextureLoader.hasPendingData())
        this._triggerPlayPauseButton();
      window.requestAnimationFrame(() => { this._updateAnimation(); });
    }
  }

  _getIconBaseName() {
    return this.gui === 'real_time' ? 'real_time' : 'pause';
  }
}
/*
 * Injects a Webots 3D view inside a HTML tag.
 * @class
 * @classdesc
 *   The Webots view object displays a 3D view on a web page.
 *   This view represents a Webots simulation world that may be
 *   connected to a webots instance running on a remote server.
 * @example
 *   // Example: Initialize from a Webots streaming server
 *   var view = new webots.View(document.getElementById("myDiv"));
 *   view.open("ws://localhost:80/simple/worlds/simple.wbt");
 *   // or view.open("ws://localhost:80");
 *   // or view.open("file.x3d");
 *   view.onready = () => {
 *       // the initialization is done
 *   }
 *   view.onclose = () => {
 *       view = null;
 *   }
 */

/* global webots */
/* global Animation, Console, ContextMenu, Editor, MouseEvents, DefaultUrl, RobotWindow, TextureLoader */
/* global Server, Stream, SystemInfo, Toolbar, Video, X3dScene */
/* global MathJax: false */
/* eslint no-eval: "off" */

/* The following member variables should be set by the application:

webots.User1Id             // ID of the main user (integer value > 0). If 0 or unset, the user is not logged in.
webots.User1Name           // user name of the main user.
webots.User1Authentication // password hash or authentication for the main user (empty or unset if user not authenticated).
webots.User2Id             // ID of the secondary user (in case of a soccer match between two different users). 0 or unset if not used.
webots.User2Name           // user name of the secondary user.
webots.CustomData          // application specific data to be passed to the simulation server
webots.showRevert          // defines whether the revert button should be displayed
webots.showQuit            // defines whether the quit button should be displayed
webots.showRun             // defines whether the run button should be displayed
*/

webots.View = class View {
  constructor(view3D, mobile) {
    webots.currentView = this;
    this.onerror = (text) => {
      console.log('%c' + text, 'color:black');
      this.onrobotwindowsdestroy();
    };
    this.onstdout = (text) => {
      console.log('%c' + text, 'color:blue');
    };
    this.onstderr = (text) => {
      console.log('%c' + text, 'color:red');
    };
    this.onrobotmessage = (robot, message) => {
      if (typeof this.robotWindowNames[robot] === 'undefined') {
        console.log("Robot '" + robot + "' has no associated robot window");
        return;
      }
      this.robotWindows[this.robotWindowNames[robot]].receive(message, robot);
    };
    this.onrobotwindowsdestroy = () => {
      this.robotWindowsGeometries = {};
      for (let win in this.robotWindows) {
        this.robotWindowsGeometries[win] = this.robotWindows[win].geometry();
        this.robotWindows[win].destroy();
      }
      this.infoWindow = undefined;
      this.robotWindows = {}; // delete robot windows
      this.robotWindowNames = {};
    };
    this.onquit = () => {
      // If the simulation page URL is this https://mydomain.com/mydir/mysimulation.html, the quit action redirects to the
      // folder level, e.g., https://mydomain.com/mydir/
      // If the simulation page is https://mydomain.com/mydir/mysimulation/, the quit action redirects to the upper level:
      // https://mydomain.com/mydir/
      // You can change this behavior by overriding this onquit() method.
      var currentLocation = window.location.href;
      // Remove filename or last directory name from url and keep the final slash.S
      var quitDestination = currentLocation.substring(0, currentLocation.lastIndexOf('/', currentLocation.length - 2) + 1);
      window.location = quitDestination;
    };
    this.onresize = () => {
      if (!this.x3dScene)
        return;

      // Sometimes the page is not fully loaded by that point and the field of view is not yet available.
      // In that case we add a callback at the end of the queue to try again when all other callbacks are finished.
      if (this.x3dScene.root === null) {
        setTimeout(this.onresize, 0);
        return;
      }
      this.x3dScene.resize();
    };
    this.ondialogwindow = (opening) => {
      // Pause the simulation if needed when a pop-up dialog window is open
      // and restart running the simulation when it is closed.
      if (opening && typeof this.isAutomaticallyPaused === 'undefined') {
        this.isAutomaticallyPaused = this.toolBar && this.toolBar.pauseButton && this.toolBar.pauseButton.style.display === 'inline';
        this.toolBar.pauseButton.click();
      } else if (!opening && this.isAutomaticallyPaused) {
        this.toolBar.real_timeButton.click();
        this.isAutomaticallyPaused = undefined;
      }
    };
    window.onresize = this.onresize;

    // Map robot name to robot window name used as key in robotWindows lists.
    this.robotWindowNames = {};
    this.robotWindows = {};

    this.view3D = view3D;
    this.view3D.className = view3D.className + ' webotsView';

    if (typeof mobile === 'undefined')
      this.mobileDevice = SystemInfo.isMobileDevice();
    else
      this.mobileDevice = mobile;

    this.fullscreenEnabled = !SystemInfo.isIOS();
    if (!this.fullscreenEnabled)
      // Add tag needed to run standalone web page in fullscreen on iOS.
      $('head').append('<meta name="apple-mobile-web-app-capable" content="yes">');

    // Prevent the backspace key to quit the simulation page.
    var rx = /INPUT|SELECT|TEXTAREA/i;
    $(document).bind('keydown keypress', (e) => {
      if (e.which === 8) { // backspace key
        if (!rx.test(e.target.tagName) || e.target.disabled || e.target.readOnly)
          e.preventDefault();
      }
    });

    this.debug = false;
    this.timeout = 60 * 1000; // default to one minute
    this.time = undefined;
    this.deadline = this.timeout;
    this.runOnLoad = false;
    this.quitting = false;
  }

  setTimeout(timeout) { // expressed in seconds
    if (timeout < 0) {
      this.timeout = timeout;
      this.deadline = 0;
      return;
    }

    this.timeout = timeout * 1000; // convert to millisecons
    this.deadline = this.timeout;
    if (typeof this.time !== 'undefined')
      this.deadline += this.time;
  }

  setWebotsDocUrl(url) {
    webots.webotsDocUrl = url;
  }

  setAnimation(url, gui, loop) {
    if (typeof gui === 'undefined')
      gui = 'play';
    if (typeof loop === 'undefined')
      loop = true;
    this.animation = new Animation(url, this.x3dScene, this, gui, loop);
  }

  open(url, mode, texturePathPrefix = '') {
    this.url = url;
    if (typeof mode === 'undefined')
      mode = 'x3d';
    this.mode = mode;

    var initWorld = () => {
      if (this.isWebSocketProtocol) {
        this.progress = document.createElement('div');
        this.progress.id = 'webotsProgress';
        this.progress.innerHTML = "<div><img src='" + DefaultUrl.wwiImagesUrl() + "load_animation.gif'>" +
                                  "</div><div id='webotsProgressMessage'>Initializing...</div>" +
                                  "</div><div id='webotsProgressPercent'></div>";
        this.view3D.appendChild(this.progress);

        if (typeof this.toolBar === 'undefined')
          this.toolBar = new Toolbar(this.view3D, this);

        if (this.url.endsWith('.wbt')) { // url expected form: "ws://localhost:80/simple/worlds/simple.wbt"
          var callback;
          if (this.mode === 'video')
            callback = this.video.finalize;
          else
            callback = finalizeWorld;
          this.server = new Server(this.url, this, callback);
          this.server.connect();
        } else { // url expected form: "ws://cyberbotics2.cyberbotics.com:80"
          var httpServerUrl = this.url.replace(/ws/, 'http'); // Serve the texture images. SSL prefix is supported.
          this.stream = new Stream(this.url, this, finalizeWorld);
          TextureLoader.setTexturePathPrefix(httpServerUrl + '/');
          this.stream.connect();
        }
      } else // assuming it's an URL to a .x3d file
        this.x3dScene.loadWorldFile(this.url, finalizeWorld);
    };

    var finalizeWorld = () => {
      $('#webotsProgressMessage').html('Loading HTML and Javascript files...');
      if (this.x3dScene.viewpoint.followedObjectId == null || this.broadcast)
        this.x3dScene.viewpoint.initFollowParameters();
      else
        // Reset follow parameters.
        this.x3dScene.viewpoint.follow(this.x3dScene.viewpoint.followedObjectId);

      if (!this.isWebSocketProtocol) { // skip robot windows initialization
        if (this.animation != null)
          this.animation.init(loadFinalize);
        else
          loadFinalize();
        this.onresize();
        return;
      }

      var loadRobotWindow = (windowName, nodeName) => {
        this.robotWindowNames[nodeName] = windowName;
        var win = new RobotWindow(this.view3D, this.mobileDevice, windowName);
        this.robotWindows[windowName] = win;
        // Initialize robot windows dialogs.
        function closeInfoWindow() {
          $('#infoButton').removeClass('toolBarButtonActive');
        }
        if (windowName === infoWindowName) {
          var user;
          if (typeof webots.User1Id !== 'undefined' && webots.User1Id !== '') {
            user = ' [' + webots.User1Name;
            if (typeof webots.User2Id !== 'undefined' && webots.User2Id !== '')
              user += '/' + webots.User2Name;
            user += ']';
          } else
            user = '';
          win.setProperties({title: this.x3dScene.worldInfo.title + user, close: closeInfoWindow});
          this.infoWindow = win;
        } else
          win.setProperties({title: 'Robot: ' + nodeName});
        pendingRequestsCount++;
        $.get('window/' + windowName + '/' + windowName + '.html', (data) => {
          // Fix the img src relative URLs.
          var d = data.replace(/ src='/g, ' src=\'window/' + windowName + '/').replace(/ src="/g, ' src="window/' + windowName + '/');
          win.setContent(d);
          MathJax.Hub.Queue(['Typeset', MathJax.Hub, win[0]]);
          $.get('window/' + windowName + '/' + windowName + '.js', (data) => {
            eval(data);
            pendingRequestsCount--;
            if (pendingRequestsCount === 0)
              loadFinalize();
          }).fail(() => {
            pendingRequestsCount--;
            if (pendingRequestsCount === 0)
              loadFinalize();
          });
        }).fail(() => {
          if (windowName === infoWindowName)
            this.infoWindow = undefined;
          pendingRequestsCount--;
          if (pendingRequestsCount === 0)
            loadFinalize();
        });
      };

      var infoWindowName = this.x3dScene.worldInfo.window;
      var pendingRequestsCount = 1; // start from 1 so that it can be 0 only after the loop is completed and all the nodes are checked
      var nodes = this.x3dScene.root ? this.x3dScene.root.children : [];
      nodes.forEach((node) => {
        if (node.isObject3D && node.userData && node.userData.window && node.userData.name)
          loadRobotWindow(node.userData.window, node.userData.name);
      });
      pendingRequestsCount--; // notify that loop is completed
      if (pendingRequestsCount === 0)
        // If no pending requests execute loadFinalize
        // otherwise it will be executed when the last request will be handled.
        loadFinalize();
    };

    var loadFinalize = () => {
      $('#webotsProgress').hide();
      if (this.toolBar)
        this.toolBar.enableToolBarButtons(true);

      if (typeof this.onready === 'function')
        this.onready();

      // Restore robot windows.
      if (this.robotWindowsGeometries) { // on reset
        for (let win in this.robotWindows) {
          if (win in this.robotWindowsGeometries) {
            this.robotWindows[win].restoreGeometry(this.robotWindowsGeometries[win]);
            if (this.robotWindowsGeometries[win].open) {
              if (this.robotWindows[win] === this.infoWindow)
                this.toolBar.toggleInfo();
              else
                this.robotWindows[win].open();
            }
          }
        }
      } else if (this.infoWindow && !this.broadcast) // at first load
        this.toolBar.toggleInfo();

      if (this.runOnLoad && this.toolBar)
        this.toolBar.realTime();
    };

    if (mode === 'video') {
      this.url = url;
      this.video = new Video(this.view3D, this.mouseEvents);
      initWorld();
      return;
    }
    if (mode !== 'x3d') {
      console.log('Error: webots.View.open: wrong mode argument: ' + mode);
      return;
    }

    if (this.broadcast)
      this.setTimeout(-1);
    this.isWebSocketProtocol = this.url.startsWith('ws://') || this.url.startsWith('wss://');

    if (typeof this.x3dScene === 'undefined') {
      this.x3dDiv = document.createElement('div');
      this.x3dDiv.className = 'webots3DView';
      this.view3D.appendChild(this.x3dDiv);
      this.x3dScene = new X3dScene(this.x3dDiv);
      this.x3dScene.init(texturePathPrefix);
      var param = document.createElement('param');
      param.name = 'showProgress';
      param.value = false;
      this.x3dScene.domElement.appendChild(param);
    }

    if (typeof this.contextMenu === 'undefined' && this.isWebSocketProtocol) {
      let authenticatedUser = !this.broadcast;
      if (authenticatedUser && typeof webots.User1Id !== 'undefined' && webots.User1Id !== '')
        authenticatedUser = Boolean(webots.User1Authentication);
      this.contextMenu = new ContextMenu(authenticatedUser, this.view3D);
      this.contextMenu.onEditController = (controller) => { this.editController(controller); };
      this.contextMenu.onFollowObject = (id) => { this.x3dScene.viewpoint.follow(id); };
      this.contextMenu.isFollowedObject = (object3d, setResult) => { setResult(this.x3dScene.viewpoint.isFollowedObject(object3d)); };
      this.contextMenu.onOpenRobotWindow = (robotName) => { this.openRobotWindow(robotName); };
      this.contextMenu.isRobotWindowValid = (robotName, setResult) => { setResult(this.robotWindows[this.robotWindowNames[robotName]]); };
    }

    if (typeof this.mouseEvents === 'undefined')
      this.mouseEvents = new MouseEvents(this.x3dScene, this.contextMenu, this.x3dDiv, this.mobileDevice);

    if (typeof this.console === 'undefined')
      this.console = new Console(this.view3D, this.mobileDevice);

    if (typeof this.editor === 'undefined')
      this.editor = new Editor(this.view3D, this.mobileDevice, this);

    initWorld();
  }

  close() {
    if (this.server)
      this.server.socket.close();
    if (this.stream)
      this.stream.close();
  }

  sendRobotMessage(message, robot) {
    this.stream.socket.send('robot:' + robot + ':' + message);
    if (this.toolBar.isPaused()) // if paused, make a simulation step
      webots.currentView.stream.socket.send('step'); // so that the robot controller handles the message
    // FIXME: there seems to be a bug here: after that step, the current time is not incremented in the web interface,
    // this is because the next 'application/json:' is not received, probably because it gets overwritten by the
    // answer to the robot message...
  }

  resize(width, height) {
    if (this.video)
      this.video.resize(width, height);
  }

  getControllerUrl(name) {
    if (!this.server)
      return;
    var port = 0;
    for (let i in this.server.controllers) {
      if (this.server.controllers[i].name === name) {
        port = this.server.controllers[i].port;
        break;
      }
    }
    if (port === 0)
      return;
    return this.url.substring(0, this.url.indexOf(':', 6) + 1) + port;
  }

  // Functions for internal use.

  updateWorldList(currentWorld, worlds) {
    if (!this.toolBar || this.broadcast)
      // Do not show world list if no toolbar exists or in broadcast mode,
      // where multiple users can connect to the same Webots instance.
      return;

    if (typeof this.worldSelect !== 'undefined')
      this.toolBar.worldSelectionDiv.removeChild(this.worldSelect);
    if (worlds.length <= 1)
      return;
    this.worldSelect = document.createElement('select');
    this.worldSelect.id = 'worldSelection';
    this.worldSelect.classList.add('select-css');
    this.toolBar.worldSelectionDiv.appendChild(this.worldSelect);
    for (let i in worlds) {
      var option = document.createElement('option');
      option.value = worlds[i];
      option.text = worlds[i];
      this.worldSelect.appendChild(option);
      if (currentWorld === worlds[i])
        this.worldSelect.selectedIndex = i;
    }
    this.worldSelect.onchange = () => {
      if (this.broadcast || typeof this.worldSelect === 'undefined')
        return;
      if (this.toolBar)
        this.toolBar.enableToolBarButtons(false);
      this.x3dScene.viewpoint.resetFollow();
      this.onrobotwindowsdestroy();
      $('#webotsProgressMessage').html('Loading ' + this.worldSelect.value + '...');
      $('#webotsProgress').show();
      this.stream.socket.send('load:' + this.worldSelect.value);
    };
  }

  setLabel(properties) {
    var labelElement = document.getElementById('label' + properties.id);
    if (labelElement == null) {
      labelElement = document.createElement('div');
      labelElement.id = 'label' + properties.id;
      labelElement.className = 'webotsLabel';
      this.x3dDiv.appendChild(labelElement);
    }
    labelElement.style.fontFamily = properties.font;
    labelElement.style.color = properties.color;
    labelElement.style.fontSize = $(this.x3dDiv).height() * properties.size / 2.25 + 'px'; // 2.25 is an empirical value to match with Webots appearance
    labelElement.style.left = $(this.x3dDiv).width() * properties.x + 'px';
    labelElement.style.top = $(this.x3dDiv).height() * properties.y + 'px';
    labelElement.innerHTML = properties.text;
  }

  removeLabels() {
    var labels = document.getElementsByClassName('webotsLabel');
    for (let i = labels.length - 1; i >= 0; i--) {
      var element = labels.item(i);
      element.parentNode.removeChild(element);
    }
  }

  resetSimulation() {
    this.removeLabels();
    $('#webotsClock').html(webots.parseMillisecondsIntoReadableTime(0));
    this.deadline = this.timeout;
    if (this.deadline >= 0)
      $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(this.deadline));
    else
      $('#webotsTimeout').html(webots.parseMillisecondsIntoReadableTime(0));
    this.x3dScene.viewpoint.reset(this.time);
  }

  quitSimulation() {
    if (this.broadcast)
      return;
    $('#webotsProgressMessage').html('Bye bye...');
    $('#webotsProgress').show();
    this.quitting = true;
    this.onquit();
  }

  destroyWorld() {
    if (this.x3dScene)
      this.x3dScene.destroyWorld();
    this.removeLabels();
  }

  editController(controller) {
    if (this.editor.dirname !== controller) {
      this.editor.closeAllTabs();
      this.editor.dirname = controller;
      this.stream.socket.send('get controller:' + controller);
    }
  }

  openRobotWindow(robotName) {
    var win = this.robotWindows[this.robotWindowNames[robotName]];
    if (win) {
      if (win === this.infoWindow) {
        if (!this.infoWindow.isOpen())
          this.toolBar.toggleInfo();
      } else
        win.open();
    } else
      console.log('No valid robot window for robot: ' + robotName);
  }
};

webots.window = (name) => {
  var win = webots.currentView.robotWindows[name];
  if (!win)
    console.log("Robot window '" + name + "' not found.");
  return win;
};
