(function($) {

  siberia.ensureObject('siberia.speechToText');

  var conversation, stt, mic, micSpan, inputId, inputPos;
  
  var onAudioDataAvailable = function(base64String) {
    console.log('Passing data to recognize...');
    stt.server.recognize(base64String);
  }

  var onConversationStateChange = function(state) {
    switch (state) {
      case 'Passive':
        stt.server.stopRecording();
        micSpan.html('mic_off');
        micSpan.attr('alt', 'mic off');
        break;
      case 'Listening':
        stt.server.startRecording();
        micSpan.html('mic_none');
        micSpan.attr('alt', 'mic on');
        break;
    }
  }

  var onHubResponse = function (response) {
    var json;
    try {
      json = JSON.parse(response);
    } catch (e) {
      console.log(e);
      console.log(response);
      return;
    }
    var input = $('#' + inputId);
    var head = input.val().substring(0, inputPos);
    var result = head + json.text;
    input.val(result);
    if (json.isFinal) {
      inputPos += json.text.length;
    }
  }

  var onHubError = function (message) {
    console.log(message);
  }

  var initConversation = function() {
    var config = {
      silenceDetection: false,
      recordingMode: {
        file: false,
        stream: true,
        streamToBase64String: true,
        streamSampleRate: 16000
      }
    };

    conversation = new siberia.speechToText.conversation(config, onConversationStateChange, null, null, null, onAudioDataAvailable);
  }

  var initMic = function () {
    console.log('Initializing microphone widget...');

    mic.click(function () {
      conversation.advanceConversation();
    });

    mic.css('visibility', 'visible');

    console.log('Microphone widget was initialized.');
  }

  var initInputItems = function () {
    console.log('Initializing inputs...');
    var items = $(document.body).find('[data-nusa-enabled="true"]');
    if (items && items.length > 0) {
      inputId = $(items[0]).attr('id');
      inputPos = $(items[0]).val().length;
      for (var i = 0; i < items.length; ++i) {
        $(items[i]).addClass('speech-to-text-enabled');
        $(items[i]).on('focus',
          function() {
            inputId = $(this).attr('id');
            inputPos = $(this).val().length;
          });
      }
    }
    console.log('Inputs initialized.');
  }

  var initHub = function() {
    console.log('Initializing hub...');

    var deferred = $.Deferred();
    stt = $.connection.speechToTextHub;

    stt.client.sendRecognition = onHubResponse;

    stt.client.errorRecognition = onHubError;

    $.connection.hub.start().done(function() {
      console.log('Hub initialized successfully.');
      deferred.resolve();
    });
    return deferred.promise();
  }

  var init = function() {
    var deferred = $.Deferred();
    mic = $('.speech-to-text-mic-btn');
    micSpan = $('.speech-to-text-mic-span');
    initHub().done(function () {
      initConversation();
      initMic();
      initInputItems();
      deferred.resolve();
    });
    return deferred.promise();
  }

  siberia.speechToText.init = init;

})(jQuery);