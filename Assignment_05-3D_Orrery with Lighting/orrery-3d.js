"use strict";

var gl;
var canvas;

var printDay;

var mvpMatrix;

// non-common modelview projection matrix
var nonCommonMVPMatrix;

// common modelview projection matrix
var commonMVPMatrix;

var a_positionLoc;
var u_colorLoc;
var u_mvpMatrixLoc;

// Last time that this function was called
var g_last = Date.now();
var elapsed = 0;
var mspf = 1000/30.0;  // ms per frame

// scale factors
var rSunMult = 45;      // keep sun's size manageable
var rPlanetMult = 2000;  // scale planet sizes to be more visible

// surface radii (km)
var rSun = 696000;
var rMercury = 2440;
var rVenus = 6052;
var rEarth = 6371;
var rMoon = 1737;

// orbital radii (km)
var orMercury = 57909050;
var orVenus = 108208000;
var orEarth = 149598261;
var orMoon = 384399;

// orbital periods (Earth days)
var pMercury = 88;
var pVenus = 225;
var pEarth = 365;
var pMoon = 27;

var EarthRef;

// time
var currentDay;
var daysPerFrame;

var globalScale;

// vertices
var circleVertexPositionData = []; // for orbit
var sphereVertexPositionData = []; // for planet
var sphereVertexIndexData = []; // for planet

var circleVertexPositionBuffer;
var sphereVertexPositionBuffer;
var sphereVertexIndexBuffer;

//trackball
var trackballMove = false;
var m_mousex = 1;
var m_mousey = 1;
var m_curquat;
var m_inc;


window.onload = function init()
{
    canvas = document.getElementById( "gl-canvas" );
    printDay = document.getElementById("printDay");

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.85, 0.85, 0.85, 1.0 );

    gl.enable(gl.DEPTH_TEST);

    currentDay = 0;
    daysPerFrame = 1.0;

    // global scaling for the entire orrery
    globalScale = 50.0 / ( orEarth + orMoon + ( rEarth + 2 * rMoon ) * rPlanetMult );

    setupCircle();

    setupSphere();

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    circleVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, circleVertexPositionBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, flatten(circleVertexPositionData), gl.STATIC_DRAW );

    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereVertexPositionData), gl.STATIC_DRAW);

    sphereVertexIndexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphereVertexIndexData), gl.STATIC_DRAW);

    // Associate out shader variables with our data buffer

    a_positionLoc = gl.getAttribLocation( program, "a_position" );

    u_colorLoc = gl.getUniformLocation( program, "u_color" );

    u_mvpMatrixLoc = gl.getUniformLocation( program, "u_mvpMatrix" );


    //Change days per frame
    document.getElementById("inc_button").onclick = function () {
        daysPerFrame *=2;
    };


    document.getElementById("dec_button").onclick = function () {
        daysPerFrame /=2;
    };

    // for trackball
    m_curquat = trackball(0, 0, 0, 0);


    canvas.addEventListener("mousedown", function(event){
        m_mousex = event.clientX - event.target.getBoundingClientRect().left;
        m_mousey = event.clientY - event.target.getBoundingClientRect().top;
        trackballMove = true;
    });

    // for trackball
    canvas.addEventListener("mouseup", function(event){
        trackballMove = false;
    });

    // for trackball
    canvas.addEventListener("mousemove", function(event){
      if (trackballMove) {
        var x = event.clientX - event.target.getBoundingClientRect().left;
        var y = event.clientY - event.target.getBoundingClientRect().top;
        mouseMotion(x, y);
      }
    });



    render();

};

function setupCircle() {
    var increment = 0.1;
    for (var theta=0.0; theta < Math.PI*2; theta+=increment) {
        circleVertexPositionData.push(vec3(Math.cos(theta+increment), 0.0, Math.sin(theta+increment)));
    }
}

function setupSphere() {
    var latitudeBands = 50;
    var longitudeBands = 50;
    var radius = 1.0;

    // compute sampled vertex positions
    for (var latNumber=0; latNumber <= latitudeBands; latNumber++) {
        var theta = latNumber * Math.PI / latitudeBands;
        var sinTheta = Math.sin(theta);
        var cosTheta = Math.cos(theta);

        for (var longNumber=0; longNumber <= longitudeBands; longNumber++) {
            var phi = longNumber * 2 * Math.PI / longitudeBands;
            var sinPhi = Math.sin(phi);
            var cosPhi = Math.cos(phi);

            var x = cosPhi * sinTheta;
            var y = cosTheta;
            var z = sinPhi * sinTheta;

            sphereVertexPositionData.push(radius * x);
            sphereVertexPositionData.push(radius * y);
            sphereVertexPositionData.push(radius * z);
        }
    }

    // create the actual mesh, each quad is represented by two triangles
    for (var latNumber=0; latNumber < latitudeBands; latNumber++) {
        for (var longNumber=0; longNumber < longitudeBands; longNumber++) {
            var first = (latNumber * (longitudeBands + 1)) + longNumber;
            var second = first + longitudeBands + 1;
            // the three vertices of the 1st triangle
            sphereVertexIndexData.push(first);
            sphereVertexIndexData.push(second);
            sphereVertexIndexData.push(first + 1);
            // the three vertices of the 2nd triangle
            sphereVertexIndexData.push(second);
            sphereVertexIndexData.push(second + 1);
            sphereVertexIndexData.push(first + 1);
        }
    }
}

function drawCircle(color) {
    // set uniforms
    gl.uniform3fv( u_colorLoc, color );
    mvpMatrix = mult(commonMVPMatrix, nonCommonMVPMatrix);
    gl.uniformMatrix4fv(u_mvpMatrixLoc, false, flatten(mvpMatrix) );

    gl.enableVertexAttribArray( a_positionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, circleVertexPositionBuffer);
    gl.vertexAttribPointer( a_positionLoc, 3, gl.FLOAT, false, 0, 0 );
    gl.drawArrays( gl.LINE_LOOP, 0, circleVertexPositionData.length );
}

function drawSphere(color) {
    // set uniforms
    gl.uniform3fv( u_colorLoc, color );
    mvpMatrix = mult(commonMVPMatrix, nonCommonMVPMatrix);
    gl.uniformMatrix4fv(u_mvpMatrixLoc, false, flatten(mvpMatrix) );

    gl.enableVertexAttribArray( a_positionLoc );
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
    gl.vertexAttribPointer(a_positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereVertexIndexBuffer);
    gl.drawElements(gl.TRIANGLES, sphereVertexIndexData.length, gl.UNSIGNED_SHORT, 0);
}

function drawOrbits() {
    var gray = vec3( 0.2, 0.2, 0.2 );

    nonCommonMVPMatrix = scalem(orMercury, orMercury, orMercury);
    drawCircle( gray );     //Mercury


    nonCommonMVPMatrix = scalem(orVenus, orVenus, orVenus);
    drawCircle( gray );    // Venus

    nonCommonMVPMatrix = scalem(orEarth, orEarth, orEarth);
    drawCircle( gray );

    nonCommonMVPMatrix = mult(EarthRef, scalem(orMoon*50, orMoon*50, orMoon*50));
    drawCircle( gray );


}

function drawBodies() {
    var size;
    var angleOffset = currentDay * 360.0;  // days * degrees

    // Sun
    size = rSun * rSunMult;
    nonCommonMVPMatrix = scalem(size, size, size);
    drawSphere( vec3( 1.0, 1.0, 0.0 ) );

    //Mercury
    size = rMercury * rPlanetMult;
    nonCommonMVPMatrix = mult(rotateY(angleOffset/pMercury),
                              mult(translate(orMercury, 0.0, 0.0), scalem(size, size, size)));
    drawSphere( vec3(1.0, 0.5, 0.5));


    // Venus
    size = rVenus * rPlanetMult;
    nonCommonMVPMatrix = mult(rotateY(angleOffset/pVenus),
                              mult(translate(orVenus, 0.0, 0.0), scalem(size, size, size)));
    drawSphere( vec3( 0.5, 1.0, 0.5 ));



    // Earth
    size = rEarth * rPlanetMult;

    nonCommonMVPMatrix =  mult(EarthRef, scalem(size, size, size));
    drawSphere( vec3( 0.5, 0.5, 1.0 ));


    //Moon
    size = rMoon * rPlanetMult;
    nonCommonMVPMatrix = mult(EarthRef,
                            mult(rotateY(angleOffset/pMoon),
                            mult(translate(orMoon*50, 0.0, 0.0), scalem(size, size, size))));
    drawSphere( vec3( 1.0, 1.0, 1.0 ));


}


function drawDay() {
    var string = 'Day ' + currentDay.toString();
    printDay.innerHTML = string;
}


function mouseMotion(x,  y)
{
        var lastquat;
        if (m_mousex != x || m_mousey != y)
        {
            lastquat = trackball(
                  (2.0*m_mousex - canvas.width) / canvas.width,
                  (canvas.height - 2.0*m_mousey) / canvas.height,
                  (2.0*x - canvas.width) / canvas.width,
                  (canvas.height - 2.0*y) / canvas.height);
            m_curquat = add_quats(lastquat, m_curquat);
            m_mousex = x;
            m_mousey = y;
        }
}


function drawAll()
{
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );

    // all planets and orbits will take the following transformation

    // global scaling
    commonMVPMatrix = scalem(globalScale, globalScale, globalScale);

    //global tilt-x
    commonMVPMatrix = mult(rotateX(15), commonMVPMatrix);


    //Trackball
    m_inc = build_rotmatrix(m_curquat);
    commonMVPMatrix = mult(m_inc, commonMVPMatrix);

    // viewing matrix
    commonMVPMatrix = mult(lookAt(vec3(0.0, 0.0, 100.0),
                                  vec3(0.0, 0.0, 0.0),
                                  vec3(0.0, 1.0, 0.0)),
                           commonMVPMatrix);

    // projection matrix
    commonMVPMatrix = mult(perspective(30, 2.0, 0.1, 1000.0),
                           commonMVPMatrix);

    var angleOffset = currentDay * 360.0;  // days * degrees

    EarthRef = mult(rotateY(angleOffset/pEarth),
                        mult(translate(orEarth, 0.0, 0.0), rotateZ(23.5)));


    if (document.getElementById("orbon").checked == true)
        drawOrbits();

    drawBodies();
    

    if(document.getElementById("dayon").checked == true)
        drawDay();
    else
        printDay.innerHTML = "";
        
}

var render = function() {
    // Calculate the elapsed time
    if(document.getElementById("animon").checked == true){
        var now = Date.now(); // time in ms
        elapsed += now - g_last;
        g_last = now;
        if (elapsed >= mspf) {
            currentDay += daysPerFrame;
            elapsed = 0;
        }
    
        requestAnimFrame(render);
        drawAll();
    }else{
        requestAnimFrame(render);
    }


};
