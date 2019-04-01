/*
 *hichat v0.4.2
 *Wayou Mar 28,2014
 *MIT license
 *view on GitHub:https://github.com/wayou/HiChat
 *see it in action:http://hichat.herokuapp.com/
 */
 var hichat;
window.onload = function() {
    //hichat.init();
};
window.onbeforeunload = function(){
    hichat.close();
};

var AUTH_TOKEN;
var CHAT_USER_ID = 0;
var HiChat = function() {
    this.socket = null;
	this.peer = null;
};
HiChat.prototype = {
    init: function() {
		loadUsers();
        var that = this;	
		this.isReady = false;
        this.socket = io.connect();
		
		//On Connect
        this.socket.on('connect', function() {
            that.socket.emit('login', USER_ID);
        });
		
		//On socket login success
        this.socket.on('loginSuccess', function(userId) {
            document.getElementById('messageInput').focus();
			
        });
		
		//On new message
		this.socket.on('newMsg', function(data) {
			var json = JSON.parse(data);
			if(!json.media){
				that._displayIncomingMsg(json.senderId, json.messageText);
			}else{
				var mediaType = json.media.type;
				if(mediaType=="image"){
					displayIncomingImage(from, json)
				}
			}
			
			//Update message status as Delivered
			setTimeout(function(){
				var status = {
				"messageId": json.messageId,
				"senderId" : json.senderId,
				"receiverId" : json.receiverId,
				"status": "DELIVERED"
			}
			that.socket.emit("updateMessageStatus", JSON.stringify(status));
			}, 1000)
			
			//Update message status as Delivered
			setTimeout(function(){
				var status = {
				"messageId": json.messageId,
				"senderId" : json.senderId,
				"receiverId" : json.receiverId,
				"status": "READ"
			}
			that.socket.emit("updateMessageStatus", JSON.stringify(status));
			}, 2000)
			
        });
		
		//On stream offer
		this.socket.on('offer', function(from, offer) {
			startVideoStream();
			setTimeout(function(){
				that.peer.signal(JSON.parse(offer));
			}, 1000);
        });
		
		//On stream answer
		this.socket.on('answer', function(from, answer) {
			that.peer.signal(JSON.parse(answer));
        });
		
		//On socket error
        this.socket.on('error', function(err) {
            if (document.getElementById('loginWrapper').style.display == 'none') {
                //document.getElementById('status').textContent = '!fail to connect :(';
            } else {
                //document.getElementById('info').textContent = '!fail to connect :(';
            }
			USER_ID = null;
        });
		
		//On system message
        this.socket.on('system', function(nickName, userCount, type) {
            //var msg = nickName + (type == 'login' ? ' joined' : ' left');
            //that._displayNewMsg('system ', msg);
        });
        
        document.getElementById('sendBtn').addEventListener('click', function() {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value;
            messageInput.value = '';
            messageInput.focus();
            if (msg.trim().length != 0) {
				var json = { "senderId": USER_ID, "receiverId": CHAT_USER_ID, "messageText" : msg};
                that.socket.emit('postMsg', JSON.stringify(json));
                that._displayOutgoingMsg('me', msg);
                return;
            };
        }, false);
        document.getElementById('messageInput').addEventListener('keyup', function(e) {
            var messageInput = document.getElementById('messageInput'),
                msg = messageInput.value;
            if (e.keyCode == 13 && msg.trim().length != 0) {
                messageInput.value = '';
                var json = { "senderId": USER_ID, "receiverId": CHAT_USER_ID, "messageText" : msg};
                that.socket.emit('postMsg', JSON.stringify(json));
                that._displayOutgoingMsg('me', msg);
            };
        }, false);
        
        /*this._initialEmoji();
        document.getElementById('emoji').addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            emojiwrapper.style.display = 'block';
            e.stopPropagation();
        }, false); */
        /* document.body.addEventListener('click', function(e) {
            var emojiwrapper = document.getElementById('emojiWrapper');
            if (e.target != emojiwrapper) {
                emojiwrapper.style.display = 'none';
            };
        });
        document.getElementById('emojiWrapper').addEventListener('click', function(e) {
            var target = e.target;
            if (target.nodeName.toLowerCase() == 'img') {
                var messageInput = document.getElementById('messageInput');
                messageInput.focus();
                messageInput.value = messageInput.value + '[emoji:' + target.title + ']';
            };
        }, false); */
		$(document).on('click', '.chat_list', function(){
			$('.chat_list').removeClass('active_chat');
			$(this).addClass('active_chat');
			if(Number($(this).find('input').val()) != CHAT_USER_ID){
				CHAT_USER_ID = Number($(this).find('input').val()); 
				//$('#msg-container').html('');
				$('#chatting-with-name').html($(this).find('.chat_user').html());
			}
			
		})
    },
	close: function(){
		if(this.socket != null){
			this.socket.emit("disconnect");
		}
	},
	sendMsg: function(data){
		if(this.socket != null){
			this.socket.emit('postMsg', data);
		}
	},
	startStream: function() {
		var that = this;
		var localVideo = document.getElementById('localVideo');
		const sUsrAg = navigator.userAgent;
		var stream;
		if (sUsrAg.indexOf('Firefox') > -1) {
		  stream = localVideo.mozCaptureStream();
		} else {
		  stream = localVideo.captureStream();
		}
		localVideo.play();

		this.peer = new SimplePeer({
			initiator: location.hash==='#1',
			trickle: false,
			stream: stream
		})	
		
		this.peer.on('signal', function(token){	
			if(window.location.hash){
				that.socket.emit('offer', CHAT_USER_ID, JSON.stringify(token));
			}else{
				that.socket.emit('answer', CHAT_USER_ID, JSON.stringify(token));
			}
		})
		
		/* this.peer.on('connect', function () {
			alert('Connect');
		}) */
		
		this.peer.on('stream', function (peerStream) {
			alert("Hello");
			var streamVideo = document.getElementById('streamVideo');
			streamVideo.style.display = 'block';
			streamVideo.srcObject = peerStream;
			streamVideo.onloadedmetadata = function(){
				streamVideo.play();
			};
			
		})
	},
    /* _initialEmoji: function() {
        var emojiContainer = document.getElementById('emojiWrapper'),
            docFragment = document.createDocumentFragment();
        for (var i = 69; i > 0; i--) {
            var emojiItem = document.createElement('img');
            emojiItem.src = '../content/emoji/' + i + '.gif';
            emojiItem.title = i;
            docFragment.appendChild(emojiItem);
        };
        emojiContainer.appendChild(docFragment);
    }, */
    _displayIncomingMsg: function(user, msg) {
        var container = document.getElementById('msg-container'),
            msgNode = document.createElement('div');
            //determine whether the msg contains emoji
            //msg = this._showEmoji(msg);
		$(msgNode).addClass('incoming_msg');
		msgNode.innerHTML = '<div class="incoming_msg_img"> <img src="default-male-profile.jpg" alt="sunil"> </div>'+
							'<div class="received_msg">'+
								'<div class="received_withd_msg">'+
								  '<p>'+msg+'</p>'+
								  '<span class="time_date"> 11:01 AM    |    June 9</span>'+
							   '</div>'+
							'</div>';
        container.appendChild(msgNode);
        container.scrollTop = container.scrollHeight;
    },
	_displayOutgoingMsg: function(user, msg) {
        var container = document.getElementById('msg-container'),
            msgNode = document.createElement('div');
            //determine whether the msg contains emoji
            //msg = this._showEmoji(msg);
		$(msgNode).addClass('outgoing_msg');
		msgNode.innerHTML = '<div class="sent_msg">'+
								'<p>'+msg+'</p>'+
								'<span class="time_date"> 11:01 AM    |    June 9</span>'+
							'</div>';
        container.appendChild(msgNode);
        container.scrollTop = container.scrollHeight;
    }
    /* _showEmoji: function(msg) {
        var match, result = msg,
            reg = /\[emoji:\d+\]/g,
            emojiIndex,
            totalEmojiNum = document.getElementById('emojiWrapper').children.length;
        while (match = reg.exec(msg)) {
            emojiIndex = match[0].slice(7, -1);
            if (emojiIndex > totalEmojiNum) {
                result = result.replace(match[0], '[X]');
            } else {
                result = result.replace(match[0], '<img class="emoji" src="../content/emoji/' + emojiIndex + '.gif" />');//todo:fix this in chrome it will cause a new request for the image
            };
        };
        return result;
    } */
};
function displayIncomingImage(user, jsonData) {
	var container = document.getElementById('msg-container'),
		msgNode = document.createElement('div');
		//determine whether the msg contains emoji
		//msg = this._showEmoji(msg);
	$(msgNode).addClass('incoming_msg');
	msgNode.innerHTML = '<div class="incoming_msg_img"> <img src="default-male-profile.jpg" alt="sunil"> </div>'+
						'<div class="received_msg">'+
							'<div class="received_withd_msg">'+
								'<p>'+
									'<img src="'+jsonData.media.mediaUrl+'"/><br/>'+
									(jsonData.textMsg ? '<span>'+jsonData.textMsg+'</span>':'')+
								'</p>'+
								'<span class="time_date"> 11:01 AM    |    June 9</span>'+
						   '</div>'+
						'</div>';
	container.appendChild(msgNode);
	container.scrollTop = container.scrollHeight;
	return msgNode;
}
function displayOutgoingImage(user, imgData) {
	var container = document.getElementById('msg-container'),
		msgNode = document.createElement('div');
	$(msgNode).addClass('outgoing_msg');
	msgNode.innerHTML = '<div class="sent_msg">'+
							'<p>'+
								'<img src=""/><br/>'+
								'<span>A dummy message</span>'
							'</p>'+
							'<div class="msg_progress">'+
								'<div class="pie-wrapper pie-wrapper--solid progress-88">'+
									'<span class="label">88<span class="smaller">%</span></span>'+
								'</div>'+
							'</div>'+
							'<span class="time_date"> 11:01 AM    |    June 9</span>'+
						'</div>';
	container.appendChild(msgNode);
	container.scrollTop = container.scrollHeight;
	return msgNode;
}
function loadUsers(){
	$.ajax({
    url: 'http://172.16.5.152:3000/users',
    method: 'GET',
    dataType: 'json',
	beforeSend: function(xhr){xhr.setRequestHeader('Authorization', AUTH_TOKEN);},
    success: function(json){
		if(json.length>0){
			document.getElementById("chat-users").innerHTML = '';
			for(var i=0; i<json.length;i++){
				var emp = json[i];
				if(emp._id!=USER_ID){
					var divHtml= '<div class="chat_people">'+
									'<div class="chat_img"> <img src="default-male-profile.jpg" alt="sunil"> </div>'+
									'<div class="chat_ib">'+
										'<h5><span class="chat_user">'+emp.fullName+'</span><span class="chat_date">Dec 25</span></h5>'+
										'<p>Online</p>'+
										'<input type="hidden" value="'+emp._id+'"/>'+
									'</div>'+
								'</div>';
					var divNode = document.createElement('div');
					$(divNode).addClass('chat_list');
					divNode.innerHTML = divHtml;
					document.getElementById("chat-users").appendChild(divNode); 
				}
			}
			$(".chat_list:first").trigger('click');
		}
    }
  });
}
//Change login and signup form
$('.form').find('input, textarea').on('keyup blur focus', function (e) {
  var $this = $(this),
	  label = $this.prev('label');
	  if (e.type === 'keyup') {
			if ($this.val() === '') {
		  label.removeClass('active highlight');
		} else {
		  label.addClass('active highlight');
		}
	} else if (e.type === 'blur') {
		if( $this.val() === '' ) {
			label.removeClass('active highlight'); 
		} else {
			label.removeClass('highlight');   
		}   
	} else if (e.type === 'focus') {
		if( $this.val() === '' ) {
			label.removeClass('highlight'); 
		} else if( $this.val() !== '' ) {
			label.addClass('highlight');
		}
	}
});
//highlight login sign up tab
$('.tab a').on('click', function (e) {
	e.preventDefault();
	$(this).parent().addClass('active');
	$(this).parent().siblings().removeClass('active');
	target = $(this).attr('href');
	$('.tab-content > div').not(target).hide();
	$(target).fadeIn(600);
});
$('#btn-login').on('click', function (e) {
	e.preventDefault();
	$.ajax({
		url: 'http://172.16.5.152:3000/login',
		method: 'POST',
		data: JSON.stringify({"username": $('#input-email').val(), "password": $('#input-password').val()}),
		dataType: 'json',
		contentType: 'application/json',
		success: function(json){
			$('#loginWrapper').css({'display': 'none'});
			USER_ID = Number(json.user_id);
			AUTH_TOKEN = json.access_token;
			hichat.init();
		}
	});
});
$('#btn-signup').on('click', function (e) {
	e.preventDefault();
	$.ajax({
		url: 'http://172.16.5.152:3000/register',
		method: 'POST',
		data: JSON.stringify({"fullName": $('#register-name').val(), "email": $('#register-email').val(), "password": $('#register-password').val()}),
		dataType: 'json',
		contentType: 'application/json',
		success: function(json){
			$('#loginWrapper').css({'display': 'none'});
			USER_ID = Number(json._id);
			hichat.init();
		}
	});
});
$('#attachBtn').on('click', function (e) {
	e.preventDefault();
	$('#input_file').trigger('click');
});
$('#input_file').on('change', function(){
	if (this.files && this.files[0]) {
		var msgNode = displayOutgoingImage(CHAT_USER_ID, '');
		var reader = new FileReader();
		reader.onload = function (e) {
			$(msgNode).find('img').attr('src', e.target.result);
		}
		reader.readAsDataURL(this.files[0]);
	}
	var form_data = new FormData(); 
	form_data.append("file", $("#input_file")[0].files[0]);
	$.ajax({
		url : 'http://172.16.5.152:3000/upload/media',
		type: "POST",
		data : form_data,
		contentType: false,
		cache: false,
		processData:false,
		xhr: function(){
			//upload Progress
			var xhr = $.ajaxSettings.xhr();
			if (xhr.upload) {
				xhr.upload.addEventListener('progress', function(event) {
					var position = event.loaded || event.position;
					var total = event.total;
					if (event.lengthComputable) {
						percent = Math.ceil(position / total * 100);
					}
					if(percent <= 50){
						$('.pie-wrapper--solid.progress-88:before').css({
							'background': '#34495e',
							'transform': 'rotate((100 - (50 - '+percent+')) / 100 * 360deg * -1)'
						});
					}else{
						$('.pie-wrapper--solid.progress-88:before').css({
							'background': '#3498db',
							'transform': 'rotate((100 - '+percent+') / 100 * 360deg)'
						});
						
					}
				}, true);
			}
			return xhr;
		},
		mimeType:"multipart/form-data"
	}).done(function(res){ 
		res = JSON.parse(res);
		var json = { 
			"userId": CHAT_USER_ID, 
			"textMsg" : 'A dummy message',
			"media": {
				"type":"image",
				"mediaUrl" : res.uploadPath + res.fileName
			}
		};
		hichat.sendMsg(JSON.stringify(json));
	});
});
$('#videoCallBtn').on('click', function(){
	startVideoStream();
});
$('#closeVideoBtn').on('click', function(){
	var streamVideo = document.getElementById('streamVideo')
	var localVideo = document.getElementById('localVideo')
	streamVideo.pause();
	localVideo.pause();
	document.getElementById('videoWrapper').style.display='none';
});
function startVideoStream(){
	document.getElementById('videoWrapper').style.display='block';
	var localVideo = document.getElementById('localVideo');
	var source2 = document.createElement('source');
	if(window.location.hash){
		source2.setAttribute('src', 'http://172.16.5.152:3000/video/test_video.mp4');
	}else{
		source2.setAttribute('src', 'http://172.16.5.152:3000/video/sample_video.mp4');
	}
	localVideo.appendChild(source2);
	hichat.startStream();
}
