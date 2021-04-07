"use strict";

var gl;
var vertices;
var u_ColorLoc;
var canvas;
var heartColors;

var a_vPositionLoc;
var u_ctMatrixLoc;

var hourMarkerMats = [];
var minuteMarkerMats = [];

var clockInputs = {
    "outer" : {
        "radius"    : 0.85,
        "color"     : vec3(1.0, 0.0, 0.0),
    },
    "inner" : {
        "radius"    : 0.79,
        "color"     : vec3(1.0, 1.0, 1.0),
    },
    "center" : {
        "radius"    : 0.03,
        "color"     : vec3(0.0, 0.0, 0.0),
    },
    "heart"  : {
        "scale"     : 0.65,
    },
    "marker" : {
        "width"     : 0.4,                  //width of rectangle unscaled   
        "height"    : 0.1,                  //height of rectangle unscaled
        "color"     : vec3(0.0,0.0,1.0),    //color used for minute/hour markers
        "hourScaleFactor" : 0.2,            //scaling factor for hour markers
        "hourAngle"     : 30,               //Angle (in degrees) between hour markers
        "hourCount"     : 12,               //Number of hour markers
        "minScaleFactor": 0.1,              //scaling factor for minute markers
        "minAngle"      : 6,                //Angle (in degrees) between minute markers
        "minCount"      : 60,               //Number of minute markers
        "secHandWidthFactor" : 1.6,         //Scaling factor of the second hand's width
        "secHandHeightFactor" : 0.1,        //Scaling factor of the second hand's height
        "minHandWidthFactor" : 1.4,         //Scaling factor of the minute hand's width
        "minHandHeightFactor" : 0.17,       //Scaling factor of the minute hand's height
        "hourHandWidthFactor" : 1.0,        //Scaling factor of the hour hand's width
        "hourHandHeightFactor" : 0.27,      //Scaling factor of the hour hand's height
    },
}

var vertLen = {                             //This object keeps track of the beginning position and length of each set of vertices
    "circle" : {
        "start" : 0,
        "len"   : 0,
    },
    "heart" : {
        "start" : 0,
        "len"   : 0,
    },
    "marker" : {
        "start" : 0,
        "len"   : 0,
    }
}

// The onload event occurs when all the script files are read;
// it causes init() function to be executed
window.onload = function init()
{

    // create WebGL context which is a JavaScript object that contains all the WebGL
    // functions and parameters
    // "gl-canvas" is the id of the canvas specified in the HTML file
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }


    //Load circle vertices
    vertices = [ vec3(0.0,0.0,1.0) ];

    var divs = 72;
    var incr = 2*Math.PI/divs;

    //Add circle verts
    for(var i=0; i<=2*Math.PI; i+=incr){
        vertices.push(vec3(vertices[0][0]+Math.cos(i), vertices[0][1]+Math.sin(i), 1.0));
    }

    vertLen["circle"]["len"] = vertices.length;
    
    
    //Add triangle verts
    var heartVerts = [
        vec2(-0.75, 0.15),
        vec2(-0.25, 0.65),
        vec2( 0.25, 0.15), //Blue
        vec2(-0.75, 0.15),
        vec2(-0.25, 0.15),
        vec2(-0.25, -0.4), //Pink
        vec2(-0.25, -0.4),
        vec2(-0.25, 0.15),
        vec2( 0.0 , -0.125), //Red
        vec2(-0.25, -0.4),
        vec2( 0.0 , -0.125),
        vec2( 0.25, -0.4), //Green
        vec2(-0.25, -0.4),
        vec2( 0.25, -0.4),
        vec2( 0.0 , -0.65), //Brown
        vec2( 0.25, -0.4),
        vec2(-0.25, 0.15),
        vec2( 0.75, 0.15), //Orange
        vec2( 0.25, 0.15),
        vec2( 0.75, 0.15),
        vec2( 0.5 , 0.4 ), //light blue
        vec2( 0.0 , 0.4 ),
        vec2( 0.5 , 0.4 ),
        vec2( 0.25, 0.15), //yellow
        vec2( 0.0 , 0.4 ),
        vec2( 0.5 , 0.4 ),
        vec2( 0.25, 0.65), //purple
    ];

    for(var vert of heartVerts){
        vertices.push(vec3(vert[0],vert[1],1.0));
    }

    vertLen["heart"]["start"] = vertLen["circle"]["len"];
    vertLen["heart"]["len"] = heartVerts.length;
     

    heartColors = [
        vec3(0.0, 0.62, 0.99), //Blue
        vec3(1.0, 0.63, 0.74), //Pink
        vec3(1.0, 0.16, 0.02), //Red
        vec3(0.0, 0.98, 0.19), //Green
        vec3(0.63, 0.35, 0.11), //Brown
        vec3(1.0, 0.62, 0.11), //Orange
        vec3(0.0, 0.99, 1.0), //Light Blue
        vec3(1.0, 0.99, 0.2), //Yellow
        vec3(0.67, 0.15, 0.84), //Purple
    ];
    
    
    //Add hour verts
    vertices.push(vec3(0.0, 0.0, 1.0));
    vertices.push(vec3(0.0, clockInputs["marker"]["height"], 1.0));
    vertices.push(vec3(clockInputs["marker"]["width"], clockInputs["marker"]["height"], 1.0));
    vertices.push(vec3(clockInputs["marker"]["width"], 0.0, 1.0));

    vertLen["marker"]["start"] = vertLen["heart"]["len"]+vertLen["heart"]["start"];
    vertLen["marker"]["len"] = 4;

    //Generate hour marker matrices
    var sm, tm, rm;
    sm = scalem(clockInputs["marker"]["hourScaleFactor"],clockInputs["marker"]["hourScaleFactor"],clockInputs["marker"]["hourScaleFactor"]);
    tm = translate(clockInputs["inner"]["radius"]-clockInputs["marker"]["width"]*clockInputs["marker"]["hourScaleFactor"], clockInputs["marker"]["hourScaleFactor"]*clockInputs["marker"]["height"]*-0.5, 0.0);
    

    for(var i=0; i<clockInputs["marker"]["hourCount"]; i++){
        rm = rotateZ(clockInputs["marker"]["hourAngle"]*i);
        hourMarkerMats.push(mult(rm, mult(tm, sm)));
    }

    //Generate minute marker matrices
    sm = scalem(clockInputs["marker"]["minScaleFactor"],clockInputs["marker"]["minScaleFactor"],clockInputs["marker"]["minScaleFactor"]);
    tm = translate(clockInputs["inner"]["radius"]-clockInputs["marker"]["width"]*clockInputs["marker"]["minScaleFactor"], clockInputs["marker"]["minScaleFactor"]*clockInputs["marker"]["height"]*-0.5, 0.0);
    

    for(var i=0; i<clockInputs["marker"]["minCount"]; i++){
        if(i%(clockInputs["marker"]["minCount"]/clockInputs["marker"]["hourCount"])==0) continue //Don't add matrix for minute markers at hour markers
        rm = rotateZ(clockInputs["marker"]["minAngle"]*i);
        minuteMarkerMats.push(mult(rm, mult(tm, sm)));
    }




    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );


    //  Load shaders and initialize attribute buffers
    
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    // Load the data into the GPU
    
    // create a vertex buffer object (VBO) in the GPU and later place our data in that object
    var vBuffer = gl.createBuffer();
    // gl.ARRAY_BUFFER: vertex attribute data rather than indices to data
    // the binding operation makes this buffer the current buffer until a differ buffer is binded
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    
    // gl.bufferData accepts only arrays of native data type values and not JavaScript objects;
    // function flatten (defined in MV.js) converts JavaScript objects into the data format
    // accepted by gl.bufferData
    gl.bufferData( gl.ARRAY_BUFFER, flatten(vertices), gl.STATIC_DRAW );


    // Associate out shader variables with our data buffer
    
    // gl.getAttribLocation returns the index of an attribute variable in the vertex shader
    a_vPositionLoc = gl.getAttribLocation( program, "a_vPosition" );
    // describe the form of the data in the vertex array
    // 4th parameter false: no data normalization;
    // 5th parameter 0: values are contiguous;
    // 6th parameter 0: address in the buffer where the data begin
    gl.vertexAttribPointer( a_vPositionLoc, 3, gl.FLOAT, false, 0, 0 );
    // enable the vertex attributes that are in the shader
    gl.enableVertexAttribArray( a_vPositionLoc );

    u_ColorLoc = gl.getUniformLocation(program, "u_Color");

    u_ctMatrixLoc = gl.getUniformLocation(program, "u_ctMatrix");


    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    var ctm;
    var outerMat, innerMat, centerMat, heartMat;
    var radius;

    
    var pm = ortho(-1.0, 1.0, -1.0, 1.0, -1.0, 1.0);

    

    radius = clockInputs["outer"]["radius"];
    outerMat = scalem(radius, radius, radius);
    radius = clockInputs["inner"]["radius"];
    innerMat = scalem(radius, radius, radius);
    radius = clockInputs["center"]["radius"];
    centerMat = scalem(radius, radius, radius);

    //Draw outer circle
    ctm = mat4();
    ctm = mult(pm, mult(outerMat, ctm));
    gl.uniform3fv(u_ColorLoc, clockInputs["outer"]["color"]);
    gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
    gl.drawArrays( gl.TRIANGLE_FAN, vertLen["circle"]["start"], vertLen["circle"]["len"]);

    //Draw inner circle
    ctm = mat4();
    ctm = mult(pm, mult(innerMat, ctm));
    gl.uniform3fv(u_ColorLoc, clockInputs["inner"]["color"]);
    gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
    gl.drawArrays( gl.TRIANGLE_FAN, vertLen["circle"]["start"], vertLen["circle"]["len"]);


    //Draw heart

    heartMat = scalem(clockInputs["heart"]["scale"], clockInputs["heart"]["scale"], clockInputs["heart"]["scale"]);

    //Draw colors
    for(var i=0; i<vertLen["heart"]["len"]/3; i++){
        ctm = mat4();
        ctm = mult(pm, mult(heartMat, ctm));
        gl.uniform3fv(u_ColorLoc, heartColors[i%heartColors.length]);
        gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
        gl.drawArrays(gl.TRIANGLES, vertLen["heart"]["start"]+i*3,3);
    }

    
    //Draw lines
    gl.uniform3fv(u_ColorLoc, vec3(0.0, 0.0, 0.0))

    //Draw the lines
    for(var j=0; j<vertLen["heart"]["len"]/3; j++){
        ctm = mat4();
        ctm = mult(pm, mult(heartMat, ctm));
        gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
        gl.drawArrays(gl.LINE_LOOP, vertLen["heart"]["start"]+j*3, 3);
    }



    //Draw center circle
    ctm = mat4();
    ctm = mult(pm, mult(centerMat, ctm));
    gl.uniform3fv(u_ColorLoc, clockInputs["center"]["color"]);
    gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
    gl.drawArrays( gl.TRIANGLE_FAN, vertLen["circle"]["start"], vertLen["circle"]["len"]);

    //Draw hour markers
    gl.uniform3fv(u_ColorLoc, clockInputs["marker"]["color"]);

    for(i=0; i<clockInputs["marker"]["hourCount"]; i++){
        ctm = mat4();
        ctm = mult(pm, mult(hourMarkerMats[i], ctm));   
        gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLE_FAN, vertLen["marker"]["start"], vertLen["marker"]["len"]);
    }
   
    //Draw minute markers
    for(var minMarkerMat of minuteMarkerMats){
        ctm = mat4();
        ctm = mult(pm, mult(minMarkerMat, ctm));
        gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
        gl.drawArrays( gl.TRIANGLE_FAN, vertLen["marker"]["start"], vertLen["marker"]["len"]);

    }


    //Draw clock hands
    gl.uniform3fv(u_ColorLoc, vec3(0.0,0.0,0.0));
    var currentTime = new Date();
    var sm, rm, tm;
    var hourMat, minuteMat, secondMat;
    
    //Draw second hand
    ctm = mat4();
    sm = scalem(clockInputs["marker"]["secHandWidthFactor"],clockInputs["marker"]["secHandHeightFactor"], 1.0);
    rm = rotateZ(90+currentTime.getSeconds()*-clockInputs["marker"]["minAngle"]);
    tm = translate(0.0, clockInputs["marker"]["secHandHeightFactor"]*clockInputs["marker"]["height"] * -0.5, 0.0);
    secondMat = mult(rm, mult(tm, mult(sm, ctm)));
    ctm = mult(pm, secondMat);
    gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
    gl.drawArrays( gl.TRIANGLE_FAN, vertLen["marker"]["start"], vertLen["marker"]["len"]);

    
    //Draw minute hand
    ctm = mat4();
    sm = scalem(clockInputs["marker"]["minHandWidthFactor"],clockInputs["marker"]["minHandHeightFactor"], 1.0);
    tm = translate(0.0, clockInputs["marker"]["minHandHeightFactor"]*clockInputs["marker"]["height"] * -0.5, 0.0);
    rm = rotateZ(90+currentTime.getMinutes()*-clockInputs["marker"]["minAngle"] + (currentTime.getSeconds()/-clockInputs["marker"]["minCount"])*clockInputs["marker"]["minAngle"]);
    minuteMat = mult(rm, mult(tm, mult(sm, ctm)));
    ctm = mult(pm, minuteMat);
    gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
    gl.drawArrays( gl.TRIANGLE_FAN, vertLen["marker"]["start"], vertLen["marker"]["len"]);

    //Draw hour hand
    ctm = mat4();
    sm = scalem(clockInputs["marker"]["hourHandWidthFactor"],clockInputs["marker"]["hourHandHeightFactor"], 1.0);
    tm = translate(0.0, clockInputs["marker"]["hourHandHeightFactor"]*clockInputs["marker"]["height"] * -0.5, 0.0);
    rm = rotateZ(90+currentTime.getHours()*-clockInputs["marker"]["hourAngle"] + (currentTime.getMinutes()/-clockInputs["marker"]["minCount"])*clockInputs["marker"]["hourAngle"]);
    hourMat = mult(rm, mult(tm, mult(sm, ctm)));
    ctm = mult(pm, hourMat);
    gl.uniformMatrix4fv(u_ctMatrixLoc, false, flatten(ctm));
    gl.drawArrays( gl.TRIANGLE_FAN, vertLen["marker"]["start"], vertLen["marker"]["len"]);
    


    setTimeout(function(){window.requestAnimFrame(render)}, 1000);
    
    
}

function debug(){
    console.log("circle verts start "+vertLen["circle"]["start"]);
    console.log("circle verts len "+vertLen["circle"]["len"]);
    console.log("heart verts start "+vertLen["heart"]["start"]);
    console.log("heart verts len "+vertLen["heart"]["len"]);

    console.log("Total vert len " + vertices.length);
}