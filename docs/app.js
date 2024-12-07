const CANVAS_SIZE = 280;
const CANVAS_SCALE = 0.5;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const clearButton = document.getElementById("clear-button");

let isMouseDown = false;
let hasIntroText = true;
let lastX = 0;
let lastY = 0;

// Add 'Draw a number here!' to the canvas.
ctx.lineWidth = 28;
ctx.lineJoin = "round";
ctx.font = "28px sans-serif";
ctx.textAlign = "center";
ctx.textBaseline = "middle";
ctx.fillStyle = "#212121";
ctx.fillText("Model not loaded...", CANVAS_SIZE / 2, CANVAS_SIZE / 2);

// Set the line color for the canvas.
ctx.strokeStyle = "#212121";

function clearCanvas() {
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  for (let i = 0; i < 10; i++) {
    const element = document.getElementById(`prediction-${i}`);
    element.className = "prediction-col";
    element.children[0].children[0].style.height = "0";
  }
}

function drawLine(fromX, fromY, toX, toY) {
  // Draws a line from (fromX, fromY) to (toX, toY).
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.closePath();
  ctx.stroke();
  updatePredictions();
}

async function updatePredictions() {
  // Get the predictions for the canvas data.
  const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const input = new ort.Tensor("float32", new Float32Array(imgData.data));

  const feeds = {
    "onnx::Reshape_0": input,
  };

  const outputMap = await sess.run(feeds);
  let predictions = [];
  let maxPrediction = null;
  for (const key in outputMap) {
    if (outputMap[key].cpuData) {
      predictions = outputMap[key].cpuData;
      maxPrediction = Math.max(...predictions);
    }
  }

  for (let i = 0; i < predictions.length; i++) {
    const element = document.getElementById(`prediction-${i}`);
    element.children[0].children[0].style.height = `${predictions[i] * 100}%`;
    element.className =
      predictions[i] === maxPrediction
        ? "prediction-col top-prediction"
        : "prediction-col";
  }
}

function canvasMouseDown(event) {
  isMouseDown = true;
  if (hasIntroText) {
    clearCanvas();
    hasIntroText = false;
  }
  const x = event.offsetX / CANVAS_SCALE;
  const y = event.offsetY / CANVAS_SCALE;

  // To draw a dot on the mouse down event, we set laxtX and lastY to be
  // slightly offset from x and y, and then we call `canvasMouseMove(event)`,
  // which draws a line from (laxtX, lastY) to (x, y) that shows up as a
  // dot because the difference between those points is so small. However,
  // if the points were the same, nothing would be drawn, which is why the
  // 0.001 offset is added.
  lastX = x + 0.001;
  lastY = y + 0.001;
  canvasMouseMove(event);
}

function canvasMouseMove(event) {
  const x = event.offsetX / CANVAS_SCALE;
  const y = event.offsetY / CANVAS_SCALE;
  if (isMouseDown) {
    drawLine(lastX, lastY, x, y);
  }
  lastX = x;
  lastY = y;
}

function bodyMouseUp() {
  isMouseDown = false;
}

function bodyMouseOut(event) {
  // We won't be able to detect a MouseUp event if the mouse has moved
  // ouside the window, so when the mouse leaves the window, we set
  // `isMouseDown` to false automatically. This prevents lines from
  // continuing to be drawn when the mouse returns to the canvas after
  // having been released outside the window.
  if (!event.relatedTarget || event.relatedTarget.nodeName === "HTML") {
    isMouseDown = false;
  }
}

function hookUpMouseEvents() {
  canvas.addEventListener("mousedown", canvasMouseDown);
  canvas.addEventListener("mousemove", canvasMouseMove);
  document.body.addEventListener("mouseup", bodyMouseUp);
  document.body.addEventListener("mouseout", bodyMouseOut);

  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.fillText("Draw a number here!", CANVAS_SIZE / 2, CANVAS_SIZE / 2);
}

function clearMouseEvents() {
  canvas.removeEventListener("mousedown", canvasMouseDown);
  canvas.removeEventListener("mousemove", canvasMouseMove);
  document.body.removeEventListener("mouseup", bodyMouseUp);
  document.body.removeEventListener("mouseout", bodyMouseOut);
  ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

document.onkeydown = (evt) => {
  let isEscape = false;
  if ("key" in evt) {
    isEscape = evt.key === "Escape" || evt.key === "Esc";
  } else {
    isEscape = evt.keyCode === 27;
  }
  if (isEscape) {
    clearCanvas();
  }
};

function updateButtonState() {
  const fileInput = document.getElementById("modelFile");
  const loadModelButton = document.getElementById("loadModelButton");
  loadModelButton.disabled = !fileInput.files.length; // Enable button only if a file is selected
}

clearButton.addEventListener("mousedown", clearCanvas);

async function loadModel() {
  const fileInput = document.getElementById("modelFile");
  if (fileInput.files.length > 0) {
    const file = fileInput.files[0];

    // Create a FileReader to read the file
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const arrayBuffer = event.target.result;

        // Load the ONNX model from the ArrayBuffer
        //const session = new ort.InferenceSession();
        const session = await ort.InferenceSession.create(new Uint8Array(arrayBuffer));
        console.log("Model loaded successfully");
        window.sess = session;
        hookUpMouseEvents();

        fileInput.value = ""; // Clear the file input
        updateButtonState(); // Update button state to disabled
      } catch (error) {
        console.error("Failed to load the model", error);
        updateButtonState();
      }
    };

    // Read the file as an ArrayBuffer
    reader.readAsArrayBuffer(file);
  } else {
    alert("Please select a model file to load.");
  }
}
