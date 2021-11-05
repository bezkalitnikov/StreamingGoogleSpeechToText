import React, { Component } from 'react';
import { Microphone } from './Microphone';
import { Recognition } from './Recognition';
import { AudioFile } from './AudioFile';


export class Home extends Component {
  static displayName = Home.name;

  render () {
    return (
      <div>
        <h1>Streaming SpeechToText Example</h1>
        <p>Click on microphone icon below to start streaming.</p>
        <Microphone/>
        <Recognition/>
        <AudioFile/>
      </div>
    );
  }
}
