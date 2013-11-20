// For this example, our "signaling channel" will
// just be the console.

var signalingChannel = {
  send: function(message) {
    console.log(message);
  }
};

var iceServers = {
  iceServers: [{
    url: 'stun:stun.l.google.com:19302'
  }
              ]
};

var optionalRtpDataChannels = {
  optional: [{
    RtpDataChannels: true
  }
            ]
};

var offerer = new webkitRTCPeerConnection(iceServers, optionalRtpDataChannels),
    answerer, answererDataChannel;

var offererDataChannel = offerer.createDataChannel('RTCDataChannel', {
  reliable: false
});
setChannelEvents(offererDataChannel, 'offerer');

offerer.onicecandidate = function (event) {
  if (!event || !event.candidate) return;
  answerer && answerer.addIceCandidate(event.candidate);
};

var mediaConstraints = {
  optional: [],
  mandatory: {
    OfferToReceiveAudio: false, // Hmm!!
    OfferToReceiveVideo: false // Hmm!!
  }
};

offerer.createOffer(function (sessionDescription) {
  offerer.setLocalDescription(sessionDescription);
  // createAnswer(sessionDescription);
}, null, mediaConstraints);


function createAnswer(offerSDP) {
  answerer = new webkitRTCPeerConnection(iceServers, optionalRtpDataChannels);
  answererDataChannel = answerer.createDataChannel('RTCDataChannel', {
    reliable: false
  });

  setChannelEvents(answererDataChannel, 'answerer');

  answerer.onicecandidate = function (event) {
    if (!event || !event.candidate) return;
    offerer && offerer.addIceCandidate(event.candidate);
  };

  answerer.setRemoteDescription(offerSDP);
  answerer.createAnswer(function (sessionDescription) {
    answerer.setLocalDescription(sessionDescription);
    offerer.setRemoteDescription(sessionDescription);
  }, null, mediaConstraints);
}

function setChannelEvents(channel, channelNameForConsoleOutput) {
  channel.onmessage = function (event) {
    console.debug(channelNameForConsoleOutput, 'received a message:', event.data);
  };

  channel.onopen = function () {
    channel.send('first text message over RTP data ports');
  };
  channel.onclose = function (e) {
    console.error(e);
  };
  channel.onerror = function (e) {
    console.error(e);
  };
}

























var peerConnection;
var channel;
var iceCandidates = [];

var iceServers = {'iceServers': [{url: 'stun:stun.l.google.com:19302'}]};
configuration = iceServers;
var optionalRtpDataChannels = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };

// call start(true) to initiate
function start(isInitiator) {
  // create your peerConnection
  peerConnection = new RTCPeerConnection(configuration,optionalRtpDataChannels);

  // send any ice candidates to the other peer
  // not fired until createOffer/createAnswer
  peerConnection.onicecandidate = function (evt) {
    if (evt.candidate)
      iceCandidates.push(evt.candidate);
    signalingChannel.send(JSON.stringify({ "candidate": evt.candidate }));
  };

  // let the "negotiationneeded" event trigger offer generation
  peerConnection.onnegotiationneeded = function () {
    peerConnection.createOffer(localDescCreated, logError);
  }

  if (isInitiator) {
    // create data channel and setup chat
    channel = peerConnection.createDataChannel("chat");
    setupChat();
  } else {
    // setup chat on incoming data channel
    peerConnection.ondatachannel = function (evt) {
      channel = evt.channel;
      setupChat();
    };
  }
}

function localDescCreated(desc) {
  peerConnection.setLocalDescription(desc, function () {
    signalingChannel.send(JSON.stringify({ "sdp": peerConnection.localDescription }));
  }, logError);
}

signalingChannel.onmessage = function (evt) {
  if (!peerConnection)
    start(false);

  var message = JSON.parse(evt.data);
  if (message.sdp)
    peerConnection.setRemoteDescription(new RTCSessionDescription(message.sdp), function () {
      // if we received an offer, we need to answer
      if (peerConnection.remoteDescription.type == "offer")
      peerConnection.createAnswer(localDescCreated, logError);
    }, logError);
  else
    peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
};

function setupChat() {
  console.log('set up chat');
  channel.onopen = function () {
    // e.g. enable send button
    // enableChat(channel);
  };

  channel.onmessage = function (evt) {
    // showChatMessage(evt.data);
    console.log(evt.data);
  };
}

function sendChatMessage(msg) {
  channel.send(msg);
}

function logError(error) {
  console.log(error.name + ": " + error.message);
}


function addAllIceCandidates(remoteIce) {
  remoteIce.map(function(candidate) {
    if (candidate) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });
}
// addAllIceCandidates(remoteIce);

















// First, create a new RTCPeerConnection object.
// To do this, you need to set your ice servers 
// (failure to do so will result in local-only IP addresses)
// If you want a DataChannel, you have to declare it in the
// optional parameters.

var iceServers = {'iceServers': [{url: 'stun:stun.l.google.com:19302'}]};
var optionalRtpDataChannels = { 'optional': [{'DtlsSrtpKeyAgreement': true}, {'RtpDataChannels': true }] };

var peerConnection = new RTCPeerConnection(iceServers, optionalRtpDataChannels);

// Next, set an onicecandidate handler. 

peerConnection.onicecandidate = gotIceCandidate;

var icecandidates = [];
function gotIceCandidate(event) {
  signalingChannel.send(JSON.stringify({ "candidate": event.candidate }));
  icecandidates.push(JSON.stringify(event.candidate));
}

// If you want a data channel:

var dataChannel;
peerConnection.ondatachannel = receivedDataChannel;

try {
  // Reliable Data Channels not yet supported in Chrome
  dataChannel = peerConnection.createDataChannel("myDataChannel");
  trace('Created send data channel');
} catch (e) {
  alert('Failed to create data channel. ' +
      'You need Chrome M25 or later with RtpDataChannel enabled');
  trace('createDataChannel() failed with exception: ' + e.message);
}

function receivedDataChannel(channel) {
  console.log(channel);
  var receiveChannel = event.channel;
  receiveChannel.onmessage = handleMessage;
  receiveChannel.onopen = handleSendeChannelStateChange;
  receiveChannel.onclose = handleSendChannelStateChange;
}

dataChannel.onopen = handleSendChannelStateChange;
dataChannel.onclose = handleSendChannelStateChange;
dataChannel.onmessage = handleMessage;

var handleSendChannelStateChange = function handleSendChannelStateChange() {
  var readyState = dataChannel.readyState;
  console.log(readyState);
}

var handleMessage = function handleMessage(message) {
  console.log(message);
}

// onicecandate won't fire until after you create an offer,
// though, so let's do that. createOffer (and later, createAnswer)
// will both fire a callback that will receive an SDP message.
// If you want to share video/audio, the offer needs to come after the
// getUserMedia callback, and after peerConnection.addStream(<MediaStream>)
// If you only want a data channel, you don't need getUserMedia.
// When you get your own description, you need to setLocalDescription to
// your description.

peerConnection.createOffer(gotLocalDescription);

function gotLocalDescription(description) {
  peerConnection.setLocalDescription(description);
  signalingChannel.send(JSON.stringify({"sdp": description}));
}

// Now you wait to hear back from the peer with an answer. Now let's
// move on to the remote peer side.
// Instantiate peerConnection in the same was as above. Now take your
// offer and use that to setRemoteDescription:

var description = "...";
peerConnection.setRemoteDescription(new RTCSessionDescription(description));

// Now create an answer:

peerConnection.createAnswer(gotLocalDescription);
function gotLocalDescription(description) {
  peerConnection.setLocalDescription(description);
  signalingChannel.send(JSON.stringify({"sdp": description}));
}

// Now, the remote peer sends the answer back to the local peer.
// The local peer sets the answer as the remote description:

var description = "...";
peerConnection.setRemoteDescription(new RTCSessionDescription(description));

// When ice candidates are sent between peers, each peer has to 
// add the ice candidates with:

var signal = '{...}';
peerConnection.addIceCandidate(new RTCIceCandidate(signal.candidate));


// to finalize the connection, you have to exchange your ice candidates
remoteIce = [];
function addAllIceCandidates(remoteIce) {
  remoteIce.map(function(candidate) {
    var candidate = JSON.parse(candidate);
    if (candidate) {
      peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  });
}
addAllIceCandidates(remoteIce);
