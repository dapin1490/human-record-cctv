let webcam;
let camw;
let camh;

let detector;
let detectedObjects = [];
let obj_map = new Map();

let maskGraphics;

let state = 0;
// 0: main page  1: recording page  2: paused page  3: saved page

let btn_pause;
let btn_record;
let btn_stop;
let stateIndicator;
let state_text = ["대기 중", "녹화 중", "녹화 일시정지", "녹화 저장 완료!"];

let recordingTime = '00:00:00';
let recordingStartTime;
let total_record_time = 0;
let log_writer;
let post_log_time;
let log_time;

let peopleNumber = 0;

let font = 'Nanum Gothic Coding';

function preload() {
  detector = ml5.objectDetector('cocossd');

  post_log_time = `${year()}-${nf(month(), 2, 0)}-${nf(day(), 2, 0)}-${nf(hour(), 2, 0)}-${nf(minute(), 2, 0)}-${nf(second(), 2, 0)}`;

  // button
  btn_record = createButton('녹화 시작');
  btn_record.position(950, 610);
  btn_style(btn_record);
  btn_record.style('width', '75px');
  btn_record.style('background', '#FF7979');
  btn_record.style('color', 'black');
  btn_record.mouseReleased(record_start);

  btn_pause = createButton('일시정지');
  btn_pause.position(1060, 610);
  btn_style(btn_pause);
  btn_pause.style('width', '70px');
  btn_pause.style('background', '#7A7A7A');
  btn_pause.style('color', 'white');
  btn_pause.mouseReleased(record_pause);

  btn_stop = createButton('녹화 종료/저장');
  btn_stop.position(1165, 610);
  btn_style(btn_stop);
  btn_stop.style('width', '105px');
  btn_stop.style('background', '#7A7A7A');
  btn_stop.style('color', 'white');
  btn_stop.mouseReleased(record_save);

  // textbox
  stateIndicator = createP("대기 중");
  stateIndicator.position(1020, 550);
  textbox_style(stateIndicator);
  stateIndicator.style('width', '150px');
  stateIndicator.style('background', 'white');
  stateIndicator.style('text-align', 'center');

  daytime = createP(`현재 시각:`);
  daytime.position(970, 35);
  textbox_style(daytime);

  record_time = createP(`녹화 시간:`);
  record_time.position(970, 70);
  textbox_style(record_time);

  pp_number = createP('보행자 수: 0');
  pp_number.position(970, 105);
  textbox_style(pp_number);
}

function setup() {
  createCanvas(1280, 720); // 1280, 720 기준

  camw = 910;
  camh = 690;
  webcam = createCapture(VIDEO);
  webcam.size(camw, camh);
  webcam.hide();

  detector.detect(webcam, gotDetections);
}

function draw() {
  background(255);

  drawVideoPreview(15, 15, camw, camh);
  drawButtons(state);
  drawStatusBar(state);
  drawStateIndicator(state);

  // logging
  let log_msg = '';
  log_time = `${year()}-${nf(month(), 2, 0)}-${nf(day(), 2, 0)}-${nf(hour(), 2, 0)}-${nf(minute(), 2, 0)}-${nf(second(), 2, 0)}`

  // draw object nemo and logging
  obj_map.clear();
  for (let i = 0; i < detectedObjects.length; i++) {
    let object = detectedObjects[i];

    if (obj_map.has(object.label)) {
      obj_map.set(object.label, obj_map.get(object.label) + 1);
    }
    else {
      obj_map.set(object.label, 1);
    }

    stroke(0, 255, 0);
    strokeWeight(4);
    noFill();
    rect(object.x, object.y, object.width, object.height);
    stroke(255, 255, 255);
    strokeWeight(4);
    fill(0);
    textSize(24);
    textFont(font);
    text(`${object.label.replace('person', '사람')} ${obj_map.get(object.label)}`, object.x + 10, object.y + 24);

    if (state == 1 && object.label == 'person' && log_time != post_log_time) {
      // timestamp, person_number, posx, posy
      let centerX = object.x + (object.width / 2);
      let centerY = object.y + (object.height / 2);
      log_msg = `${log_time},${obj_map.get('person')},${centerX},${centerY}`;
      log_writer.print(log_msg);
      print(log_msg);
    }
  }

  // count person
  if (obj_map.has('person')) {
    peopleNumber = obj_map.get('person');
  }
  else {
    peopleNumber = 0;
  }

  // logging time update
  if (log_time != post_log_time) {
    post_log_time = log_time;
    if (state == 3)
      state = 0;
  }
}

function btn_style(btn) {
  btn.style('font-family', font);
  btn.style('font-size', '12px');
  btn.style('height', '30px');
  btn.style('border-radius', '5px');
  btn.style('border', 'none');

  // hover 효과도 적용 가능
  btn.mouseOver(() => {
    btn.style('border', '3px solid black');
  });

  btn.mouseOut(() => {
    btn.style('border', 'none');
  });
}

function textbox_style(tbox) {
  tbox.style('font-size', '16px');
  tbox.style('color', 'black');
  tbox.style('font-family', font);
}

//==================== 1.Draw Video Preview
function drawVideoPreview(x, y, w, h) {
  image(webcam, x, y, w, h);
}

//==================== 2.Draw Buttons
function drawButtons(currentState) {
  // 0: main page  1: recording page  2: paused page  3: saved page
  btn_pause.html("일시정지");

  if(currentState == 0) {
    btn_record.style('background', '#FF7979');

    btn_pause.style('background', '#7A7A7A');
    btn_pause.style('color', 'white');

    btn_stop.style('background', '#7A7A7A');
  }
  else if(currentState == 1) {
    btn_record.style('background', '#7A7A7A');

    btn_pause.style('background', '#FFFF00');
    btn_pause.style('color', 'black');

    btn_stop.style('background', '#008000');
  }
  else if(currentState == 2) {
    btn_record.style('background', '#7A7A7A');

    btn_pause.style('background', '#F7A3FF');
    btn_pause.style('color', 'white');
    btn_pause.html("녹화재개");

    btn_stop.style('background', '#008000');
  }
  else if (currentState == 3) {
    btn_record.style('background', '#FF7979');

    btn_pause.style('background', '#7A7A7A');
    btn_pause.style('color', 'white');

    btn_stop.style('background', '#7A7A7A');
  }
}

//==================== 3.Draw Status Bar
function drawStatusBar(currentState) {
  // 0: main page  1: recording page  2: paused page  3: saved page
  let currdaytime = `${year()}-${nf(month(), 2, 0)}-${nf(day(), 2, 0)} ${nf(hour(), 2, 0)}:${nf(minute(), 2, 0)}:${nf(second(), 2, 0)}`;

  let timelen = 0;
  if (currentState == 1) {
    timelen = total_record_time + (millis() - recordingStartTime) / 1000; // 초 단위
  }
  else if (currentState == 2 || currentState == 3) {
    timelen = total_record_time;
  }
  recordingTime = `${nf(Math.floor(timelen / 3600), 2, 0)}:${nf(Math.floor(timelen % 3600 / 60), 2, 0)}:${nf(Math.floor(timelen % 60), 2, 0)}`;

  daytime.html(`현재 시각: ${currdaytime}`);
  pp_number.html(`보행자 수: ${peopleNumber}`);

  if (currentState == 0) {
    record_time.html(`녹화 시간: 00:00:00`);
  }
  else {
    record_time.html(`녹화 시간: ${recordingTime}`);
  }
}

//==================== 4.Draw State Indicator
function drawStateIndicator(currentState) {
  stateIndicator.html(state_text[currentState]);
}

function gotDetections(error, results) {
  if (error) {
    console.error(error);
    alert(error);
  }

  detectedObjects = results;
  detector.detect(webcam, gotDetections);
}

function record_start() {
  let filename = `record_person_${year()}-${nf(month(), 2, 0)}-${nf(day(), 2, 0)}-${nf(hour(), 2, 0)}-${nf(minute(), 2, 0)}-${nf(second(), 2, 0)}.csv`;

  log_writer = createWriter(filename);

  log_writer.print(`timestamp,person_number,posx,posy`);

  state = 1;
  total_record_time = 0;
  recordingStartTime = millis();
}

function record_pause() {
  if (state == 1) {
    state = 2;
    total_record_time += (millis() - recordingStartTime) / 1000;
  }
  else if (state == 2) {
    state = 1;
    recordingStartTime = millis();
  }
}

function record_save() {
  state = 3;
  if (state == 1) {
    total_record_time += (millis() - recordingStartTime) / 1000;
  }

  log_writer.close();
  log_writer.clear();

  showToast(state_text[state]);
}

function createToastElement() {
  // 토스트를 담을 div 생성
  var toast = document.createElement("div");

  // id와 기본 스타일을 설정
  toast.id = "toast";
  toast.style.visibility = "hidden";  // 초기 상태에서는 보이지 않음
  toast.style.minWidth = "150px";
  toast.style.marginLeft = "-125px";
  toast.style.backgroundColor = "white";
  toast.style.color = "black";
  toast.style.textAlign = "center";
  toast.style.borderRadius = "5px";
  toast.style.position = "fixed";
  toast.style.zIndex = "1";
  toast.style.fontSize = "16px";
  toast.style.opacity = "0";
  toast.style.transition = "visibility 0s, opacity 0.5s linear";
  toast.style.left = '1150px';
  toast.style.top = '565px';

  // 생성한 토스트 요소를 body에 추가
  document.body.appendChild(toast);

  return toast;
}

function showToast(message) {
  // 페이지에 토스트가 없으면 생성
  var toast = document.getElementById("toast") || createToastElement();

  stateIndicator.hide();

  // 메시지를 설정하고 토스트 보이기
  toast.innerText = message;
  toast.style.visibility = "visible";
  toast.style.opacity = "1";

  // 3초 후에 토스트를 숨김
  setTimeout(function() {
    toast.style.visibility = "hidden";
    toast.style.opacity = "0";
    stateIndicator.show();
  }, 3000);
}