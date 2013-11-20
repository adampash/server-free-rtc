var feature = {
  video: true,
  audio: false,
  data: true
}

// ----------------------------------------------------

var startCallButton = document.getElementById('startCallButton');
startCallButton.disabled = false;

var chatTextInput = document.getElementById('chatTextInput');
chatTextInput.disabled = true;

var chatTextResponses = document.getElementById('chatTextResponses');

var selfView = document.getElementById('selfView');
var remoteView = document.getElementById('remoteView');

var consumeButton = document.getElementById('consume');
consumeButton.onclick = function(e) {
  var offer = signalingChannel.value;
  signalingChannel.value = '';
  consumeOffer(offer);
}


// ----------------------------------------------------

startCallButton.addEventListener('click', function () {
  start(true);
  this.disabled = true;
});


// ----------------------------------------------------

var createSignalingChannel = function () {
  signalingChannel = document.getElementById('signal');
  signalingChannel.send = function(stuff) {
    this.value += stuff + "$NEWTHING$";
  }
  signalingChannel.onclick = function() {
    signalingChannel.select();
  }
  return signalingChannel;
}

// ----------------------------------------------------


var signalingChannel = createSignalingChannel();
var peerConnection, localStream, remoteStream;

var iceServers = {'iceServers': [{url: 'stun:stun.l.google.com:19302'}]};
var optionalRtpDataChannels = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };
var configuration = iceServers, optionalRtpDataChannels;

var dataChannel;

// run start(true) to initiate a call
function start(isCaller) {
  peerConnection = new RTCPeerConnection(configuration, optionalRtpDataChannels);

  if (feature.data) {
    try {
      // Reliable Data Channels not yet supported in Chrome
      dataChannel = peerConnection.createDataChannel("sendDataChannel",
          {reliable: false});
      trace('Created send data channel');
    } catch (e) {
      alert('Failed to create data channel. ' +
          'You need Chrome M25 or later with RtpDataChannel enabled');
      trace('createDataChannel() failed with exception: ' + e.message);
    }
    dataChannel.onopen = handleSendChannelStateChange;
    dataChannel.onclose = handleSendChannelStateChange;
    dataChannel.onmessage = handleMessage;
  }

  // send any ice candidates to the other peer
  peerConnection.onicecandidate = function (evt) {
    signalingChannel.send(JSON.stringify({ "candidate": evt.candidate }));
  };

  if (feature.video) {
    // once remote stream arrives, show it in the remote video element
    peerConnection.onaddstream = function (evt) {
      console.log('a stream was just added');
      remoteStream = evt.stream;
      remoteView.src = URL.createObjectURL(remoteStream);
    };

    // get the local stream, show it in the local video element and send it
    getUserMedia({ "audio": feature.audio, "video": feature.video }, function (stream) {
      localStream = stream;
      selfView.src = URL.createObjectURL(localStream);
      console.log('adding stream');
      peerConnection.addStream(localStream, errorLog);
      if (isCaller) {
        peerConnection.createOffer(gotDescription);
      } else {
        peerConnection.createAnswer(gotDescription);
      }
    });
  }

  if (isCaller && !feature.video) {
    peerConnection.createOffer(gotDescription);
  }

}

function errorLog(e) {
  console.log(e);
}

function gotDescription(desc) {
  peerConnection.setLocalDescription(desc);
  console.log('sending description');
  signalingChannel.send(JSON.stringify({ "sdp": desc }));
}

function consumeOffer(messages) {
  messages = messages.split("$NEWTHING$").map(function(message) {
    if (message) {
      return JSON.parse(message);
    } else {
      return null;
    }
  });
  if (!peerConnection) {
    start(false);
  }
  messages.forEach(function(message) {
    if (message) {
      if (message.sdp) {
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp));
        if (message.sdp.type == 'offer' && !feature.video) {
          peerConnection.createAnswer(gotDescription, errorLog);
        }
        console.log(peerConnection.messageingState);
      } else if (message.candidate) {
        peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
      }
    }
  });
}

function handleSendChannelStateChange() {
  var readyState = dataChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState == "open") {
    console.log('ready to send data!');
  } else {
    dataChannelSend.disabled = true;
    sendButton.disabled = true;
    closeButton.disabled = true;
  }
}

function handleMessage(event) {
  trace('Received message: ' + event.data);
}

function gotReceiveChannel(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleMessage;
  receiveChannel.onopen = handleReceiveChannelStateChange;
  receiveChannel.onclose = handleReceiveChannelStateChange;
}

function handleReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}
