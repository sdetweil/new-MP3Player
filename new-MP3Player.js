// get our filename as an array
let _ourMP3path = document.currentScript.src.split('/')
// get just the name from the array
// (next to last entry, the containing folder name, which MUST match the modulename)
let __ourMP3name = _ourMP3path.slice(-2,-1)


// all the variables BEFORE the module register are GLOBAL and COULD collide with other scripts loaded
// by other modules.. be careful
var __ourMP3 = null;
const __ourDefault_path="see code in start"
Module.register(__ourMP3name,{
	defaults: {
		musicPath: __ourDefault_path,
		autoPlay: true,
		random: false,
		loopList: true,
	},
	audioPlayer : null,
	arrPlayed : [],
	getStyles: function() {
		return [this.data.path+this.name+".css"];
	},
	start: function(){
		// save our this pointer once
		__ourMP3 = this
		// we can't set the default path via data declarations (this.name....)
		// so we set it to some literal that we check , so we can use CODE to set it
		// if the incoming config value is the dummy literal
		if(__ourMP3.config.musicPath === __ourDefault_path )
			// use code to set it to the documented default (using our CURRENT module name)
			__ourMP3.config.musicPath=__ourMP3.data.path+"/music/"
		},

	getDom: function() {
	    var wrapper = document.createElement("div");
	    wrapper.id = __ourMP3.identifier + "_wrapper";

	    var player = document.createElement("div");
	    player.className = "player";

	    __ourMP3.info = document.createElement("div");
	    __ourMP3.info.className = "info";

	    __ourMP3.artist = document.createElement("span");
	    __ourMP3.artist.className = "artist";
	    __ourMP3.artist.innerHTML = __ourMP3.name; // was "MMM-MP3Player";

	    __ourMP3.song = document.createElement("span");
	    __ourMP3.song.className = "name";
	    __ourMP3.song.innerHTML = __ourMP3.config.autoPlay ? "AutoPlay Enabled" : "AutoPlay Disabled";
	    __ourMP3.song.innerHTML += __ourMP3.config.random ? "<br />Random Enabled" : "<br />Random Disabled";

	    var progress = document.createElement("div");
	    progress.className = "progress-bar";

	    __ourMP3.bar = document.createElement("div");
	    __ourMP3.bar.className = "bar";
	    progress.appendChild(__ourMP3.bar);

	    __ourMP3.info.appendChild(__ourMP3.artist);
	    __ourMP3.info.appendChild(__ourMP3.song);
	    __ourMP3.info.appendChild(progress);

	    __ourMP3.album_art = document.createElement("div");
	    __ourMP3.album_art.className = "album-art";
	    player.appendChild(__ourMP3.album_art);
	    player.appendChild(__ourMP3.info);

	    // Controls container
	    var controls = document.createElement("div");
	    controls.className = "controls";

	    // Define buttons and associated notifications
	    var buttons = {
	        "Play": 'PLAY_MUSIC',
	        "Stop": 'STOP_MUSIC',
	        "Next": 'NEXT_TRACK',
	        "Previous": 'PREVIOUS_TRACK',
	        "Random On": 'RANDOM_ON',
	        "Random Off": 'RANDOM_OFF'
	    };

	    Object.keys(buttons).forEach(function(key) {
	        var button = document.createElement("button");
	        button.innerHTML = key;
			button.addEventListener("click",()=>{
			    console.log("Button clicked: " + key);
			    console.log("Sending notification:", buttons[key], 'some_info');
			    __ourMP3.notificationReceived(buttons[key], 'some_info');
	        });
	        controls.appendChild(button);
	    });

	    player.appendChild(controls);


	    // Initialize the audio player
	    __ourMP3.audioPlayer = document.createElement("audio");
	    __ourMP3.audioPlayer.id = __ourMP3.identifier+"_player";
	    wrapper.appendChild(__ourMP3.audioPlayer);
	    wrapper.appendChild(player);

	    setTimeout(function() {
	        __ourMP3.sendSocketNotification("INITIATEDEVICES", __ourMP3.config);
	    }, 3000);

	    return wrapper;
	},
	socketNotificationReceived: function(notification, payload){		
		switch(notification){
			case "Error": // Universal error handler
				__ourMP3.musicFound = false;
				console.log("["+self.name+" Error! ", payload);
				break;
			case "Music_Files": // this populates the songs list (array)
				__ourMP3.songs = payload;
				__ourMP3.current = 0;
				__ourMP3.musicFound = true;
				console.log("["+self.name+" Music Found");
				__ourMP3.arrPlayed = Array(__ourMP3.songs.length).fill(false);
				if (__ourMP3.config.autoPlay){
					if (__ourMP3.config.random){
						ind = Math.floor(Math.random() * __ourMP3.songs.length); //(__ourMP3.current + 1) % __ourMP3.songs.length;
						__ourMP3.arrPlayed[ind] = true;
						__ourMP3.current = ind;
					}
					__ourMP3.sendSocketNotification("LOADFILE", __ourMP3.songs[__ourMP3.current]);
				}
				break;
			case "Music_File": // this is called everytime a song is sent from the server
				//console.log(payload[3]);
				if (payload[3] == 'music.png') {
					__ourMP3.album_art.className = "album-art";
					__ourMP3.album_art.classList.add('active');
				}
				else {
					__ourMP3.album_art.classList.toggle('active');
					__ourMP3.album_art.className = "album-art-found";
					var chngstyle = document.querySelector('.album-art-found').style;
					chngstyle.setProperty("--backgroundImage", "url('" + payload[3] + "')");
					//var mystr = window.getComputedStyle(document.querySelector('.album-art-found'), '::before').getPropertyValue('background-image');
					//console.log(mystr);
				}
				
				// create url of the raw data received and play it
				let audioPlayer=document.getElementById(__ourMP3.identifier+"_player");
				var binaryData = [];
				binaryData.push(payload[0]);
				if ((payload[2] = 'mp3') || (payload[2] = 'flac')){
					var url = window.URL.createObjectURL(new Blob(binaryData, {type: "audio/mpeg"}));
				}
				/*else if (payload[2] = 'ogg'){
					var url = window.URL.createObjectURL(new Blob(binaryData, {type: "audio/ogg"}));
				}*/
				else if (payload[2] = 'wav'){
					var url = window.URL.createObjectURL(new Blob(binaryData, {type: "audio/wav"}));
				}
				audioPlayer.load();
				audioPlayer.setAttribute('src', url);
				audioPlayer.volume = 1;
				audioPlayer.play();
				__ourMP3.artist.innerHTML = payload[1][0];
				__ourMP3.song.innerHTML = payload[1][1];
				//__ourMP3.album_art.classList.add('active');
				// progress bar (thanks to Michael Foley @ https://codepen.io/mdf/pen/ZWbvBv)
				var timer;
				var percent = 0;
				audioPlayer.addEventListener("playing", function(_event) {
					advance(_event.target.duration, audioPlayer);
				});
				audioPlayer.addEventListener("pause", function(_event) {
					clearTimeout(timer);
				});
				var advance = function(duration, element) {
					increment = 10/duration
					percent = Math.min(increment * element.currentTime * 10, 100);
					__ourMP3.bar.style.width = percent+'%'
					startTimer(duration, element);
				}
				var startTimer = function(duration, element){ 
					if(percent < 100) {
						timer = setTimeout(function (){advance(duration, element)}, 100);
					}
				}
				// next track & loop
				audioPlayer.onended = function() {
					if(!__ourMP3.musicFound){
						__ourMP3.album_art.classList.toggle('active');
						return;
					}
					if (__ourMP3.config.random){
						if (!__ourMP3.arrPlayed.includes(false)){ // if all files are played
							if (!__ourMP3.config.loopList) {
								__ourMP3.artist.innerHTML = "Playlist ended";
								__ourMP3.song.innerHTML = "";
								console.log("["+self.name+" Playlist ended");
								return;
							}
							__ourMP3.arrPlayed.fill(false);
						}
						do {
							ind = Math.floor(Math.random() * __ourMP3.songs.length); //(__ourMP3.current + 1) % __ourMP3.songs.length;
						} while ( (__ourMP3.arrPlayed[ind]) || ((ind == __ourMP3.current) && (__ourMP3.songs.length>1)) ); //ind == __ourMP3.current: not to play one song twice - in the end of list and in the beginning of newly created list)
						__ourMP3.arrPlayed[ind] = true;
						__ourMP3.current = ind;
					}
					else {
						if(__ourMP3.current==(__ourMP3.songs.length-1)){ // if all files are played
							if (!__ourMP3.config.loopList){
								__ourMP3.artist.innerHTML = "Playlist ended";
								__ourMP3.song.innerHTML = "";
								console.log("["+self.name+" Playlist ended");
								return;
							}
							__ourMP3.current = -1;
						}
						__ourMP3.current++;
					}
					__ourMP3.sendSocketNotification("LOADFILE", __ourMP3.songs[__ourMP3.current]);
				};
				console.log("["+self.name+" Music Played");
				break;
		}
	},

	notificationReceived: function(notification, payload, sender) {
	    console.log("Notification received:", notification);
			if (__ourMP3.musicFound){
				switch(notification){
					case "PLAY_MUSIC":
						if (__ourMP3.audioPlayer.paused){
							__ourMP3.audioPlayer.play();
						}
						else {
							__ourMP3.sendSocketNotification("LOADFILE", __ourMP3.songs[__ourMP3.current]);
						}
						break;
					case "STOP_MUSIC":
						__ourMP3.audioPlayer.pause();
						break;
					case "NEXT_TRACK":
						if(!__ourMP3.musicFound){
							__ourMP3.album_art.classList.toggle('active');
							return;
						}
						if (__ourMP3.config.random){
							if (!__ourMP3.arrPlayed.includes(false)){
								__ourMP3.arrPlayed.fill(false);
							}
							do {
								ind = Math.floor(Math.random() * __ourMP3.songs.length); // (__ourMP3.current + 1) % __ourMP3.songs.length;
							} while (__ourMP3.arrPlayed[ind] || ind == __ourMP3.current); // ind == __ourMP3.current: not to play one song twice - in the end of list and in the beginning of newly created list)
							__ourMP3.arrPlayed[ind] = true;
							__ourMP3.current = ind;
						}
						else {
							if(__ourMP3.current==(__ourMP3.songs.length-1)){ // this assures the loop
								__ourMP3.current = -1;
							}
							__ourMP3.current++;
						}
						__ourMP3.sendSocketNotification("LOADFILE", __ourMP3.songs[__ourMP3.current]);
						break;
					case "PREVIOUS_TRACK":
						if(__ourMP3.current==0){ // this assures the loop
								__ourMP3.current = (__ourMP3.songs.length);
							}
						__ourMP3.current--;
						__ourMP3.sendSocketNotification("LOADFILE", __ourMP3.songs[__ourMP3.current]);
						break;
					case "RANDOM_ON":
						__ourMP3.config.random = true;
						break;
					case "RANDOM_OFF":
						__ourMP3.config.random = false;
						break;
				}
			}
	}
});
