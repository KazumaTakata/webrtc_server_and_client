navigator.getUserMedia = navigator.getUserMedia ||
    navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

// migrate from non-spec RTCIceServer.url to RTCIceServer.urls
var OrigPeerConnection = window.RTCPeerConnection;
window.RTCPeerConnection = function(pcConfig, pcConstraints) {
  const configCopy = {};
  Object.getOwnPropertyNames(pcConfig).forEach(function(name) {
    configCopy[name] = pcConfig[name];
  });
  if (configCopy && configCopy.iceServers) {
    var newIceServers = [];
    for (var i = 0; i < configCopy.iceServers.length; i++) {
      var server = configCopy.iceServers[i];
      if (!server.hasOwnProperty('urls') &&
          server.hasOwnProperty('url')) {
        utils.deprecated('RTCIceServer.url', 'RTCIceServer.urls');
        server = JSON.parse(JSON.stringify(server));
        server.urls = server.url;
        newIceServers.push(server);
      } else {
        newIceServers.push(configCopy.iceServers[i]);
      }
    }
    configCopy.iceServers = newIceServers;
  }
  return new OrigPeerConnection(configCopy, pcConstraints);

}

var constraints = {video: true, audio: true}
var localStream;
var pc_config = webrtcDetectedBrowser === 'firefox' ? {'iceServers':[{'url':'stun:23.21.150.121'}]} : {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = { 'optional': [{'DtlsSrtpKeyAgreement': true} ]};
var sdpConstraints = {};

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');
// Clean-up function:
// collect garbage before unloading browser's window

var peerSockets = []
var pc;

var webSocket = new WebSocket("ws://localhost:8182");
navigator.getUserMedia(constraints, handleUserMedia, handleUserMediaError);


webSocket.onopen = function (event) {
   console.log("connect")
};

webSocket.onmessage = function (event) {
    console.log(event.data);
    let data = JSON.parse(event.data)

    if (data.type === "offer"){
        let video = document.createElement('video');
        video.autoplay = true;
        document.getElementById("videoContainer").appendChild(video)
        
        pc = new RTCPeerConnection(pc_config, pc_constraints);
        pc.addStream(localStream);
        pc.onicecandidate = function (event) {
                console.log('handleIceCandidate event: ', event);
                let icecandidatedate = {
                    type: 'candidate',
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid,
                    candidate: event.candidate.candidate
                }
                if (event.candidate) {
                    webSocket.send( JSON.stringify(icecandidatedate) )   
                } else {
                    console.log('End of candidates.');
                }
                }
        pc.onaddstream = function (event) {
                            console.log('Remote stream added.');
                            attachMediaStream(video, event.stream);
                            // console.log('Remote stream attached!!.');
                            // remoteStream = event.stream;
                            }

        pc.setRemoteDescription(new RTCSessionDescription(data));
        doAnswer();
    } else if (data.type === 'candidate') {
        var candidate = new RTCIceCandidate({sdpMLineIndex: data.sdpMLineIndex, candidate: data.candidate});
        pc.addIceCandidate(candidate);
    } 
  }

// Send 'Create or join' message to singnaling server

function handleUserMedia(stream) {
    localStream = stream;
    attachMediaStream(localVideo, stream);
    console.log('Adding local stream.');
    // sendMessage('got user media');
    
}

function handleUserMediaError(error){
    console.log('navigator.getUserMedia error: ', error);
}

function doAnswer() {
    console.log('Sending answer to peer.');
    pc.createAnswer(function(sessionDescription){
          pc.setLocalDescription(sessionDescription);
        //   sendMessageWithSocketId(sessionDescription, );
          webSocket.send( JSON.stringify(sessionDescription) )
        }, onSignalingError, sdpConstraints);
}

function onSignalingError(error) {
    console.log('Failed to create signaling message : ' + error.name);
}