// Based AWS Lex browser audio capture solution https://github.com/awslabs/aws-lex-browser-audio-capture
// https://github.com/awslabs/aws-lex-browser-audio-capture/blob/master/lib/worker.js

var recLength = 0,
    recBuffer = [],
    recordSampleRate,
    stream,
    streamSampleRate,
    streamToBase64String,
    file;

onmessage = function (e) {
  switch (e.data.command) {
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'export':
      exportBuffer(e.data.sampleRate);
      break;
    case 'clear':
      clear();
      break;
  }
};

function init(config) {
  recordSampleRate = config.sampleRate;
  stream = config.recordingMode.stream;
  streamSampleRate = config.recordingMode.streamSampleRate;
  file = config.recordingMode.file;
  streamToBase64String = config.recordingMode.streamToBase64String;
}

function record(inputBuffer) {
  if (file) {
    recBuffer.push(inputBuffer[0]);
    recLength += inputBuffer[0].length;
  }

  if (stream) {
    exportChunk(inputBuffer[0], streamSampleRate);
  }
}

function exportChunk(inputBuffer, exportSampleRate) {
  var downsampledBuffer = downsampleBuffer(inputBuffer, exportSampleRate);
  var buffer = new ArrayBuffer(downsampledBuffer.length * 2);
  var view = new DataView(buffer);
  floatTo16BitPCM(view, 0, downsampledBuffer);
  var audioBlob = new Blob([view], { type: 'application/octet-stream' });
  if (streamToBase64String) {
    var reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = function(ev) {
      postMessage({ type: 'chunk', payload: ev.target.result.split(',')[1] });
    };
  } else {
    postMessage({ type: 'chunk', payload: audioBlob });
  }
}

function exportBuffer(exportSampleRate) {
  if (!file) {
    postMessage({ type: 'file', payload: null });
  }
  var mergedBuffers = mergeBuffers(recBuffer, recLength);
  var downsampledBuffer = downsampleBuffer(mergedBuffers, exportSampleRate);
  var encodedWav = encodeWAV(downsampledBuffer, exportSampleRate);
  var audioBlob = new Blob([encodedWav], { type: 'application/octet-stream' });
  postMessage({ type: 'file', payload: audioBlob });
}

function clear() {
  recLength = 0;
  recBuffer = [];
}

function downsampleBuffer(buffer, exportSampleRate) {
  if (exportSampleRate === recordSampleRate) {
    return buffer;
  }
  var sampleRateRatio = recordSampleRate / exportSampleRate;
  var newLength = Math.round(buffer.length / sampleRateRatio);
  var result = new Float32Array(newLength);
  var offsetResult = 0;
  var offsetBuffer = 0;
  while (offsetResult < result.length) {
    var nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
    var accum = 0,
      count = 0;
    for (var i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
      accum += buffer[i];
      count++;
    }
    result[offsetResult] = accum / count;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function mergeBuffers(bufferArray, recLength) {
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < bufferArray.length; i++) {
    result.set(bufferArray[i], offset);
    offset += bufferArray[i].length;
  }
  return result;
}

function floatTo16BitPCM(output, offset, input) {
  for (var i = 0; i < input.length; i++, offset += 2) {
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string) {
  for (var i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples, exportSampleRate) {
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 32 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, exportSampleRate, true);
  view.setUint32(28, exportSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);

  return view;
}