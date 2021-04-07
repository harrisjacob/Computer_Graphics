"use strict";

var gl;
var vertices = [];
var u_ColorLoc;
var canvas;

var a_vPositionLoc;
var u_vPaddleTranslateLoc;
var u_vBallTranslateLoc;

var ctx;

var Ball = {
    "velocityX": 0.005,     //Horizontal starting velocity
    "velocityY": -0.005,    //Vertical starting velocity
    "positionX": 0.0,       //Horizontal translation to set from starting position
    "positionY": 0.0,       //Vertical translation to set from starting position
    "radius" : 0.05,        //Radius of ball
    "speedFactor" : 0.5,    //Factor by which the ball speeds up / slows down
};
Ball.tolerance =  0.5*Ball.radius;  //Tolerance used on the edge of the paddle

var Paddle = {
    "width": 0.5,       //Width of paddle
    "height" : 0.05,    //Height of paddle
    "xShift" : 0,       //horizontal step
    "shiftAmt" : 0.1,   //distance the paddle steps      
};

var Game = {
    "score" : 0,        //Times the ball has hit the paddle
    "running" : true,   //Is the game running
};

// The onload event occurs when all the script files are read;
// it causes init() function to be executed
window.onload = function init()
{
    //Set up text display
    var hud = document.getElementById("head-up-display");
    ctx = hud.getContext('2d');

    // create WebGL context which is a JavaScript object that contains all the WebGL
    // functions and parameters
    // "gl-canvas" is the id of the canvas specified in the HTML file
    canvas = document.getElementById( "gl-canvas" );
    
    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }

    //
    //  Configure WebGL
    //
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.0, 0.0, 0.0, 1.0 );



    vertices = [
        vec2(0.0,1.0-Ball.radius),
    ];

    var divs=36;
    var increment = Math.PI/divs;

    for(var i=0; i< Math.PI*2;i+=increment){
        var newVec = vec2(vertices[0][0] + Math.cos(i)*Ball.radius, vertices[0][1] + Math.sin(i)*Ball.radius);
        vertices.push(newVec);
    }



    vertices.push(vec2(-(Paddle.width/2.0),-1.0));
    vertices.push(vec2(-(Paddle.width/2.0),-1.0+Paddle.height));
    vertices.push(vec2(Paddle.width/2.0,-1.0+Paddle.height));
    vertices.push(vec2(Paddle.width/2.0,-1.0));

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

    u_ColorLoc = gl.getUniformLocation(program, "u_Color");


    u_vPaddleTranslateLoc = gl.getUniformLocation(program, "u_vPaddleTranslate");
    u_vBallTranslateLoc = gl.getUniformLocation(program, "u_vBallTranslate");


    //Set event handlers
    document.getElementById("speed-up-button").onclick = function () {
        Ball.velocityX *= (1+Ball.speedFactor);
        Ball.velocityY *= (1+Ball.speedFactor);
    };

    document.getElementById("speed-down-button").onclick = function () {
        Ball.velocityX *= Ball.speedFactor;
        Ball.velocityY *= Ball.speedFactor;
    };
    
    document.getElementById("paddle-left-button").onclick = function () {
        Paddle.xShift -= (Paddle.xShift*Paddle.shiftAmt > -1.0) ? 1 : 0;
    };

    document.getElementById("paddle-right-button").onclick = function () {
        Paddle.xShift += (Paddle.xShift*Paddle.shiftAmt < 1.0) ? 1 : 0;
    };


    render();
};

function print(){
    var string = "Score: "+Game.score.toString();
    draw2D(ctx, string);
}

function draw2D(ctx, string) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = '20px "Tahoma"';
    ctx.textAlign = 'center';
    ctx.fillStyle = "#ffffff";
    ctx.fillText(string, canvas.width/2.0, 30);
}


function render() {
    gl.clear( gl.COLOR_BUFFER_BIT );
    
    var xPaddleLocation = Paddle.shiftAmt*Paddle.xShift;

    //Check for ball hitting a side wall
    if(Ball.positionX+Ball.radius >= 1.0 || Ball.positionX-Ball.radius <= -1.0) Ball.velocityX *= -1.0;

    //Check for ball hitting the paddle

    if(Ball.positionY-(2.0*Ball.radius) <= -2.0+Paddle.height && Game.running){ //Ball is in the paddle zone
        var paddleLeftEnd = xPaddleLocation-(0.5*Paddle.width) - Ball.tolerance;
        var paddleRightEnd = xPaddleLocation+(0.5*Paddle.width) + Ball.tolerance;


        //Check if ball is within paddled range
        if(Ball.positionX >= paddleLeftEnd && Ball.positionX <= paddleRightEnd){
             Ball.velocityY *= -1.0;
             Game.score += 1;
        }

    }

    //Check for ball hitting top wall
    if(Ball.velocityY >= 0 && Ball.positionY >= 0.0) Ball.velocityY *=-1.0;

    

    Ball.positionX += Ball.velocityX;
    Ball.positionY += Ball.velocityY;

    if(Ball.positionY - 2*Ball.radius <= -2.0) Game.running = false;

    //Ball animation
    gl.uniform3fv(u_ColorLoc, vec3(0.4, 0.4, 1.0));
    gl.uniform3fv(u_vBallTranslateLoc, vec3(Ball.positionX,Ball.positionY,0.0));
    gl.uniform3fv(u_vPaddleTranslateLoc, vec3(0.0,0.0,0.0));
    gl.drawArrays( gl.TRIANGLE_FAN, 0, vertices.length-4);



    //Paddle animation
    gl.uniform3fv(u_vBallTranslateLoc, vec3(0.0,0.0,0.0));
    gl.uniform3fv(u_vPaddleTranslateLoc, vec3(xPaddleLocation,0.0,0.0));
    gl.uniform3fv(u_ColorLoc, vec3(1.0, 0.4, 0.4));
    gl.drawArrays( gl.TRIANGLE_FAN, vertices.length-4, 4);

    print();
    if(Game.running){
        window.requestAnimFrame(render);
    }else{
        alert("Game Over! User Score: "+Game.score+"!");
    }
}
