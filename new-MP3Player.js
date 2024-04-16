//const __sp = require("path");
let _ourpath = document.currentScript.src.split('/')
let __ourname = _ourpath.slice(-2,-1)



var arrPlayed = [];
var audioElement = null; // Define it here globally
var ourMP3 = null;
const default_path="see code in start"
Module.register(__ourname,{
	defaults: {
		musicPath: "see code in start",
		autoPlay: true,
		random: false,
		loopList: true,
	},

	getStyles: function() {
		return [this.data.path+this.name+".css"];
	},
start: function(){
	// save our this pointer once
	ourMP3 = this	
	if(ourMP3.config.musicPath=== default_path )
		ourMP3.config.musicPath=ourMP3.data.path+"/music/"

	},

getDom: function() {    
    var wrapper = document.createElement("div");
    wrapper.id = ourMP3.identifier + "_wrapper";

    var player = document.createElement("div");
    player.className = "player";

    ourMP3.info = document.createElement("div");
    ourMP3.info.className = "info";

    ourMP3.artist = document.createElement("span");
    ourMP3.artist.className = "artist";
    ourMP3.artist.innerHTML = ourMP3.name; // was "MMM-MP3Player";

    ourMP3.song = document.createElement("span");
    ourMP3.song.className = "name";
    ourMP3.song.innerHTML = ourMP3.config.autoPlay ? "AutoPlay Enabled" : "AutoPlay Disabled";
    ourMP3.song.innerHTML += ourMP3.config.random ? "<br />Random Enabled" : "<br />Random Disabled";

    var progress = document.createElement("div");
    progress.className = "progress-bar";

    ourMP3.bar = document.createElement("div");
    ourMP3.bar.className = "bar";
    progress.appendChild(ourMP3.bar);

    ourMP3.info.appendChild(ourMP3.artist);
    ourMP3.info.appendChild(ourMP3.song);
    ourMP3.info.appendChild(progress);

    ourMP3.album_art = document.createElement("div");
    ourMP3.album_art.className = "album-art";
    player.appendChild(ourMP3.album_art);
    player.appendChild(ourMP3.info);

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
		    ourMP3.notificationReceived(buttons[key], 'some_info');
        });
        controls.appendChild(button);
    });

    player.appendChild(controls);


    // Initialize the audio element
    audioElement = document.createElement("audio");
    audioElement.id = ourMP3.identifier+"_player";
    wrapper.appendChild(audioElement);
    wrapper.appendChild(player);

    setTimeout(function() {
        ourMP3.sendSocketNotification("INITIATEDEVICES", ourMP3.config);
    }, 3000);

    return wrapper;
},
	socketNotificationReceived: function(notification, payload){		
		switch(notification){
			case "Error": // Universal error handler
				ourMP3.musicFound = false;
				console.log("["+self.name+" Error! ", payload);
				break;
			case "Music_Files": // this populates the songs list (array)
				ourMP3.songs = payload;
				ourMP3.current = 0;
				ourMP3.musicFound = true;
				console.log("["+self.name+" Music Found");
				arrPlayed = Array(ourMP3.songs.length).fill(false);
				if (ourMP3.config.autoPlay){
					if (ourMP3.config.random){
						ind = Math.floor(Math.random() * ourMP3.songs.length); //(ourMP3.current + 1) % ourMP3.songs.length;
						arrPlayed[ind] = true;
						ourMP3.current = ind;
					}
					ourMP3.sendSocketNotification("LOADFILE", ourMP3.songs[ourMP3.current]);
				}
				break;
			case "Music_File": // this is called everytime a song is sent from the server
				//console.log(payload[3]);
				if (payload[3] == 'music.png') {
					ourMP3.album_art.className = "album-art";
					ourMP3.album_art.classList.add('active');
				}
				else {
					ourMP3.album_art.classList.toggle('active');
					ourMP3.album_art.className = "album-art-found";
					var chngstyle = document.querySelector('.album-art-found').style;
					chngstyle.setProperty("--backgroundImage", "url('" + payload[3] + "')");
					//var mystr = window.getComputedStyle(document.querySelector('.album-art-found'), '::before').getPropertyValue('background-image');
					//console.log(mystr);
				}
				
				// create url of the raw data received and play it
				let audioElement=document.getElementById(ourMP3.identifier+"_player");
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
				audioElement.load();
				audioElement.setAttribute('src', url);
				audioElement.volume = 1;
				audioElement.play();
				ourMP3.artist.innerHTML = payload[1][0];
				ourMP3.song.innerHTML = payload[1][1];
				//ourMP3.album_art.classList.add('active');
				// progress bar (thanks to Michael Foley @ https://codepen.io/mdf/pen/ZWbvBv)
				var timer;
				var percent = 0;
				audioElement.addEventListener("playing", function(_event) {
					advance(_event.target.duration, audioElement);
				});
				audioElement.addEventListener("pause", function(_event) {
					clearTimeout(timer);
				});
				var advance = function(duration, element) {
					increment = 10/duration
					percent = Math.min(increment * element.currentTime * 10, 100);
					ourMP3.bar.style.width = percent+'%'
					startTimer(duration, element);
				}
				var startTimer = function(duration, element){ 
					if(percent < 100) {
						timer = setTimeout(function (){advance(duration, element)}, 100);
					}
				}
				// next track & loop
				audioElement.onended = function() {
					if(!ourMP3.musicFound){
						ourMP3.album_art.classList.toggle('active');
						return;
					}
					if (ourMP3.config.random){
						if (!arrPlayed.includes(false)){ // if all files are played
							if (!ourMP3.config.loopList) {
								ourMP3.artist.innerHTML = "Playlist ended";
								ourMP3.song.innerHTML = "";
								console.log("["+self.name+" Playlist ended");
								return;
							}
							arrPlayed.fill(false);
						}
						do {
							ind = Math.floor(Math.random() * ourMP3.songs.length); //(ourMP3.current + 1) % ourMP3.songs.length;
						} while ( (arrPlayed[ind]) || ((ind == ourMP3.current) && (ourMP3.songs.length>1)) ); //ind == ourMP3.current: not to play one song twice - in the end of list and in the beginning of newly created list)
						arrPlayed[ind] = true;
						ourMP3.current = ind;
					}
					else {
						if(ourMP3.current==(ourMP3.songs.length-1)){ // if all files are played
							if (!ourMP3.config.loopList){
								ourMP3.artist.innerHTML = "Playlist ended";
								ourMP3.song.innerHTML = "";
								console.log("["+self.name+" Playlist ended");
								return;
							}
							ourMP3.current = -1;
						}
						ourMP3.current++;
					}
					ourMP3.sendSocketNotification("LOADFILE", ourMP3.songs[ourMP3.current]);
				};
				console.log("["+self.name+" Music Played");
				break;
		}
	},

notificationReceived: function(notification, payload, sender) {
    console.log("Notification received:", notification);
		if (ourMP3.musicFound){
			switch(notification){
				case "PLAY_MUSIC":
					if (audioElement.paused){
						audioElement.play();
					}
					else {
						ourMP3.sendSocketNotification("LOADFILE", ourMP3.songs[ourMP3.current]);
					}
					break;
				case "STOP_MUSIC":
					audioElement.pause();
					break;
				case "NEXT_TRACK":
					if(!ourMP3.musicFound){
						ourMP3.album_art.classList.toggle('active');
						return;
					}
					if (ourMP3.config.random){
						if (!arrPlayed.includes(false)){
							arrPlayed.fill(false);
						}
						do {
							ind = Math.floor(Math.random() * ourMP3.songs.length); // (ourMP3.current + 1) % ourMP3.songs.length;
						} while (arrPlayed[ind] || ind == ourMP3.current); // ind == ourMP3.current: not to play one song twice - in the end of list and in the beginning of newly created list)
						arrPlayed[ind] = true;
						ourMP3.current = ind;
					}
					else {
						if(ourMP3.current==(ourMP3.songs.length-1)){ // this assures the loop
							ourMP3.current = -1;
						}
						ourMP3.current++;
					}
					ourMP3.sendSocketNotification("LOADFILE", ourMP3.songs[ourMP3.current]);
					break;
				case "PREVIOUS_TRACK":
					if(ourMP3.current==0){ // this assures the loop
							ourMP3.current = (ourMP3.songs.length);
						}
					ourMP3.current--;
					ourMP3.sendSocketNotification("LOADFILE", ourMP3.songs[ourMP3.current]);
					break;
				case "RANDOM_ON":
					ourMP3.config.random = true;
					break;
				case "RANDOM_OFF":
					ourMP3.config.random = false;
					break;
			}
		}
	}
});
