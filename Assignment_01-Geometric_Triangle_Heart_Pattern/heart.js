"use strict";

var gl;
var vertices;
var colors;
var u_ColorLoc;
var a_vPositionLoc;
var u_vTranslationLoc;
var u_vScaleLoc;

// The onload event occurs when all the script files are read;
// it causes init() function to be executed
window.onload = function init()
{
    // create WebGL context which is a JavaScript object that contains all the WebGL
    // functions and parameters
    // "gl-canvas" is the id of the canvas specified in the HTML file
    var canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    // Three vertices
    
     vertices = [
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


    colors = [
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

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );
    
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
    gl.vertexAttribPointer( a_vPositionLoc, 2, gl.FLOAT, false, 0, 0 );
    // enable the vertex attributes that are in the shader
    gl.enableVertexAttribArray( a_vPositionLoc );

    u_vScaleLoc = gl.getUniformLocation(program, "u_vScale");
    u_vTranslationLoc = gl.getUniformLocation(program, "u_vTranslation");
    u_ColorLoc = gl.getUniformLocation(program, "u_Color");
    render();
};


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );

    var xdirection;
    var xdistance;
    var ydirection;
    var ydistance;
    var offset = 0.6;
    var scaleFactor = 1/3;

    //Set scale the vertices
    gl.uniform4f(u_vScaleLoc, scaleFactor, scaleFactor, 1.0, 1.0);

    for(var tri=0; tri<vertices.length/3; tri++){
        
        //Calculate the translations for the given heart
        xdirection = (tri%3==0)? -1 : 1;
        xdistance = (tri%3==1) ? 0 : 1;
        ydirection = (~~(tri/3)==2)? -1 : 1;
        ydistance = (~~(tri/3)==1) ? 0 : 1;
        //~~(x/y) effectively perform integer division

        //Set the vertex translation
        gl.uniform4f(u_vTranslationLoc, offset*xdistance*xdirection, offset*ydistance*ydirection, 0.0, 0.0);

        //Draw the triangles
        for(var i=0; i<vertices.length/3; i++){
            gl.uniform3fv(u_ColorLoc, colors[(i+tri)%colors.length]);
            gl.drawArrays(gl.TRIANGLES, i*3,3);
        }

        //Set the line color
        gl.uniform3fv(u_ColorLoc, vec3(0.0, 0.0, 0.0));

        //Draw the lines
        for(var j=0; j<vertices.length/3; j++){
            gl.drawArrays(gl.LINE_LOOP, j*3, 3);
        }

    }


}
