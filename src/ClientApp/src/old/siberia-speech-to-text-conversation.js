// Based AWS Lex browser audio capture solution https://github.com/awslabs/aws-lex-browser-audio-capture
// https://github.com/awslabs/aws-lex-browser-audio-capture/blob/master/lib/conversation.js

(function ($) {

  siberia.ensureObject('siberia.speechToText');

  var AudioControl = siberia.speechToText.audioControl;
  var MESSAGES = Object.freeze({
    PASSIVE: 'Passive',
    LISTENING: 'Listening'
  });

  var audioControl = new AudioControl({ checkAudioSupport: false });

  siberia.speechToText.conversation = function (config, onStateChange, onSuccess, onError, onVisualize, onDataAvailable) {
    var currentState;

    // Apply default values.
    this.config = applyDefaults(config);
    this.messages = MESSAGES;
    onStateChange = onStateChange || function () { /* no op */ };
    this.onSuccess = onSuccess || function () { /* no op */ };
    this.onError = onError || function () { /* no op */ };
    this.onVisualize = onVisualize || function () { /* no op */ };
    this.onDataAvailable = onDataAvailable || function() { /* no op */ };

    this.onSilence = function () {
      if (this.config.silenceDetection) {
        audioControl.stopRecording();
        currentState.advanceConversation();
      }
    };

    this.onSilence = this.onSilence.bind(this);

    this.transition = function (conversation) {
      currentState = conversation;
      var state = currentState.state;
      onStateChange(state.message);
    };

    this.advanceConversation = function () {
      audioControl.supportsAudio(function (supported) {
        if (supported) {
          currentState.advanceConversation();
        } else {
          onError('Audio is not supported.');
        }
      });
    };

    this.updateConfig = function (newValue) {
      this.config = applyDefaults(newValue);
    };

    this.updateConfig = this.updateConfig.bind(this);

    this.reset = function () {
      audioControl.clear();
      currentState = new Initial(currentState.state);
    };

    currentState = new Initial(this);

    return {
      advanceConversation: this.advanceConversation,
      updateConfig: this.updateConfig,
      reset: this.reset
    };
  };

  var Initial = function (state) {
    this.state = state;
    state.message = state.messages.PASSIVE;
    this.advanceConversation = function () {
      audioControl.startRecording(state.onSilence, state.onVisualize, state.onDataAvailable, state.config.silenceDetection, state.config.recordingMode);
      state.transition(new Listening(state));
    };
  };

  var Listening = function (state) {
    this.state = state;
    state.message = state.messages.LISTENING;
    this.advanceConversation = function () {
      audioControl.stopRecording();
      state.transition(new Initial(state));
    };
  };

  var applyDefaults = function (config) {
    config = config || {};
    config.silenceDetection = config.hasOwnProperty('silenceDetection') ? config.silenceDetection : true;

    return config;
  };

})(jQuery);