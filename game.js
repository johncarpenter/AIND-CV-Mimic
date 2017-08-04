
// Mimic Me!
// Fun game where you need to express emojis being displayed
// --- Affectiva setup ---
// The affdex SDK Needs to create video and canvas elements in the DOM
var divRoot = $("#camera")[0];  // div node where we want to add these elements
var width = 320, height = 240;  // camera image size
var faceMode = affdex.FaceDetectorMode.LARGE_FACES;  // face mode parameter

// Initialize an Affectiva CameraDetector object
var detector = new affdex.CameraDetector(divRoot, width, height, faceMode);

// Enable detection of all Expressions, Emotions and Emojis classifiers.
detector.detectAllEmotions();
detector.detectAllExpressions();
detector.detectAllEmojis();
detector.detectAllAppearance();

// --- Utility values and functions ---
var gameState = {
  score: 0,
  currentEmoji: null,
  reset: function(){
    this.score = 0;
    setScore(this.score,false);
    this.currentEmoji = null;
  },
  nextEmoji: function(){
    this.currentEmoji = getRandomEmoji();
    showNextEmoji(this.currentEmoji);
  },
  checkEmoji: function(againstEmoji){
    if(this.currentEmoji == toUnicode(againstEmoji)){
      this.score += 100;
      setScore(this.score);
      this.nextEmoji();
    }
  }
}

// Unicode values for all emojis Affectiva can detect
var emojis = [ 128528, 9786, 128515, 128524, 128527, 128521, 128535, 128539, 128540, 128542, 128545, 128563, 128561 ];

function getRandomEmoji(){
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// Convert a special character to its unicode value (can be 1 or 2 units long)
function toUnicode(c) {
  if(c.length == 1)
    return c.charCodeAt(0);
  return ((((c.charCodeAt(0) - 0xD800) * 0x400) + (c.charCodeAt(1) - 0xDC00) + 0x10000));
}



// Display log messages and tracking results
function log(msg,level='all') {
    console.log(msg);
}

// --- Callback functions ---

// Start button
function onStart() {
  if (detector && !detector.isRunning) {
    detector.start();  // start detector
  }
  log("Start Game pressed");

  // reset score
  gameState.reset();
  gameState.nextEmoji();
}

// Stop button
function onStop() {
  log("Stop game pressed");
  if (detector && detector.isRunning) {
    detector.removeEventListener();
    detector.stop();  // stop detector
  }
  // reset score
  gameState.reset();
};

// Add a callback to notify when camera access is allowed
detector.addEventListener("onWebcamConnectSuccess", function() {
  log("Webcam access allowed");
});

// Add a callback to notify when camera access is denied
detector.addEventListener("onWebcamConnectFailure", function() {
  log("webcam denied");
  // @todo end
});

// Add a callback to notify when detector is stopped
detector.addEventListener("onStopSuccess", function() {
  log("The detector reports stopped");
});

// Add a callback to notify when the detector is initialized and ready for running
detector.addEventListener("onInitializeSuccess", function() {
  log("The detector reports initialized");
  //Display canvas instead of video feed because we want to draw the feature points on it
  $("#face_video_canvas").css("display", "block");
  $("#face_video").css("display", "none");
  $("#loading").hide();
  $("#game").show();
});

// Add a callback to receive the results from processing an image
// NOTE: The faces object contains a list of the faces detected in the image,
//   probabilities for different expressions, emotions and appearance metrics
detector.addEventListener("onImageResultsSuccess", function(faces, image, timestamp) {
  var canvas = $('#face_video_canvas')[0];
  if (!canvas)
    return;

  if (faces.length > 0) {
    // Report desired metrics
    log("Appearance: " + JSON.stringify(faces[0].appearance));
    log("Emotions: " + JSON.stringify(faces[0].emotions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log("Expressions: " + JSON.stringify(faces[0].expressions, function(key, val) {
      return val.toFixed ? Number(val.toFixed(0)) : val;
    }));
    log("Emoji: " + faces[0].emojis.dominantEmoji);

    // Call functions to draw feature points and dominant emoji (for the first face only)
    drawFeaturePoints(canvas, image, faces[0]);
    drawEmoji(canvas, image, faces[0]);

    if(faces[0].emojis != null && faces[0].emojis.dominantEmoji != null){
      gameState.checkEmoji(faces[0].emojis.dominantEmoji);
    }
  }
});


// --- Custom functions ---

// Draw the detected facial feature points on the image
function drawFeaturePoints(canvas, img, face) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  // Loop over each feature point in the face
  for (var id in face.featurePoints) {
    var featurePoint = face.featurePoints[id];
      drawPoint(featurePoint.x, featurePoint.y,ctx);
  }
}

// Draw the dominant emoji on the image
function drawEmoji(canvas, img, face) {
  // Obtain a 2D context object to draw on the canvas
  var ctx = canvas.getContext('2d');

  var emoji = face.emojis.dominantEmoji;

  if(emoji != 0){
    ctx.font = '48px serif';
    ctx.fillText(emoji, 10, 50);
  }
}

function drawPoint(x, y, canvas){
  canvas.beginPath();
  canvas.arc(x, y, 1, 0, 2 * Math.PI, true);
  canvas.stroke();
}

// Game
var app = new PIXI.Application();
app.renderer = PIXI.autoDetectRenderer(800, 600, { transparent: true });


// Emoji Container
var emojiContainer = new PIXI.Container();
// Center on the screen
emojiContainer.x = (app.renderer.width - emojiContainer.width) / 2;
emojiContainer.y = (app.renderer.height - emojiContainer.height) / 2;
app.stage.addChild(emojiContainer);

var emojiTextStyle = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 144,
    fontWeight: 'bold',
});
function showNextEmoji(emoji){
  var text = String.fromCodePoint(emoji);
  var basicText = new PIXI.Text(text,emojiTextStyle);
  basicText.anchor.set(0.5);
  emojiContainer.addChild(basicText);
}

// Update score being displayed
var snd = new Audio("audio/points.wav"); // buffers automatically when created

function setScore(score) {
  log("Setting Score");
  snd.play();
  $("#score_label").html("Score:"+score);
}

$(document).ready(function() {

    onStart();

    $("#loading").show();
    $("#game").hide();

  	// add the renderer view element to the DOM
  	$("#gameContainer").append(app.view);

  	app.ticker.add(function(delta){


    });

    $(window).keypress(function (e) {
      if (e.keyCode === 0 || e.keyCode === 32) {
        gameState.nextEmoji();
      }else if (e.keyCode === 0 || e.keyCode === 109) {
        var audio = $("audio")[0];
        if (audio.paused) { audio.play(); } else { audio.pause(); }
      }


    });

  });
